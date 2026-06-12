"use client";

import { getCloudinaryConfig } from "@/lib/cloudinary/config";

interface CloudinaryUploadResponse {
  secure_url: string;
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env vars are missing.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Cloudinary upload failed.");
  }

  const data = (await response.json()) as CloudinaryUploadResponse;
  return data.secure_url;
}
