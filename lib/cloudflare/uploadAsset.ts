"use client";

import { apiRequest } from "@/lib/api/client";

export interface UploadedAsset {
  url: string;
  previewUrl: string;
  width?: number;
  height?: number;
  isPdf: boolean;
  pages?: number;
}

interface PreparedUpload {
  assetId: string;
  assetUrl: string;
  uploadUrl: string;
  headers: Record<string, string>;
  isPdf: boolean;
}

function productKindFromFolder(folder: string): "design" | "wealth" {
  return folder.includes("wealth") ? "wealth" : "design";
}

function inferContentType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

export async function uploadAsset(
  file: File,
  folder: string,
  purpose: "product_image" | "deliverable" = "deliverable",
): Promise<UploadedAsset> {
  const productKind = productKindFromFolder(folder);
  const contentType = inferContentType(file);
  const prepared = await apiRequest<PreparedUpload>("/api/storage/uploads/prepare", {
    method: "POST",
    body: JSON.stringify({
      productKind,
      purpose,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    }),
  });

  const uploaded = await fetch(prepared.uploadUrl, {
    method: "PUT",
    headers: prepared.headers,
    body: file,
  });
  if (!uploaded.ok) {
    throw new Error("The file could not be uploaded to storage. Please try again.");
  }

  const complete = await apiRequest<{ assetUrl: string }>("/api/storage/uploads/complete", {
    method: "POST",
    body: JSON.stringify({ assetId: prepared.assetId }),
  });
  return {
    url: complete.assetUrl,
    previewUrl: purpose === "product_image" ? complete.assetUrl : prepared.isPdf ? "/file.svg" : complete.assetUrl,
    isPdf: prepared.isPdf,
  };
}

export async function bindProductAssets(
  kind: "design" | "wealth",
  productId: string,
  references: string[],
): Promise<void> {
  const cloudflareReferences = references.filter((value) => value.includes("/api/storage/assets/"));
  if (cloudflareReferences.length === 0) return;
  await apiRequest("/api/storage/uploads/bind", {
    method: "POST",
    body: JSON.stringify({ kind, productId, references: cloudflareReferences }),
  });
}
