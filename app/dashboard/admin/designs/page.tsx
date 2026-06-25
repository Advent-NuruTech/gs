"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, ShoppingBag } from "lucide-react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { deleteDesign, listDesigns, updateDesign } from "@/services/designService";
import { Design } from "@/types/design";

export default function AdminDesignsPage() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const { pushToast } = useNotificationContext();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDesigns(await listDesigns({ pageSize: 300 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) void load();
  }, [isAllowed, load]);

  if (guardLoading || !isAllowed) return <p>Loading…</p>;

  const totalViews = designs.reduce((sum, d) => sum + d.views, 0);
  const totalOrders = designs.reduce((sum, d) => sum + d.ordersCount, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Designs</h2>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/designs/orders">
            <Button variant="secondary">View Orders</Button>
          </Link>
          <Link href="/dashboard/admin/designs/create">
            <Button>Add Design</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{designs.length}</p>
          <p className="text-xs text-slate-500">Designs</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{totalViews.toLocaleString("en-KE")}</p>
          <p className="text-xs text-slate-500">Total views</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{totalOrders.toLocaleString("en-KE")}</p>
          <p className="text-xs text-slate-500">Total orders</p>
        </div>
      </div>

      {loading ? <p>Loading designs…</p> : null}
      {!loading && designs.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">No designs yet. Add your first one.</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {designs.map((design) => (
          <article key={design.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={design.imageUrl} alt={design.title} className="h-24 w-24 shrink-0 rounded-md border border-slate-100 object-cover" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-semibold text-slate-900">{design.title}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    design.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {design.published ? "Live" : "Hidden"}
                </span>
              </div>
              <p className="text-xs text-slate-500">{design.category}</p>
              <p className="text-xs font-semibold text-slate-700">
                <span className="text-indigo-600">Download {formatKsh(design.downloadPrice)}</span>
                {" · "}
                <span className="text-slate-600">Customize {formatKsh(design.customizationPrice)}</span>
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{design.views}</span>
                <span className="inline-flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />{design.ordersCount}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2.5 py-1 text-xs"
                  disabled={busyId === design.id}
                  onClick={async () => {
                    setBusyId(design.id);
                    try {
                      await updateDesign(design.id, { published: !design.published });
                      await load();
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {design.published ? "Unpublish" : "Publish"}
                </Button>
                <Link href={`/dashboard/admin/designs/${design.id}/edit`}>
                  <Button type="button" variant="secondary" className="px-2.5 py-1 text-xs">Edit</Button>
                </Link>
                <Button
                  type="button"
                  variant="danger"
                  className="px-2.5 py-1 text-xs"
                  disabled={busyId === design.id}
                  onClick={async () => {
                    setBusyId(design.id);
                    try {
                      await deleteDesign(design.id);
                      pushToast("Design deleted.", "success");
                      await load();
                    } catch (error) {
                      pushToast(error instanceof Error ? error.message : "Delete failed.", "error");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
