import { NextRequest, NextResponse } from "next/server";

import {
  assetIdFromReference,
  bindAssetsToProduct,
  completePendingAsset,
  createPendingAsset,
  getEffectiveUploadLimit,
  getR2SourceUrl,
} from "@/lib/cloudflare/assets";
import { createR2PresignedUrl } from "@/lib/cloudflare/r2";
import { destroyCloudinaryAssetByUrl } from "@/lib/cloudinary/destroyServer";
import { signedDownloadUrl } from "@/lib/cloudinary/signedDownloadUrl";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    return last.slice(0, 255) || fallback;
  } catch {
    return fallback;
  }
}

async function migrateSource(input: {
  source: string;
  ownerId: string;
  kind: "design";
  purpose: "product_image" | "deliverable";
  visibility: "public" | "private";
  fallbackName: string;
}) {
  if (assetIdFromReference(input.source)) return input.source;
  if (!/^https:\/\//i.test(input.source)) return input.source;
  const sourceUrl = signedDownloadUrl(input.source, input.fallbackName) ?? input.source;
  const upstream = await fetch(sourceUrl, { cache: "no-store", headers: { "Accept-Encoding": "identity" } });
  if (!upstream.ok || !upstream.body) throw new Error("The existing file could not be read from its current host.");
  // Fetch transparently decompresses encoded responses, so their Content-Length
  // is not necessarily the number of bytes that will be sent to R2.
  const encoding = upstream.headers.get("content-encoding");
  const buffered = upstream.headers.get("content-length") && (!encoding || encoding.toLowerCase() === "identity")
    ? null
    : await upstream.arrayBuffer();
  const sizeBytes = buffered?.byteLength ?? Number(upstream.headers.get("content-length") ?? 0);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) throw new Error("The existing file size could not be verified.");
  const limit = await getEffectiveUploadLimit(input.ownerId);
  if (limit != null && sizeBytes > limit) {
    throw new Error("This file is larger than the account currently allows. Increase that account's upload size, then sync again.");
  }
  const contentType = upstream.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const fileName = fileNameFromUrl(input.source, input.fallbackName);
  const pending = await createPendingAsset({
    ownerId: input.ownerId,
    productKind: input.kind,
    purpose: input.purpose,
    visibility: input.visibility,
    fileName,
    contentType,
    sizeBytes,
    legacySourceUrl: input.source,
  });
  const uploadUrl = createR2PresignedUrl({ method: "PUT", key: pending.objectKey, contentType, expiresSeconds: 15 * 60 });
  const init: RequestInit & { duplex?: "half" } = {
    method: "PUT",
    headers: { "Content-Type": contentType, "Content-Length": String(sizeBytes) },
    body: buffered ?? upstream.body,
  };
  if (!buffered) init.duplex = "half";
  const uploaded = await fetch(uploadUrl, init);
  if (!uploaded.ok) throw new Error(`R2 rejected the migrated file (HTTP ${uploaded.status}). Please retry or check the storage configuration.`);
  await completePendingAsset(pending.id);
  const readUrl = await getR2SourceUrl(pending.reference, 120);
  if (!readUrl) throw new Error("The migrated file could not be reopened from R2.");
  const reopened = await fetch(readUrl, { cache: "no-store", headers: { Range: "bytes=0-0" } });
  if (!reopened.ok || !reopened.body) throw new Error("The migrated file could not be reopened from R2.");
  await reopened.body.cancel();
  return pending.reference;
}

export async function POST(request: NextRequest) {
  const adminUser = await getRequestUser(request);
  if (adminUser?.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = body?.kind === "design" ? "design" : null;
  const productId = String(body?.productId ?? "");
  if (!kind || !productId) return NextResponse.json({ error: "Invalid product sync request." }, { status: 400 });

  const db = getSupabaseAdminClient();
  const table = "designs";
  const { data: product, error: productError } = await db
    .from(table)
    .select("id,title,created_by,image_url,file_url,file_type")
    .eq("id", productId)
    .maybeSingle();
  if (productError || !product) return NextResponse.json({ error: productError?.message ?? "Product not found." }, { status: 404 });

  const oldImage = String(product.image_url ?? "");
  const oldFile = String(product.file_url ?? "") || oldImage;
  if (!oldImage || !oldFile) return NextResponse.json({ error: "This product does not have a file to sync." }, { status: 400 });
  if (assetIdFromReference(oldImage) && assetIdFromReference(oldFile)) {
    return NextResponse.json({ ok: true, alreadySynced: true, legacyRemoved: true });
  }

  const ownerId = String(product.created_by ?? adminUser.id);
  const title = String(product.title ?? "product").replace(/[^a-z0-9]+/gi, "-").slice(0, 70) || "product";
  try {
    let nextImage: string;
    let nextFile: string;
    if (oldImage === oldFile) {
      if (product.file_type === "pdf") {
        throw new Error("This PDF needs a separate cover image before it can be synced safely. Edit the product to add a cover, then sync again.");
      }
      nextImage = await migrateSource({
        source: oldImage,
        ownerId,
        kind,
        purpose: "product_image",
        visibility: "public",
        fallbackName: `${title}.${product.file_type === "pdf" ? "pdf" : "jpg"}`,
      });
      nextFile = nextImage;
    } else {
      nextImage = await migrateSource({
        source: oldImage,
        ownerId,
        kind,
        purpose: "product_image",
        visibility: "public",
        fallbackName: `${title}-cover.jpg`,
      });
      nextFile = await migrateSource({
        source: oldFile,
        ownerId,
        kind,
        purpose: "deliverable",
        visibility: "private",
        fallbackName: `${title}.${product.file_type === "pdf" ? "pdf" : "bin"}`,
      });
    }

    await bindAssetsToProduct([nextImage, nextFile], kind, productId, ownerId);
    const { error: updateError } = await db.from(table).update({ image_url: nextImage, file_url: nextFile }).eq("id", productId);
    if (updateError) throw new Error(`The product was not switched to R2: ${updateError.message}`);

    let legacyRemoved = true;
    const legacyUrls = [...new Set([oldImage, oldFile])];
    for (const url of legacyUrls) {
      if (!url.includes("cloudinary.com")) {
        legacyRemoved = false;
        continue;
      }
      try {
        await destroyCloudinaryAssetByUrl(url);
      } catch {
        legacyRemoved = false;
      }
    }
    return NextResponse.json({ ok: true, alreadySynced: false, legacyRemoved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Product sync failed." }, { status: 500 });
  }
}
