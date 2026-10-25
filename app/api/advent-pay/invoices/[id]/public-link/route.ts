import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { createPublicPaymentToken, publicPaymentPath } from "@/lib/advent-pay/publicLink";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Creates a new bearer link rather than exposing a stored secret. Creating a
 * replacement invalidates the old link immediately.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  const admin = getSupabaseAdminClient();
  const { data: invoice } = await admin
    .from("advent_pay_invoices")
    .select("id,status,payment_method")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status === "paid" || invoice.status === "void") return NextResponse.json({ error: "Only an open invoice can receive a public payment link." }, { status: 400 });
  if (invoice.payment_method !== "paystack") return NextResponse.json({ error: "Public payment links require the invoice to use Paystack." }, { status: 400 });

  const { token, hash } = createPublicPaymentToken();
  const { error } = await admin.from("advent_pay_invoices").update({
    public_payment_link_enabled: true,
    public_payment_token_hash: hash,
    public_payment_link_created_at: new Date().toISOString(),
  }).eq("id", id).neq("status", "paid").neq("status", "void");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");
  return NextResponse.json({ url: `${siteUrl}${publicPaymentPath(token)}` });
}
