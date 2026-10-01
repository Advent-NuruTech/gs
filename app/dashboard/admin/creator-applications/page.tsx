"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppUser } from "@/types/user";
import { mapProfile } from "@/services/authService";

export default function CreatorApplicationsPage() {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [applicants, setApplicants] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data, error: queryError } = await getSupabaseBrowserClient().from("profiles").select("*").in("creator_status", ["pending", "approved", "rejected"]).order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setApplicants((data ?? []).map(mapProfile));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load applications."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const decide = async (user: AppUser, action: "approve_creator" | "reject_creator") => {
    setBusyId(user.id);
    try {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) }, body: JSON.stringify({ id: user.id, action }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Application update failed.");
      pushToast(action === "approve_creator" ? "Creator application approved and applicant notified." : "Application declined and applicant notified.", "success");
      await reload();
    } catch (caught) { pushToast(caught instanceof Error ? caught.message : "Application update failed.", "error"); }
    finally { setBusyId(""); }
  };

  if (profile?.role !== "admin") return <StatusCard kind="error" title="Administrator access required" description="This workspace is available to administrators only." />;
  if (loading) return <PageSkeleton label="Loading creator applications" />;
  const visible = applicants.filter((item) => filter === "all" || item.creatorStatus === "pending");
  const pending = applicants.filter((item) => item.creatorStatus === "pending").length;

  return <section className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">People</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Creator applications</h1><p className="mt-2 text-sm text-slate-600">Review applications, approve creator access, or record a decision.</p></div>
      <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" href="/dashboard/admin/users">Manage users</Link>
    </div>
    {error ? <StatusCard kind="error" title="Applications could not be loaded" description={error} actions={<Button onClick={() => void reload()}>Retry</Button>} /> : null}
    <div className="grid gap-3 sm:grid-cols-3">
      {[{ label: "Pending review", value: pending }, { label: "Approved", value: applicants.filter((item) => item.creatorStatus === "approved").length }, { label: "Total applications", value: applicants.length }].map((stat) => <Card key={stat.label} className="p-4"><p className="text-sm text-slate-600">{stat.label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{stat.value}</p></Card>)}
    </div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Application status">
      {(["pending", "all"] as const).map((value) => <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-blue-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>{value === "pending" ? `Needs review (${pending})` : "All applications"}</button>)}
    </div>
    <div className="space-y-3">{visible.map((user) => <Card key={user.id} className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><h2 className="break-words text-lg font-semibold text-slate-950">{user.displayName || "Name not provided"}</h2><p className="break-all text-sm text-slate-600">{user.email}</p><p className="mt-2 text-sm text-slate-700">WhatsApp: {user.whatsapp || "Not provided"}</p><p className="mt-1 text-xs text-slate-500">Account created {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "date unavailable"}</p></div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${user.creatorStatus === "pending" ? "bg-amber-100 text-amber-900" : user.creatorStatus === "approved" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}><Clock3 className="h-3.5 w-3.5" />{user.creatorStatus}</span>
      </div>
      {user.creatorStatus === "pending" ? <div className="mt-4 flex flex-wrap gap-2"><Button disabled={busyId === user.id} loading={busyId === user.id} onClick={() => void decide(user, "approve_creator")}><Check className="mr-1 inline h-4 w-4" />Approve</Button><Button variant="secondary" disabled={busyId === user.id} onClick={() => void decide(user, "reject_creator")}><X className="mr-1 inline h-4 w-4" />Decline</Button></div> : null}
    </Card>)}{visible.length === 0 && !error ? <StatusCard kind="info" title="No applications in this view" description="New submissions will appear here for review." /> : null}</div>
  </section>;
}
