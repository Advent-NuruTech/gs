"use client";

import { useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import Select from "@/components/ui/Select";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiRequest } from "@/lib/api/client";
import { CreatorDomainRequest, CreatorDomainStatus } from "@/types/creator";

type AdminDomainRequest = CreatorDomainRequest & { creatorHandle?: string };

const statusOptions: { value: CreatorDomainStatus; label: string }[] = [
  { value: "pending", label: "Pending review" },
  { value: "in_progress", label: "Setup in progress" },
  { value: "awaiting_dns", label: "Awaiting DNS" },
  { value: "ready", label: "Ready" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminCreatorDomainsPage() {
  const requests = useAsyncData(() => apiRequest<{ requests: AdminDomainRequest[] }>("/api/admin/creator-domains"), []);
  const [drafts, setDrafts] = useState<Record<string, CreatorDomainStatus>>({});
  const [activeId, setActiveId] = useState("");
  const updateAction = useAsyncAction({
    action: (id: string, status: CreatorDomainStatus) => {
      setActiveId(id);
      return apiRequest<{ ok: boolean }>("/api/admin/creator-domains", { method: "PATCH", body: JSON.stringify({ id, status }) });
    },
    successMessage: "Domain request updated. The creator is notified automatically when it becomes ready.",
    onSuccess: () => { setActiveId(""); requests.reload(); },
    onError: () => setActiveId(""),
  });

  if (requests.isLoading) return <PageSkeleton label="Loading creator domain requests" />;
  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Creator operations</p><h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">Custom domain requests</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Track the manual setup process. Mark a domain ready only after ownership, routing and HTTPS are verified.</p></div>
      {requests.errorMessage ? <StatusCard kind="error" title="Requests could not be loaded" description={requests.errorMessage} actions={<Button onClick={requests.reload}>Retry</Button>} /> : null}
      {updateAction.successMessage ? <StatusCard kind="success" title="Request updated" description={updateAction.successMessage} /> : null}
      {updateAction.errorMessage ? <StatusCard kind="error" title="Request could not be updated" description={updateAction.errorMessage} /> : null}
      <div className="space-y-4">
        {(requests.data?.requests ?? []).map((request) => {
          const selected = drafts[request.id] ?? request.status;
          return <article key={request.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0"><h2 className="break-all text-lg font-bold text-slate-950 dark:text-white">{request.requestedDomain}</h2><p className="break-words text-sm text-slate-600 dark:text-slate-300">{request.creatorName}{request.creatorHandle ? <> · <Link className="text-blue-700 dark:text-blue-300" href={`/@${request.creatorHandle}`} target="_blank">@{request.creatorHandle}</Link></> : null}</p><p className="mt-1 text-xs text-slate-500">Requested {new Date(request.requestedAt).toLocaleString("en-KE")}</p></div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
                <Select label="Status" value={selected} onChange={(event) => setDrafts((current) => ({ ...current, [request.id]: event.target.value as CreatorDomainStatus }))} options={statusOptions} />
                <Button loading={updateAction.isLoading && activeId === request.id} loadingText="Updating…" disabled={updateAction.isLoading || selected === request.status} onClick={() => void updateAction.run(request.id, selected)}>Update</Button>
              </div>
            </div>
          </article>;
        })}
        {!requests.errorMessage && !(requests.data?.requests.length) ? <StatusCard kind="info" title="No custom-domain requests" description="Creator requests will appear here." /> : null}
      </div>
    </section>
  );
}
