import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/wasms";
import { sendEmail } from "@/lib/email/resend";
import { designOrderCompletedEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

const VALID = new Set(["pending", "in_progress", "completed", "delivered"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const status = String(body.status ?? "");
  if (!VALID.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("design_orders")
    .update({ order_status: status })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // Notify the customer when the work is complete.
  if (status === "completed") {
    const customer = String(order.full_name ?? "there");
    const firstName = customer.split(" ")[0] || "there";
    const designTitle = String(order.design_title ?? "your design");

    const smsMsg = `AdventSkool: Good morning ${firstName}, your order for ${designTitle} is completed. Check your email or WhatsApp for the product.`;
    if (order.phone) await sendSms(String(order.phone), smsMsg);

    const email = String(order.email ?? "");
    if (email.includes("@")) {
      const rendered = designOrderCompletedEmail({ customerName: customer, designTitle });
      await sendEmail({ to: email, subject: rendered.subject, html: rendered.html });
    }
  }

  return NextResponse.json({ ok: true, status });
}
