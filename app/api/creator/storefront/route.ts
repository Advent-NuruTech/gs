import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizeCreatorHandle,
  sanitizeSocialLinks,
  validateCreatorHandle,
} from "@/lib/creators/validation";

export const runtime = "nodejs";

async function requireCreator(request: NextRequest) {
  const user = await getRequestUser(request);
  return user && (user.role === "teacher" || user.role === "admin") ? user : null;
}

export async function GET(request: NextRequest) {
  const user = await requireCreator(request);
  if (!user) return NextResponse.json({ error: "Creator access required." }, { status: 403 });
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("id,full_name,handle,photo_url,bio,social_links")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
  return NextResponse.json({
    profile: {
      id: data.id,
      name: data.full_name,
      handle: data.handle,
      photoUrl: data.photo_url,
      bio: data.bio,
      socialLinks: data.social_links ?? {},
    },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await requireCreator(request);
  if (!user) return NextResponse.json({ error: "Creator access required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (!name) return NextResponse.json({ error: "Creator name is required." }, { status: 400 });

  const db = getSupabaseAdminClient();
  const { data: current } = await db.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  let handle = normalizeCreatorHandle(String(body?.handle ?? ""));
  if (!handle) handle = String(current?.handle ?? "") || normalizeCreatorHandle(name);
  if (handle.length < 3) handle = `creator-${user.id.replace(/-/g, "").slice(0, 7)}`;
  const handleError = validateCreatorHandle(handle);
  if (handleError) return NextResponse.json({ error: handleError }, { status: 400 });
  if (handle !== current?.handle) {
    const [{ data: profileMatch }, { data: aliasMatch }] = await Promise.all([
      db.from("profiles").select("id").eq("handle", handle).neq("id", user.id).maybeSingle(),
      db.from("creator_handle_aliases").select("creator_id").eq("handle", handle).maybeSingle(),
    ]);
    if (profileMatch || (aliasMatch && aliasMatch.creator_id !== user.id)) {
      return NextResponse.json({ error: "That handle is already being used. Choose another." }, { status: 409 });
    }
  }

  let socialLinks;
  try {
    socialLinks = sanitizeSocialLinks(body?.socialLinks);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid social links." }, { status: 400 });
  }

  const photoUrl = String(body?.photoUrl ?? "").trim().slice(0, 1000);
  if (photoUrl) {
    try {
      const parsed = new URL(photoUrl);
      if (parsed.protocol !== "https:") throw new Error();
    } catch {
      return NextResponse.json({ error: "Profile picture must use a secure image URL." }, { status: 400 });
    }
  }

  const { data, error } = await db
    .from("profiles")
    .update({
      full_name: name,
      handle,
      photo_url: photoUrl || null,
      bio: String(body?.bio ?? "").trim().slice(0, 500),
      social_links: socialLinks,
    })
    .eq("id", user.id)
    .select("id,full_name,handle,photo_url,bio,social_links")
    .single();
  if (error?.code === "23505") {
    return NextResponse.json({ error: "That handle is already being used. Choose another." }, { status: 409 });
  }
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not update storefront." }, { status: 400 });
  if (current?.handle && current.handle !== handle) {
    await db.from("creator_handle_aliases").upsert({ handle: current.handle, creator_id: user.id }, { onConflict: "handle" });
  }
  return NextResponse.json({
    profile: {
      id: data.id,
      name: data.full_name,
      handle: data.handle,
      photoUrl: data.photo_url,
      bio: data.bio,
      socialLinks: data.social_links ?? {},
    },
  });
}
