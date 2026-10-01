"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusCard from "@/components/ui/StatusCard";
import { apiRequest } from "@/lib/api/client";

export default function BecomeCreatorPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try { await apiRequest("/api/creator/application", { method: "POST", body: JSON.stringify({ whatsapp }) }); setMessage("Application submitted. Your account is now in review. You can create products after approval."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not submit application."); }
    finally { setSaving(false); }
  };
  if (loading) return <main className="mx-auto max-w-2xl p-6"><StatusCard kind="loading" title="Loading your account…" /></main>;
  return <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
    <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Creator programme</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Teach and sell on AdventSkool</h1><p className="mt-3 text-slate-600">Apply with your student account. Once approved, you can publish products and courses. Earnings are routed only after your creator profile and payout account are verified.</p></div>
    {message ? <StatusCard kind={message.startsWith("Application submitted") ? "success" : "error"} title={message.startsWith("Application submitted") ? "Application received" : "Could not apply"} description={message} /> : null}
    {profile?.creatorStatus === "pending" ? <StatusCard kind="info" title="Application in review" description="An administrator will review your creator application." /> : null}
    {profile?.role === "teacher" ? <StatusCard kind="success" title="Creator account active" description="Your teacher account is active. Manage courses from your dashboard." /> : null}
    {!profile ? <div className="rounded-2xl border bg-white p-6"><p className="text-slate-700">Sign in or create a student account to apply. You can use the same account you already learn with.</p><div className="mt-4 flex gap-3"><Link className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" href="/login?redirect=%2Fbecome-a-creator">Sign in</Link><Link className="rounded-lg border px-4 py-2 font-semibold" href="/register?redirect=%2Fbecome-a-creator">Create account</Link></div></div> : null}
    {profile && profile.role !== "teacher" && profile.creatorStatus !== "pending" ? <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6"><Input label="Working WhatsApp number" type="tel" placeholder="+254712345678" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} required /><p className="text-sm text-slate-500">Add your payout details now or later from your creator dashboard. A reminder appears after you publish without payout details.</p><Button type="submit" loading={saving} loadingText="Submitting application…">Apply to become a creator</Button></form> : null}
    <p className="text-sm text-slate-500">Creator applications need administrator approval. Temporary email addresses are not accepted; use an email you can keep access to.</p>
  </main>;
}
