import { NextRequest, NextResponse } from "next/server";

import { signedDownloadUrl } from "@/lib/cloudinary/signedDownloadUrl";
import { getR2SourceUrl } from "@/lib/cloudflare/assets";
import { toWealthDownloadUrl } from "@/lib/wealth/downloadUrl";
import { getOwnedWealthResource } from "@/lib/wealth/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const resource = await getOwnedWealthResource(orderId, user);
  if (!resource) return NextResponse.json({ error: "Resource not found in your library." }, { status: 404 });
  if (!resource.fileUrl) return NextResponse.json({ error: "This resource has no readable file." }, { status: 404 });

  const sourceUrl = await getR2SourceUrl(resource.fileUrl) ?? signedDownloadUrl(resource.fileUrl, resource.title) ?? toWealthDownloadUrl(resource.fileUrl, resource.title);
  const range = request.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(sourceUrl, {
      cache: "no-store",
      headers: range ? { Range: range } : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the file host." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "The resource could not be opened." }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? (resource.fileType === "pdf" ? "application/pdf" : "image/jpeg"));
  headers.set("Content-Disposition", `inline; filename="${resource.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 80) || "resource"}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
