"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import DesignUploadForm from "@/components/design/DesignUploadForm";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { getDesignById } from "@/services/designService";
import { Design } from "@/types/design";

export default function EditDesignPage() {
  const params = useParams<{ designId: string }>();
  const { isAllowed, loading } = useRoleGuard(["admin"]);
  const [design, setDesign] = useState<Design | null>(null);
  const [loadingDesign, setLoadingDesign] = useState(true);

  useEffect(() => {
    if (!isAllowed) return;
    let active = true;
    (async () => {
      try {
        const data = await getDesignById(params.designId);
        if (active) setDesign(data);
      } finally {
        if (active) setLoadingDesign(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAllowed, params.designId]);

  if (loading || !isAllowed || loadingDesign) return <p>Loading…</p>;
  if (!design) return <p className="text-slate-600">Design not found.</p>;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Edit Design</h2>
      <DesignUploadForm design={design} />
    </section>
  );
}
