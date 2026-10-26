"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, ShoppingBag } from "lucide-react";

import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { deleteWealthProduct, listWealthProducts, updateWealthProduct } from "@/services/wealthService";
import { WealthProduct } from "@/types/wealth";

export default function TeacherWealthPage() {
  const { profile } = useAuth();
  const { isAllowed, loading: guardLoading } = useRoleGuard(["teacher"]);
  const { pushToast } = useNotificationContext();
  const [products, setProducts] = useState<WealthProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const hasAccess = profile?.creatorStatus === "approved" && profile.wealthEnabled;
  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError("");
    try {
      const items = await listWealthProducts({ pageSize: 300 });
      setProducts(items.filter((product) => product.createdBy === profile.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your wealth products.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (isAllowed && hasAccess) void load();
  }, [hasAccess, isAllowed, load]);

  if (guardLoading || !isAllowed) {
    return <PageSkeleton label="Checking your Wealth Academy access…" variant="plain" />;
  }
  if (!hasAccess) {
    return <StatusCard kind="warning" title="Wealth product access is not enabled" description="Ask an administrator to grant Wealth Academy access to your creator account." />;
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Wealth Products</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Create and manage your Wealth Academy resources.</p>
        </div>
        <Link href="/dashboard/teacher/wealth/create">
          <Button>Add Resource</Button>
        </Link>
      </div>

      {loading ? <PageSkeleton label="Loading your wealth products…" variant="cards" /> : null}
      {error ? <StatusCard kind="error" title="Could not load wealth products" description={error} /> : null}
      {!loading && !error && products.length === 0 ? (
        <StatusCard kind="info" title="No wealth products yet" description="Add a resource to start building your Wealth Academy catalogue." />
      ) : null}

      {!loading && !error ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <article key={product.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 min-[420px]:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.imageUrl} alt={product.title} className="h-24 w-24 shrink-0 rounded-md border border-slate-100 object-cover dark:border-slate-700" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <h2 className="min-w-0 break-words font-semibold text-slate-900 dark:text-white">{product.title}</h2>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${product.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {product.published ? "Live" : "Hidden"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{product.category}</p>
                <p className="break-words text-xs font-semibold text-slate-700 dark:text-slate-200">Access {formatKsh(product.downloadPrice)}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{product.views}</span>
                  <span className="inline-flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />{product.ordersCount}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2.5 py-1 text-xs"
                    loading={busyId === product.id}
                    disabled={busyId === product.id}
                    onClick={async () => {
                      setBusyId(product.id);
                      try {
                        await updateWealthProduct(product.id, { published: !product.published });
                        await load();
                      } catch (actionError) {
                        pushToast(actionError instanceof Error ? actionError.message : "Could not update product visibility.", "error");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    {product.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Link href={`/dashboard/teacher/wealth/${product.id}/edit`}>
                    <Button type="button" variant="secondary" className="px-2.5 py-1 text-xs">Edit</Button>
                  </Link>
                  <Button
                    type="button"
                    variant="danger"
                    className="px-2.5 py-1 text-xs"
                    loading={busyId === product.id}
                    disabled={busyId === product.id}
                    onClick={async () => {
                      setBusyId(product.id);
                      try {
                        await deleteWealthProduct(product.id);
                        pushToast("Wealth resource deleted.", "success");
                        await load();
                      } catch (actionError) {
                        pushToast(actionError instanceof Error ? actionError.message : "Could not delete wealth resource.", "error");
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
      ) : null}
    </section>
  );
}
