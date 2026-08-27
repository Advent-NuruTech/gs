"use client";

import DesignUploadForm from "@/components/design/DesignUploadForm";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function CreateDesignPage() {
  const { isAllowed, loading } = useRoleGuard(["admin"]);
  if (loading || !isAllowed) return <p>Loading…</p>;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Add a Digital Product</h2>
      <p className="text-sm text-slate-600">Upload an ebook, guide, workbook, template, graphic or printable and set its product price.</p>
      <DesignUploadForm />
    </section>
  );
}
