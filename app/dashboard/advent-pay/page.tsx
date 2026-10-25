"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, CreditCard, Download, Landmark, ReceiptText, WalletCards } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiRequest } from "@/lib/api/client";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { getAdventPaySummary, listAdventPayInvoices, startAdventPayPayment } from "@/services/adventPayService";
import type { AdventPayInvoice, AdventPayInvoiceFilter } from "@/types/adventPay";

type CustomerTab = AdventPayInvoiceFilter | "recurring";

const customerTabs: Array<{ value: CustomerTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "recurring", label: "Recurring" },
];

function effectiveStatus(invoice: AdventPayInvoice) {
  if (invoice.status === "pending" && invoice.dueDate < new Date().toISOString().slice(0, 10)) return "overdue";
  return invoice.status;
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("en-KE", { dateStyle: "medium" });
}

function dueLabel(dueDate: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((new Date(`${dueDate}T12:00:00`).getTime() - today) / 86_400_000);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}

export default function AdventPayPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [tab, setTab] = useState<CustomerTab>("all");
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    const [invoicePage, summary] = await Promise.all([
      listAdventPayInvoices({ page, status: tab === "recurring" ? "all" : tab, billingType: tab === "recurring" ? "recurring" : "all" }),
      getAdventPaySummary(),
    ]);
    return { invoicePage, summary };
  }, [page, tab]);
  const { data, isLoading, errorMessage, reload } = useAsyncData(load, [load]);
  const verify = useAsyncAction({ action: async () => { if (reference) await apiRequest(`/api/advent-pay/verify?reference=${encodeURIComponent(reference)}`); }, successMessage: "Your Paystack payment was confirmed. Your receipt is ready.", onSuccess: reload });
  const pay = useAsyncAction({ action: startAdventPayPayment, onSuccess: ({ authorizationUrl }) => { window.location.assign(authorizationUrl); } });
  const copyTill = useAsyncAction({ action: async (tillNumber: string) => { if (!navigator.clipboard) throw new Error("Clipboard access is unavailable. Please copy the Till number manually."); await navigator.clipboard.writeText(tillNumber); }, successMessage: "Till number copied to your clipboard." });

  useEffect(() => { if (reference?.startsWith("ap_")) void verify.run(); }, [reference, verify.run]);
  if (isLoading && !data) return <PageSkeleton label="Loading AdventPay invoices…" variant="cards" />;

  const invoicePage = data?.invoicePage;
  const summary = data?.summary;
  return <section className="mx-auto w-full max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-950 dark:text-white">AdventPay</h1><p className="text-sm text-slate-600 dark:text-slate-300">Your invoices, secure payments, and professional PDF receipts in one place.</p></div>
    {verify.status === "loading" ? <StatusCard kind="loading" title="Confirming your Paystack payment" description="Please wait while we verify it securely." /> : null}
    {verify.status === "success" ? <StatusCard kind="success" title="Payment confirmed" description={verify.successMessage} /> : null}
    {verify.status === "error" ? <StatusCard kind="warning" title="Payment is still pending" description={verify.errorMessage} actions={<Button variant="secondary" size="sm" onClick={() => void verify.run()}>Check again</Button>} /> : null}
    {copyTill.status === "success" ? <StatusCard kind="success" title="Till number copied" description={copyTill.successMessage} /> : null}
    {copyTill.status === "error" ? <StatusCard kind="error" title="Could not copy Till number" description={copyTill.errorMessage} /> : null}
    {errorMessage ? <StatusCard kind="error" title="Could not load AdventPay" description={errorMessage} actions={<Button size="sm" onClick={reload}>Try again</Button>} /> : null}
    {isLoading && data ? <StatusCard kind="loading" title="Updating invoices" description="Loading the selected invoice view." /> : null}
    <Card><CardHeader title="Account status" description="Recurring dates stay on their original schedule, even if a payment is late." /><CardBody><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"><div className="min-w-0 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30"><p className="flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-200"><WalletCards className="h-3.5 w-3.5 shrink-0" /> Total paid</p><p className="mt-1 break-words text-lg font-bold text-slate-950 dark:text-white">{formatKsh(summary?.paidTotal ?? 0)}</p><p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">{summary?.paidCount ?? 0} confirmed payment{summary?.paidCount === 1 ? "" : "s"}</p></div><div className="min-w-0 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30"><p className="text-xs font-medium text-amber-800 dark:text-amber-200">Outstanding balance</p><p className="mt-1 break-words text-lg font-bold text-slate-950 dark:text-white">{formatKsh(summary?.outstandingTotal ?? 0)}</p></div><div className="min-w-0 rounded-lg bg-sky-50 p-3 dark:bg-sky-950/30"><p className="text-xs font-medium text-sky-800 dark:text-sky-200">Payment due</p><p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{summary?.nextDueDate ? formatDate(summary.nextDueDate) : "No open invoice"}</p>{summary?.nextDueDate ? <p className="mt-1 text-xs text-sky-800 dark:text-sky-200">{dueLabel(summary.nextDueDate)}</p> : null}</div><div className="min-w-0 rounded-lg bg-violet-50 p-3 dark:bg-violet-950/30"><p className="text-xs font-medium text-violet-800 dark:text-violet-200">Next recurring billing</p><p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{summary?.nextScheduledDueDate ? formatDate(summary.nextScheduledDueDate) : "Not scheduled"}</p>{summary?.nextScheduledDueDate ? <p className="mt-1 text-xs text-violet-800 dark:text-violet-200">{dueLabel(summary.nextScheduledDueDate)}</p> : null}</div><div className="min-w-0 rounded-lg bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs font-medium text-slate-600 dark:text-slate-300">Open invoices</p><p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{summary?.pendingCount ?? 0}</p></div></div></CardBody></Card>
    <Card><CardHeader title="Invoices & payment history" description="Filter your history, pay open invoices, or download confirmed receipts." /><CardBody><nav className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Invoice filters">{customerTabs.map((item) => <button key={item.value} type="button" aria-current={tab === item.value ? "page" : undefined} onClick={() => { setTab(item.value); setPage(1); }} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${tab === item.value ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}>{item.label}</button>)}</nav>
      <div className="space-y-3">{invoicePage?.invoices.map((invoice) => {
        const status = effectiveStatus(invoice);
        return <article key={invoice.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950 dark:text-white">{invoice.invoiceNumber}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status === "paid" ? "bg-emerald-100 text-emerald-800" : status === "overdue" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{status}</span>{invoice.billingType === "recurring" ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">Recurring {invoice.recurrenceInterval}</span> : null}</div><p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{invoice.description}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Issued {formatDate(invoice.createdAt)} · Due {formatDate(invoice.dueDate)} · {invoice.paymentMethod === "paystack" ? "Paystack" : "Till payment"}</p>{status !== "paid" && status !== "void" ? <p className={`mt-1 text-sm font-semibold ${status === "overdue" ? "text-red-700 dark:text-red-300" : "text-sky-700 dark:text-slate-300"}`}>{dueLabel(invoice.dueDate)}</p> : null}</div><div className="shrink-0 text-left sm:text-right"><p className="text-lg font-bold text-slate-950 dark:text-white">{formatKsh(invoice.amount)}</p>{invoice.status === "paid" ? <a href={`/api/advent-pay/invoices/${invoice.id}/receipt`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300"><Download className="h-4 w-4" /> Download receipt</a> : invoice.paymentMethod === "paystack" && status !== "void" ? <Button className="mt-2" size="sm" loading={pay.isLoading} loadingText="Opening payment…" onClick={() => void pay.run(invoice.id)}><CreditCard className="h-4 w-4" /> Pay now</Button> : null}</div></div>
          {invoice.status !== "paid" && status !== "void" && invoice.paymentMethod === "till" ? <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"><p className="font-semibold"><Landmark className="mr-1 inline h-4 w-4" /> Pay through Till</p><p className="mt-1 text-xs font-medium text-blue-800 dark:text-blue-200">Payment for: {invoice.description}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span>{invoice.tillName ? `${invoice.tillName}: ` : "Till number: "}<strong>{invoice.tillNumber}</strong></span><Button variant="secondary" size="sm" loading={copyTill.isLoading} loadingText="Copying…" onClick={() => void copyTill.run(invoice.tillNumber ?? "")}><Copy className="h-3.5 w-3.5" /> Copy Till</Button></div>{invoice.tillInstructions ? <p className="mt-2 whitespace-pre-wrap">{invoice.tillInstructions}</p> : null}<p className="mt-2 text-xs">Use invoice {invoice.invoiceNumber} as your payment reference. We will issue your receipt once payment is confirmed.</p></div> : null}
        </article>;
      })}</div>
      {!invoicePage?.invoices.length ? <StatusCard kind="info" title="No matching invoices" description="Try another filter, or check back when a new invoice is issued." /> : null}
      {invoicePage && invoicePage.totalPages > 1 ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="text-sm text-slate-600 dark:text-slate-300">Showing {(invoicePage.page - 1) * invoicePage.pageSize + 1}–{Math.min(invoicePage.page * invoicePage.pageSize, invoicePage.total)} of {invoicePage.total}</p><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={invoicePage.page === 1 || isLoading} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={invoicePage.page >= invoicePage.totalPages || isLoading} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div> : null}
    </CardBody></Card>
    <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><ReceiptText className="h-4 w-4" /> Receipts are generated only after a payment is confirmed.</p>
  </section>;
}
