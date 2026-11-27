import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { destroyCloudinaryAssetByUrl } from "@/lib/cloudinary/destroyServer";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isServeGalleryImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "res.cloudinary.com"
      && url.pathname.includes("/image/upload/")
      && url.pathname.includes("/adventskool/serve-gallery/");
  } catch {
    return false;
  }
}

async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (user.role !== "admin") return { response: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const { data, error } = await getSupabaseAdminClient()
    .from("serve_gallery_images")
    .select("id,image_url,caption,sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load the SERVE image gallery." }, { status: 500 });
  return NextResponse.json({ images: data });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const body = await request.json().catch(() => null);
  const imageUrl = text(body?.image_url, 2000);
  const caption = text(body?.caption, 500);
  if (!isServeGalleryImageUrl(imageUrl) || !caption) {
    return NextResponse.json({ error: "Upload a SERVE gallery image and enter its caption." }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  const { data: lastImage, error: orderError } = await db
    .from("serve_gallery_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) return NextResponse.json({ error: "Could not add this gallery image." }, { status: 500 });

  const { data, error } = await db
    .from("serve_gallery_images")
    .insert({ image_url: imageUrl, caption, sort_order: Number(lastImage?.sort_order ?? 0) + 10 })
    .select("id,image_url,caption,sort_order")
    .single();

  if (error) return NextResponse.json({ error: "Could not add this gallery image." }, { status: 500 });
  return NextResponse.json({ image: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const body = await request.json().catch(() => null);
  const id = text(body?.id, 64);
  const caption = text(body?.caption, 500);
  if (!id || !caption) {
    return NextResponse.json({ error: "Enter a caption for this image." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("serve_gallery_images")
    .update({ caption })
    .eq("id", id)
    .select("id,image_url,caption,sort_order")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not update this gallery caption." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });
  return NextResponse.json({ image: data });
}

export async function DELETE(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const body = await request.json().catch(() => null);
  const id = text(body?.id, 64);
  if (!id) return NextResponse.json({ error: "Choose an image to remove." }, { status: 400 });

  const db = getSupabaseAdminClient();
  const { data: image, error: readError } = await db
    .from("serve_gallery_images")
    .select("id,image_url")
    .eq("id", id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "Could not remove this gallery image." }, { status: 500 });
  if (!image) return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });

  const { error: deleteError } = await db.from("serve_gallery_images").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: "Could not remove this gallery image." }, { status: 500 });

  let cleanupWarning: string | undefined;
  try {
    if (!isServeGalleryImageUrl(image.image_url) || !await destroyCloudinaryAssetByUrl(image.image_url)) {
      cleanupWarning = "The image was removed from the gallery, but its hosted file could not be deleted.";
    }
  } catch {
    cleanupWarning = "The image was removed from the gallery, but its hosted file could not be deleted.";
  }

  return NextResponse.json({ ok: true, cleanupWarning });
}
