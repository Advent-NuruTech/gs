import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { initializeTransaction } from "@/lib/paystack/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to pay this invoice." }, { status: 401 });
  const { id } = await params;
  const admin = getSupabaseAdminClient();
  const { data: invoice } = await admin.from("advent_pay_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice || (invoice.customer_id !== user.id && user.role !== "admin")) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 });
  if (invoice.status === "void") return NextResponse.json({ error: "This invoice has been voided." }, { status: 400 });
  if (invoice.payment_method !== "paystack") return NextResponse.json({ error: "This invoice is payable through Till. Use the Till details shown on the invoice." }, { status: 400 });
  if (!String(invoice.customer_email ?? user.email).includes("@")) return NextResponse.json({ error: "A valid account email is required for Paystack payment." }, { status: 400 });

  const reference = `ap_${crypto.randomUUID().replace(/-/g, "")}`;
  try {
    const result = await initializeTransaction({
      email: String(invoice.customer_email || user.email), amountKobo: Math.round(Number(invoice.amount) * 100), reference,
      callbackUrl: `${request.nextUrl.origin}/adventpay/dashboard?reference=${reference}`,
      metadata: { type: "advent_pay_invoice", invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, customerId: invoice.customer_id },
    });
    const { error } = await admin.from("advent_pay_invoices").update({ paystack_reference: reference, paystack_access_code: result.accessCode }).eq("id", invoice.id).neq("status", "paid");
    if (error) throw new Error(error.message);
    return NextResponse.json({ authorizationUrl: result.authorizationUrl, reference });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start Paystack payment." }, { status: 502 });
  }
}
