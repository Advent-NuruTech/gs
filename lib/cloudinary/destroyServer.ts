import "server-only";

import crypto from "crypto";

import { extractCloudinaryPublicId } from "@/lib/cloudinary/publicId";

export async function destroyCloudinaryAssetByUrl(url: string): Promise<boolean> {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return false;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary delete credentials are not configured.");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", apiKey);
  formData.append("signature", signature);
  formData.append("invalidate", "true");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { result?: string; error?: { message?: string } } | null;
  if (!response.ok || !["ok", "not found"].includes(payload?.result ?? "")) {
    throw new Error(payload?.error?.message ?? "Cloudinary did not confirm deletion.");
  }
  return true;
}
