import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack/api";
import { recurringPaymentMessage, syncAdventPayRecurringInvoices } from "@/lib/advent-pay/recurring";

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
    await admin.from("notifications").insert({
      user_id: invoice.customer_id,
      title: "AdventPay payment received",
      message,
      link: "/adventpay/dashboard",
    });
  } catch { /* notification delivery must not reverse a settled payment */ }
  return { ok: true, status: "paid", invoiceId: String(invoice.id), alreadyFulfilled: false };
}

/**
 * A short-lived dashboard fallback for asynchronous mobile-money payments.
 * Webhooks remain the primary settlement route, but this closes the gap when
 * a webhook is delayed or was configured after a payment prompt was sent.
 */
export async function reconcileRecentMobileMoneyPayments(invoices: Record<string, unknown>[]) {
  const cutoff = Date.now() - 4 * 60_000;
  const references = [...new Set(invoices.flatMap((invoice) => {
    const promptedAt = invoice.mobile_charge_last_at ? new Date(String(invoice.mobile_charge_last_at)).getTime() : 0;
    const reference = typeof invoice.paystack_reference === "string" ? invoice.paystack_reference : "";
    return invoice.status === "pending" && invoice.payment_method === "paystack" && promptedAt >= cutoff && reference.startsWith("ap_")
      ? [reference]
      : [];
  }))];

  if (!references.length) return false;
  const results = await Promise.allSettled(references.map((reference) => fulfillAdventPayInvoice(reference)));
  return results.some((result) => result.status === "fulfilled" && result.value.ok && result.value.status === "paid");
}
