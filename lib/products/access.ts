import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface OwnedDigitalProduct {
  orderId: string;
  designId: string;
  title: string;
  reference: string;
  amount: number;
  accessMode: "download" | "read_online";
  purchasedAt?: string;
  imageUrl: string;
  fileUrl: string;
  fileType: "image" | "pdf";
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

async function hydrateOrder(order: Record<string, unknown>): Promise<OwnedDigitalProduct | null> {
  const designId = String(order.design_id ?? "");
  if (!designId) return null;

  const admin = getSupabaseAdminClient();
  const { data: design } = await admin.from("designs").select("*").eq("id", designId).maybeSingle();
  if (!design) return null;

  return {
    orderId: String(order.id),
    designId,
    title: String(order.design_title || design.title || "Digital product"),
    reference: String(order.paystack_reference ?? ""),
    amount: Number(order.amount ?? 0),
    accessMode: order.access_mode === "read_online" ? "read_online" : "download",
    purchasedAt: order.paid_at ? String(order.paid_at) : order.created_at ? String(order.created_at) : undefined,
    imageUrl: String(design.image_url ?? ""),
    fileUrl: String(design.file_url ?? "") || String(design.image_url ?? ""),
    fileType: design.file_type === "pdf" ? "pdf" : "image",
    category: String(design.category ?? "Digital Product"),
  };
}

export async function getOwnedDigitalProduct(
  orderId: string,
  user: { id: string; email?: string | null },
): Promise<OwnedDigitalProduct | null> {
  const admin = getSupabaseAdminClient();
  const { data: order } = await admin.from("design_orders").select("*").eq("id", orderId).maybeSingle();
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

export async function listOwnedDigitalProducts(user: {
  id: string;
  email?: string | null;
}): Promise<OwnedDigitalProduct[]> {
  const admin = getSupabaseAdminClient();
  const [linked, matchingEmail] = await Promise.all([
    admin
      .from("design_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", "download")
      .eq("payment_status", "success")
      .order("paid_at", { ascending: false }),
    user.email
      ? admin
          .from("design_orders")
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

  const products = await Promise.all([...unique.values()].map(hydrateOrder));
  return products
    .filter((product): product is OwnedDigitalProduct => Boolean(product))
    .sort((a, b) => String(b.purchasedAt ?? "").localeCompare(String(a.purchasedAt ?? "")));
}
