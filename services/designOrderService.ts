import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DesignOrder, DesignOrderDraft, DesignOrderKind, DesignOrderStatus } from "@/types/designOrder";
import { PaymentStatus } from "@/types/payment";

const supabase = getSupabaseBrowserClient();

function mapOrder(data: Record<string, unknown>): DesignOrder {
  return {
    id: String(data.id ?? ""),
    designId: data.design_id ? String(data.design_id) : undefined,
    designTitle: String(data.design_title ?? ""),
    kind: (data.kind as DesignOrderKind) ?? "customization",
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
    orderStatus: (data.order_status as DesignOrderStatus) ?? "pending",
    paidAt: data.paid_at ? String(data.paid_at) : undefined,
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

/**
 * Starts a design customization checkout. The server recomputes the amount
 * from the design row, creates the pending order, and returns the Paystack
 * hosted checkout URL. No account required.
 */
export interface StartDesignOrderResult {
  /** Present for paid orders — redirect the customer here to pay. */
  authorizationUrl?: string;
  /** True when the design was free: the order is already settled, no payment. */
  free: boolean;
  /** For free downloads, the file to hand the customer straight away. */
  downloadUrl?: string;
  reference: string;
  amount: number;
}

export async function startDesignOrder(draft: DesignOrderDraft): Promise<StartDesignOrderResult> {
  const response = await fetch("/api/designs/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const payload = (await response.json()) as {
    authorizationUrl?: string;
    free?: boolean;
    downloadUrl?: string;
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
    reference: payload.reference ?? "",
    amount: payload.amount ?? 0,
  };
}

/** Verifies a design order payment after the Paystack redirect. */
export async function verifyDesignOrder(reference: string): Promise<{
  ok: boolean;
  status: string;
  kind?: DesignOrderKind;
  designTitle?: string;
  amount?: number;
  downloadUrl?: string;
}> {
  const response = await fetch(`/api/designs/verify?reference=${encodeURIComponent(reference)}`);
  return response.json();
}

/** Admin: list all design orders. RLS restricts reads to admins. */
export async function listDesignOrders(): Promise<DesignOrder[]> {
  const { data, error } = await supabase
    .from("design_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOrder);
}

/**
 * Admin: change an order's fulfillment status. Routed through the API so the
 * customer can be notified (email/SMS) when the order is completed.
 */
export async function updateDesignOrderStatus(
  orderId: string,
  status: DesignOrderStatus,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in to continue.");

  const response = await fetch(`/api/designs/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Could not update order status.");
  }
}
