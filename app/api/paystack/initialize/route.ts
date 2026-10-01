import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack/api";
import { amountForLessons, LessonLike } from "@/lib/payments/plans";
import { Course } from "@/types/course";
import { PlanType } from "@/types/payment";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function getCaller(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  const user = await getCaller(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json()) as {
    courseId?: string;
    planType?: PlanType;
    lessonIds?: string[];
  };
  if (!body.courseId || !body.planType || !Array.isArray(body.lessonIds) || body.lessonIds.length === 0) {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Load course + lessons + profile server-side (trusted data).
  const [{ data: courseRow }, { data: lessonRows }, { data: profile }] = await Promise.all([
    admin.from("courses").select("*").eq("id", body.courseId).maybeSingle(),
    admin.from("lessons").select("id, title, order_index").eq("course_id", body.courseId),
    admin.from("profiles").select("email, phone, full_name").eq("id", user.id).maybeSingle(),
  ]);

  if (!courseRow) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const course = { finalPrice: Number(courseRow.final_price ?? 0) } as Course;
  const lessons: LessonLike[] = (lessonRows ?? []).map((l) => ({
    id: String(l.id),
    title: String(l.title ?? ""),
    order: Number(l.order_index ?? 0),
  }));

  // Only allow lessons that belong to the course.
  const validLessonIds = new Set(lessons.map((l) => l.id));
  const lessonIds = body.lessonIds.filter((id) => validLessonIds.has(id));
  if (lessonIds.length === 0) {
    return NextResponse.json({ error: "No valid lessons selected." }, { status: 400 });
  }

  // Skip lessons the user already unlocked so they're never charged twice.
  const { data: unlocks } = await admin
    .from("lesson_unlocks")
    .select("lesson_id")
    .eq("user_id", user.id)
    .eq("course_id", body.courseId);
  const alreadyUnlocked = new Set((unlocks ?? []).map((u) => String(u.lesson_id)));
  const payableLessonIds = lessonIds.filter((id) => !alreadyUnlocked.has(id));

  if (payableLessonIds.length === 0) {
    return NextResponse.json({ error: "You already own the selected lessons." }, { status: 400 });
  }

  const amount = amountForLessons(course, lessons, payableLessonIds);
  if (amount <= 0) {
    return NextResponse.json({ error: "Could not compute a valid amount." }, { status: 400 });
  }

  const email = String(profile?.email ?? user.email ?? "");
  const reference = `as_${crypto.randomUUID().replace(/-/g, "")}`;

  const sellerId = courseRow.instructor_id ? String(courseRow.instructor_id) : null;
  let payoutSplit: { subaccount: string; transactionChargeKobo: number; feeBearer: "account" | "subaccount" } | undefined;
  let creatorPayoutSnapshot: Record<string, unknown> | undefined;
  if (sellerId) {
    const [{ data: platformSettings }, { data: creatorSettings }, { data: payoutProfile }, { data: creatorProfile }] = await Promise.all([
      admin.from("platform_payment_settings").select("default_commission_percent,default_fee_mode").eq("id", true).maybeSingle(),
      admin.from("creator_commission_settings").select("commission_percent,fee_mode").eq("creator_id", sellerId).maybeSingle(),
      admin.from("creator_payout_profiles").select("paystack_subaccount_code,verification_status,payout_status").eq("creator_id", sellerId).maybeSingle(),
      admin.from("profiles").select("creator_status,suspended_until").eq("id", sellerId).maybeSingle(),
    ]);
    const commissionPercent = Number(creatorSettings?.commission_percent ?? platformSettings?.default_commission_percent ?? 10);
    const feeMode = String(creatorSettings?.fee_mode ?? platformSettings?.default_fee_mode ?? "exclusive");
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100 || !["inclusive", "exclusive"].includes(feeMode)) {
      return NextResponse.json({ error: "Creator commission configuration is invalid. Contact AdventSkool support." }, { status: 503 });
    }
    const platformAmount = Math.round(amount * commissionPercent) / 100;
    const subaccount = creatorProfile?.creator_status === "approved" && (!creatorProfile.suspended_until || new Date(creatorProfile.suspended_until).getTime() <= Date.now()) && payoutProfile?.verification_status === "verified" && payoutProfile.payout_status === "ready"
      ? String(payoutProfile.paystack_subaccount_code ?? "")
      : "";
    const settlementMode = subaccount ? "paystack_split" : "platform_only";
    creatorPayoutSnapshot = {
      creator_id: sellerId,
      commission_percent: commissionPercent,
      fee_mode: feeMode,
      platform_amount: platformAmount,
      settlement_mode: settlementMode,
    };
    if (subaccount) {
      payoutSplit = {
        subaccount,
        transactionChargeKobo: Math.round(platformAmount * 100),
        feeBearer: feeMode === "exclusive" ? "subaccount" : "account",
      };
    }
  }
  const paymentMetadata = creatorPayoutSnapshot ? { creator_payout: creatorPayoutSnapshot } : {};

  // Create the pending payment record (service role; clients cannot write payments).
  const { error: insertError } = await admin.from("payments").insert({
    user_id: user.id,
    course_id: body.courseId,
    plan_type: body.planType,
    lesson_ids: payableLessonIds,
    amount,
    currency: "KES",
    paystack_reference: reference,
    status: "pending",
    email,
    phone: String(profile?.phone ?? ""),
    full_name: String(profile?.full_name ?? ""),
    course_title: String(courseRow.title ?? ""),
    metadata: paymentMetadata,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const callbackUrl = `${request.nextUrl.origin}/courses/${body.courseId}/checkout/success`;

  try {
    const result = await initializeTransaction({
      email,
      amountKobo: Math.round(amount * 100),
      reference,
      callbackUrl,
      metadata: {
        courseId: body.courseId,
        userId: user.id,
        planType: body.planType,
        lessonIds: payableLessonIds,
        ...(creatorPayoutSnapshot ? { creatorPayout: creatorPayoutSnapshot } : {}),
      },
      ...payoutSplit,
    });

    await admin
      .from("payments")
      .update({ paystack_access_code: result.accessCode })
      .eq("paystack_reference", reference);

    return NextResponse.json({
      authorizationUrl: result.authorizationUrl,
      reference,
      amount,
    });
  } catch (error) {
    await admin.from("payments").update({ status: "failed" }).eq("paystack_reference", reference);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment." },
      { status: 502 },
    );
  }
}
