"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import WealthUploadForm from "@/components/wealth/WealthUploadForm";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { getWealthProductById } from "@/services/wealthService";
import { WealthProduct } from "@/types/wealth";

export default function EditTeacherWealthResourcePage() {
  const params = useParams<{ productId: string }>();
  const { profile } = useAuth();
  const { isAllowed, loading } = useRoleGuard(["teacher"]);
  const [product, setProduct] = useState<WealthProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState("");
  const hasAccess = profile?.creatorStatus === "approved" && profile.wealthEnabled;

  useEffect(() => {
    if (!isAllowed || !hasAccess) return;
    let active = true;
    void getWealthProductById(params.productId)
      .then((item) => {
        if (!active) return;
        if (item?.createdBy === profile?.id) setProduct(item);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load wealth resource.");
      })
      .finally(() => {
        if (active) setLoadingProduct(false);
      });
    return () => {
      active = false;
    };
  }, [hasAccess, isAllowed, params.productId, profile?.id]);

  if (loading || !isAllowed) {
    return <PageSkeleton label="Loading your wealth resource…" variant="form" />;
  }
  if (!hasAccess) {
    return <StatusCard kind="warning" title="Wealth product access is not enabled" description="Ask an administrator to grant Wealth Academy access to your creator account." />;
  }
  if (loadingProduct) return <PageSkeleton label="Loading your wealth resource…" variant="form" />;
  if (error) return <StatusCard kind="error" title="Could not load wealth resource" description={error} />;
  if (!product) {
    return (
      <StatusCard
        kind="error"
        title="Wealth resource not found"
        description="This resource does not belong to your creator account."
        actions={<Link href="/dashboard/teacher/wealth" className="font-semibold underline">Back to my wealth products</Link>}
      />
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Wealth Resource</h1>
      <WealthUploadForm product={product} />
    </section>
  );
}
