import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createKenyanSubaccount, listKenyanBanks } from "@/lib/paystack/api";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Teachers only." }, { status: 403 });
  const db = getSupabaseAdminClient();
  const [{ data: payout }, { data: commission }, { data: earnings }] = await Promise.all([
    db.from("creator_payout_profiles").select("creator_id,account_holder_name,bank_name,bank_code,account_last4,phone_number,verification_status,payout_status,updated_at").eq("creator_id", user.id).maybeSingle(),
    db.from("creator_commission_settings").select("commission_percent,fee_mode").eq("creator_id", user.id).maybeSingle(),
    db.from("creator_earnings").select("gross_amount,commission_percent,fee_mode,platform_commission,creator_amount,provider_fee,payout_status,settlement_mode,payment_reference,created_at").eq("creator_id", user.id).order("created_at", { ascending: false }),
  ]);
  const { data: defaults } = await db.from("platform_payment_settings").select("default_commission_percent,default_fee_mode").eq("id", true).maybeSingle();
  return NextResponse.json({ payout, commission: commission ?? defaults, earnings: earnings ?? [] });
}

export async function PUT(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Teachers only." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const holder = String(body?.accountHolderName ?? "").trim();
  const bankCode = String(body?.bankCode ?? "").trim();
  const account = String(body?.accountNumber ?? "").replace(/\s/g, "");
  const phone = String(body?.phoneNumber ?? "").trim();
  if (!holder || !bankCode || !/^\d{5,20}$/.test(account) || !/^\+?[0-9 ()-]{7,20}$/.test(phone)) {
    return NextResponse.json({ error: "Enter the account holder name, select a bank, enter a valid account number and phone number." }, { status: 400 });
  }
  const db = getSupabaseAdminClient();
  try {
    const banks = await listKenyanBanks();
    const selectedBank = banks.find((item) => item.code === bankCode);
    if (!selectedBank) return NextResponse.json({ error: "Select a valid Kenyan bank from the list." }, { status: 400 });
    const created = await createKenyanSubaccount({
      businessName: user.fullName || holder,
      accountHolderName: holder,
      accountNumber: account,
      bankCode,
      email: user.email,
      phone,
    });
    const { error } = await db.from("creator_payout_profiles").upsert({
      creator_id: user.id,
      account_holder_name: created.accountName,
      bank_name: created.bankName || selectedBank.name,
      bank_code: bankCode,
      account_number: "",
      account_last4: created.accountLast4,
      paystack_subaccount_code: created.code,
      phone_number: phone,
      verification_status: "pending",
      payout_status: "pending_verification",
    }, { onConflict: "creator_id" });
    if (error) return NextResponse.json({ error: "Paystack registered the account, but AdventSkool could not save the payout setup. Contact support before submitting again." }, { status: 500 });
    return NextResponse.json({ ok: true, verificationStatus: "pending" });
  } catch {
    return NextResponse.json({ error: "Paystack could not register this account. Check the bank and account details, then try again." }, { status: 502 });
  }
}
