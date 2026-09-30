import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Teachers only." }, { status: 403 });
  const db = getSupabaseAdminClient();
  const [{ data: payout }, { data: commission }, { data: earnings }] = await Promise.all([
    db.from("creator_payout_profiles").select("*").eq("creator_id", user.id).maybeSingle(),
    db.from("creator_commission_settings").select("commission_percent,fee_mode").eq("creator_id", user.id).maybeSingle(),
    db.from("creator_earnings").select("gross_amount,commission_percent,fee_mode,platform_commission,creator_amount,provider_fee,payout_status,created_at").eq("creator_id", user.id).order("created_at", { ascending: false }),
  ]);
  const { data: defaults } = await db.from("platform_payment_settings").select("default_commission_percent,default_fee_mode").eq("id", true).maybeSingle();
  return NextResponse.json({ payout, commission: commission ?? defaults, earnings: earnings ?? [] });
}

export async function PUT(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Teachers only." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const holder = String(body?.accountHolderName ?? "").trim();
  const bank = String(body?.bankName ?? "").trim();
  const code = String(body?.bankCode ?? "").trim();
  const account = String(body?.accountNumber ?? "").replace(/\s/g, "");
  const phone = String(body?.phoneNumber ?? "").trim();
  if (!holder || !bank || !account || account.length > 32 || !/^\+?[0-9 ()-]{7,20}$/.test(phone)) {
    return NextResponse.json({ error: "Enter an account holder, bank, account number, and valid phone number." }, { status: 400 });
  }
  const db = getSupabaseAdminClient();
  const { data: previous } = await db.from("creator_payout_profiles").select("verification_status").eq("creator_id", user.id).maybeSingle();
  const { error } = await db.from("creator_payout_profiles").upsert({
    creator_id: user.id,
    account_holder_name: holder,
    bank_name: bank,
    bank_code: code,
    account_number: account,
    phone_number: phone,
    verification_status: previous?.verification_status === "verified" ? "pending" : "pending",
    payout_status: "pending_verification",
  }, { onConflict: "creator_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
