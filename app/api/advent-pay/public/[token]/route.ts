import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hashPublicPaymentToken } from "@/lib/advent-pay/publicLink";
import { mobileMoneyTrackingEmail } from "@/lib/advent-pay/mobileMoney";
import { chargeKenyanMobileMoney, initializeTransaction } from "@/lib/paystack/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const paymentSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("checkout"), email: z.string().trim().email().max(254) }),
  z.object({ method: z.literal("mobile_money"), phone: z.string().trim().regex(/^(?:\+254|254|0)(?:1|7)\d{8}$/, "Enter a Kenyan mobile number."), provider: z.enum(["mpesa", "atl"]).default("mpesa") }),
]);
const normalizePhone = (phone: string) => `+254${phone.replace(/^\+?254|^0/, "")}`;

async function findPublicInvoice(token: string) {
  return getSupabaseAdminClient().from("advent_pay_invoices").select("*")
    .eq("public_payment_link_enabled", true)
    .eq("public_payment_token_hash", hashPublicPaymentToken(token))
    .maybeSingle();
}

function publicInvoice(invoice: Record<string, unknown>) {
  return {
    invoiceNumber: String(invoice.invoice_number), description: String(invoice.description), amount: Number(invoice.amount), currency: "KES",
    dueDate: String(invoice.due_date), status: String(invoice.status),
  };
}

function unavailable(invoice: Record<string, unknown>) {
  return invoice.status === "void" || invoice.payment_method !== "paystack";
}

function payable(invoice: Record<string, unknown>) {
  return !unavailable(invoice) && invoice.status !== "paid";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: invoice, error } = await findPublicInvoice(token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invoice || unavailable(invoice as Record<string, unknown>)) return NextResponse.json({ error: "This payment link is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ invoice: publicInvoice(invoice as Record<string, unknown>) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the Paystack-required details for your chosen payment method." }, { status: 400 });
  const { token } = await params;
  const admin = getSupabaseAdminClient();
  const { data: invoice, error: lookupError } = await findPublicInvoice(token);
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!invoice || !payable(invoice as Record<string, unknown>)) return NextResponse.json({ error: "This payment link is unavailable." }, { status: 404 });

  const reference = `ap_${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = { type: "advent_pay_invoice", invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, customerId: invoice.customer_id, publicPaymentLink: true };
  try {
    if (parsed.data.method === "checkout") {
      const transaction = await initializeTransaction({
        email: parsed.data.email, amountKobo: Math.round(Number(invoice.amount) * 100), reference,
        callbackUrl: `${request.nextUrl.origin}/adventpay/pay/${encodeURIComponent(token)}`,
        metadata,
      });
      const { error } = await admin.from("advent_pay_invoices").update({ paystack_reference: transaction.reference, paystack_access_code: transaction.accessCode }).eq("id", invoice.id).neq("status", "paid").neq("status", "void");
      if (error) throw new Error(error.message);
      return NextResponse.json({ authorizationUrl: transaction.authorizationUrl });
    }

    const lastPrompt = invoice.mobile_charge_last_at ? new Date(String(invoice.mobile_charge_last_at)).getTime() : 0;
    if (lastPrompt && Date.now() - lastPrompt < 30_000) return NextResponse.json({ error: "Please wait 30 seconds before sending another phone prompt." }, { status: 429 });
    const prompt = await chargeKenyanMobileMoney({
      email: mobileMoneyTrackingEmail(reference), amountKobo: Math.round(Number(invoice.amount) * 100), reference,
      phone: normalizePhone(parsed.data.phone), provider: parsed.data.provider, metadata,
    });
    const { error } = await admin.from("advent_pay_invoices").update({
      customer_phone: normalizePhone(parsed.data.phone), paystack_reference: prompt.reference, paystack_access_code: null, mobile_charge_last_at: new Date().toISOString(),
    }).eq("id", invoice.id).neq("status", "paid").neq("status", "void");
    if (error) throw new Error(error.message);
    return NextResponse.json({ message: prompt.displayText });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not start the payment." }, { status: 502 });
  }
}
