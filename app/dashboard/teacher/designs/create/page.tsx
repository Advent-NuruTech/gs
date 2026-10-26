"use client";

import DesignUploadForm from "@/components/design/DesignUploadForm";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { useRoleGuard } from "@/hooks/useRoleGuard";

/** Uses the same Digital Product form as the administrator workspace. */
export default function CreateTeacherDesignPage() {
  const { isAllowed, loading } = useRoleGuard(["teacher"]);

  if (loading || !isAllowed) {
    return <PageSkeleton label="Checking creator access…" variant="form" />;
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Digital Product</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Upload an ebook, guide, workbook, template, graphic, or printable for your online store.</p>
      </div>
      <DesignUploadForm />
    </section>
  );
}
