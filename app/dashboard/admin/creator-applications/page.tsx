"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatCard from "@/components/ui/StatCard";
import StatusCard from "@/components/ui/StatusCard";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppUser } from "@/types/user";
import { mapProfile } from "@/services/authService";

function ApplicationBadge({ status }: { status: AppUser["creatorStatus"] }) {
  return <Badge tone={status === "approved" ? "emerald" : status === "rejected" ? "red" : "amber"}>{status === "approved" ? "Approved" : status === "rejected" ? "Declined" : "Pending review"}</Badge>;
}

export default function CreatorApplicationsPage() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const [applicants, setApplicants] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => { if (selectedId && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [selectedId]);
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data, error: queryError } = await getSupabaseBrowserClient().from("profiles").select("*").in("creator_status", ["pending", "approved", "rejected"]).order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setApplicants((data ?? []).map(mapProfile));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load applications."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (isAllowed) void reload(); }, [isAllowed, reload]);

  const decide = async (user: AppUser, action: "approve_creator" | "reject_creator") => {
    if (busyId) return;
    setBusyId(user.id); setFeedback(null);
    try {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) }, body: JSON.stringify({ id: user.id, action }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Application update failed.");
      setApplicants(current => current.map(item => item.id === user.id ? { ...item, creatorStatus: action === "approve_creator" ? "approved" : "rejected", role: action === "approve_creator" ? "teacher" : item.role } : item));
      setFeedback({ kind: "success", message: action === "approve_creator" ? "Application approved." : "Application declined." });
    } catch (caught) { setFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "Application update failed." }); }
    finally { setBusyId(""); }
  };

  if (guardLoading || !isAllowed || loading) return <PageSkeleton label="Loading creator applications" variant="cards" />;
  if (error) return <StatusCard kind="error" title="Applications could not be loaded" description={error} actions={<Button onClick={() => void reload()}>Retry</Button>} />;
  const query = search.trim().toLowerCase();
  const visible = applicants.filter(item => (filter === "all" || item.creatorStatus === "pending") && `${item.displayName} ${item.email} ${item.whatsapp || ""}`.toLowerCase().includes(query));
  const pending = applicants.filter(item => item.creatorStatus === "pending").length;
  const selected = applicants.find(item => item.id === selectedId);
  return <section className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">People</p><h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">Creator applications</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Review applications and manage creator access.</p></div><Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800" href="/dashboard/admin/users">Manage users</Link></div>
    {feedback && !selected ? <StatusCard kind={feedback.kind} title={feedback.message} onDismiss={() => setFeedback(null)} /> : null}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Pending review" value={pending} /><StatCard label="Approved" value={applicants.filter(item => item.creatorStatus === "approved").length} /><StatCard label="Declined" value={applicants.filter(item => item.creatorStatus === "rejected").length} /><StatCard label="Applications loaded" value={applicants.length} /></div>
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><Input label="Search applications" placeholder="Name, email or WhatsApp" value={search} onChange={event => setSearch(event.target.value)} /><div className="flex flex-wrap gap-2" aria-label="Application status">{(["pending", "all"] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{value === "pending" ? `Needs review (${pending})` : "All applications"}</button>)}</div></div>
    <section aria-label="Application directory" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-200 p-4 dark:border-slate-700"><h2 className="font-semibold text-slate-950 dark:text-white">Application directory</h2><p className="text-sm text-slate-500 dark:text-slate-400">{visible.length} applications shown</p></div><ol className="divide-y divide-slate-100 dark:divide-slate-800">{visible.map((user, index) => <li key={user.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 p-4"><span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{index + 1}</span><div className="min-w-0"><p className="break-words font-semibold text-slate-900 dark:text-white">{user.displayName || "Name not provided"}</p><p className="break-all text-sm text-slate-500 dark:text-slate-400">{user.email}</p><div className="mt-2"><ApplicationBadge status={user.creatorStatus} /></div></div><button type="button" onClick={() => { setFeedback(null); setSelectedId(user.id); }} aria-label={`View application for ${user.displayName || user.email}`} className="rounded-lg border border-slate-200 p-2 text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800"><Eye className="h-5 w-5" /></button></li>)}</ol>{visible.length === 0 ? <div className="p-4"><StatusCard kind="info" title="No matching applications" description="Try another search or view all applications." /></div> : null}</section>
    {selected ? <dialog ref={dialogRef} onClose={() => setSelectedId(null)} aria-labelledby="application-details-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 id="application-details-title" className="text-lg font-semibold text-slate-950 dark:text-white">Application details</h2><p className="break-words text-sm text-slate-500 dark:text-slate-400">{selected.displayName || "Name not provided"}</p></div><button type="button" onClick={() => setSelectedId(null)} aria-label="Close application details" className="rounded p-2 text-slate-600 dark:text-slate-300"><X className="h-5 w-5" /></button></div><div className="mt-4 space-y-4">{feedback ? <StatusCard kind={feedback.kind} title={feedback.message} /> : null}<ApplicationBadge status={selected.creatorStatus} /><dl className="grid gap-4 text-sm sm:grid-cols-2"><div className="min-w-0"><dt className="font-semibold text-slate-700 dark:text-slate-200">Email</dt><dd className="break-all text-slate-600 dark:text-slate-300">{selected.email}</dd></div><div><dt className="font-semibold text-slate-700 dark:text-slate-200">WhatsApp</dt><dd className="break-words text-slate-600 dark:text-slate-300">{selected.whatsapp || "Not provided"}</dd></div><div><dt className="font-semibold text-slate-700 dark:text-slate-200">Account created</dt><dd className="text-slate-600 dark:text-slate-300">{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "Date unavailable"}</dd></div></dl>{selected.creatorStatus === "pending" ? <div className="flex flex-wrap gap-2"><Button loading={busyId === selected.id} loadingText="Updating..." disabled={!!busyId} onClick={() => void decide(selected, "approve_creator")}>Approve</Button><Button variant="secondary" disabled={!!busyId} onClick={() => void decide(selected, "reject_creator")}>Decline</Button></div> : null}</div></dialog> : null}
  </section>;
}
