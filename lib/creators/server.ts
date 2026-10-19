import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CreatorSocialLinks,
  CreatorStorefrontProfile,
  StorefrontProduct,
} from "@/types/creator";
import { sanitizeSocialLinks } from "@/lib/creators/validation";

function mapCourse(row: Record<string, unknown>): StorefrontProduct {
  return {
    id: String(row.id),
    kind: "course",
    creatorId: String(row.instructor_id ?? ""),
    title: String(row.title ?? ""),
    category: String(row.category ?? "General"),
    imageUrl: String(row.thumbnail_url ?? ""),
    price: Number(row.final_price ?? 0),
    originalPrice: Number(row.original_price ?? 0),
    views: 0,
    ordersCount: 0,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function mapDownloadable(row: Record<string, unknown>, kind: "design" | "wealth"): StorefrontProduct {
  return {
    id: String(row.id),
    kind,
    creatorId: String(row.created_by ?? ""),
    title: String(row.title ?? ""),
    category: String(row.category ?? "General"),
    imageUrl: String(row.image_url ?? ""),
    price: Number(row.download_price ?? 0),
    views: Number(row.views ?? 0),
    ordersCount: Number(row.orders_count ?? 0),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function byNewest(a: StorefrontProduct, b: StorefrontProduct) {
  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
}

function byPopularity(a: StorefrontProduct, b: StorefrontProduct) {
  return (b.ordersCount * 25 + b.views) - (a.ordersCount * 25 + a.views) || byNewest(a, b);
}

export async function getCreatorStorefront(handle: string): Promise<CreatorStorefrontProfile | null> {
  const db = getSupabaseAdminClient();
  let { data, error } = await db
    .from("profiles")
    .select("id,full_name,handle,photo_url,bio,social_links,role,creator_status,suspended_until")
    .eq("handle", handle)
    .eq("role", "teacher")
    .maybeSingle();
  if (!data && !error) {
    const { data: alias } = await db.from("creator_handle_aliases").select("creator_id").eq("handle", handle).maybeSingle();
    if (alias?.creator_id) {
      const resolved = await db
        .from("profiles")
        .select("id,full_name,handle,photo_url,bio,social_links,role,creator_status,suspended_until")
        .eq("id", alias.creator_id)
        .eq("role", "teacher")
        .maybeSingle();
      data = resolved.data;
      error = resolved.error;
    }
  }
  if (error) throw new Error(error.message);
  if (!data || !String(data.full_name ?? "").trim()) return null;
  if (data.suspended_until && new Date(String(data.suspended_until)).getTime() > Date.now()) return null;
  if (!["pending", "approved"].includes(String(data.creator_status ?? ""))) return null;
  let socialLinks: CreatorSocialLinks = {};
  try {
    socialLinks = sanitizeSocialLinks(data.social_links);
  } catch {
    socialLinks = {};
  }
  return {
    id: String(data.id),
    name: String(data.full_name).trim(),
    handle: String(data.handle),
    photoUrl: data.photo_url ? String(data.photo_url) : undefined,
    bio: String(data.bio ?? "").trim() || undefined,
    socialLinks,
  };
}

async function listProductsForCreator(creatorId: string): Promise<StorefrontProduct[]> {
  const db = getSupabaseAdminClient();
  const [courses, designs, wealth] = await Promise.all([
    db.from("courses").select("id,title,category,thumbnail_url,final_price,original_price,instructor_id,created_at").eq("published", true).eq("instructor_id", creatorId).order("created_at", { ascending: false }).limit(300),
    db.from("designs").select("id,title,category,image_url,download_price,views,orders_count,created_by,created_at").eq("published", true).eq("created_by", creatorId).order("created_at", { ascending: false }).limit(300),
    db.from("wealth_products").select("id,title,category,image_url,download_price,views,orders_count,created_by,created_at").eq("published", true).eq("created_by", creatorId).order("created_at", { ascending: false }).limit(300),
  ]);
  const error = courses.error ?? designs.error ?? wealth.error;
  if (error) throw new Error(error.message);
  return [
    ...(courses.data ?? []).map((row) => mapCourse(row as Record<string, unknown>)),
    ...(designs.data ?? []).map((row) => mapDownloadable(row as Record<string, unknown>, "design")),
    ...(wealth.data ?? []).map((row) => mapDownloadable(row as Record<string, unknown>, "wealth")),
  ].sort(byNewest);
}

async function listOtherProducts(creatorId: string): Promise<StorefrontProduct[]> {
  const db = getSupabaseAdminClient();
  const [courses, designs, wealth] = await Promise.all([
    db.from("courses").select("id,title,category,thumbnail_url,final_price,original_price,instructor_id,created_at").eq("published", true).neq("instructor_id", creatorId).order("created_at", { ascending: false }).limit(18),
    db.from("designs").select("id,title,category,image_url,download_price,views,orders_count,created_by,created_at").eq("published", true).neq("created_by", creatorId).order("created_at", { ascending: false }).limit(18),
    db.from("wealth_products").select("id,title,category,image_url,download_price,views,orders_count,created_by,created_at").eq("published", true).neq("created_by", creatorId).order("created_at", { ascending: false }).limit(18),
  ]);
  const error = courses.error ?? designs.error ?? wealth.error;
  if (error) throw new Error(error.message);
  const products = [
    ...(courses.data ?? []).map((row) => mapCourse(row as Record<string, unknown>)),
    ...(designs.data ?? []).map((row) => mapDownloadable(row as Record<string, unknown>, "design")),
    ...(wealth.data ?? []).map((row) => mapDownloadable(row as Record<string, unknown>, "wealth")),
  ];
  const creatorIds = [...new Set(products.map((product) => product.creatorId).filter(Boolean))];
  if (!creatorIds.length) return [];
  const { data: creators, error: creatorError } = await db
    .from("profiles")
    .select("id,handle,role,creator_status,suspended_until")
    .in("id", creatorIds)
    .eq("role", "teacher")
    .in("creator_status", ["pending", "approved"])
    .not("handle", "is", null);
  if (creatorError) throw new Error(creatorError.message);
  const handles = new Map(
    (creators ?? [])
      .filter((creator) => !creator.suspended_until || new Date(String(creator.suspended_until)).getTime() <= Date.now())
      .map((creator) => [String(creator.id), String(creator.handle)]),
  );
  return products.flatMap((product) => {
    const creatorHandle = handles.get(product.creatorId);
    return creatorHandle ? [{ ...product, creatorHandle }] : [];
  });
}

export async function getCreatorStorefrontPage(handle: string) {
  const creator = await getCreatorStorefront(handle);
  if (!creator) return null;
  const [products, others] = await Promise.all([
    listProductsForCreator(creator.id),
    listOtherProducts(creator.id),
  ]);
  const youMayLike = [...others].sort(byNewest).slice(0, 8);
  const used = new Set(youMayLike.map((item) => `${item.kind}:${item.id}`));
  const mostPopular = [...others]
    .filter((item) => !used.has(`${item.kind}:${item.id}`))
    .sort(byPopularity)
    .slice(0, 8);
  return { creator, products, youMayLike, mostPopular };
}
