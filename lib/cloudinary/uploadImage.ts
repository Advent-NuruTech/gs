"use client";

import { getCloudinaryConfig } from "@/lib/cloudinary/config";

interface CloudinaryUploadResponse {
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
  pages?: number;
}

export interface UploadedAsset {
  /** The original asset URL (PDF or image). */
  url: string;
  /** A renderable preview image URL (first-page JPG for PDFs). */
  previewUrl: string;
  width?: number;
  height?: number;
  /** True when Cloudinary detected a PDF. */
  isPdf: boolean;
  /** Total page count for PDFs (used for the quarter-of-pages preview). */
  pages?: number;
}

/**
 * Turn a Cloudinary PDF asset URL into a first-page JPG preview the browser can
 * render in an <img>. Cloudinary renders PDF page 1 when the extension is an
 * image format, so we just swap the trailing `.pdf` for `.jpg`.
 */
function pdfPreviewUrl(pdfUrl: string): string {
  return pdfUrl.replace(/\.pdf($|\?)/i, ".jpg$1");
}

/**
 * Upload any supported asset (image or PDF). Uses the `auto` resource type so a
 * single unsigned preset accepts both; PDFs come back as `image` resources and
 * get a derived JPG preview for the gallery.
 */
export async function uploadAsset(file: File, folder: string): Promise<UploadedAsset> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env vars are missing.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const response = await fetch(endpoint, { method: "POST", body: formData });

  if (!response.ok) {
    throw new Error("Cloudinary upload failed.");
  }

  const data = (await response.json()) as CloudinaryUploadResponse;
  const isPdf =
    (data.format ?? "").toLowerCase() === "pdf" ||
    file.type === "application/pdf" ||
    /\.pdf($|\?)/i.test(data.secure_url);

  return {
    url: data.secure_url,
    previewUrl: isPdf ? pdfPreviewUrl(data.secure_url) : data.secure_url,
    width: data.width,
    height: data.height,
    isPdf,
    pages: isPdf ? data.pages : undefined,
  };
}

/** Image-only upload (kept for callers that only ever handle images). */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const asset = await uploadAsset(file, folder);
  return asset.url;
}
