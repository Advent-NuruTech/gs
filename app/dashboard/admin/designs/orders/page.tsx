"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { listDesignOrders, updateDesignOrderStatus } from "@/services/designOrderService";
import { DesignOrder, DesignOrderStatus } from "@/types/designOrder";

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await listDesignOrders());
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load orders.", "error");
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
    if (!q) return base;
    return base.filter((o) =>
      [o.fullName, o.email, o.phone, o.whatsapp, o.designTitle, o.titleText, o.paystackReference, o.orderStatus]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [paidOrders, search]);

  async function changeStatus(order: DesignOrder, status: DesignOrderStatus) {
    setSavingId(order.id);
    try {
      await updateDesignOrderStatus(order.id, status);
      if (status === "completed") {
        pushToast("Marked complete — customer notified by email & SMS.", "success");
      } else {
        pushToast("Order status updated.", "success");
      }
      await load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not update status.", "error");
    } finally {
      setSavingId(null);
    }
  }

  if (guardLoading || !isAllowed) return <p>Loading…</p>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Design Orders</h2>
        <p className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
          {paidOrders.length} paid · {formatKsh(revenue)} revenue
        </p>
      </div>

      <Input
        label="Search Orders"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by customer, design, phone, reference, status…"
      />

      {loading ? <p>Loading orders…</p> : null}
      {!loading && filtered.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">No paid orders yet.</p>
      ) : null}

      <div className="space-y-3">
        {filtered.map((order) => (
          <article key={order.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{order.designTitle}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      order.kind === "download" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                    }`}
                  >
                    {order.kind === "download" ? "Download" : "Customization"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString("en-KE") : ""} ·{" "}
                  <span className="font-mono">{order.paystackReference}</span>
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.orderStatus]}`}>
                {order.orderStatus.replace("_", " ")}
              </span>
            </div>

            <div className="grid gap-1.5 text-sm md:grid-cols-2">
              <p className="text-slate-600"><span className="font-semibold text-slate-900">Customer:</span> {order.fullName}</p>
              <p className="text-slate-600"><span className="font-semibold text-slate-900">Amount:</span> {formatKsh(order.amount)}</p>
              <p className="text-slate-600"><span className="font-semibold text-slate-900">Email:</span> {order.email}</p>
              <p className="text-slate-600"><span className="font-semibold text-slate-900">Phone:</span> {order.phone}</p>
              <p className="text-slate-600"><span className="font-semibold text-slate-900">WhatsApp:</span> {order.whatsapp || "—"}</p>
              <p className="text-slate-600"><span className="font-semibold text-slate-900">Payment:</span> {order.paymentStatus}</p>
            </div>

            {order.kind === "download" ? (
              <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-700">
                Instant download — the customer received the full-quality file automatically. No work needed.
              </p>
            ) : (
              <div className="rounded-md bg-slate-50 p-3 text-sm">
                <p className="text-slate-700"><span className="font-semibold text-slate-900">Title text:</span> {order.titleText}</p>
                {order.subtitle ? <p className="text-slate-700"><span className="font-semibold text-slate-900">Subtitle:</span> {order.subtitle}</p> : null}
                {order.preferredColors ? <p className="text-slate-700"><span className="font-semibold text-slate-900">Colors:</span> {order.preferredColors}</p> : null}
                {order.preferredStyle ? <p className="text-slate-700"><span className="font-semibold text-slate-900">Style:</span> {order.preferredStyle}</p> : null}
                {order.instructions ? <p className="mt-1 whitespace-pre-wrap text-slate-700"><span className="font-semibold text-slate-900">Instructions:</span> {order.instructions}</p> : null}
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
                  disabled={savingId === order.id || order.orderStatus === status}
                  onClick={() => changeStatus(order, status)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed ${
                    order.orderStatus === status
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 disabled:opacity-60"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
