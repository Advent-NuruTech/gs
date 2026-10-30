"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Eye, X } from "lucide-react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatCard from "@/components/ui/StatCard";
import StatusCard from "@/components/ui/StatusCard";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { listPayments } from "@/services/paymentService";
import { planLabel } from "@/lib/payments/plans";
import { Payment } from "@/types/payment";

const STATUS_STYLES: Record<Payment["status"], string> = {
  success: "text-emerald-700",
  failed: "text-red-700",
  pending: "text-amber-700",
  cancelled: "text-slate-500",
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isAllowed, loading: roleGuardLoading } = useRoleGuard(["admin"]);
  const { pushToast } = useNotificationContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [selected, setSelected] = useState<Payment | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selected && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [selected]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      setPayments(await listPayments());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load payments.";
      setErrorMessage(message);
      pushToast(message, "error");
      if (message.toLowerCase().includes("auth")) router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [pushToast, router]);

  useEffect(() => {
    if (!isAllowed || !profile) return;
    void load();
  }, [isAllowed, load, profile]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((payment) =>
      (status === "all" || payment.status === status) && [
        payment.fullName,
        payment.email,
        payment.phone,
        payment.courseId,
        payment.courseTitle ?? "",
        payment.paystackReference,
        payment.status,
        payment.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [payments, search, status]);

  const totals = useMemo(() => {
    const success = payments.filter((p) => p.status === "success");
    const revenue = success.reduce((sum, p) => sum + p.amount, 0);
    return { count: success.length, revenue };
  }, [payments]);

  if (roleGuardLoading || !isAllowed || loading) return <PageSkeleton label="Loading payments" variant="cards" />;

  return <section className="space-y-5"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Finance</p><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Payments</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Recent course payment records, up to the database response limit. Access is granted automatically after successful payment.</p></div>
    {errorMessage ? <StatusCard kind="error" title="Could not load payments" description={errorMessage} actions={<button type="button" onClick={()=>void load()} className="font-semibold underline">Try again</button>} /> : <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Successful payments" value={totals.count} /><StatCard label="Successful payment value" value={formatKsh(totals.revenue)} /><StatCard label="Pending payments" value={payments.filter(p=>p.status === "pending").length} /><StatCard label="Loaded payments" value={payments.length} /></div>
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_12rem]"><Input label="Search payments" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Name, email, course or reference" /><label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Status<select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"><option value="all">All statuses</option><option value="success">Successful</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></label></div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-200 p-4 dark:border-slate-700"><h2 className="font-semibold text-slate-950 dark:text-white">Payment records</h2><p className="text-sm text-slate-500 dark:text-slate-400">{filteredPayments.length} payments shown</p></div><ol className="divide-y divide-slate-100 dark:divide-slate-800">{filteredPayments.map((payment,index)=><li key={payment.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 p-4"><span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{index+1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p className="break-words font-semibold text-slate-900 dark:text-white">{payment.fullName || payment.email || "Customer"}</p><span className={`text-xs font-semibold capitalize ${STATUS_STYLES[payment.status]} dark:text-slate-300`}>{payment.status}</span></div><p className="break-words text-sm text-slate-500 dark:text-slate-400">{payment.courseTitle || "Course payment"} ? {formatKsh(payment.amount)}</p><p className="break-all font-mono text-xs text-slate-500 dark:text-slate-400">{payment.paystackReference || "No reference"}</p></div><button type="button" onClick={()=>setSelected(payment)} aria-label={`View payment details for ${payment.fullName || payment.email}`} className="rounded-lg border border-slate-200 p-2 text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800"><Eye className="h-5 w-5" /></button></li>)}</ol>{filteredPayments.length===0 ? <div className="p-4"><StatusCard kind="info" title="No payments found" description="Try another search or status." /></div> : null}</section>
    {selected ? <dialog ref={dialogRef} onClose={()=>setSelected(null)} aria-labelledby="payment-details-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><h2 id="payment-details-title" className="text-lg font-semibold text-slate-950 dark:text-white">Payment details</h2><p className="text-sm capitalize text-slate-500 dark:text-slate-400">{selected.status}</p></div><button type="button" onClick={()=>setSelected(null)} aria-label="Close payment details" className="rounded p-2 text-slate-600 dark:text-slate-300"><X className="h-5 w-5" /></button></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">{[["Customer",selected.fullName],["Email",selected.email],["Phone",selected.phone],["Amount",formatKsh(selected.amount)],["Course",selected.courseTitle || "Not available"],["Plan",`${planLabel(selected.planType)} (${selected.lessonIds.length} lessons)`],["Reference",selected.paystackReference],["Created",selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "Not available"],["Paid",selected.paidAt ? new Date(selected.paidAt).toLocaleString() : "Not yet paid"]].map(([label,value])=><div key={label} className="min-w-0"><dt className="font-semibold text-slate-700 dark:text-slate-200">{label}</dt><dd className="mt-1 break-all text-slate-600 dark:text-slate-300">{value || "Not available"}</dd></div>)}</dl>{selected.courseId ? <Link href={`/courses/${selected.courseId}`} className="mt-5 inline-block text-sm font-semibold text-blue-700 underline dark:text-blue-300">Open course</Link> : null}</dialog> : null}
    </>}
  </section>;
}
