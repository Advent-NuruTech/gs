import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { data, error } = await getSupabaseAdminClient().from("advent_pay_invoices").select("status,amount,due_date");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const today = new Date().toISOString().slice(0, 10);
  const summary = (data ?? []).reduce((total, row) => {
    const amount = Number(row.amount ?? 0);
    if (row.status === "paid") { total.paidTotal += amount; total.paidCount += 1; }
    if (row.status === "pending" || row.status === "overdue") { total.outstandingTotal += amount; total.pendingCount += 1; }
    if (row.status !== "paid" && row.status !== "void" && String(row.due_date) < today) total.overdueCount += 1;
    return total;
  }, { paidTotal: 0, outstandingTotal: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 });
  return NextResponse.json(summary);
}
