import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const db = getSupabaseAdminClient();
  const [{ data: teachers }, { data: payouts }, { data: rates }, { data: earnings }, { data: settings }] = await Promise.all([
    db.from("profiles").select("id,full_name,email").eq("role", "teacher").order("full_name"),
    db.from("creator_payout_profiles").select("creator_id,account_holder_name,bank_name,account_last4,phone_number,verification_status,payout_status,updated_at"),
    db.from("creator_commission_settings").select("*"),
    db.from("creator_earnings").select("*").order("created_at", { ascending: false }).limit(500),
    db.from("platform_payment_settings").select("*").eq("id", true).maybeSingle(),
  ]);
  const teacherById = new Map((teachers ?? []).map((teacher) => [teacher.id, teacher]));
  const earningsWithCreator = (earnings ?? []).map((row) => ({ ...row, creator: teacherById.get(row.creator_id) ?? null }));
  return NextResponse.json({ teachers: teachers ?? [], payouts: payouts ?? [], rates: rates ?? [], earnings: earningsWithCreator, settings });
}

export async function PUT(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const db = getSupabaseAdminClient();
  let error;
  if (body?.kind === "defaults") {
    const rate = Number(body.rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !["inclusive", "exclusive"].includes(body.feeMode)) {
      return NextResponse.json({ error: "Invalid default commission or fee mode." }, { status: 400 });
    }
    ({ error } = await db.from("platform_payment_settings").upsert({ id: true, default_commission_percent: rate, default_fee_mode: body.feeMode }, { onConflict: "id" }));
  } else if (body?.kind === "creator") {
    const creatorId = String(body.creatorId ?? "");
    const rate = Number(body.rate);
    if (!creatorId || !Number.isFinite(rate) || rate < 0 || rate > 100 || !["inclusive", "exclusive"].includes(body.feeMode)) {
      return NextResponse.json({ error: "Invalid creator commission." }, { status: 400 });
    }
    const { data: creator } = await db.from("profiles").select("role").eq("id", creatorId).maybeSingle();
    if (creator?.role !== "teacher") return NextResponse.json({ error: "Commissions can only be assigned to existing teachers." }, { status: 400 });
    ({ error } = await db.from("creator_commission_settings").upsert({ creator_id: creatorId, commission_percent: rate, fee_mode: body.feeMode }, { onConflict: "creator_id" }));
  } else if (body?.kind === "verification") {
    if (!body.creatorId || !["pending", "verified", "rejected"].includes(body.status)) return NextResponse.json({ error: "Invalid verification status." }, { status: 400 });
    const { data: payout } = await db.from("creator_payout_profiles").select("paystack_subaccount_code").eq("creator_id", body.creatorId).maybeSingle();
    if (body.status === "verified" && !payout?.paystack_subaccount_code) return NextResponse.json({ error: "The teacher must register a Paystack payout subaccount before verification." }, { status: 400 });
    ({ error } = await db.from("creator_payout_profiles").update({ verification_status: body.status, payout_status: body.status === "verified" ? "ready" : body.status === "rejected" ? "paused" : "pending_verification" }).eq("creator_id", body.creatorId));
  } else {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
