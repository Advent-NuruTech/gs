import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/api/requireUser";
import { recurringPaymentMessage, syncAdventPayRecurringInvoices } from "@/lib/advent-pay/recurring";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ reference: z.string().trim().max(160).optional() });
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const { data: invoice } = await admin.from("advent_pay_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status === "paid") return NextResponse.json({ ok: true, alreadyPaid: true });
  if (invoice.status === "void") return NextResponse.json({ error: "A void invoice cannot be marked paid." }, { status: 400 });
  const receipt = `APR-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const { data: settledInvoice, error } = await admin.from("advent_pay_invoices").update({ status: "paid", paid_at: new Date().toISOString(), paid_by: user.id, manual_payment_reference: parsed.data.reference || null, receipt_number: receipt }).eq("id", id).neq("status", "paid").select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!settledInvoice) return NextResponse.json({ ok: true, alreadyPaid: true });
  let message = `Payment for invoice ${invoice.invoice_number} has been confirmed. Your receipt is ready.`;
  if (invoice.billing_type === "recurring") {
    try {
      await syncAdventPayRecurringInvoices();
      const seriesId = String(invoice.recurring_series_id ?? invoice.id);
      const { data: recurringInvoices } = await admin.from("advent_pay_invoices").select("*").eq("recurring_series_id", seriesId);
      message = `Payment for invoice ${invoice.invoice_number} has been confirmed. ${recurringPaymentMessage((recurringInvoices ?? []) as Record<string, unknown>[], invoice as Record<string, unknown>)}`;
    } catch { /* Scheduling retries through cron or the next dashboard request. */ }
  }
  try {
    await admin.from("notifications").insert({ user_id: invoice.customer_id, title: "AdventPay payment confirmed", message, link: "/adventpay/dashboard" });
  } catch { /* manual settlement remains recorded if notification is unavailable */ }
  return NextResponse.json({ ok: true });
}
