import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack/api";

function receiptNumber() {
  return `APR-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

/** Server-authoritative Paystack fulfillment. Safe to call from redirect and webhook. */
export async function fulfillAdventPayInvoice(reference: string) {
  const admin = getSupabaseAdminClient();
  const { data: invoice } = await admin.from("advent_pay_invoices").select("*").eq("paystack_reference", reference).maybeSingle();
  if (!invoice) return { ok: false, status: "pending", message: "Invoice payment was not found." };
  if (invoice.status === "paid") return { ok: true, status: "paid", invoiceId: String(invoice.id), alreadyFulfilled: true };
  if (invoice.status === "void") return { ok: false, status: "void", message: "This invoice has been voided." };

  const payment = await verifyTransaction(reference);
  const expectedKobo = Math.round(Number(invoice.amount) * 100);
  if (payment.status !== "success" || payment.amount < expectedKobo) {
    return { ok: false, status: "pending", message: "Payment has not been confirmed yet." };
  }

  const { data: settledInvoice, error } = await admin.from("advent_pay_invoices").update({
    status: "paid",
    paid_at: payment.paidAt ?? new Date().toISOString(),
    provider_fee: payment.feesKobo === null ? null : payment.feesKobo / 100,
    receipt_number: receiptNumber(),
  }).eq("id", invoice.id).neq("status", "paid").select("id").maybeSingle();
  if (error) throw new Error(`Could not record invoice payment: ${error.message}`);
  // Another verified path (webhook or redirect) may have won the race.
  if (!settledInvoice) return { ok: true, status: "paid", invoiceId: String(invoice.id), alreadyFulfilled: true };

  try {
    await admin.from("notifications").insert({
      user_id: invoice.customer_id,
      title: "AdventPay payment received",
      message: `Payment for invoice ${invoice.invoice_number} has been confirmed. Your receipt is ready.`,
      link: "/adventpay/dashboard",
    });
  } catch { /* notification delivery must not reverse a settled payment */ }
  return { ok: true, status: "paid", invoiceId: String(invoice.id), alreadyFulfilled: false };
}
