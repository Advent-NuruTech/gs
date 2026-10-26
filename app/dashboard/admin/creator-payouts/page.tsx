"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";

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
  async function load() { const r = await fetch("/api/admin/creator-payouts"); const v = await r.json(); if (!r.ok) throw new Error(v.error); setData(v); setRate(String(v.settings?.default_commission_percent ?? 10)); setFeeMode(v.settings?.default_fee_mode ?? "inclusive"); }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async request; state changes after the response arrives.
  useEffect(() => { if (isAllowed) void load().catch((e: Error) => setMessage(e.message)); }, [isAllowed]);
  async function update(body: object) { const r = await fetch("/api/admin/creator-payouts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const v = await r.json(); if (!r.ok) throw new Error(v.error); await load(); setMessage("Payment settings saved."); }
  if (loading || !isAllowed) return <p>Loading creator payouts…</p>;
  const rates = new Map((data?.rates ?? []).map((r) => [r.creator_id, r]));
  const payouts = new Map((data?.payouts ?? []).map((p) => [p.creator_id, p]));
  const platformGross = (data?.earnings ?? []).reduce((s, r) => s + Number(r.platform_commission), 0);
  const creatorGross = (data?.earnings ?? []).reduce((s, r) => s + Number(r.creator_amount), 0);
  const providerFees = (data?.earnings ?? []).reduce((s, r) => s + Number(r.provider_fee ?? 0), 0);
  const netPlatform = (data?.earnings ?? []).reduce((s, r) => s + Number(r.platform_commission) - (r.fee_mode === "inclusive" ? Number(r.provider_fee ?? 0) : 0), 0);
  return <section className="space-y-5"><div><h2 className="text-2xl font-bold">Creator commissions & payouts</h2><p className="text-sm text-slate-600">Configure rates for future successful course payments. Existing earning records keep their original rate.</p></div>
    {message && <p role="status" className="rounded bg-slate-100 p-3 text-sm">{message}</p>}
    <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4" onSubmit={(e) => { e.preventDefault(); void update({ kind:"defaults", rate:Number(rate), feeMode }).catch((err:Error) => setMessage(err.message)); }}><label className="text-sm">Default commission (%)<input type="number" min="0" max="100" step="0.1" value={rate} onChange={(e)=>setRate(e.target.value)} className="mt-1 block rounded border p-2" /></label><label className="text-sm">Paystack processing fee bearer<select value={feeMode} onChange={(e)=>setFeeMode(e.target.value)} className="mt-1 block rounded border p-2"><option value="inclusive">AdventSkool bears fee (inclusive)</option><option value="exclusive">Creator bears fee (exclusive)</option></select></label><button className="rounded bg-blue-700 px-4 py-2 text-white">Save defaults</button><p className="basis-full text-xs text-slate-500">The fee bearer is applied to future split transactions only. Customer checkout amounts are unchanged.</p></form>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Recorded platform commission</p><p className="text-xl font-semibold">{formatKsh(platformGross)}</p></article><article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Net platform earnings</p><p className="text-xl font-semibold">{formatKsh(netPlatform)}</p></article><article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Recorded creator earnings</p><p className="text-xl font-semibold">{formatKsh(creatorGross)}</p></article><article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Paystack fees reported</p><p className="text-xl font-semibold">{formatKsh(providerFees)}</p></article></div>
    <div className="space-y-3">{(data?.teachers ?? []).map((teacher) => { const payout = payouts.get(teacher.id); const setting = rates.get(teacher.id); return <CreatorRow key={teacher.id} teacher={teacher} payout={payout} setting={setting} defaultRate={Number(data?.settings?.default_commission_percent ?? 10)} defaultFee={String(data?.settings?.default_fee_mode ?? "inclusive")} save={(body)=>update(body).catch((err:Error)=>setMessage(err.message))} />; })}</div>
    <div className="overflow-x-auto rounded-lg border bg-white"><h3 className="p-4 font-semibold">Recent transaction breakdowns</h3><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Creator","Reference","Date","Customer paid","Rate","Platform","Creator","Paystack fee","Routing"].map((x)=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{(data?.earnings ?? []).map((r)=><tr key={r.id} className="border-t"><td className="p-3">{r.creator?.full_name ?? r.creator_id}</td><td className="p-3 font-mono text-xs">{r.payment_reference ?? "—"}</td><td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td><td className="p-3">{formatKsh(Number(r.gross_amount))}</td><td className="p-3">{r.commission_percent}%</td><td className="p-3">{formatKsh(Number(r.platform_commission))}</td><td className="p-3">{formatKsh(Number(r.creator_amount))}</td><td className="p-3">{r.provider_fee == null ? "Not reported" : formatKsh(Number(r.provider_fee))}</td><td className="p-3">{r.settlement_mode === "paystack_split" ? "Paystack subaccount" : "Platform balance"}</td></tr>)}</tbody></table></div>
    <p className="text-sm text-slate-600">Net platform earnings deduct actual Paystack fees when the platform carries them. “Routed to Paystack” means a split was accepted for the transaction; confirm the actual bank settlement in Paystack’s settlement report.</p>
  </section>;
}

function CreatorRow({teacher,payout,setting,defaultRate,defaultFee,save}:{teacher: Teacher; payout?: Payout; setting?: CommissionSetting; defaultRate:number; defaultFee:string; save:(body:object)=>void}) {
  const [rate,setRate]=useState(String(setting?.commission_percent ?? "")); const [mode,setMode]=useState(String(setting?.fee_mode ?? defaultFee));
  return <article className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1.2fr_1fr_1.5fr_auto] lg:items-center"><div><p className="font-semibold">{teacher.full_name || "Teacher"}</p><p className="text-sm text-slate-500">{teacher.email}</p></div><div className="text-sm">{payout ? <><p>{payout.bank_name} · {payout.account_holder_name}</p><p>Account ending {payout.account_last4 || "????"}</p><p>Verification: {payout.verification_status}</p><p>Paystack routing: {payout.payout_status}</p></> : <p className="text-slate-500">Payout details not submitted</p>}</div><div className="flex flex-wrap items-center gap-2"><label className="text-xs">Commission %<input aria-label={`Commission for ${teacher.full_name}`} type="number" min="0" max="100" step="0.1" value={rate} placeholder={`${defaultRate} default`} onChange={(e)=>setRate(e.target.value)} className="ml-1 w-24 rounded border p-2 text-sm" /></label><select aria-label="Processing fee bearer" value={mode} onChange={(e)=>setMode(e.target.value)} className="rounded border p-2 text-sm"><option value="inclusive">Platform bears fee</option><option value="exclusive">Creator bears fee</option></select><button onClick={()=>save({kind:"creator",creatorId:teacher.id,rate:rate === "" ? defaultRate : Number(rate),feeMode:mode})} className="rounded bg-slate-800 px-3 py-2 text-xs text-white">Save rate</button></div>{payout && <button onClick={()=>save({kind:"verification",creatorId:teacher.id,status:payout.verification_status === "verified" ? "pending" : "verified"})} className="rounded border px-3 py-2 text-xs">{payout.verification_status === "verified" ? "Mark pending" : "Verify bank & enable"}</button>}</article>;
}
