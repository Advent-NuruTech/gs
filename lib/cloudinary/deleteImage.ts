import { extractCloudinaryPublicId } from "@/lib/cloudinary/publicId";

interface DeleteCloudinaryResponse {
  error?: string;
}

export async function deleteCloudinaryImageByUrl(url: string): Promise<void> {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;

  const response = await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as DeleteCloudinaryResponse;
    throw new Error(payload.error ?? "Failed to delete Cloudinary image.");
  }
}
