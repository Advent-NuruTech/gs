import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const requested = Number(request.nextUrl.searchParams.get("page") ?? 1);
  if (!Number.isSafeInteger(requested) || requested < 1 || requested > 100000) return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  const pageSize = 25;
  const db = getSupabaseAdminClient();
  const { data, error, count } = await db.from("creator_earnings").select("id,creator_id,payment_reference,created_at,gross_amount,commission_percent,platform_commission,creator_amount,provider_fee,payout_status,settlement_mode", { count: "exact" }).order("created_at", { ascending: false }).order("id", { ascending: false }).range((requested - 1) * pageSize, requested * pageSize - 1);
  if (error) return NextResponse.json({ error: "Could not load transactions." }, { status: 500 });
  const ids = [...new Set((data ?? []).map((row) => row.creator_id))];
  const creators = ids.length ? await db.from("profiles").select("id,full_name,email").in("id", ids) : { data: [], error: null };
  if (creators.error) return NextResponse.json({ error: "Could not load transaction creators." }, { status: 500 });
  const names = new Map((creators.data ?? []).map((row) => [row.id, row]));
  return NextResponse.json({ transactions: (data ?? []).map((row) => ({ ...row, creator: names.get(row.creator_id) ?? null })), total: count ?? 0, page: requested, pageSize });
}
