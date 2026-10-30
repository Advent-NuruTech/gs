"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatCard from "@/components/ui/StatCard";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";

type Teacher = { id: string; full_name: string; email: string };
type Payout = {
  creator_id: string;
  account_holder_name: string;
  bank_name: string;
  account_last4: string;
  payout_status: string;
  verification_status: "pending" | "verified" | "rejected";
};
type CommissionSetting = { creator_id: string; commission_percent: number; fee_mode: "inclusive" | "exclusive" };
type Earning = {
  id: string;
  creator_id: string;
  payment_reference: string | null;
  created_at: string;
  gross_amount: number;
  commission_percent: number;
  fee_mode: "inclusive" | "exclusive";
  platform_commission: number;
  creator_amount: number;
  provider_fee: number | null;
  payout_status: string;
  settlement_mode: string;
  creator: Teacher | null;
};
type Data = {
  teachers: Teacher[];
  payouts: Payout[];
  rates: CommissionSetting[];
  earnings: Earning[];
  settings: { default_commission_percent: number; default_fee_mode: "inclusive" | "exclusive" } | null;
};
export default function AdminCreatorPayoutsPage() {
  const { isAllowed, loading } = useRoleGuard(["admin"]);
  const [data, setData] = useState<Data | null>(null);
  const [rate, setRate] = useState("10");
  const [feeMode, setFeeMode] = useState("inclusive");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selectedId && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [selectedId]);
  async function load() { const r = await fetch("/api/admin/creator-payouts"); const v = await r.json(); if (!r.ok) throw new Error(v.error); setData(v); setRate(String(v.settings?.default_commission_percent ?? 10)); setFeeMode(v.settings?.default_fee_mode ?? "inclusive"); }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async request; state changes after the response arrives.
  useEffect(() => { if (isAllowed) void load().catch((e: Error) => (setFailed(true), setMessage(e.message))); }, [isAllowed]);
  async function update(body: object) { if (saving) return; setSaving(true); setMessage(""); setFailed(false); try { const r = await fetch("/api/admin/creator-payouts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const v = await r.json(); if (!r.ok) throw new Error(v.error); await load(); setMessage("Payment settings saved."); } finally { setSaving(false); } }
  if (loading || !isAllowed) return <p>Loading creator payouts…</p>;
  const rates = new Map((data?.rates ?? []).map((r) => [r.creator_id, r]));
  const payouts = new Map((data?.payouts ?? []).map((p) => [p.creator_id, p]));
  const platformGross = (data?.earnings ?? []).reduce((s, r) => s + Number(r.platform_commission), 0);
  const creatorGross = (data?.earnings ?? []).reduce((s, r) => s + Number(r.creator_amount), 0);
  const providerFees = (data?.earnings ?? []).reduce((s, r) => s + Number(r.provider_fee ?? 0), 0);
  const netPlatform = (data?.earnings ?? []).reduce((s, r) => s + Number(r.platform_commission) - (r.fee_mode === "inclusive" ? Number(r.provider_fee ?? 0) : 0), 0);
  const visibleTeachers = (data?.teachers ?? []).filter((teacher) => `${teacher.full_name} ${teacher.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = data?.teachers.find((teacher) => teacher.id === selectedId);
  return <section className="space-y-5"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Finance</p><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Creator commissions & payouts</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage payout accounts and rates for future sales. Existing earnings retain their original terms.</p></div>
    {saving && <StatusCard kind="loading" title="Saving payout settings" />}
    {message && <StatusCard kind={failed ? "error" : "success"} title={failed ? "Unable to update payout settings" : "Payout settings"} description={message} />}
    {data ? <>
    <div><h2 className="mb-1 font-semibold text-slate-900 dark:text-white">Recent earnings overview</h2><p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Based on the latest {data.earnings.length} recorded transactions, up to 500.</p><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Platform commission" value={formatKsh(platformGross)} /><StatCard label="Net platform earnings" value={formatKsh(netPlatform)} /><StatCard label="Creator earnings" value={formatKsh(creatorGross)} /><StatCard label="Paystack fees reported" value={formatKsh(providerFees)} /></div></div>
    <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><summary className="cursor-pointer font-semibold text-slate-900 dark:text-white">Default commission settings</summary><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void update({ kind:"defaults", rate:Number(rate), feeMode }).catch((err:Error) => (setFailed(true), setMessage(err.message))); }}><Input label="Default commission (%)" type="number" min="0" max="100" step="0.1" required value={rate} onChange={(e)=>setRate(e.target.value)} /><label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Paystack processing fee bearer<select value={feeMode} onChange={(e)=>setFeeMode(e.target.value)} className="rounded-md border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"><option value="inclusive">AdventSkool bears fee (inclusive)</option><option value="exclusive">Creator bears fee (exclusive)</option></select></label><div className="sm:col-span-2"><Button type="submit" loading={saving} loadingText="Saving...">Save defaults</Button><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Applies to future split transactions. Customer checkout amounts are unchanged.</p></div></form></details>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-700"><div><h2 className="font-semibold text-slate-950 dark:text-white">Creator accounts</h2><p className="text-sm text-slate-500 dark:text-slate-400">{visibleTeachers.length} creators shown</p></div><Input label="Search creators" placeholder="Name or email" value={search} onChange={(e)=>setSearch(e.target.value)} /></div><ol className="divide-y divide-slate-100 dark:divide-slate-800">{visibleTeachers.map((teacher,index)=>{ const payout=payouts.get(teacher.id); return <li key={teacher.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 p-4"><span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{index+1}</span><div className="min-w-0"><p className="break-words font-semibold text-slate-900 dark:text-white">{teacher.full_name || "Creator"}</p><p className="break-all text-sm text-slate-500 dark:text-slate-400">{teacher.email}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{payout ? `Verification: ${payout.verification_status}` : "Payout details not submitted"}</p></div><button type="button" onClick={()=>{setMessage("");setSelectedId(teacher.id);}} aria-label={`View payout details for ${teacher.full_name || teacher.email}`} className="rounded-lg border border-slate-200 p-2 text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800"><Eye className="h-5 w-5" /></button></li>;})}</ol>{visibleTeachers.length===0 ? <div className="p-4"><StatusCard kind="info" title="No creators found" description="Try another search." /></div> : null}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-semibold text-slate-950 dark:text-white">Recent transaction breakdowns</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Latest {data.earnings.length} ledger entries, up to 500.</p><div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{data.earnings.map((r)=><article key={r.id} className="grid gap-2 py-4 sm:grid-cols-2 lg:grid-cols-4"><div className="min-w-0"><p className="break-words font-semibold text-slate-900 dark:text-white">{r.creator?.full_name ?? "Creator"}</p><p className="break-all font-mono text-xs text-slate-500 dark:text-slate-400">{r.payment_reference ?? "No reference"}</p><p className="text-xs text-slate-500 dark:text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p></div><div className="text-sm text-slate-600 dark:text-slate-300">Customer paid: {formatKsh(Number(r.gross_amount))}<br />Platform: {formatKsh(Number(r.platform_commission))} ({r.commission_percent}%)</div><div className="text-sm text-slate-600 dark:text-slate-300">Creator: {formatKsh(Number(r.creator_amount))}<br />Paystack fee: {r.provider_fee == null ? "Not reported" : formatKsh(Number(r.provider_fee))}</div><div className="text-sm text-slate-600 dark:text-slate-300">{r.settlement_mode === "paystack_split" ? "Paystack subaccount" : "Platform balance"}<br /><span className="capitalize">{r.payout_status}</span></div></article>)}{data.earnings.length===0 ? <div className="pt-4"><StatusCard kind="info" title="No earnings recorded yet" /></div> : null}</div></section>
    <StatusCard kind="info" title="About settlement" description="Net platform earnings deduct reported Paystack fees when AdventSkool bears them. Routing to Paystack does not confirm bank settlement; check Paystack settlement reports." />
    {selected ? <dialog ref={dialogRef} onClose={()=>setSelectedId(null)} aria-labelledby="payout-details-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 id="payout-details-title" className="text-lg font-semibold text-slate-950 dark:text-white">Payout details</h2><p className="break-all text-sm text-slate-500 dark:text-slate-400">{selected.full_name} ? {selected.email}</p></div><button type="button" onClick={()=>setSelectedId(null)} aria-label="Close payout details" className="rounded p-2 text-slate-600 dark:text-slate-300"><X className="h-5 w-5" /></button></div>{message ? <div className="mt-4"><StatusCard kind={failed ? "error" : "success"} title={message} /></div> : null}<CreatorRow key={selected.id} teacher={selected} payout={payouts.get(selected.id)} setting={rates.get(selected.id)} defaultRate={Number(data.settings?.default_commission_percent ?? 10)} defaultFee={String(data.settings?.default_fee_mode ?? "exclusive")} saving={saving} save={(body)=>update(body).catch((err:Error)=>(setFailed(true), setMessage(err.message)))} /></dialog> : null}
    </> : null}
  </section>;
}

function CreatorRow({teacher,payout,setting,defaultRate,defaultFee,save,saving}:{teacher: Teacher; payout?: Payout; setting?: CommissionSetting; defaultRate:number; defaultFee:string; save:(body:object)=>void; saving:boolean}) {
  const [rate,setRate]=useState(String(setting?.commission_percent ?? "")); const [mode,setMode]=useState(String(setting?.fee_mode ?? defaultFee));
  return <div className="mt-5 space-y-4"><div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{payout ? <><p className="font-semibold">{payout.bank_name} ? {payout.account_holder_name}</p><p>Account ending {payout.account_last4 || "----"}</p><p>Verification: {payout.verification_status}</p><p>Paystack routing: {payout.payout_status}</p></> : <p>Payout details not submitted</p>}</div><form className="space-y-3" onSubmit={(e)=>{e.preventDefault();save({kind:"creator",creatorId:teacher.id,rate:rate === "" ? defaultRate : Number(rate),feeMode:mode});}}><Input label="Commission (%)" type="number" min="0" max="100" step="0.1" value={rate} placeholder={`${defaultRate} default`} onChange={(e)=>setRate(e.target.value)} /><label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Processing fee bearer<select value={mode} onChange={(e)=>setMode(e.target.value)} className="rounded-md border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"><option value="inclusive">Platform bears fee</option><option value="exclusive">Creator bears fee</option></select></label><div className="flex flex-wrap gap-2"><Button type="submit" loading={saving} loadingText="Saving...">Save rate</Button>{payout && <Button variant="secondary" disabled={saving} onClick={()=>save({kind:"verification",creatorId:teacher.id,status:payout.verification_status === "verified" ? "pending" : "verified"})}>{payout.verification_status === "verified" ? "Mark pending" : "Verify bank & enable"}</Button>}</div></form></div>;
}
