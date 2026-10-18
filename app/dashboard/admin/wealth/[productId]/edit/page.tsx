"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import WealthUploadForm from "@/components/wealth/WealthUploadForm";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { getWealthProductById } from "@/services/wealthService";
import { WealthProduct } from "@/types/wealth";

export default function EditWealthResourcePage() {
  const params = useParams<{ productId: string }>();
  const { isAllowed, loading } = useRoleGuard(["admin"]);
  const [product, setProduct] = useState<WealthProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  useEffect(() => {
    if (!isAllowed) return;
    let active = true;
    (async () => {
      try {
        const data = await getWealthProductById(params.productId);
        if (active) setProduct(data);
      } finally {
        if (active) setLoadingProduct(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAllowed, params.productId]);

  if (loading || !isAllowed || loadingProduct) return <p>Loading…</p>;
  if (!product) return <p className="text-slate-600">Wealth resource not found.</p>;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Edit Wealth Resource</h2>
      <WealthUploadForm product={product} />
    </section>
  );
}
