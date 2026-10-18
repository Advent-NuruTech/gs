import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface OwnedWealthResource {
  orderId: string;
  productId: string;
  title: string;
  reference: string;
  amount: number;
  accessMode: "download" | "read_online";
  purchasedAt?: string;
  imageUrl: string;
  fileUrl: string;
  fileType: "image" | "pdf";
  pageCount?: number;
  category: string;
}

function customerOwnsOrder(
  order: Record<string, unknown>,
  user: { id: string; email?: string | null },
) {
  if (String(order.user_id ?? "") === user.id) return true;
  return Boolean(
    user.email &&
      String(order.email ?? "").trim().toLowerCase() === user.email.trim().toLowerCase(),
  );
}

async function hydrateOrder(order: Record<string, unknown>): Promise<OwnedWealthResource | null> {
  const productId = String(order.product_id ?? "");
  if (!productId) return null;

  const admin = getSupabaseAdminClient();
  const { data: product } = await admin.from("wealth_products").select("*").eq("id", productId).maybeSingle();
  if (!product) return null;

  return {
    orderId: String(order.id),
    productId,
    title: String(order.product_title || product.title || "Wealth resource"),
    reference: String(order.paystack_reference ?? ""),
    amount: Number(order.amount ?? 0),
    accessMode: order.access_mode === "read_online" ? "read_online" : "download",
    purchasedAt: order.paid_at ? String(order.paid_at) : order.created_at ? String(order.created_at) : undefined,
    imageUrl: String(product.image_url ?? ""),
    fileUrl: String(product.file_url ?? "") || String(product.image_url ?? ""),
    fileType: product.file_type === "pdf" ? "pdf" : "image",
    pageCount: product.page_count != null ? Number(product.page_count) : undefined,
    category: String(product.category ?? "Wealth Resource"),
  };
}

export async function getOwnedWealthResource(
  orderId: string,
  user: { id: string; email?: string | null },
): Promise<OwnedWealthResource | null> {
  const admin = getSupabaseAdminClient();
  const { data: order } = await admin.from("wealth_orders").select("*").eq("id", orderId).maybeSingle();
  if (
    !order ||
    order.kind !== "download" ||
    order.payment_status !== "success" ||
    !customerOwnsOrder(order, user)
  ) {
    return null;
  }
  return hydrateOrder(order);
}

export async function listOwnedWealthResources(user: {
  id: string;
  email?: string | null;
}): Promise<OwnedWealthResource[]> {
  const admin = getSupabaseAdminClient();
  const [linked, matchingEmail] = await Promise.all([
    admin
      .from("wealth_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", "download")
      .eq("payment_status", "success")
      .order("paid_at", { ascending: false }),
    user.email
      ? admin
          .from("wealth_orders")
          .select("*")
          .ilike("email", user.email)
          .eq("kind", "download")
          .eq("payment_status", "success")
          .order("paid_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const unique = new Map<string, Record<string, unknown>>();
  for (const row of [...(linked.data ?? []), ...(matchingEmail.data ?? [])]) {
    const order = row as Record<string, unknown>;
    if (customerOwnsOrder(order, user)) unique.set(String(row.id), order);
  }

  const resources = await Promise.all([...unique.values()].map(hydrateOrder));
  return resources
    .filter((resource): resource is OwnedWealthResource => Boolean(resource))
    .sort((a, b) => String(b.purchasedAt ?? "").localeCompare(String(a.purchasedAt ?? "")));
}
