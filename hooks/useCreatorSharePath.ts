"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { apiRequest } from "@/lib/api/client";
import { StorefrontProductKind } from "@/types/creator";

export function useCreatorSharePath(
  creatorId: string | undefined,
  kind: StorefrontProductKind,
  productId: string,
  fallback: string,
) {
  const result = useAsyncData(
    () => creatorId
      ? apiRequest<{ handle: string | null }>(`/api/creators/${encodeURIComponent(creatorId)}`)
      : Promise.resolve({ handle: null }),
    [creatorId],
  );
  return result.data?.handle
    ? `/@${result.data.handle}?product=${kind}-${productId}#product-${kind}-${productId}`
    : fallback;
}
