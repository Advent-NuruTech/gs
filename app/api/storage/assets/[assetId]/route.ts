import { NextRequest, NextResponse } from "next/server";

import { getAsset } from "@/lib/cloudflare/assets";
import { createR2PresignedUrl } from "@/lib/cloudflare/r2";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  try {
    const asset = await getAsset(assetId);
    if (!asset || asset.status !== "ready" || asset.visibility !== "public") {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    const url = createR2PresignedUrl({ method: "GET", key: asset.objectKey, expiresSeconds: 10 * 60 });
    const response = NextResponse.redirect(url, 307);
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=300");
    return response;
  } catch {
    return NextResponse.json({ error: "File storage is unavailable." }, { status: 503 });
  }
}
