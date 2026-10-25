"use client";

import { useCallback, useEffect } from "react";
import { CreditCard, Download, Landmark, ReceiptText } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiRequest } from "@/lib/api/client";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { listAdventPayInvoices, startAdventPayPayment } from "@/services/adventPayService";
import type { AdventPayInvoice } from "@/types/adventPay";

function status(invoice: AdventPayInvoice) {
  if (invoice.status === "pending" && invoice.dueDate < new Date().toISOString().slice(0, 10)) return "overdue";
  return invoice.status;
}

export default function AdventPayPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const load = useCallback(() => listAdventPayInvoices(), []);
  const { data: invoices, isLoading, errorMessage, reload } = useAsyncData(load, [load]);
  const verify = useAsyncAction({ action: async () => { if (reference) await apiRequest(`/api/advent-pay/verify?reference=${encodeURIComponent(reference)}`); }, successMessage: "Your Paystack payment was confirmed. Your receipt is ready.", onSuccess: reload });
  const pay = useAsyncAction({ action: startAdventPayPayment, onSuccess: ({ authorizationUrl }) => { window.location.assign(authorizationUrl); } });

  useEffect(() => { if (reference?.startsWith("ap_")) void verify.run(); }, [reference, verify.run]);

  if (isLoading) return <PageSkeleton label="Loading Advent Pay invoices…" variant="cards" />;
  const pending = (invoices ?? []).filter((invoice) => invoice.status !== "paid" && invoice.status !== "void");
  const nextDue = pending.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return <section className="mx-auto w-full max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Advent Pay</h1><p className="text-sm text-slate-600 dark:text-slate-300">Your invoices, secure payments, and professional receipts in one place.</p></div>
    {verify.status === "loading" ? <StatusCard kind="loading" title="Confirming your Paystack payment" description="Please wait while we verify it securely." /> : null}
    {verify.status === "success" ? <StatusCard kind="success" title="Payment confirmed" description={verify.successMessage} /> : null}
    {verify.status === "error" ? <StatusCard kind="warning" title="Payment is still pending" description={verify.errorMessage} actions={<Button variant="secondary" size="sm" onClick={() => void verify.run()}>Check again</Button>} /> : null}
    {errorMessage ? <StatusCard kind="error" title="Could not load Advent Pay" description={errorMessage} actions={<Button size="sm" onClick={reload}>Try again</Button>} /> : null}
    <Card><CardHeader title="Account status" /><CardBody><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-sm text-slate-500 dark:text-slate-400">Outstanding balance</p><p className="text-2xl font-bold text-slate-950 dark:text-white">{formatKsh(pending.reduce((sum, i) => sum + i.amount, 0))}</p></div><div><p className="text-sm text-slate-500 dark:text-slate-400">Next billing date</p><p className="text-2xl font-bold text-slate-950 dark:text-white">{nextDue ? new Date(`${nextDue.dueDate}T12:00:00`).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "No upcoming invoice"}</p></div></div></CardBody></Card>
    <Card><CardHeader title="Invoices & payment history" description="Pay open invoices or download receipts for confirmed payments." /><CardBody><div className="space-y-3">{(invoices ?? []).map((invoice) => { const effectiveStatus = status(invoice); return <article key={invoice.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950 dark:text-white">{invoice.invoiceNumber}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${effectiveStatus === "paid" ? "bg-emerald-100 text-emerald-800" : effectiveStatus === "overdue" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{effectiveStatus}</span></div><p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{invoice.description}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due {new Date(`${invoice.dueDate}T12:00:00`).toLocaleDateString("en-KE", { dateStyle: "medium" })} · {invoice.paymentMethod === "paystack" ? "Paystack" : "Till payment"}</p></div><div className="shrink-0 text-left sm:text-right"><p className="text-lg font-bold text-slate-950 dark:text-white">{formatKsh(invoice.amount)}</p>{invoice.status === "paid" ? <a href={`/api/advent-pay/invoices/${invoice.id}/receipt`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300"><Download className="h-4 w-4" /> Download receipt</a> : invoice.paymentMethod === "paystack" ? <Button className="mt-2" size="sm" loading={pay.isLoading} loadingText="Opening payment…" onClick={() => void pay.run(invoice.id)}><CreditCard className="h-4 w-4" /> Pay now</Button> : null}</div></div>{invoice.status !== "paid" && invoice.paymentMethod === "till" ? <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"><p className="font-semibold"><Landmark className="mr-1 inline h-4 w-4" /> Pay through Till</p><p className="mt-1">{invoice.tillName ? `${invoice.tillName}: ` : "Till number: "}<strong>{invoice.tillNumber}</strong></p>{invoice.tillInstructions ? <p className="mt-1 whitespace-pre-wrap">{invoice.tillInstructions}</p> : null}<p className="mt-2 text-xs">Use invoice {invoice.invoiceNumber} as your payment reference. We will issue your receipt once payment is confirmed.</p></div> : null}</article>; })}</div>{!invoices?.length ? <StatusCard kind="info" title="No invoices yet" description="When AdventSkool sends an invoice to your account, it will appear here with its payment instructions." /> : null}</CardBody></Card>
    <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><ReceiptText className="h-4 w-4" /> Receipts are generated only after a payment is confirmed.</p>
  </section>;
}
