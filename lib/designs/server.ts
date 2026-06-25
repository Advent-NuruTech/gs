import "server-only";

import { Design } from "@/types/design";

/** Read-only Supabase client using the anon key (RLS allows published rows). */
async function anonClient() {
  const { createServerClient } = await import("@supabase/ssr");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

function mapDesign(data: Record<string, unknown>): Design {
  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    category: String(data.category ?? "General"),
    imageUrl: String(data.image_url ?? ""),
    imageWidth: data.image_width != null ? Number(data.image_width) : undefined,
    imageHeight: data.image_height != null ? Number(data.image_height) : undefined,
    downloadPrice: Number(data.download_price ?? 0),
    customizationPrice: Number(data.customization_price ?? 0),
    published: Boolean(data.published),
    views: Number(data.views ?? 0),
    ordersCount: Number(data.orders_count ?? 0),
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

export async function getPublishedDesign(designId: string): Promise<Design | null> {
  const supabase = await anonClient();
  const { data } = await supabase
    .from("designs")
    .select("*")
    .eq("id", designId)
    .eq("published", true)
    .maybeSingle();
  return data ? mapDesign(data) : null;
}

/**
 * Designs to suggest alongside the one being viewed. Prefers the same category;
 * if there aren't enough, fills the rest with the newest other published designs.
 */
export async function listRelatedDesigns(
  designId: string,
  category: string,
  limit = 6,
): Promise<Design[]> {
  const supabase = await anonClient();

  const { data: sameCategory } = await supabase
    .from("designs")
    .select("*")
    .eq("published", true)
    .eq("category", category)
    .neq("id", designId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const related = (sameCategory ?? []).map(mapDesign);
  if (related.length >= limit) return related.slice(0, limit);

  // Top up with other recent designs, skipping ones we already have.
  const exclude = new Set([designId, ...related.map((d) => d.id)]);
  const { data: others } = await supabase
    .from("designs")
    .select("*")
    .eq("published", true)
    .neq("id", designId)
    .order("created_at", { ascending: false })
    .limit(limit + related.length);

  for (const row of others ?? []) {
    const design = mapDesign(row);
    if (exclude.has(design.id)) continue;
    related.push(design);
    if (related.length >= limit) break;
  }

  return related.slice(0, limit);
}

export async function listPublishedDesignsForSitemap(): Promise<Array<{ id: string; updatedAt?: string }>> {
  const supabase = await anonClient();
  const { data } = await supabase.from("designs").select("id, updated_at").eq("published", true);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  }));
}
