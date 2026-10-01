"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";

type PayoutData = {
  payout: { account_holder_name: string; bank_name: string; bank_code: string; account_last4: string; phone_number: string; verification_status: string; payout_status: string } | null;
  commission: { commission_percent: number; fee_mode: string } | null;
  earnings: Array<{ gross_amount: number; commission_percent: number; platform_commission: number; creator_amount: number; provider_fee: number | null; payout_status: string; settlement_mode: string; payment_reference: string | null; created_at: string }>;
};
type Bank = { code: string; name: string };

export default function TeacherPayoutsPage() {
  const { profile } = useAuth();
  const { isAllowed, loading } = useRoleGuard(["teacher"]);
  const [data, setData] = useState<PayoutData | null>(null);
  const [form, setForm] = useState({ accountHolderName: "", bankCode: "", accountNumber: "", phoneNumber: "" });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/creator/payout");
    if (!response.ok) throw new Error("Could not load payout settings.");
    const result = await response.json() as PayoutData;
    setData(result);
    const payout = result.payout;
    if (payout) setForm((current) => ({ ...current, accountHolderName: payout.account_holder_name, bankCode: payout.bank_code, accountNumber: "" }));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async request; state changes after the response arrives.
  useEffect(() => { if (profile && isAllowed) void load().catch((error: Error) => setMessage(error.message)); }, [profile, isAllowed]);
  useEffect(() => {
    if (!profile || !isAllowed) return;
    void fetch("/api/paystack/banks").then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load banks.");
      setBanks(result.banks as Bank[]);
    }).catch((error: Error) => setMessage(error.message));
  }, [profile, isAllowed]);

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
  const routed = earnings.filter((row) => row.payout_status === "routed").reduce((sum, row) => sum + Number(row.creator_amount), 0);
  const payoutReady = data?.payout?.verification_status === "verified" && data.payout.payout_status === "ready";
  const payoutStatus = !data?.payout ? "Not set up" : payoutReady ? "Verified" : data.payout.verification_status === "rejected" ? "Needs changes" : "Pending review";
  return <section className="max-w-3xl space-y-5">
    <div><h2 className="text-2xl font-bold text-slate-900">Payout details</h2><p className="mt-1 text-sm text-slate-600">Add the account where AdventSkool can send your creator earnings. Only you and administrators can access these details.</p></div>
    <form onSubmit={save} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
      <label className="space-y-1 text-sm font-medium text-slate-700">Account holder name<input required value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">Kenyan bank<select required value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2"><option value="">Select your bank</option>{banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">Account number<input required inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">Phone number<input required type="tel" autoComplete="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <p className="md:col-span-2 text-xs text-slate-500">Paystack creates the payout subaccount from these details. AdventSkool stores the Paystack subaccount reference and last four digits, not your account number.</p>
      <div className="flex items-end"><button disabled={saving} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save payout details"}</button></div>
      {message && <p className="md:col-span-2 text-sm text-slate-700" role="status">{message}</p>}
    </form>
    <div className="grid gap-3 sm:grid-cols-4">
      <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Commission</p><p className="text-xl font-semibold">{data?.commission?.commission_percent ?? 10}%</p><p className="text-xs text-slate-500">{data?.commission?.fee_mode === "exclusive" ? "Creator bears Paystack fee" : "AdventSkool bears Paystack fee"}</p></article>
      <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Recorded earnings</p><p className="text-xl font-semibold">{formatKsh(total)}</p></article>
      <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Pending payout</p><p className="text-xl font-semibold">{formatKsh(pending)}</p></article>
      <article className="rounded-lg border bg-white p-4"><p className="text-sm text-slate-500">Sent for payout</p><p className="text-xl font-semibold">{formatKsh(routed)}</p></article>
    </div>
    <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">Payout account status: <strong>{payoutStatus}</strong>{data?.payout ? ` · ${data.payout.bank_name} · account ending ${data.payout.account_last4}` : ""}.</p>
    <p className={`rounded-md p-3 text-sm ${payoutReady ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900"}`}>{payoutReady
      ? "Your payout account is verified. You will receive your share from new course sales in this account. Paystack sends the money on its normal schedule. Earlier sales will not be sent automatically."
      : data?.payout?.verification_status === "rejected"
        ? "Your payout account needs changes before you can receive money from course sales. Please contact AdventSkool support."
        : data?.payout
          ? "Your payout account is waiting for review. You will be able to receive money from new course sales after it is approved."
          : "Add your payout account details, then wait for AdventSkool to review them. You can receive money from course sales after approval."}</p>
    <div className="overflow-x-auto rounded-lg border bg-white"><h3 className="p-4 font-semibold">Earnings history</h3><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Date","Payment reference","Sale amount","AdventSkool fee","Your share","Payment fee","Status"].map((x) => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{earnings.map((row, i) => <tr key={`${row.created_at}-${i}`} className="border-t"><td className="p-3">{new Date(row.created_at).toLocaleDateString()}</td><td className="p-3 font-mono text-xs">{row.payment_reference ?? "—"}</td><td className="p-3">{formatKsh(Number(row.gross_amount))}</td><td className="p-3">{row.commission_percent}%</td><td className="p-3">{formatKsh(Number(row.creator_amount))}</td><td className="p-3">{row.provider_fee == null ? "Not reported" : formatKsh(Number(row.provider_fee))}</td><td className="p-3">{row.payout_status === "routed" ? "Sent for payout" : row.payout_status === "pending" ? "Waiting for payment" : row.payout_status}</td></tr>)}{earnings.length === 0 && <tr><td colSpan={7} className="p-4 text-slate-500">Earnings will appear after successful sales are recorded.</td></tr>}</tbody></table></div>
  </section>;
}
