import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary/deleteImage";
import { CreateDesignInput, Design, DesignFilters } from "@/types/design";

const supabase = getSupabaseBrowserClient();

function normalizeCategory(category?: string): string {
  const normalized = (category ?? "").trim().replace(/\s+/g, " ");
  return normalized || "General";
}

function mapDesign(data: Record<string, unknown>): Design {
  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    category: normalizeCategory(String(data.category ?? "")),
    imageUrl: String(data.image_url ?? ""),
    imageWidth: data.image_width != null ? Number(data.image_width) : undefined,
    imageHeight: data.image_height != null ? Number(data.image_height) : undefined,
    fileUrl: data.file_url ? String(data.file_url) : undefined,
    fileType: String(data.file_type ?? "image") === "pdf" ? "pdf" : "image",
    pageCount: data.page_count != null ? Number(data.page_count) : undefined,
    downloadPrice: Number(data.download_price ?? 0),
    customizationPrice: Number(data.customization_price ?? 0),
    published: Boolean(data.published),
    views: Number(data.views ?? 0),
    ordersCount: Number(data.orders_count ?? 0),
    createdBy: data.created_by ? String(data.created_by) : undefined,
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

export async function createDesign(input: CreateDesignInput): Promise<string> {
  const { data, error } = await supabase
    .from("designs")
    .insert({
      title: input.title,
      description: input.description,
      category: normalizeCategory(input.category),
      image_url: input.imageUrl,
      image_width: input.imageWidth ?? null,
      image_height: input.imageHeight ?? null,
      file_url: input.fileUrl ?? input.imageUrl,
      file_type: input.fileType ?? "image",
      page_count: input.pageCount ?? null,
      download_price: input.downloadPrice,
      customization_price: input.customizationPrice,
      published: input.published ?? true,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create design.");
  return String(data.id);
}

export async function getDesignById(designId: string): Promise<Design | null> {
  const { data, error } = await supabase
    .from("designs")
    .select("*")
    .eq("id", designId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapDesign(data) : null;
}

export async function listDesigns(filters: DesignFilters = {}): Promise<Design[]> {
  const pageSize = filters.pageSize ?? 200;
  let queryBuilder = supabase
    .from("designs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, pageSize - 1);

  if (typeof filters.published === "boolean") {
    queryBuilder = queryBuilder.eq("published", filters.published);
  }
  if (filters.category) {
    queryBuilder = queryBuilder.eq("category", normalizeCategory(filters.category));
  }

  const { data, error } = await queryBuilder;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDesign);
}

/**
 * Distinct categories already used by saved designs. Lets the admin upload form
 * surface manually-added categories on reload instead of only the hardcoded presets.
 */
export async function listDesignCategories(): Promise<string[]> {
  const { data, error } = await supabase.from("designs").select("category");
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const row of data ?? []) {
    const category = normalizeCategory(String((row as Record<string, unknown>).category ?? ""));
    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    categories.push(category);
  }
  return categories.sort((a, b) => a.localeCompare(b));
}

export async function updateDesign(
  designId: string,
  updates: Partial<CreateDesignInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (typeof updates.title === "string") payload.title = updates.title;
  if (typeof updates.description === "string") payload.description = updates.description;
  if (typeof updates.category === "string") payload.category = normalizeCategory(updates.category);
  if (typeof updates.imageUrl === "string") payload.image_url = updates.imageUrl;
  if (typeof updates.imageWidth === "number") payload.image_width = updates.imageWidth;
  if (typeof updates.imageHeight === "number") payload.image_height = updates.imageHeight;
  if (typeof updates.fileUrl === "string") payload.file_url = updates.fileUrl;
  if (typeof updates.fileType === "string") payload.file_type = updates.fileType;
  if (typeof updates.pageCount === "number") payload.page_count = updates.pageCount;
  if (typeof updates.downloadPrice === "number") payload.download_price = updates.downloadPrice;
  if (typeof updates.customizationPrice === "number") payload.customization_price = updates.customizationPrice;
  if (typeof updates.published === "boolean") payload.published = updates.published;

  const { error } = await supabase.from("designs").update(payload).eq("id", designId);
  if (error) throw new Error(error.message);
}

export async function deleteDesign(designId: string): Promise<void> {
  const design = await getDesignById(designId);
  if (design?.imageUrl) {
    await deleteCloudinaryImageByUrl(design.imageUrl).catch(() => {});
  }
  // PDFs store the original deliverable separately from the preview image.
  if (design?.fileUrl && design.fileUrl !== design.imageUrl) {
    await deleteCloudinaryImageByUrl(design.fileUrl).catch(() => {});
  }
  const { error } = await supabase.from("designs").delete().eq("id", designId);
  if (error) throw new Error(error.message);
}

/** Best-effort atomic view increment (does not block rendering). */
export async function recordDesignView(designId: string): Promise<void> {
  await supabase.rpc("increment_design_views", { p_design_id: designId });
}
