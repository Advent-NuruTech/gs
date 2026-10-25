import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const editSchema = z.object({
  description: z.string().trim().min(3).max(2000).optional(),
  amount: z.coerce.number().positive().max(10_000_000).optional(),
  dueDate: z.string().date().optional(),
  paymentMethod: z.enum(["paystack", "till"]).optional(),
  billingType: z.enum(["one_time", "recurring"]).optional(),
  recurrenceInterval: z.enum(["weekly", "monthly", "quarterly", "yearly"]).nullable().optional(),
  receiptReceivedFromName: z.string().trim().min(1).max(180).optional(),
  receiptReceivedFromEmail: z.string().trim().email().max(254).optional(),
  receiptNote: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid invoice and receipt details." }, { status: 400 });
  const { id } = await params;
  const admin = getSupabaseAdminClient();
  const { data: current } = await admin.from("advent_pay_invoices").select("*").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (current.status === "void") return NextResponse.json({ error: "A void invoice cannot be edited." }, { status: 400 });

  const input = parsed.data;
  const hasInvoiceFields = input.description !== undefined || input.amount !== undefined || input.dueDate !== undefined || input.paymentMethod !== undefined || input.billingType !== undefined || input.recurrenceInterval !== undefined;
  if (current.status === "paid" && hasInvoiceFields) return NextResponse.json({ error: "Paid invoice financial details are locked. You can still correct the receipt recipient or note." }, { status: 400 });
  if (input.dueDate && new Date(`${input.dueDate}T23:59:59`).getTime() < Date.now() - 86_400_000) return NextResponse.json({ error: "The due date cannot be in the past." }, { status: 400 });
  if (current.paystack_reference && (input.amount !== undefined || input.paymentMethod !== undefined)) return NextResponse.json({ error: "A payment attempt already exists; amount and payment method are locked." }, { status: 400 });

  const nextBillingType = input.billingType ?? current.billing_type;
  const nextInterval = input.recurrenceInterval === undefined ? current.recurrence_interval : input.recurrenceInterval;
  if (nextBillingType === "recurring" && !nextInterval) return NextResponse.json({ error: "Choose a recurrence interval for a recurring invoice." }, { status: 400 });
  const nextSeriesId = nextBillingType === "recurring" ? current.recurring_series_id ?? crypto.randomUUID() : null;
  const nextAnchorDate = nextBillingType === "recurring"
    ? current.recurrence_anchor_date ?? input.dueDate ?? current.due_date
    : null;
  const nextMethod = input.paymentMethod ?? current.payment_method;
  let tillSnapshot = {};
  if (nextMethod === "till" && input.paymentMethod === "till") {
    const { data: settings } = await admin.from("advent_pay_settings").select("till_name,till_number,till_instructions").eq("id", true).maybeSingle();
    if (!String(settings?.till_number ?? "").trim()) return NextResponse.json({ error: "Set a Till number before changing this invoice to Till payment." }, { status: 400 });
    tillSnapshot = { till_name_snapshot: String(settings?.till_name ?? ""), till_number_snapshot: String(settings?.till_number ?? ""), till_instructions_snapshot: String(settings?.till_instructions ?? "") };
  }
  const update = {
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.dueDate !== undefined ? { due_date: input.dueDate } : {}),
    ...(input.paymentMethod !== undefined ? { payment_method: input.paymentMethod } : {}),
    ...(input.billingType !== undefined ? { billing_type: input.billingType } : {}),
    ...(input.billingType !== undefined || input.recurrenceInterval !== undefined ? { recurrence_interval: nextBillingType === "recurring" ? nextInterval : null } : {}),
    ...(input.billingType !== undefined ? { recurring_series_id: nextSeriesId, recurrence_anchor_date: nextAnchorDate } : {}),
    ...(input.receiptReceivedFromName !== undefined ? { receipt_received_from_name: input.receiptReceivedFromName } : {}),
    ...(input.receiptReceivedFromEmail !== undefined ? { receipt_received_from_email: input.receiptReceivedFromEmail } : {}),
    ...(input.receiptNote !== undefined ? { receipt_note: input.receiptNote, receipt_updated_at: new Date().toISOString() } : {}),
    ...tillSnapshot,
  };
  const { error } = await admin.from("advent_pay_invoices").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  const admin = getSupabaseAdminClient();
  const { data: invoice } = await admin.from("advent_pay_invoices").select("id,status,customer_id,invoice_number").eq("id", id).maybeSingle();
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status === "paid") return NextResponse.json({ error: "Paid invoices are retained for audit purposes and cannot be deleted." }, { status: 400 });
  if (invoice.status === "void") return NextResponse.json({ ok: true, alreadyVoid: true });
  const { error } = await admin.from("advent_pay_invoices").update({ status: "void" }).eq("id", id).neq("status", "paid");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await admin.from("notifications").insert({ user_id: invoice.customer_id, title: "AdventPay invoice cancelled", message: `Invoice ${invoice.invoice_number} has been cancelled and no payment is due.`, link: "/adventpay/dashboard" }); } catch {}
  return NextResponse.json({ ok: true });
}
