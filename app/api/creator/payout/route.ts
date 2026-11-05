import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createKenyanSubaccount, listKenyanBanks, PaystackRequestError } from "@/lib/paystack/api";
import { syncCreatorPayoutSettlements } from "@/lib/paystack/creatorPayoutSettlements";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Teachers only." }, { status: 403 });
  const db = getSupabaseAdminClient();
  // A dashboard visit is an additional backstop if the scheduled reconciliation
  // was delayed. Payout data must still be available if Paystack is temporarily
  // unavailable, so the cron remains the authoritative retry mechanism.
  try {
    await syncCreatorPayoutSettlements(user.id);
  } catch {
    // Leave the last known ledger state intact; a later cron run will retry.
  }
  const [payoutResult, commissionResult, defaultsResult] = await Promise.all([
    db.from("creator_payout_profiles").select("creator_id,account_holder_name,bank_name,bank_code,account_last4,phone_number,verification_status,payout_status,updated_at").eq("creator_id", user.id).maybeSingle(),
    db.from("creator_commission_settings").select("commission_percent,fee_mode").eq("creator_id", user.id).maybeSingle(),
    db.from("platform_payment_settings").select("default_commission_percent,default_fee_mode").eq("id", true).maybeSingle(),
  ]);
  if (payoutResult.error || commissionResult.error || defaultsResult.error) return NextResponse.json({ error: "Could not load payout details." }, { status: 500 });
  const earnings = [];
  const batchSize = 1000;
  for (let offset = 0; ; offset += batchSize) {
    const result = await db.from("creator_earnings").select("id,gross_amount,commission_percent,fee_mode,creator_amount,provider_fee,payout_status,settlement_mode,payment_reference,settled_at,created_at").eq("creator_id", user.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + batchSize - 1);
    if (result.error) return NextResponse.json({ error: "Could not load your earnings." }, { status: 500 });
    earnings.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < batchSize) break;
  }
  const defaults = defaultsResult.data;
  return NextResponse.json({ payout: payoutResult.data, commission: commissionResult.data ?? { commission_percent: defaults?.default_commission_percent ?? 10, fee_mode: defaults?.default_fee_mode ?? "exclusive" }, earnings });
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
  let banks;
  const [commissionResult, settingsResult] = await Promise.all([
    db.from("creator_commission_settings").select("commission_percent").eq("creator_id", user.id).maybeSingle(),
    db.from("platform_payment_settings").select("default_commission_percent").eq("id", true).maybeSingle(),
  ]);
  if (commissionResult.error || settingsResult.error) return NextResponse.json({ error: "Payout settings are unavailable. Try again." }, { status: 503 });
  const platformCommissionPercent = Number(commissionResult.data?.commission_percent ?? settingsResult.data?.default_commission_percent ?? 10);
  if (!Number.isFinite(platformCommissionPercent) || platformCommissionPercent < 0 || platformCommissionPercent > 100) {
    return NextResponse.json({ error: "Payout settings are unavailable. Contact support." }, { status: 503 });
  }
  try { banks = await listKenyanBanks(); }
  catch { return NextResponse.json({ error: "Could not load banks. Please try again." }, { status: 502 }); }
  const selectedBank = banks.find((item) => item.code === bankCode);
  if (!selectedBank) return NextResponse.json({ error: "Select a valid Kenyan bank from the list." }, { status: 400 });

  // A persistent claim prevents concurrent creates and unsafe retries after an
  // ambiguous Paystack response or a failure to save the returned code.
  const claim = await db.from("creator_payout_submission_claims").insert({ creator_id: user.id });
  if (claim.error) {
    return NextResponse.json({ error: claim.error.code === "23505" ? "A payout submission is already in progress or needs review. Contact support if it does not clear." : "Could not start payout setup. Please try again." }, { status: claim.error.code === "23505" ? 409 : 503 });
  }
  let releaseClaim = true;
  try {
    const existing = await db.from("creator_payout_profiles").select("paystack_subaccount_code").eq("creator_id", user.id).maybeSingle();
    if (existing.error) return NextResponse.json({ error: "Could not load payout setup. Please try again." }, { status: 503 });
    const existingCode = existing.data?.paystack_subaccount_code || undefined;
    if (existingCode) {
      // Stop future splits before changing the destination; the new details
      // must be verified again even if the provider response is interrupted.
      const paused = await db.from("creator_payout_profiles").update({ verification_status: "pending", payout_status: "pending_verification" }).eq("creator_id", user.id);
      if (paused.error) return NextResponse.json({ error: "Could not prepare payout setup. Please try again." }, { status: 503 });
    }
    // Once a create starts, only a definite rejection or a successful local
    // save permits another create. A timeout may have created a subaccount.
    releaseClaim = Boolean(existingCode);
    let registered;
    try {
      registered = await createKenyanSubaccount({
        businessName: user.fullName || holder,
        accountHolderName: holder,
        accountNumber: account,
        bankCode,
        email: user.email,
        phone,
        platformCommissionPercent,
        existingCode,
      });
    } catch (error) {
      if (!existingCode && error instanceof PaystackRequestError && [400, 401, 403, 422].includes(error.status)) releaseClaim = true;
      return NextResponse.json({ error: releaseClaim ? "Paystack could not save this account. Check the bank and account details, then try again." : "Paystack could not confirm the payout setup. Contact support before submitting again." }, { status: 502 });
    }
    // Keep the claim for either operation until the local record is saved.
    releaseClaim = false;
    const { error } = await db.from("creator_payout_profiles").upsert({
      creator_id: user.id,
      account_holder_name: registered.accountName,
      bank_name: registered.bankName || selectedBank.name,
      bank_code: bankCode,
      account_number: "",
      account_last4: registered.accountLast4,
      paystack_subaccount_code: registered.code,
      phone_number: phone,
      verification_status: "pending",
      payout_status: "pending_verification",
    }, { onConflict: "creator_id" });
    if (error) return NextResponse.json({ error: "Paystack saved the account, but AdventSkool could not save the payout setup. Contact support before submitting again." }, { status: 500 });
    releaseClaim = true;
    return NextResponse.json({ ok: true, verificationStatus: "pending" });
  } finally {
    if (releaseClaim) await db.from("creator_payout_submission_claims").delete().eq("creator_id", user.id);
  }
}
