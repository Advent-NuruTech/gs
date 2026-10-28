import { NextRequest, NextResponse } from "next/server";

import { completePendingAsset, getAsset } from "@/lib/cloudflare/assets";
import { getRequestUser } from "@/lib/api/requireUser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const assetId = String(body?.assetId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) {
    return NextResponse.json({ error: "Invalid upload record." }, { status: 400 });
  }
  try {
    const pending = await getAsset(assetId);
    if (!pending || (pending.ownerId !== user.id && user.role !== "admin")) {
      return NextResponse.json({ error: "Upload record was not found." }, { status: 404 });
    }
    const asset = await completePendingAsset(assetId);
    return NextResponse.json({
      assetUrl: `/api/storage/assets/${asset.id}`,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify the upload." },
      { status: 400 },
    );
  }
}
