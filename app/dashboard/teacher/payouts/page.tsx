"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";

type PayoutData = {
  payout: { account_holder_name: string; bank_name: string; bank_code: string; account_number: string; phone_number: string; verification_status: string; payout_status: string } | null;
  commission: { commission_percent: number; fee_mode: string } | null;
  earnings: Array<{ gross_amount: number; commission_percent: number; platform_commission: number; creator_amount: number; provider_fee: number | null; payout_status: string; created_at: string }>;
};

export default function TeacherPayoutsPage() {
  const { profile } = useAuth();
  const { isAllowed, loading } = useRoleGuard(["teacher"]);
  const [data, setData] = useState<PayoutData | null>(null);
  const [form, setForm] = useState({ accountHolderName: "", bankName: "", bankCode: "", accountNumber: "", phoneNumber: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/creator/payout");
    if (!response.ok) throw new Error("Could not load payout settings.");
    const result = await response.json() as PayoutData;
    setData(result);
    if (result.payout) setForm({ accountHolderName: result.payout.account_holder_name, bankName: result.payout.bank_name, bankCode: result.payout.bank_code, accountNumber: result.payout.account_number, phoneNumber: result.payout.phone_number });
  }

  useEffect(() => { if (profile && isAllowed) void load().catch((error: Error) => setMessage(error.message)); }, [profile, isAllowed]);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/creator/payout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save payout details.");
      await load(); setMessage("Payout details saved. Verification is pending.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save payout details."); }
    finally { setSaving(false); }
  }

  if (loading || !isAllowed) return <p>Loading payout settings…</p>;
  const earnings = data?.earnings ?? [];
  const total = earnings.reduce((sum, row) => sum + Number(row.creator_amount), 0);
  const pending = earnings.filter((row) => row.payout_status === "pending").reduce((sum, row) => sum + Number(row.creator_amount), 0);
  return <section className="max-w-3xl space-y-5">
    <div><h2 className="text-2xl font-bold text-slate-900">Payout details</h2><p className="mt-1 text-sm text-slate-600">Add the account where AdventSkool can send your creator earnings. Only you and administrators can access these details.</p></div>
    <form onSubmit={save} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
      {([["accountHolderName","Account holder name"],["bankName","Bank name"],["bankCode","Bank code (optional)"],["accountNumber","Account number"],["phoneNumber","Phone number"]] as const).map(([key,label]) => <label key={key} className="space-y-1 text-sm font-medium text-slate-700">{label}<input required={key !== "bankCode"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>)}
      <div className="flex items-end"><button disabled={saving} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save payout details"}</button></div>
      {message && <p className="md:col-span-2 text-sm text-slate-700" role="status">{message}</p>}
    </form>
    <div className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Commission</p><p className="text-xl font-semibold">{data?.commission?.commission_percent ?? 10}%</p><p className="text-xs text-slate-500">{data?.commission?.fee_mode ?? "inclusive"} processing fees</p></article>
      <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Recorded earnings</p><p className="text-xl font-semibold">{formatKsh(total)}</p></article>
      <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Pending payout</p><p className="text-xl font-semibold">{formatKsh(pending)}</p></article>
    </div>
    <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Payout verification: {data?.payout?.verification_status ?? "Details not submitted"}. Payout transfers are not yet automated; payment-provider fees are shown only when settlement data is available.</p>
    <div className="overflow-x-auto rounded-lg border bg-white"><h3 className="p-4 font-semibold">Earnings history</h3><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Date","Gross","Rate","Creator amount","Provider fee","Status"].map((x) => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{earnings.map((row, i) => <tr key={`${row.created_at}-${i}`} className="border-t"><td className="p-3">{new Date(row.created_at).toLocaleDateString()}</td><td className="p-3">{formatKsh(Number(row.gross_amount))}</td><td className="p-3">{row.commission_percent}%</td><td className="p-3">{formatKsh(Number(row.creator_amount))}</td><td className="p-3">{row.provider_fee == null ? "Not reported" : formatKsh(Number(row.provider_fee))}</td><td className="p-3">{row.payout_status}</td></tr>)}{earnings.length === 0 && <tr><td colSpan={6} className="p-4 text-slate-500">Earnings will appear after successful sales are recorded.</td></tr>}</tbody></table></div>
  </section>;
}
