"use client";

import { apiRequest } from "@/lib/api/client";
import { deleteCloudinaryImageByUrl } from "@/lib/cloudinary/deleteImage";

export async function deleteHostedAssetByUrl(reference: string): Promise<void> {
  if (reference.includes("/api/storage/assets/")) {
    await apiRequest("/api/storage/assets/delete", {
      method: "POST",
      body: JSON.stringify({ reference }),
    });
    return;
  }
  await deleteCloudinaryImageByUrl(reference);
}
