import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/api/requireUser";
import { mobileMoneyTrackingEmail } from "@/lib/advent-pay/mobileMoney";
import { createPublicPaymentToken, publicPaymentPath } from "@/lib/advent-pay/publicLink";
import { chargeKenyanMobileMoney } from "@/lib/paystack/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const phone = z.string().trim().regex(/^(?:\+254|254|0)(?:1|7)\d{8}$/, "Enter a Kenyan mobile number.");
const collectionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("payment_link"), amount: z.coerce.number().positive().max(10_000_000), reason: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("mobile_prompt"), amount: z.coerce.number().positive().max(10_000_000), customerName: z.string().trim().min(1).max(180), phone, provider: z.enum(["mpesa", "atl"]), reason: z.string().trim().max(2000).optional() }),
]);

const normalizePhone = (value: string) => `+254${value.replace(/^\+?254|^0/, "")}`;
const today = () => new Date().toISOString().slice(0, 10);

function responseInvoice(invoice: Record<string, unknown>) {
  return {
    id: String(invoice.id), invoiceNumber: String(invoice.invoice_number),
    customerName: String(invoice.customer_name ?? ""), customerEmail: String(invoice.customer_email ?? ""),
    customerPhone: String(invoice.customer_phone ?? ""), description: String(invoice.description), amount: Number(invoice.amount),
    currency: "KES", dueDate: String(invoice.due_date), status: String(invoice.status), paymentMethod: "paystack",
    billingType: "one_time", receiptReceivedFromName: String(invoice.receipt_received_from_name ?? ""),
    receiptReceivedFromEmail: String(invoice.receipt_received_from_email ?? ""), createdAt: String(invoice.created_at),
  };
}

/** Creates an amount-first public link or immediately sends a phone-authorised mobile-money prompt. */
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const parsed = collectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the required amount and, for a phone prompt, the customer name, Kenyan phone number, and network." }, { status: 400 });

  const input = parsed.data;
  const admin = getSupabaseAdminClient();
  const reference = `ap_${crypto.randomUUID().replace(/-/g, "")}`;
  const normalizedPhone = input.action === "mobile_prompt" ? normalizePhone(input.phone) : "";
  if (normalizedPhone) {
    const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
    const { data: recentPrompt, error } = await admin.from("advent_pay_invoices")
      .select("id").eq("customer_phone", normalizedPhone).gte("mobile_charge_last_at", thirtySecondsAgo).limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (recentPrompt) return NextResponse.json({ error: "Please wait 30 seconds before sending another prompt to this number." }, { status: 429 });
  }

  const publicToken = input.action === "payment_link" ? createPublicPaymentToken() : null;
  const description = input.reason || (input.action === "payment_link" ? "Payment collection" : "Mobile-money payment");
  const trackingEmail = input.action === "mobile_prompt" ? mobileMoneyTrackingEmail(reference) : "";
  const { data: invoice, error: insertError } = await admin.from("advent_pay_invoices").insert({
    customer_id: null,
    customer_name: input.action === "mobile_prompt" ? input.customerName : "",
    customer_email: trackingEmail,
    customer_phone: normalizedPhone,
    description,
    amount: input.amount,
    due_date: today(),
    payment_method: "paystack",
    billing_type: "one_time",
    recurrence_interval: null,
    receipt_received_from_name: input.action === "mobile_prompt" ? input.customerName : "",
    receipt_received_from_email: trackingEmail,
    receipt_note: "",
    created_by: user.id,
    ...(publicToken ? {
      public_payment_link_enabled: true,
      public_payment_token_hash: publicToken.hash,
      public_payment_link_created_at: new Date().toISOString(),
    } : {}),
  }).select("*").single();
  if (insertError || !invoice) return NextResponse.json({ error: insertError?.message ?? "Could not create the collection." }, { status: 500 });

  if (input.action === "payment_link") {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");
    return NextResponse.json({ invoice: responseInvoice(invoice as Record<string, unknown>), url: `${siteUrl}${publicPaymentPath(publicToken!.token)}` }, { status: 201 });
  }

  try {
    const prompt = await chargeKenyanMobileMoney({
      email: trackingEmail,
      amountKobo: Math.round(input.amount * 100),
      reference,
      phone: normalizedPhone,
      provider: input.provider,
      metadata: { type: "advent_pay_invoice", invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, quickCollection: true },
    });
    const { error: updateError } = await admin.from("advent_pay_invoices").update({
      paystack_reference: prompt.reference,
      mobile_charge_last_at: new Date().toISOString(),
    }).eq("id", invoice.id);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ invoice: responseInvoice(invoice as Record<string, unknown>), message: prompt.displayText, reference: prompt.reference }, { status: 201 });
  } catch (error) {
    // Retain a failed attempt for audit purposes but ensure it cannot be paid later.
    await admin.from("advent_pay_invoices").update({ status: "void" }).eq("id", invoice.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send the mobile-money prompt." }, { status: 502 });
  }
}
