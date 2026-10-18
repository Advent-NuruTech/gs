import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  WealthAccessMode,
  WealthOrder,
  WealthOrderDraft,
  WealthOrderKind,
  WealthOrderStatus,
} from "@/types/wealthOrder";
import { PaymentStatus } from "@/types/payment";

const supabase = getSupabaseBrowserClient();

function mapOrder(data: Record<string, unknown>): WealthOrder {
  return {
    id: String(data.id ?? ""),
    productId: data.product_id ? String(data.product_id) : undefined,
    productTitle: String(data.product_title ?? ""),
    kind: (data.kind as WealthOrderKind) ?? "customization",
    accessMode: (data.access_mode as WealthAccessMode) ?? "download",
    userId: data.user_id ? String(data.user_id) : undefined,
    fullName: String(data.full_name ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    whatsapp: String(data.whatsapp ?? ""),
    titleText: String(data.title_text ?? ""),
    subtitle: String(data.subtitle ?? ""),
    instructions: String(data.instructions ?? ""),
    preferredColors: String(data.preferred_colors ?? ""),
    preferredStyle: String(data.preferred_style ?? ""),
    uploadedImages: (data.uploaded_images as string[]) ?? [],
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "KES"),
    paystackReference: String(data.paystack_reference ?? ""),
    paymentStatus: (data.payment_status as PaymentStatus) ?? "pending",
    orderStatus: (data.order_status as WealthOrderStatus) ?? "pending",
    paidAt: data.paid_at ? String(data.paid_at) : undefined,
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

export interface StartWealthOrderResult {
  /** Present for paid orders — redirect the customer here to pay. */
  authorizationUrl?: string;
  /** True when the resource was free: the order is already settled, no payment. */
  free: boolean;
  /** For free downloads, the file to hand the customer straight away. */
  downloadUrl?: string;
  /** For account-based reading, the purchased resource's reader page. */
  libraryUrl?: string;
  reference: string;
  amount: number;
}

export async function startWealthOrder(draft: WealthOrderDraft): Promise<StartWealthOrderResult> {
  const response = await fetch("/api/wealth/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const payload = (await response.json()) as {
    authorizationUrl?: string;
    free?: boolean;
    downloadUrl?: string;
    libraryUrl?: string;
    reference?: string;
    amount?: number;
    error?: string;
  };
  // A successful response is either a Paystack URL (paid) or a free settlement.
  if (!response.ok || (!payload.authorizationUrl && !payload.free)) {
    throw new Error(payload.error ?? "Could not start your order.");
  }
  return {
    authorizationUrl: payload.authorizationUrl,
    free: Boolean(payload.free),
    downloadUrl: payload.downloadUrl,
    libraryUrl: payload.libraryUrl,
    reference: payload.reference ?? "",
    amount: payload.amount ?? 0,
  };
}

/** Verifies a wealth order payment after the Paystack redirect. */
export async function verifyWealthOrder(reference: string): Promise<{
  ok: boolean;
  status: string;
  kind?: WealthOrderKind;
  productTitle?: string;
  amount?: number;
  downloadUrl?: string;
  libraryUrl?: string;
  accessMode?: WealthAccessMode;
}> {
  const response = await fetch(`/api/wealth/verify?reference=${encodeURIComponent(reference)}`);
  return response.json();
}

/** Admin: list all wealth orders. RLS restricts reads to admins. */
export async function listWealthOrders(): Promise<WealthOrder[]> {
  const { data, error } = await supabase
    .from("wealth_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOrder);
}

/**
 * Admin: change an order's fulfillment status. Routed through the API so the
 * customer can be notified (email/SMS) when the order is completed.
 */
export async function updateWealthOrderStatus(
  orderId: string,
  status: WealthOrderStatus,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in to continue.");

  const response = await fetch(`/api/wealth/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Could not update order status.");
  }
}
