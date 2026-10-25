import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function esc(value: unknown) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to download a receipt." }, { status: 401 });
  const { id } = await params;
  const { data: invoice } = await getSupabaseAdminClient().from("advent_pay_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice || (invoice.customer_id !== user.id && user.role !== "admin")) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  if (invoice.status !== "paid" || !invoice.receipt_number) return NextResponse.json({ error: "A receipt is available only after payment is confirmed." }, { status: 400 });
  const paid = new Date(String(invoice.paid_at)).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
  const method = invoice.payment_method === "paystack" ? "Paystack" : "Till (confirmed by AdventSkool)";
  const reference = invoice.payment_method === "paystack" ? invoice.paystack_reference : invoice.manual_payment_reference;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(invoice.receipt_number)}</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:0;background:#f1f5f9}.receipt{max-width:720px;margin:32px auto;background:#fff;padding:42px;border:1px solid #e2e8f0;border-radius:16px}.top{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #0ea5e9;padding-bottom:22px}h1{margin:0;color:#0284c7}table{width:100%;border-collapse:collapse;margin-top:28px}td{padding:12px;border-bottom:1px solid #e2e8f0}td:first-child{color:#64748b;width:42%}.amount{font-size:26px;font-weight:800;color:#047857;margin:26px 0}.foot{margin-top:34px;color:#64748b;font-size:13px}@media print{body{background:#fff}.receipt{margin:0;border:0}}</style></head><body><main class="receipt"><div class="top"><div><h1>Advent Pay</h1><p>Professional payment receipt</p></div><div><strong>Receipt ${esc(invoice.receipt_number)}</strong><p>Invoice ${esc(invoice.invoice_number)}</p></div></div><div class="amount">KES ${Number(invoice.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</div><table><tr><td>Received from</td><td>${esc(invoice.customer_name)}<br>${esc(invoice.customer_email)}</td></tr><tr><td>For</td><td>${esc(invoice.description)}</td></tr><tr><td>Payment method</td><td>${esc(method)}</td></tr><tr><td>Payment date</td><td>${esc(paid)}</td></tr>${reference ? `<tr><td>Payment reference</td><td>${esc(reference)}</td></tr>` : ""}</table><p class="foot">Issued by AdventSkool · https://adventskool.co.ke<br>This receipt confirms that the invoice above has been paid in full.</p></main></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${String(invoice.receipt_number).replace(/[^A-Z0-9-]/gi, "")}.html"` } });
}
