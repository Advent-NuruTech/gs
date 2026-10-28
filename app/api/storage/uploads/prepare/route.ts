import { NextRequest, NextResponse } from "next/server";

import { createPendingAsset, getEffectiveUploadLimit } from "@/lib/cloudflare/assets";
import { createR2PresignedUrl } from "@/lib/cloudflare/r2";
import { getRequestUser } from "@/lib/api/requireUser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return NextResponse.json({ error: "Creator or administrator access is required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const productKind = body?.productKind === "wealth" ? "wealth" : body?.productKind === "design" ? "design" : null;
  const fileName = String(body?.fileName ?? "").trim().slice(0, 255);
  const contentType = String(body?.contentType ?? "").trim().toLowerCase();
  const purpose = body?.purpose === "product_image" ? "product_image" : body?.purpose === "deliverable" ? "deliverable" : null;
  const sizeBytes = Number(body?.sizeBytes);
  if (!productKind || !purpose || !fileName || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: "Invalid upload details." }, { status: 400 });
  }
  if (contentType !== "application/pdf" && !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Upload an image or PDF file." }, { status: 400 });
  }
  if (purpose === "product_image" && !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "The product cover must be an image." }, { status: 400 });
  }

  try {
    const limit = await getEffectiveUploadLimit(user.id);
    if (limit != null && sizeBytes > limit) {
      return NextResponse.json(
        { error: "This file is larger than your account currently allows. Apply for more upload size." },
        { status: 413 },
      );
    }

    const isPdf = contentType === "application/pdf";
    const pending = await createPendingAsset({
      ownerId: user.id,
      productKind,
      purpose,
      visibility: purpose === "product_image" ? "public" : "private",
      fileName,
      contentType,
      sizeBytes,
    });
    const uploadUrl = createR2PresignedUrl({
      method: "PUT",
      key: pending.objectKey,
      contentType,
      expiresSeconds: 15 * 60,
    });
    return NextResponse.json({
      assetId: pending.id,
      assetUrl: pending.reference,
      uploadUrl,
      headers: { "Content-Type": contentType },
      isPdf,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare the upload." },
      { status: 500 },
    );
  }
}
