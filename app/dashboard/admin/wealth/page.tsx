"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, ShoppingBag } from "lucide-react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { deleteWealthProduct, listWealthProducts, updateWealthProduct } from "@/services/wealthService";
import { WealthProduct } from "@/types/wealth";
import {
  getWealthPublicNavigationEnabled,
  setWealthPublicNavigationEnabled,
} from "@/services/wealthSettingsService";
import StatusCard from "@/components/ui/StatusCard";

export default function AdminWealthPage() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const { pushToast } = useNotificationContext();
  const [products, setProducts] = useState<WealthProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publicNavigation, setPublicNavigation] = useState(false);
  const [savingNavigation, setSavingNavigation] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listWealthProducts({ pageSize: 300 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) void load();
  }, [isAllowed, load]);

  useEffect(() => {
    if (!isAllowed) return;
    void getWealthPublicNavigationEnabled()
      .then(setPublicNavigation)
      .catch((error) => pushToast(error instanceof Error ? error.message : "Could not load Wealth settings.", "error"));
  }, [isAllowed, pushToast]);

  if (guardLoading || !isAllowed) return <p>Loading…</p>;

  const totalViews = products.reduce((sum, p) => sum + p.views, 0);
  const totalOrders = products.reduce((sum, p) => sum + p.ordersCount, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Wealth Academy</h2>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/wealth/orders">
            <Button variant="secondary">View Orders</Button>
          </Link>
          <Link href="/dashboard/admin/wealth/create">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Add Resource</Button>
          </Link>
        </div>
      </div>

      <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Public Wealth Academy navigation</h3>
          <p className="text-sm text-slate-600">Choose whether Wealth Academy appears in public navigation and discovery search. Directly shared links remain accessible.</p>
        </div>
        <Button
          type="button"
          variant={publicNavigation ? "secondary" : "primary"}
          loading={savingNavigation}
          disabled={savingNavigation}
          onClick={async () => {
            setSavingNavigation(true);
            try {
              const next = !publicNavigation;
              await setWealthPublicNavigationEnabled(next);
              setPublicNavigation(next);
              pushToast(next ? "Wealth Academy is visible in public navigation." : "Wealth Academy is hidden from public navigation.", "success");
            } catch (error) {
              pushToast(error instanceof Error ? error.message : "Could not update Wealth settings.", "error");
            } finally {
              setSavingNavigation(false);
            }
          }}
        >
          {publicNavigation ? "Hide from public navigation" : "Show in public navigation"}
        </Button>
      </article>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{products.length}</p>
          <p className="text-xs text-slate-500">Resources</p>
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

      {loading ? <p>Loading wealth resources…</p> : null}
      {!loading && products.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">No wealth resources yet. Add your first one.</p>
      ) : null}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 min-[420px]:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={product.title} className="h-24 w-24 shrink-0 rounded-md border border-slate-100 object-cover" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-semibold text-slate-900">{product.title}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    product.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {product.published ? "Live" : "Hidden"}
                </span>
              </div>
              <p className="text-xs text-slate-500">{product.category}</p>
              <p className="break-words text-xs font-semibold text-slate-700">
                <span className="text-emerald-600">Access {formatKsh(product.downloadPrice)}</span>
                {" · "}
                <span className="text-slate-600">
                  {product.customizationEnabled ? `Personalize ${formatKsh(product.customizationPrice)}` : "Personalization off"}
                </span>
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{product.views}</span>
                <span className="inline-flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />{product.ordersCount}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2.5 py-1 text-xs"
                  disabled={busyId === product.id}
                  onClick={async () => {
                    setBusyId(product.id);
                    try {
                      await updateWealthProduct(product.id, { published: !product.published });
                      await load();
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {product.published ? "Unpublish" : "Publish"}
                </Button>
                <Link href={`/dashboard/admin/wealth/${product.id}/edit`}>
                  <Button type="button" variant="secondary" className="px-2.5 py-1 text-xs">Edit</Button>
                </Link>
                <Button
                  type="button"
                  variant="danger"
                  className="px-2.5 py-1 text-xs"
                  disabled={busyId === product.id}
                  onClick={async () => {
                    setBusyId(product.id);
                    try {
                      await deleteWealthProduct(product.id);
                      pushToast("Wealth resource deleted.", "success");
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
