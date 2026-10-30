"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { apiRequest } from "@/lib/api/client";
import { formatKsh } from "@/lib/utils/formatCurrency";

type Transaction = { id: string; created_at: string; payment_reference: string | null; gross_amount: number; commission_percent: number; platform_commission: number; creator_amount: number; provider_fee: number | null; payout_status: string; settlement_mode: string; creator: { full_name: string; email: string } | null };
type Response = { transactions: Transaction[]; total: number; pageSize: number };
export default function CreatorTransactionsPage() {
  const { isAllowed, loading } = useRoleGuard(["admin"]);
  const [page, setPage] = useState(1);
  const { data, isLoading, errorMessage, reload } = useAsyncData<Response>(async () => apiRequest(`/api/admin/creator-payouts/transactions?page=${page}`), [page]);
  if (loading || !isAllowed || isLoading) return <PageSkeleton label="Loading creator transactions" variant="cards" />;
  if (errorMessage || !data) return <StatusCard kind="error" title="Could not load transactions" description={errorMessage} actions={<Button variant="secondary" onClick={reload}>Try again</Button>} />;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return <section className="space-y-5"><div><Link href="/dashboard/admin/creator-payouts" className="text-sm font-semibold text-blue-700 underline dark:text-blue-300">Back to creator payouts</Link><h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Transaction breakdowns</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{data.total.toLocaleString()} recorded transactions, newest first.</p></div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><ol start={(page - 1) * data.pageSize + 1} className="divide-y divide-slate-100 dark:divide-slate-800">{data.transactions.map((r, index) => <li key={r.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 p-4"><span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{(page - 1) * data.pageSize + index + 1}</span><div className="grid min-w-0 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4"><div className="min-w-0"><p className="break-words font-semibold text-slate-900 dark:text-white">{r.creator?.full_name || r.creator?.email || "Creator"}</p><p className="break-all font-mono text-xs text-slate-500 dark:text-slate-400">{r.payment_reference || "No reference"}</p><p className="text-xs text-slate-500 dark:text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p></div><p className="text-slate-600 dark:text-slate-300">Customer paid: {formatKsh(Number(r.gross_amount))}<br />Platform: {formatKsh(Number(r.platform_commission))} ({r.commission_percent}%)</p><p className="text-slate-600 dark:text-slate-300">Creator: {formatKsh(Number(r.creator_amount))}<br />Paystack fee: {r.provider_fee == null ? "Not reported" : formatKsh(Number(r.provider_fee))}</p><p className="text-slate-600 dark:text-slate-300">{r.settlement_mode === "paystack_split" ? "Paystack subaccount" : "Platform balance"}<br /><span className="capitalize">{r.payout_status}</span></p></div></li>)}</ol>{data.transactions.length === 0 ? <div className="p-4"><StatusCard kind="info" title="No transactions on this page" /></div> : null}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600 dark:text-slate-300">Page {page} of {pages}</p><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    <StatusCard kind="info" title="About settlement" description="Routing to Paystack does not confirm bank settlement. Check Paystack settlement reports." />
  </section>;
}
