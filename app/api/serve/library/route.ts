import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ItemType = "course" | "design";

interface LibraryItem {
  type: ItemType;
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  published: boolean;
  selected: boolean;
  is_pdf: boolean;
  price: number;
}

function mapCourse(row: Record<string, unknown>, selectedIds: Set<string>): LibraryItem {
  return {
    type: "course",
    id: String(row.id),
    title: String(row.title ?? ""),
    description: "",
    category: String(row.category ?? "General"),
    image_url: String(row.thumbnail_url ?? ""),
    published: Boolean(row.published),
    selected: selectedIds.has(String(row.id)),
    is_pdf: false,
    price: Number(row.final_price ?? 0),
  };
}

function mapDesign(row: Record<string, unknown>, selectedIds: Set<string>): LibraryItem {
  return {
    type: "design",
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: String(row.category ?? "General"),
    image_url: String(row.image_url ?? ""),
    published: Boolean(row.published),
    selected: selectedIds.has(String(row.id)),
    is_pdf: row.file_type === "pdf",
    price: Number(row.download_price ?? 0),
  };
}

async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (user.role !== "admin") return { response: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  return { user };
}

export async function GET(request: NextRequest) {
  const manage = new URL(request.url).searchParams.get("manage") === "true";
  if (manage) {
    const authorization = await requireAdmin(request);
    if ("response" in authorization) return authorization.response;
  }

  const db = getSupabaseAdminClient();
  const { data: selections, error: selectionError } = await db
    .from("serve_library_items")
    .select("item_type,item_id");

  if (selectionError) return NextResponse.json({ error: "Could not load the SERVE library selections." }, { status: 500 });

  const courseIds = (selections ?? []).filter((row) => row.item_type === "course").map((row) => String(row.item_id));
  const designIds = (selections ?? []).filter((row) => row.item_type === "design").map((row) => String(row.item_id));

  if (manage) {
    const [{ data: courses, error: coursesError }, { data: designs, error: designsError }] = await Promise.all([
      db.from("courses").select("id,title,category,thumbnail_url,published,final_price").order("title", { ascending: true }),
      db.from("designs").select("id,title,description,category,image_url,file_type,published,download_price").order("title", { ascending: true }),
    ]);

    if (coursesError || designsError) return NextResponse.json({ error: "Could not load courses and digital products for the SERVE library." }, { status: 500 });

    return NextResponse.json({
      items: [
        ...(courses ?? []).map((row) => mapCourse(row, new Set(courseIds))),
        ...(designs ?? []).map((row) => mapDesign(row, new Set(designIds))),
      ],
    });
  }

  const publishedItems: LibraryItem[] = [];
  if (courseIds.length) {
    const { data, error } = await db
      .from("courses")
      .select("id,title,category,thumbnail_url,published,final_price")
      .in("id", courseIds)
      .eq("published", true);
    if (error) return NextResponse.json({ error: "Could not load the SERVE library." }, { status: 500 });
    publishedItems.push(...(data ?? []).map((row) => mapCourse(row, new Set(courseIds))));
  }
  if (designIds.length) {
    const { data, error } = await db
      .from("designs")
      .select("id,title,description,category,image_url,file_type,published,download_price")
      .in("id", designIds)
      .eq("published", true);
    if (error) return NextResponse.json({ error: "Could not load the SERVE library." }, { status: 500 });
    publishedItems.push(...(data ?? []).map((row) => mapDesign(row, new Set(designIds))));
  }

  publishedItems.sort((a, b) => a.title.localeCompare(b.title));
  return NextResponse.json({ items: publishedItems });
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const body = await request.json().catch(() => null);
  const type = body?.type as ItemType;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const selected = body?.selected;
  if (!["course", "design"].includes(type) || !/^[0-9a-f-]{36}$/i.test(id) || typeof selected !== "boolean") {
    return NextResponse.json({ error: "Choose a valid course or digital product and display setting." }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  if (selected) {
    const { data, error } = await db
      .from(type === "course" ? "courses" : "designs")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Could not confirm this item is available." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "This course or digital product no longer exists." }, { status: 404 });

    const { error: saveError } = await db
      .from("serve_library_items")
      .upsert({ item_type: type, item_id: id }, { onConflict: "item_type,item_id" });
    if (saveError) return NextResponse.json({ error: "Could not add this item to the SERVE library." }, { status: 500 });
  } else {
    const { error } = await db
      .from("serve_library_items")
      .delete()
      .eq("item_type", type)
      .eq("item_id", id);
    if (error) return NextResponse.json({ error: "Could not remove this item from the SERVE library." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
