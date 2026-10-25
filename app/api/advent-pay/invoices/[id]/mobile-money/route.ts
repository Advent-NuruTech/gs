import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/api/requireUser";
import { paystackEmailForMobileMoney } from "@/lib/advent-pay/mobileMoney";
import { chargeKenyanMobileMoney } from "@/lib/paystack/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const promptSchema = z.object({
  phone: z.string().trim().regex(/^(?:\+254|254|0)(?:1|7)\d{8}$/, "Enter a Kenyan mobile number."),
  provider: z.enum(["mpesa", "atl"]).default("mpesa"),
});
const normalizePhone = (phone: string) => `+254${phone.replace(/^\+?254|^0/, "")}`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const parsed = promptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid Kenyan mobile number and supported mobile-money network." }, { status: 400 });
  const { id } = await params;
  const admin = getSupabaseAdminClient();
  const { data: invoice } = await admin.from("advent_pay_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status === "paid" || invoice.status === "void") return NextResponse.json({ error: "This invoice is no longer payable." }, { status: 400 });
  if (invoice.payment_method !== "paystack") return NextResponse.json({ error: "Change this invoice to Paystack before sending an M-PESA prompt." }, { status: 400 });
  const lastPrompt = invoice.mobile_charge_last_at ? new Date(String(invoice.mobile_charge_last_at)).getTime() : 0;
  if (lastPrompt && Date.now() - lastPrompt < 30_000) return NextResponse.json({ error: "Please wait 30 seconds before sending another phone prompt." }, { status: 429 });

  const reference = `ap_${crypto.randomUUID().replace(/-/g, "")}`;
  try {
    const prompt = await chargeKenyanMobileMoney({
      email: paystackEmailForMobileMoney(invoice.customer_email, reference), amountKobo: Math.round(Number(invoice.amount) * 100), reference,
      phone: normalizePhone(parsed.data.phone), provider: parsed.data.provider,
      metadata: { type: "advent_pay_invoice", invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, customerId: invoice.customer_id },
    });
    const { error } = await admin.from("advent_pay_invoices").update({ customer_phone: normalizePhone(parsed.data.phone), paystack_reference: prompt.reference, paystack_access_code: null, mobile_charge_last_at: new Date().toISOString() }).eq("id", invoice.id).neq("status", "paid");
    if (error) throw new Error(error.message);
    return NextResponse.json({ message: prompt.displayText });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send the mobile-money prompt." }, { status: 502 });
  }
}
