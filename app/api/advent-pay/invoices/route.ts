import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const createSchema = z.object({
  customerId: z.string().uuid(),
  description: z.string().trim().min(3).max(2000),
  amount: z.coerce.number().positive().max(10_000_000),
  dueDate: z.string().date(),
  paymentMethod: z.enum(["paystack", "till"]),
  billingType: z.enum(["one_time", "recurring"]),
  recurrenceInterval: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(),
}).refine((data) => data.billingType === "one_time" || Boolean(data.recurrenceInterval), {
  message: "Choose how often the recurring invoice is billed.", path: ["recurrenceInterval"],
});

function mapInvoice(row: Record<string, unknown>) {
  return {
    id: String(row.id), invoiceNumber: String(row.invoice_number), customerId: String(row.customer_id),
    customerName: String(row.customer_name ?? ""), customerEmail: String(row.customer_email ?? ""),
    description: String(row.description), amount: Number(row.amount), currency: "KES", dueDate: String(row.due_date),
    status: String(row.status), paymentMethod: String(row.payment_method), tillName: String(row.till_name_snapshot ?? ""),
    tillNumber: String(row.till_number_snapshot ?? ""), tillInstructions: String(row.till_instructions_snapshot ?? ""),
    paystackReference: row.paystack_reference ? String(row.paystack_reference) : undefined,
    manualPaymentReference: row.manual_payment_reference ? String(row.manual_payment_reference) : undefined,
    paidAt: row.paid_at ? String(row.paid_at) : undefined, receiptNumber: row.receipt_number ? String(row.receipt_number) : undefined,
    billingType: String(row.billing_type ?? "one_time"), recurrenceInterval: row.recurrence_interval ? String(row.recurrence_interval) : undefined,
    receiptReceivedFromName: String(row.receipt_received_from_name ?? row.customer_name ?? ""),
    receiptReceivedFromEmail: String(row.receipt_received_from_email ?? row.customer_email ?? ""),
    receiptNote: row.receipt_note ? String(row.receipt_note) : undefined,
    createdAt: String(row.created_at),
  };
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to view AdventPay." }, { status: 401 });
  const { searchParams } = request.nextUrl;
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const requestedPageSize = Number.parseInt(searchParams.get("pageSize") ?? "25", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const pageSize = Number.isFinite(requestedPageSize) ? Math.min(100, Math.max(10, requestedPageSize)) : 25;
  const status = searchParams.get("status") ?? "all";
  const billingType = searchParams.get("billingType") ?? "all";
  if (!["all", "paid", "pending", "overdue", "void"].includes(status) || !["all", "one_time", "recurring"].includes(billingType)) {
    return NextResponse.json({ error: "Invalid invoice filter." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  let query = admin.from("advent_pay_invoices").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (user.role !== "admin") query = query.eq("customer_id", user.id);
  if (status === "paid" || status === "void") query = query.eq("status", status);
  if (status === "pending") query = query.eq("status", "pending").gte("due_date", today);
  if (status === "overdue") query = query.neq("status", "paid").neq("status", "void").lt("due_date", today);
  if (billingType !== "all") query = query.eq("billing_type", billingType);
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const total = count ?? 0;
  return NextResponse.json({
    invoices: (data ?? []).map((row) => mapInvoice(row as Record<string, unknown>)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a customer, description, valid amount, due date, payment method, and billing type." }, { status: 400 });
  if (new Date(`${parsed.data.dueDate}T23:59:59`).getTime() < Date.now() - 86_400_000) return NextResponse.json({ error: "The due date cannot be in the past." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const [{ data: customer }, { data: settings, error: settingsError }] = await Promise.all([
    admin.from("profiles").select("id,full_name,email").eq("id", parsed.data.customerId).maybeSingle(),
    admin.from("advent_pay_settings").select("till_name,till_number,till_instructions").eq("id", true).maybeSingle(),
  ]);
  if (!customer) return NextResponse.json({ error: "That customer account does not exist." }, { status: 404 });
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });
  if (parsed.data.paymentMethod === "till" && !String(settings?.till_number ?? "").trim()) {
    return NextResponse.json({ error: "Set the AdventPay Till number before creating a Till invoice." }, { status: 400 });
  }
  const { data: invoice, error } = await admin.from("advent_pay_invoices").insert({
    customer_id: customer.id, customer_name: String(customer.full_name ?? ""), customer_email: String(customer.email ?? ""),
    description: parsed.data.description, amount: parsed.data.amount, due_date: parsed.data.dueDate,
    payment_method: parsed.data.paymentMethod, billing_type: parsed.data.billingType,
    recurrence_interval: parsed.data.billingType === "recurring" ? parsed.data.recurrenceInterval : null,
    receipt_received_from_name: String(customer.full_name ?? ""), receipt_received_from_email: String(customer.email ?? ""),
    created_by: user.id,
    ...(parsed.data.paymentMethod === "till" ? {
      till_name_snapshot: String(settings?.till_name ?? ""), till_number_snapshot: String(settings?.till_number ?? ""),
      till_instructions_snapshot: String(settings?.till_instructions ?? ""),
    } : {}),
  }).select("*").single();
  if (error || !invoice) return NextResponse.json({ error: error?.message ?? "Could not create the invoice." }, { status: 500 });
  try {
    await admin.from("notifications").insert({
      user_id: customer.id, title: "New AdventPay invoice",
      message: `Invoice ${invoice.invoice_number} for KES ${Number(invoice.amount).toLocaleString("en-KE")} is ready.`,
      link: "/adventpay/dashboard",
    });
  } catch { /* invoice creation remains successful if notification is unavailable */ }
  return NextResponse.json({ invoice: mapInvoice(invoice as Record<string, unknown>) }, { status: 201 });
}
