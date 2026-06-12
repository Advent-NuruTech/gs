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
      },
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
