import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack/api";
import { sendSmsBulk } from "@/lib/sms/wasms";
import { sendEmail } from "@/lib/email/resend";
import { wealthOrderAdminEmail } from "@/lib/email/templates";
import { proxyWealthDownloadUrl } from "@/lib/wealth/downloadUrl";
import { WealthAccessMode, WealthOrderKind } from "@/types/wealthOrder";

export interface WealthFulfillResult {
  ok: boolean;
  alreadyFulfilled: boolean;
  status: "success" | "failed" | "pending";
  kind?: WealthOrderKind;
  productTitle?: string;
  amount?: number;
  downloadUrl?: string;
  libraryUrl?: string;
  accessMode?: WealthAccessMode;
  message?: string;
}

function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

/**
 * Verifies a wealth-order Paystack transaction and, on success, marks the order
 * paid exactly once and notifies the admins. Idempotent on
 * `wealth_orders.payment_status` so the redirect verify route is safe to retry.
 */
export async function fulfillWealthOrder(reference: string): Promise<WealthFulfillResult> {
  const supabase = getSupabaseAdminClient();

  const { data: order } = await supabase
    .from("wealth_orders")
    .select("*")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (!order) {
    return { ok: false, alreadyFulfilled: false, status: "pending", message: "Order not found." };
  }

  const kind: WealthOrderKind = order.kind === "download" ? "download" : "customization";
  const accessMode: WealthAccessMode = order.access_mode === "read_online" ? "read_online" : "download";

  if (order.payment_status === "success") {
    return {
      ok: true,
      alreadyFulfilled: true,
      status: "success",
      kind,
      productTitle: String(order.product_title ?? ""),
      amount: Number(order.amount),
      accessMode,
      downloadUrl: kind === "download" && accessMode === "download" ? await wealthDownloadUrl(order) : undefined,
      libraryUrl:
        kind === "download" && accessMode === "read_online"
          ? `/dashboard/wealth/${String(order.id)}/read`
          : undefined,
    };
  }

  const verification = await verifyTransaction(reference);
  const expectedKobo = Math.round(Number(order.amount) * 100);

  if (verification.status !== "success" || verification.amount < expectedKobo) {
    await supabase.from("wealth_orders").update({ payment_status: "failed" }).eq("id", order.id);
    return {
      ok: false,
      alreadyFulfilled: false,
      status: "failed",
      kind,
      message: "Payment was not successful or amount mismatch.",
    };
  }

  await supabase
    .from("wealth_orders")
    .update({
      payment_status: "success",
      // Downloads are self-serve and complete the moment payment clears.
      order_status: kind === "download" ? "delivered" : "pending",
      paid_at: verification.paidAt ?? new Date().toISOString(),
      metadata: { ...(order.metadata as object), paystack: verification.raw },
    })
    .eq("id", order.id);

  // Bump the resource's orders counter (best-effort).
  if (order.product_id) {
    const { data: product } = await supabase
      .from("wealth_products")
      .select("orders_count")
      .eq("id", order.product_id)
      .maybeSingle();
    if (product) {
      await supabase
        .from("wealth_products")
        .update({ orders_count: Number(product.orders_count ?? 0) + 1 })
        .eq("id", order.product_id);
    }
  }

  // Notify admins of every paid wealth order so the bell captures all activity.
  await notifyAdmins(order);

  return {
    ok: true,
    alreadyFulfilled: false,
    status: "success",
    kind,
    productTitle: String(order.product_title ?? ""),
    amount: Number(order.amount),
    accessMode,
    downloadUrl: kind === "download" && accessMode === "download" ? await wealthDownloadUrl(order) : undefined,
    libraryUrl:
      kind === "download" && accessMode === "read_online"
        ? `/dashboard/wealth/${String(order.id)}/read`
        : undefined,
  };
}

/**
 * Same-origin, force-download URL for a purchased wealth resource. Streamed
 * through our own API so restricted PDFs don't 401 and the visitor is never
 * redirected to Cloudinary. Returns undefined when there is no deliverable.
 */
async function wealthDownloadUrl(order: Record<string, unknown>): Promise<string | undefined> {
  const productId = order.product_id ? String(order.product_id) : "";
  if (!productId) return undefined;
  const supabase = getSupabaseAdminClient();
  const { data: product } = await supabase
    .from("wealth_products")
    .select("file_url, image_url")
    .eq("id", productId)
    .maybeSingle();
  const deliverable = String(product?.file_url ?? "") || String(product?.image_url ?? "");
  if (!deliverable) return undefined;
  return proxyWealthDownloadUrl(productId, String(order.paystack_reference ?? ""));
}

/** Notify admins of a new wealth order (paid or free). Best-effort. */
export async function notifyAdminsOfWealthOrder(order: Record<string, unknown>) {
  return notifyAdmins(order);
}

async function notifyAdmins(order: Record<string, unknown>) {
  const supabase = getSupabaseAdminClient();
  const kind: WealthOrderKind = order.kind === "download" ? "download" : "customization";
  const customer = String(order.full_name ?? "A customer");
  const firstName = customer.split(" ")[0] || customer;
  const productTitle = String(order.product_title ?? "a wealth resource");
  const amount = Number(order.amount ?? 0);
  const link = "/dashboard/admin/wealth/orders";

  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, phone, email")
      .eq("role", "admin");

    // In-app bell notification for every wealth order — downloads and
    // personalized requests alike — so admins see all activity.
    const title = kind === "download" ? "Wealth Resource Purchased" : "New Wealth Order";
    const verb = kind === "download" ? "purchased" : "ordered";
    await Promise.all(
      (admins ?? []).map((adminRow) =>
        supabase.from("notifications").insert({
          user_id: adminRow.id,
          title,
          message: `${firstName} ${verb} ${productTitle} (${formatKes(amount)}).`,
          link,
        }),
      ),
    );

    // Downloads are self-serve — skip the "do the work" SMS/email blast.
    if (kind !== "customization") return;

    const smsMsg = `AdventSkool: ${firstName} has ordered ${productTitle}. Log in and review the request.`;

    const phones = (admins ?? [])
      .map((a) => String((a as Record<string, unknown>).phone ?? ""))
      .filter(Boolean);
    await sendSmsBulk(phones, smsMsg);

    const adminEmail = wealthOrderAdminEmail({
      customerName: customer,
      productTitle,
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
