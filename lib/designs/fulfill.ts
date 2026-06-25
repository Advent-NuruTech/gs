import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack/api";
import { sendSmsBulk } from "@/lib/sms/wasms";
import { sendEmail } from "@/lib/email/resend";
import { designOrderAdminEmail } from "@/lib/email/templates";
import { toDownloadUrl } from "@/lib/designs/downloadUrl";
import { DesignOrderKind } from "@/types/designOrder";

export interface DesignFulfillResult {
  ok: boolean;
  alreadyFulfilled: boolean;
  status: "success" | "failed" | "pending";
  kind?: DesignOrderKind;
  designTitle?: string;
  amount?: number;
  downloadUrl?: string;
  message?: string;
}

function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

/**
 * Verifies a design-order Paystack transaction and, on success, marks the
 * order paid exactly once and notifies the admins. Idempotent on
 * `design_orders.payment_status` so the redirect verify route is safe to retry.
 */
export async function fulfillDesignOrder(reference: string): Promise<DesignFulfillResult> {
  const supabase = getSupabaseAdminClient();

  const { data: order } = await supabase
    .from("design_orders")
    .select("*")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (!order) {
    return { ok: false, alreadyFulfilled: false, status: "pending", message: "Order not found." };
  }

  const kind: DesignOrderKind = order.kind === "download" ? "download" : "customization";

  if (order.payment_status === "success") {
    return {
      ok: true,
      alreadyFulfilled: true,
      status: "success",
      kind,
      designTitle: String(order.design_title ?? ""),
      amount: Number(order.amount),
      downloadUrl: kind === "download" ? await designDownloadUrl(order) : undefined,
    };
  }

  const verification = await verifyTransaction(reference);
  const expectedKobo = Math.round(Number(order.amount) * 100);

  if (verification.status !== "success" || verification.amount < expectedKobo) {
    await supabase.from("design_orders").update({ payment_status: "failed" }).eq("id", order.id);
    return {
      ok: false,
      alreadyFulfilled: false,
      status: "failed",
      kind,
      message: "Payment was not successful or amount mismatch.",
    };
  }

  await supabase
    .from("design_orders")
    .update({
      payment_status: "success",
      // Downloads are self-serve and complete the moment payment clears.
      order_status: kind === "download" ? "delivered" : "pending",
      paid_at: verification.paidAt ?? new Date().toISOString(),
      metadata: { ...(order.metadata as object), paystack: verification.raw },
    })
    .eq("id", order.id);

  // Bump the design's orders counter (best-effort).
  if (order.design_id) {
    const { data: design } = await supabase
      .from("designs")
      .select("orders_count")
      .eq("id", order.design_id)
      .maybeSingle();
    if (design) {
      await supabase
        .from("designs")
        .update({ orders_count: Number(design.orders_count ?? 0) + 1 })
        .eq("id", order.design_id);
    }
  }

  // Only customization orders need the team to do work; downloads are instant.
  if (kind === "customization") {
    await notifyAdmins(order);
  }

  return {
    ok: true,
    alreadyFulfilled: false,
    status: "success",
    kind,
    designTitle: String(order.design_title ?? ""),
    amount: Number(order.amount),
    downloadUrl: kind === "download" ? await designDownloadUrl(order) : undefined,
  };
}

/** Full-quality, force-download URL for the purchased design (download orders). */
async function designDownloadUrl(order: Record<string, unknown>): Promise<string | undefined> {
  const designId = order.design_id ? String(order.design_id) : "";
  if (!designId) return undefined;
  const supabase = getSupabaseAdminClient();
  const { data: design } = await supabase
    .from("designs")
    .select("*")
    .eq("id", designId)
    .maybeSingle();
  // Deliver the original asset (PDF template or full-quality image); fall back
  // to the preview image for legacy rows without a stored file_url.
  const deliverable = String(design?.file_url ?? "") || String(design?.image_url ?? "");
  if (!deliverable) return undefined;
  return toDownloadUrl(deliverable, String(design?.title ?? order.design_title ?? "design"));
}

/** Notify admins of a new design order (paid or free). Best-effort. */
export async function notifyAdminsOfDesignOrder(order: Record<string, unknown>) {
  return notifyAdmins(order);
}

async function notifyAdmins(order: Record<string, unknown>) {
  const supabase = getSupabaseAdminClient();
  const customer = String(order.full_name ?? "A customer");
  const firstName = customer.split(" ")[0] || customer;
  const designTitle = String(order.design_title ?? "a design");
  const amount = Number(order.amount ?? 0);

  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, phone, email")
      .eq("role", "admin");

    const smsMsg = `AdventSkool: ${firstName} has ordered ${designTitle}. Log in and do the work.`;
    const link = "/dashboard/admin/designs/orders";

    // In-app notifications.
    await Promise.all(
      (admins ?? []).map((adminRow) =>
        supabase.from("notifications").insert({
          user_id: adminRow.id,
          title: "New Design Order",
          message: `${firstName} ordered ${designTitle} (${formatKes(amount)}).`,
          link,
        }),
      ),
    );

    // SMS to all admins.
    const phones = (admins ?? [])
      .map((a) => String((a as Record<string, unknown>).phone ?? ""))
      .filter(Boolean);
    await sendSmsBulk(phones, smsMsg);

    // Email to all admins.
    const adminEmail = designOrderAdminEmail({
      customerName: customer,
      designTitle,
      amount: formatKes(amount),
      reference: String(order.paystack_reference ?? ""),
      email: String(order.email ?? ""),
      phone: String(order.phone ?? ""),
      whatsapp: String(order.whatsapp ?? ""),
    });
    await Promise.all(
      (admins ?? [])
        .map((a) => String((a as Record<string, unknown>).email ?? ""))
        .filter((email) => email.includes("@"))
        .map((email) => sendEmail({ to: email, subject: adminEmail.subject, html: adminEmail.html })),
    );
  } catch {
    /* notifications are best-effort */
  }
}
