import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack/api";
import { sendSms, sendSmsBulk } from "@/lib/sms/wasms";

export interface FulfillResult {
  ok: boolean;
  alreadyFulfilled: boolean;
  status: "success" | "failed" | "pending";
  courseId?: string;
  amount?: number;
  unlockedLessonIds?: string[];
  message?: string;
}

function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

/**
 * Verifies a Paystack transaction and, on success, grants access exactly once.
 * Safe to call from both the redirect verify route and the webhook — it is
 * idempotent on `payments.status`.
 */
export async function fulfillByReference(reference: string): Promise<FulfillResult> {
  const supabase = getSupabaseAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (!payment) {
    return { ok: false, alreadyFulfilled: false, status: "pending", message: "Payment not found." };
  }

  if (payment.status === "success") {
    return {
      ok: true,
      alreadyFulfilled: true,
      status: "success",
      courseId: payment.course_id,
      amount: Number(payment.amount),
      unlockedLessonIds: (payment.lesson_ids as string[]) ?? [],
    };
  }

  // Verify with Paystack using the secret key (server-side source of truth).
  const verification = await verifyTransaction(reference);
  const expectedKobo = Math.round(Number(payment.amount) * 100);

  if (verification.status !== "success" || verification.amount < expectedKobo) {
    await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return {
      ok: false,
      alreadyFulfilled: false,
      status: "failed",
      message: "Payment was not successful or amount mismatch.",
    };
  }

  const lessonIds = (payment.lesson_ids as string[]) ?? [];

  // 1) Mark the payment successful.
  await supabase
    .from("payments")
    .update({
      status: "success",
      paid_at: verification.paidAt ?? new Date().toISOString(),
      metadata: { ...(payment.metadata as object), paystack: verification.raw },
    })
    .eq("id", payment.id);

  // 2) Record per-lesson unlocks (idempotent on user_id + lesson_id).
  if (lessonIds.length > 0) {
    await supabase.from("lesson_unlocks").upsert(
      lessonIds.map((lessonId) => ({
        user_id: payment.user_id,
        course_id: payment.course_id,
        lesson_id: lessonId,
        payment_id: payment.id,
      })),
      { onConflict: "user_id,lesson_id" },
    );
  }

  // 3) Upsert the enrollment and merge unlocked lessons.
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", payment.user_id)
    .eq("course_id", payment.course_id)
    .maybeSingle();

  const mergedUnlocked = Array.from(
    new Set([...(((enrollment?.unlocked_lessons as string[]) ?? [])), ...lessonIds]),
  );

  if (enrollment) {
    await supabase
      .from("enrollments")
      .update({
        unlocked_lessons: mergedUnlocked,
        last_opened_lesson_id: enrollment.last_opened_lesson_id || lessonIds[0] || null,
      })
      .eq("id", enrollment.id);
  } else {
    await supabase.from("enrollments").insert({
      user_id: payment.user_id,
      course_id: payment.course_id,
      unlocked_lessons: mergedUnlocked,
      last_opened_lesson_id: lessonIds[0] ?? null,
    });
  }

  // 4) In-app notifications + SMS receipts (best-effort).
  const courseTitle = payment.course_title || "your course";
  await notifyAndText(payment, courseTitle, lessonIds.length);

  return {
    ok: true,
    alreadyFulfilled: false,
    status: "success",
    courseId: payment.course_id,
    amount: Number(payment.amount),
    unlockedLessonIds: lessonIds,
  };
}

async function notifyAndText(
  payment: Record<string, unknown>,
  courseTitle: string,
  unlockedCount: number,
) {
  const supabase = getSupabaseAdminClient();
  const amount = Number(payment.amount);
  const studentMsg = `AdventSkool: Payment of ${formatKes(amount)} received for ${courseTitle}. ${unlockedCount} lesson(s) unlocked. Ref ${payment.paystack_reference}.`;

  try {
    await supabase.from("notifications").insert({
      user_id: payment.user_id,
      title: "Payment Successful",
      message: `${formatKes(amount)} received for ${courseTitle}. ${unlockedCount} lesson(s) unlocked.`,
      link: `/dashboard/student/my-courses/${payment.course_id}`,
    });
  } catch {
    /* non-fatal */
  }

  // Student SMS receipt.
  if (payment.phone) {
    await sendSms(String(payment.phone), studentMsg);
  }

  // Admin notifications + SMS.
  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, phone")
      .eq("role", "admin");

    const adminMsg = `AdventSkool: ${payment.full_name || "A student"} paid ${formatKes(amount)} for ${courseTitle} (${unlockedCount} lesson(s)).`;

    await Promise.all(
      (admins ?? []).map((admin) =>
        supabase.from("notifications").insert({
          user_id: admin.id,
          title: "New Payment Received",
          message: adminMsg,
          link: "/dashboard/admin/payments",
        }),
      ),
    );

    const adminPhones = (admins ?? [])
      .map((a) => String((a as Record<string, unknown>).phone ?? ""))
      .filter(Boolean);
    await sendSmsBulk(adminPhones, adminMsg);
  } catch {
    /* non-fatal */
  }
}
