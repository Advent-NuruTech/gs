"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { apiRequest } from "@/lib/api/client";
import { listUsers } from "@/services/userService";
import { AppUser } from "@/types/user";

interface StorageSettings {
  defaultMaxUploadBytes: number;
  overrides: Array<{
    accountId: string;
    maxUploadBytes: number | null;
    unlimited: boolean;
    updatedAt: string;
  }>;
}

function bytesToMb(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export default function StorageSettingsPage() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const [settings, setSettings] = useState<StorageSettings | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [defaultMb, setDefaultMb] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountMode, setAccountMode] = useState<"inherit" | "custom" | "unlimited">("inherit");
  const [accountMb, setAccountMb] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [nextSettings, nextUsers] = await Promise.all([
        apiRequest<StorageSettings>("/api/admin/storage-settings"),
        listUsers(),
      ]);
      setSettings(nextSettings);
      setUsers(nextUsers);
      setDefaultMb(String(bytesToMb(nextSettings.defaultMaxUploadBytes)));
      setAccountId((current) => current || nextUsers[0]?.id || "");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load storage settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) void load();
  }, [isAllowed, load]);

  const selectedOverride = useMemo(
    () => settings?.overrides.find((item) => item.accountId === accountId),
    [accountId, settings],
  );

  useEffect(() => {
    if (!accountId) return;
    if (!selectedOverride) {
      setAccountMode("inherit");
      setAccountMb("");
    } else if (selectedOverride.unlimited) {
      setAccountMode("unlimited");
      setAccountMb("");
    } else {
      setAccountMode("custom");
      setAccountMb(selectedOverride.maxUploadBytes ? String(bytesToMb(selectedOverride.maxUploadBytes)) : "");
    }
  }, [accountId, selectedOverride]);

  const saveDefault = useAsyncAction({
    action: () => apiRequest("/api/admin/storage-settings", {
      method: "PATCH",
      body: JSON.stringify({ scope: "global", maxUploadMb: Number(defaultMb) }),
    }),
    successMessage: "Default upload size saved.",
    onSuccess: load,
  });
  const saveAccount = useAsyncAction({
    action: () => apiRequest("/api/admin/storage-settings", {
      method: "PATCH",
      body: JSON.stringify({
        scope: "account",
        accountId,
        mode: accountMode,
        maxUploadMb: accountMode === "custom" ? Number(accountMb) : undefined,
      }),
    }),
    successMessage: "Account upload size saved.",
    onSuccess: load,
  });

  if (guardLoading || !isAllowed) return <PageSkeleton label="Checking storage settings access…" variant="plain" />;
  if (loading) return <PageSkeleton label="Loading Cloudflare storage settings…" variant="form" />;

  return (
    <section className="min-w-0 space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Cloudflare storage</p>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Upload size controls</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Set the normal product-file allowance or override it for one account. File metadata is stored in D1 and file bytes in R2.
        </p>
      </div>

      {loadError ? <StatusCard kind="error" title="Storage settings unavailable" description={loadError} actions={<Button type="button" variant="secondary" onClick={() => void load()}>Retry</Button>} /> : null}

      <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Default for all accounts</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">This applies when an account does not have its own override.</p>
        </div>
        <form className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); void saveDefault.run(); }}>
          <div className="min-w-0 flex-1">
            <Input label="Maximum product file size (MB)" type="number" min="0.01" step="0.01" value={defaultMb} onChange={(event) => { setDefaultMb(event.target.value); saveDefault.reset(); }} required />
          </div>
          <Button type="submit" loading={saveDefault.isLoading} loadingText="Saving…">Save default</Button>
        </form>
        {saveDefault.successMessage ? <StatusCard kind="success" title={saveDefault.successMessage} /> : null}
        {saveDefault.errorMessage ? <StatusCard kind="error" title="Default was not saved" description={saveDefault.errorMessage} /> : null}
      </article>

      <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Specific account override</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Choose a custom amount, inherit the default, or remove the app-level cap for that account.</p>
        </div>
        <form className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); void saveAccount.run(); }}>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Account
            <select className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={accountId} onChange={(event) => { setAccountId(event.target.value); saveAccount.reset(); }} required>
              {users.map((user) => <option key={user.id} value={user.id}>{user.displayName || user.email} — {user.email}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Limit mode
            <select className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={accountMode} onChange={(event) => { setAccountMode(event.target.value as typeof accountMode); saveAccount.reset(); }}>
              <option value="inherit">Use default</option>
              <option value="custom">Custom size</option>
              <option value="unlimited">No app-level cap</option>
            </select>
          </label>
          <Input label="Custom size (MB)" type="number" min="0.01" step="0.01" value={accountMb} onChange={(event) => { setAccountMb(event.target.value); saveAccount.reset(); }} disabled={accountMode !== "custom"} required={accountMode === "custom"} />
          <Button type="submit" loading={saveAccount.isLoading} loadingText="Saving…" disabled={!accountId}>Save account</Button>
        </form>
        {accountMode === "unlimited" ? <StatusCard kind="warning" title="No AdventSkool upload cap" description="Cloudflare R2's own object and single-request limits still apply." /> : null}
        {saveAccount.successMessage ? <StatusCard kind="success" title={saveAccount.successMessage} /> : null}
        {saveAccount.errorMessage ? <StatusCard kind="error" title="Account setting was not saved" description={saveAccount.errorMessage} /> : null}
      </article>
    </section>
  );
}
