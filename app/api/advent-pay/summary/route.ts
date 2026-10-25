import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getRecurringSchedule, syncAdventPayRecurringInvoices } from "@/lib/advent-pay/recurring";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to view AdventPay." }, { status: 401 });
  try {
    await syncAdventPayRecurringInvoices();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update recurring invoices." }, { status: 500 });
  }
  let query = getSupabaseAdminClient().from("advent_pay_invoices").select("customer_id,status,amount,due_date,billing_type,recurrence_interval,recurring_series_id,id");
  if (user.role !== "admin") query = query.eq("customer_id", user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const today = new Date().toISOString().slice(0, 10);
  const rows = data ?? [];
  const summary = rows.reduce((total, row) => {
    const amount = Number(row.amount ?? 0);
    if (row.status === "paid") { total.paidTotal += amount; total.paidCount += 1; }
    if (row.status === "pending" || row.status === "overdue") { total.outstandingTotal += amount; total.pendingCount += 1; }
    if (row.status !== "paid" && row.status !== "void" && String(row.due_date) < today) total.overdueCount += 1;
    if ((row.status === "pending" || row.status === "overdue") && (!total.nextDueDate || String(row.due_date) < total.nextDueDate)) total.nextDueDate = String(row.due_date);
    return total;
  }, { paidTotal: 0, outstandingTotal: 0, paidCount: 0, pendingCount: 0, overdueCount: 0, nextDueDate: "" });
  const { nextDueDate: nextScheduledDueDate } = getRecurringSchedule(rows as Record<string, unknown>[], user.role === "admin" ? undefined : user.id);
  return NextResponse.json({ ...summary, nextScheduledDueDate: nextScheduledDueDate || undefined });
}
