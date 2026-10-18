import "server-only";

import { WealthProduct } from "@/types/wealth";

/** Read-only Supabase client using the anon key (RLS allows published rows). */
async function anonClient() {
  const { createServerClient } = await import("@supabase/ssr");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

function mapProduct(data: Record<string, unknown>): WealthProduct {
  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    category: String(data.category ?? "General"),
    imageUrl: String(data.image_url ?? ""),
    imageWidth: data.image_width != null ? Number(data.image_width) : undefined,
    imageHeight: data.image_height != null ? Number(data.image_height) : undefined,
    fileUrl: data.file_url ? String(data.file_url) : undefined,
    fileType: String(data.file_type ?? "image") === "pdf" ? "pdf" : "image",
    pageCount: data.page_count != null ? Number(data.page_count) : undefined,
    downloadPrice: Number(data.download_price ?? 0),
    customizationEnabled: data.customization_enabled == null ? true : Boolean(data.customization_enabled),
    customizationPrice: Number(data.customization_price ?? 0),
    published: Boolean(data.published),
    views: Number(data.views ?? 0),
    ordersCount: Number(data.orders_count ?? 0),
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

export async function getPublishedWealthProduct(productId: string): Promise<WealthProduct | null> {
  const supabase = await anonClient();
  const { data } = await supabase
    .from("wealth_products")
    .select("*")
    .eq("id", productId)
    .eq("published", true)
    .maybeSingle();
  return data ? mapProduct(data) : null;
}

/**
 * Wealth resources to suggest alongside the one being viewed. Prefers the same
 * category; if there aren't enough, fills the rest with the newest other
 * published resources.
 */
export async function listRelatedWealthProducts(
  productId: string,
  category: string,
  limit = 6,
): Promise<WealthProduct[]> {
  const supabase = await anonClient();

  const { data: sameCategory } = await supabase
    .from("wealth_products")
    .select("*")
    .eq("published", true)
    .eq("category", category)
    .neq("id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const related = (sameCategory ?? []).map(mapProduct);
  if (related.length >= limit) return related.slice(0, limit);

  // Top up with other recent resources, skipping ones we already have.
  const exclude = new Set([productId, ...related.map((p) => p.id)]);
  const { data: others } = await supabase
    .from("wealth_products")
    .select("*")
    .eq("published", true)
    .neq("id", productId)
    .order("created_at", { ascending: false })
    .limit(limit + related.length);

  for (const row of others ?? []) {
    const product = mapProduct(row);
    if (exclude.has(product.id)) continue;
    related.push(product);
    if (related.length >= limit) break;
  }

  return related.slice(0, limit);
}

/**
 * Dashboard suggestions are intentionally stricter than public related items:
 * only published resources in categories the customer already owns are shown.
 */
export async function listRecommendedWealthProducts(
  categories: string[],
  excludedProductIds: string[],
  limit = 6,
): Promise<WealthProduct[]> {
  const relevantCategories = [...new Set(categories.map((category) => category.trim()).filter(Boolean))];
  if (relevantCategories.length === 0) return [];

  const supabase = await anonClient();
  const { data } = await supabase
    .from("wealth_products")
    .select("*")
    .eq("published", true)
    .in("category", relevantCategories)
    .order("created_at", { ascending: false })
    .limit(Math.max(limit + excludedProductIds.length, limit));

  const excluded = new Set(excludedProductIds);
  return (data ?? [])
    .map(mapProduct)
    .filter((product) => !excluded.has(product.id))
    .slice(0, limit);
}

export async function listPublishedWealthProductsForSitemap(): Promise<Array<{ id: string; updatedAt?: string }>> {
  const supabase = await anonClient();
  const { data } = await supabase.from("wealth_products").select("id, updated_at").eq("published", true);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  }));
}
