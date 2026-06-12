import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/wasms";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

// Lets a student cancel their own pending payment draft. Clients cannot write to
// the payments table directly (RLS), so the cancellation runs with the service
// role after we confirm the caller owns the draft and it is still pending.
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { reference?: string };
  if (!body.reference) {
    return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("paystack_reference", body.reference)
    .maybeSingle();

  if (!payment || payment.user_id !== user.id) {
    return NextResponse.json({ error: "Payment draft not found." }, { status: 404 });
  }
  if (payment.status !== "pending") {
    return NextResponse.json(
      { error: "Only a pending payment can be cancelled." },
      { status: 409 },
    );
  }

  const { error: updateError } = await admin
    .from("payments")
    .update({ status: "cancelled" })
    .eq("id", payment.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // Notify the student (in-app + SMS) that the draft was cancelled.
  const courseTitle = payment.course_title || "your course";
  const amount = Number(payment.amount);

  try {
    await admin.from("notifications").insert({
      user_id: payment.user_id,
      title: "Payment Cancelled",
      message: `Your pending payment of ${formatKes(amount)} for ${courseTitle} was cancelled. You can start it again anytime.`,
      link: `/courses/${payment.course_id}/checkout`,
    });
  } catch {
    /* non-fatal */
  }

  if (payment.phone) {
    await sendSms(
      String(payment.phone),
      `AdventSkool: Your pending payment of ${formatKes(amount)} for ${courseTitle} was cancelled. You can start it again anytime.`,
    );
  }

  return NextResponse.json({ ok: true });
}
