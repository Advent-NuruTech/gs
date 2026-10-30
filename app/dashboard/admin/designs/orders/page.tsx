"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Eye, X } from "lucide-react";
import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatCard from "@/components/ui/StatCard";
import StatusCard from "@/components/ui/StatusCard";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { listDesignOrders, updateDesignOrderStatus } from "@/services/designOrderService";
import { DesignOrder, DesignOrderStatus } from "@/types/designOrder";

function truncateTitle(title: string): string {
  const words = title.trim().split(/\s+/);
  return words.length > 8 ? `${words.slice(0, 8).join(" ")}\u2026` : title.trim();
}

const ORDER_STATUSES: DesignOrderStatus[] = ["pending", "in_progress", "completed", "delivered"];

const STATUS_STYLES: Record<DesignOrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  delivered: "bg-indigo-50 text-indigo-700",
};

export default function AdminDesignOrdersPage() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const { pushToast } = useNotificationContext();
  const [orders, setOrders] = useState<DesignOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selectedId && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await listDesignOrders());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load orders.";
      setFeedback({ kind: "error", message });
      pushToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (isAllowed) void load();
  }, [isAllowed, load]);

  const paidOrders = useMemo(() => orders.filter((o) => o.paymentStatus === "success"), [orders]);
  const revenue = useMemo(() => paidOrders.reduce((sum, o) => sum + o.amount, 0), [paidOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Only show orders that were actually paid for (the source of truth for work).
    const base = paidOrders;
    return base.filter((o) =>
      (statusFilter === "all" || o.orderStatus === statusFilter) && [o.fullName, o.email, o.phone, o.whatsapp, o.designTitle, o.titleText, o.paystackReference, o.orderStatus]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [paidOrders, search, statusFilter]);

  async function changeStatus(order: DesignOrder, status: DesignOrderStatus) {
    if (savingId) return;
    setSavingId(order.id);
    setFeedback(null);
    try {
      await updateDesignOrderStatus(order.id, status);
      if (status === "completed") {
        pushToast("Marked complete — customer notified by email & SMS.", "success");
      } else {
        pushToast("Order status updated.", "success");
      }
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, orderStatus: status } : item));
      setFeedback({ kind: "success", message: status === "completed" ? "Order marked complete; customer notifications were requested." : "Order status updated." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update status.";
      setFeedback({ kind: "error", message });
      pushToast(message, "error");
    } finally {
      setSavingId(null);
    }
  }

  if (guardLoading || !isAllowed || loading) return <PageSkeleton label="Loading product orders" variant="cards" />;
  const order = orders.find((item) => item.id === selectedId);
  return <section className="space-y-5"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Commerce</p><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Digital Product orders</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Paid orders returned by the database, including free fulfilled orders.</p></div>
    {feedback && !order ? <StatusCard kind={feedback.kind} title={feedback.message} actions={feedback.kind === "error" ? <Button variant="secondary" onClick={()=>void load()}>Retry</Button> : undefined} /> : null}
    <div className="grid grid-cols-2 gap-3"><StatCard label="Paid orders loaded" value={paidOrders.length} /><StatCard label="Order value loaded" value={formatKsh(revenue)} /></div>
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_12rem]"><Input label="Search orders" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Customer, product, phone or reference" /><label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Status<select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"><option value="all">All statuses</option>{ORDER_STATUSES.map((status)=><option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></label></div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-200 p-4 dark:border-slate-700"><h2 className="font-semibold text-slate-950 dark:text-white">Order register</h2><p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} orders shown</p></div><ol className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((item,index)=><li key={item.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 p-4"><span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{index+1}</span><div className="min-w-0"><p className="break-words font-semibold text-slate-900 dark:text-white">{truncateTitle(item.designTitle) || "Digital Product"}</p><p className="break-words text-sm text-slate-500 dark:text-slate-400">{item.fullName || item.email || "Customer"} ? {formatKsh(item.amount)}</p><span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[item.orderStatus]}`}>{item.orderStatus.replace("_", " ")}</span></div><button type="button" onClick={()=>{setFeedback(null);setSelectedId(item.id);}} aria-label={`View order details for ${item.designTitle}`} className="rounded-lg border border-slate-200 p-2 text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800"><Eye className="h-5 w-5" /></button></li>)}</ol>{filtered.length === 0 ? <div className="p-4"><StatusCard kind="info" title="No matching paid orders" description="Try another search or status." /></div> : null}</section>
    {order ? <dialog ref={dialogRef} onClose={()=>setSelectedId(null)} aria-labelledby="order-details-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><h2 id="order-details-title" className="text-lg font-semibold text-slate-950 dark:text-white">Order details</h2><button type="button" onClick={()=>setSelectedId(null)} aria-label="Close order details" className="rounded p-2 text-slate-600 dark:text-slate-300"><X className="h-5 w-5" /></button></div><div className="mt-4 space-y-4">{savingId ? <StatusCard kind="loading" title="Updating order status" /> : null}{feedback ? <StatusCard kind={feedback.kind} title={feedback.message} /> : null}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{order.designTitle}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      order.kind === "download" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                    }`}
                  >
                    {order.kind === "download" ? (order.accessMode === "read_online" ? "Online access" : "Download") : "Customization"}
                  </span>
                </div>
                <p className="break-all text-xs text-slate-500 dark:text-slate-400">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString("en-KE") : ""} ·{" "}
                  <span className="font-mono">{order.paystackReference}</span>
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.orderStatus]}`}>
                {order.orderStatus.replace("_", " ")}
              </span>
            </div>

            <div className="grid gap-1.5 text-sm md:grid-cols-2">
              <p className="break-words text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">Customer:</span> {order.fullName}</p>
              <p className="break-words text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">Amount:</span> {formatKsh(order.amount)}</p>
              <p className="break-words text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">Email:</span> {order.email}</p>
              <p className="break-words text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">Phone:</span> {order.phone}</p>
              <p className="break-words text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">WhatsApp:</span> {order.whatsapp || "—"}</p>
              <p className="break-words text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">Payment:</span> {order.paymentStatus}</p>
            </div>

            {order.kind === "download" ? (
              <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-700">
                {order.accessMode === "read_online"
                  ? "Online access — the product is available in the customer’s dashboard. No work needed."
                  : "Instant download — the customer received the full-quality file automatically. No work needed."}
              </p>
            ) : (
              <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <p className="text-slate-700 dark:text-slate-200"><span className="font-semibold text-slate-900 dark:text-white">Title text:</span> {order.titleText}</p>
                {order.subtitle ? <p className="text-slate-700 dark:text-slate-200"><span className="font-semibold text-slate-900 dark:text-white">Subtitle:</span> {order.subtitle}</p> : null}
                {order.preferredColors ? <p className="text-slate-700 dark:text-slate-200"><span className="font-semibold text-slate-900 dark:text-white">Colors:</span> {order.preferredColors}</p> : null}
                {order.preferredStyle ? <p className="text-slate-700 dark:text-slate-200"><span className="font-semibold text-slate-900 dark:text-white">Style:</span> {order.preferredStyle}</p> : null}
                {order.instructions ? <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-200"><span className="font-semibold text-slate-900 dark:text-white">Instructions:</span> {order.instructions}</p> : null}
              </div>
            )}

            {order.kind === "customization" && order.uploadedImages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {order.uploadedImages.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="customer upload" className="h-16 w-16 rounded-md border border-slate-200 object-cover" />
                  </a>
                ))}
              </div>
            ) : null}

            {order.kind === "customization" ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-500">Set status:</span>
              {ORDER_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-busy={savingId === order.id || undefined}
                  disabled={!!savingId || order.orderStatus === status}
                  onClick={() => changeStatus(order, status)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed ${
                    order.orderStatus === status
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 disabled:opacity-60"
                  }`}
                >
                  {savingId === order.id ? "Updating..." : status.replace("_", " ")}
                </button>
              ))}
            </div>
            ) : null}
    </div></dialog> : null}
  </section>;
}
