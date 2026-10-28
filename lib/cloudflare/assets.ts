import "server-only";

import { queryD1 } from "@/lib/cloudflare/d1";
import { createR2PresignedUrl, deleteR2Object, headR2Object } from "@/lib/cloudflare/r2";

export const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const ASSET_REFERENCE_PREFIX = "/api/storage/assets/";

export interface StoredAsset {
  id: string;
  ownerId: string;
  productKind: "design" | "wealth";
  productId?: string;
  purpose: "product_image" | "deliverable";
  visibility: "public" | "private";
  objectKey: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  status: "pending" | "ready" | "deleted" | "failed";
  legacySourceUrl?: string;
}

function mapAsset(row: Record<string, unknown>): StoredAsset {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    productKind: row.product_kind === "wealth" ? "wealth" : "design",
    productId: row.product_id ? String(row.product_id) : undefined,
    purpose: row.purpose === "product_image" ? "product_image" : "deliverable",
    visibility: row.visibility === "public" ? "public" : "private",
    objectKey: String(row.object_key),
    originalFileName: String(row.original_file_name),
    contentType: String(row.content_type),
    sizeBytes: Number(row.size_bytes),
    etag: row.etag ? String(row.etag) : undefined,
    status: String(row.status) as StoredAsset["status"],
    legacySourceUrl: row.legacy_source_url ? String(row.legacy_source_url) : undefined,
  };
}

export function assetReference(assetId: string): string {
  return `${ASSET_REFERENCE_PREFIX}${assetId}`;
}

export function assetIdFromReference(reference: string): string | null {
  try {
    const pathname = reference.startsWith("http") ? new URL(reference).pathname : reference.split("?")[0];
    if (!pathname.startsWith(ASSET_REFERENCE_PREFIX)) return null;
    const id = pathname.slice(ASSET_REFERENCE_PREFIX.length).split("/")[0];
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function getAsset(assetId: string): Promise<StoredAsset | null> {
  const rows = await queryD1<Record<string, unknown>>("SELECT * FROM assets WHERE id = ? LIMIT 1", [assetId]);
  return rows[0] ? mapAsset(rows[0]) : null;
}

export async function getAssetByReference(reference: string): Promise<StoredAsset | null> {
  const assetId = assetIdFromReference(reference);
  return assetId ? getAsset(assetId) : null;
}

export async function getEffectiveUploadLimit(accountId: string): Promise<number | null> {
  const rows = await queryD1<Record<string, unknown>>(
    `SELECT s.default_max_upload_bytes, l.max_upload_bytes, l.unlimited
     FROM storage_settings s
     LEFT JOIN account_storage_limits l ON l.account_id = ?
     WHERE s.id = 1 LIMIT 1`,
    [accountId],
  );
  const row = rows[0];
  if (!row) return DEFAULT_MAX_UPLOAD_BYTES;
  if (Number(row.unlimited ?? 0) === 1) return null;
  return row.max_upload_bytes == null
    ? Number(row.default_max_upload_bytes ?? DEFAULT_MAX_UPLOAD_BYTES)
    : Number(row.max_upload_bytes);
}

export async function createPendingAsset(input: {
  ownerId: string;
  productKind: "design" | "wealth";
  purpose: "product_image" | "deliverable";
  visibility: "public" | "private";
  fileName: string;
  contentType: string;
  sizeBytes: number;
  legacySourceUrl?: string;
}) {
  const id = crypto.randomUUID();
  const safeName = input.fileName.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(-120) || "file";
  const objectKey = `${input.productKind}/${input.ownerId}/${new Date().toISOString().slice(0, 10)}/${id}-${safeName}`;
  await queryD1(
    `INSERT INTO assets
      (id, owner_id, product_kind, purpose, visibility, object_key, original_file_name, content_type, size_bytes, status, legacy_source_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, input.ownerId, input.productKind, input.purpose, input.visibility, objectKey, input.fileName, input.contentType, input.sizeBytes, input.legacySourceUrl ?? null],
  );
  return { id, objectKey, reference: assetReference(id) };
}

export async function completePendingAsset(assetId: string): Promise<StoredAsset> {
  const asset = await getAsset(assetId);
  if (!asset || asset.status !== "pending") throw new Error("Upload record was not found.");
  const object = await headR2Object(asset.objectKey);
  if (!object || object.size !== asset.sizeBytes) {
    if (object) await deleteR2Object(asset.objectKey).catch(() => undefined);
    await queryD1("UPDATE assets SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [assetId]);
    throw new Error("The uploaded file could not be verified. Please try again.");
  }
  const limit = await getEffectiveUploadLimit(asset.ownerId);
  if (limit != null && object.size > limit) {
    await deleteR2Object(asset.objectKey).catch(() => undefined);
    await queryD1("UPDATE assets SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [assetId]);
    throw new Error("This file is larger than your account currently allows. Apply for more upload size.");
  }
  await queryD1(
    "UPDATE assets SET status = 'ready', etag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [object.etag, assetId],
  );
  return { ...asset, status: "ready", etag: object.etag };
}

export async function bindAssetsToProduct(
  references: string[],
  kind: "design" | "wealth",
  productId: string,
  assetOwnerId: string,
  productOwnerId = assetOwnerId,
) {
  for (const reference of [...new Set(references)]) {
    const assetId = assetIdFromReference(reference);
    if (!assetId) continue;
    await queryD1(
      `UPDATE assets SET product_id = ?, owner_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND owner_id = ? AND product_kind = ? AND status = 'ready'`,
      [productId, productOwnerId, assetId, assetOwnerId, kind],
    );
  }
}

export async function getR2SourceUrl(reference: string, expiresSeconds = 300): Promise<string | null> {
  const assetId = assetIdFromReference(reference);
  if (!assetId) return null;
  const asset = await getAsset(assetId);
  if (!asset || asset.status !== "ready") return null;
  return createR2PresignedUrl({ method: "GET", key: asset.objectKey, expiresSeconds });
}

export async function removeStoredAsset(reference: string, requestingUserId: string, isAdmin: boolean): Promise<boolean> {
  const assetId = assetIdFromReference(reference);
  if (!assetId) return false;
  const asset = await getAsset(assetId);
  if (!asset) return true;
  if (!isAdmin && asset.ownerId !== requestingUserId) throw new Error("Not authorized to remove this file.");
  await deleteR2Object(asset.objectKey);
  await queryD1("UPDATE assets SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [assetId]);
  return true;
}
