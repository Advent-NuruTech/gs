"use client";

import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import WealthUploadForm from "@/components/wealth/WealthUploadForm";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function CreateTeacherWealthResourcePage() {
  const { profile } = useAuth();
  const { isAllowed, loading } = useRoleGuard(["teacher"]);
  const hasAccess = profile?.creatorStatus === "approved" && profile.wealthEnabled;

  if (loading || !isAllowed) {
    return <PageSkeleton label="Checking your Wealth Academy access…" variant="plain" />;
  }
  if (!hasAccess) {
    return <StatusCard kind="warning" title="Wealth product access is not enabled" description="Ask an administrator to grant Wealth Academy access to your creator account." />;
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add a Wealth Resource</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">Upload an ebook, guide, workbook or course resource and set its price.</p>
      <WealthUploadForm />
    </section>
  );
}
