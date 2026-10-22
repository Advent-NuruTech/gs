"use client";

import { Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  getPublicDisplaySettings,
  updatePublicDisplaySettings,
} from "@/services/publicDisplaySettingsService";

export default function DisplaySettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const settings = useAsyncData(getPublicDisplaySettings, [profile?.role]);
  const [showViewCountsOverride, setShowViewCountsOverride] = useState<boolean | null>(null);
  const showViewCounts = showViewCountsOverride ?? settings.data?.showViewCounts ?? true;

  const save = useAsyncAction({
    action: () => updatePublicDisplaySettings({ showViewCounts }),
    successMessage: "Public display settings saved.",
    onSuccess: (saved) => {
      setShowViewCountsOverride(saved.showViewCounts);
      settings.reload();
    },
  });

  if (authLoading || settings.isLoading) {
    return <PageSkeleton label="Loading public display settings" variant="form" />;
  }

  if (profile?.role !== "admin") {
    return <StatusCard kind="error" title="Access denied" description="Only administrators can manage public display settings." />;
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <SlidersHorizontal className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Public display settings</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Control which engagement details visitors can see.</p>
        </div>
      </div>

      {settings.errorMessage ? (
        <StatusCard kind="error" title="Could not load display settings" description={settings.errorMessage} actions={<Button variant="secondary" onClick={settings.reload}>Try again</Button>} />
      ) : null}
      {save.isLoading ? <StatusCard kind="loading" title="Saving public display settings" /> : null}
      {save.successMessage ? <StatusCard kind="success" title={save.successMessage} /> : null}
      {save.errorMessage ? <StatusCard kind="error" title="Could not save display settings" description={save.errorMessage} /> : null}

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <span className="flex min-w-0 items-start gap-3">
            <span className={`mt-0.5 shrink-0 rounded-lg p-2 ${showViewCounts ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
              {showViewCounts ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-950 dark:text-white">Show public view counts</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                Display view totals on Digital Product and Wealth Academy cards, detail pages, catalog highlights, and creator storefronts. Turning this off removes the counters completely while internal tracking continues.
              </span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={showViewCounts}
            onChange={(event) => {
              setShowViewCountsOverride(event.target.checked);
              save.reset();
            }}
            className="mt-2 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </label>

        <div className="flex justify-end">
          <Button
            onClick={() => void save.run()}
            loading={save.isLoading}
            loadingText="Saving..."
            disabled={showViewCountsOverride === null || showViewCounts === settings.data?.showViewCounts}
          >
            Save changes
          </Button>
        </div>
      </div>
    </section>
  );
}
