import { apiRequest } from "@/lib/api/client";

export interface ProductSyncResult {
  ok: boolean;
  alreadySynced: boolean;
  legacyRemoved: boolean;
}

export async function syncProductAssets(kind: "design", productId: string) {
  return apiRequest<ProductSyncResult>("/api/storage/sync", {
    method: "POST",
    body: JSON.stringify({ kind, productId }),
  });
}
