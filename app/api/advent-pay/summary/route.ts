import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to view AdventPay." }, { status: 401 });
  let query = getSupabaseAdminClient().from("advent_pay_invoices").select("status,amount,due_date");
  if (user.role !== "admin") query = query.eq("customer_id", user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const today = new Date().toISOString().slice(0, 10);
  const summary = (data ?? []).reduce((total, row) => {
    const amount = Number(row.amount ?? 0);
    if (row.status === "paid") { total.paidTotal += amount; total.paidCount += 1; }
    if (row.status === "pending" || row.status === "overdue") { total.outstandingTotal += amount; total.pendingCount += 1; }
    if (row.status !== "paid" && row.status !== "void" && String(row.due_date) < today) total.overdueCount += 1;
    if ((row.status === "pending" || row.status === "overdue") && String(row.due_date) >= today && (!total.nextDueDate || String(row.due_date) < total.nextDueDate)) total.nextDueDate = String(row.due_date);
    return total;
  }, { paidTotal: 0, outstandingTotal: 0, paidCount: 0, pendingCount: 0, overdueCount: 0, nextDueDate: "" });
  return NextResponse.json(summary);
}
