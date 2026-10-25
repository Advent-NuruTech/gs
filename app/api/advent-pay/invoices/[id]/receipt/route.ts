import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { createAdventPayReceiptPdf } from "@/lib/advent-pay/receiptPdf";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to download a receipt." }, { status: 401 });
  const { id } = await params;
  const { data: invoice } = await getSupabaseAdminClient().from("advent_pay_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice || (invoice.customer_id !== user.id && user.role !== "admin")) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  if (invoice.status !== "paid" || !invoice.receipt_number) return NextResponse.json({ error: "A receipt is available only after payment is confirmed." }, { status: 400 });
  const method = invoice.payment_method === "paystack" ? "Paystack" : "Till (confirmed by AdventPay)";
  const reference = invoice.payment_method === "paystack" ? invoice.paystack_reference : invoice.manual_payment_reference;
  const bytes = createAdventPayReceiptPdf({
    receiptNumber: String(invoice.receipt_number), invoiceNumber: String(invoice.invoice_number), amount: Number(invoice.amount),
    receivedFromName: String(invoice.receipt_received_from_name || invoice.customer_name || ""),
    receivedFromEmail: String(invoice.receipt_received_from_email || invoice.customer_email || ""), description: String(invoice.description),
    paymentMethod: method, paidAt: new Date(String(invoice.paid_at)).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }),
    reference: reference ? String(reference) : undefined, note: invoice.receipt_note ? String(invoice.receipt_note) : undefined,
  });
  const filename = `${String(invoice.receipt_number).replace(/[^A-Z0-9-]/gi, "")}.pdf`;
  return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
