"use client";

import WealthUploadForm from "@/components/wealth/WealthUploadForm";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function CreateWealthResourcePage() {
  const { isAllowed, loading } = useRoleGuard(["admin"]);
  if (loading || !isAllowed) return <p>Loading…</p>;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Add a Wealth Resource</h2>
      <p className="text-sm text-slate-600">Upload an ebook, guide, workbook or course resource and set its price.</p>
      <WealthUploadForm />
    </section>
  );
}
