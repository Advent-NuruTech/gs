import Link from "next/link";
import { BookOpen, Download, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

import WealthCard from "@/components/wealth/WealthCard";
import { listRecommendedWealthProducts } from "@/lib/wealth/server";
import { listOwnedWealthResources } from "@/lib/wealth/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatKsh } from "@/lib/utils/formatCurrency";

export default async function MyWealthPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/wealth");

  const resources = await listOwnedWealthResources(user);
  const recommendations = await listRecommendedWealthProducts(
    resources.map((resource) => resource.category),
    resources.map((resource) => resource.productId),
    6,
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-600">Your wealth library</p>
        <h1 className="text-2xl font-bold text-slate-900">My Wealth Resources</h1>
        <p className="mt-1 text-sm text-slate-600">Read your purchased resources online or download them whenever you need them.</p>
      </div>

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-bold text-slate-900">Your wealth library is ready</h2>
          <p className="mt-1 text-sm text-slate-600">Resources purchased with {user.email} will appear here.</p>
          <Link href="/wealth" className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Browse Wealth Academy
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <article key={resource.orderId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[16/10] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resource.imageUrl} alt={resource.title} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{resource.category}</p>
                  <h2 className="mt-1 font-bold text-slate-900">{resource.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Purchased {resource.purchasedAt ? new Date(resource.purchasedAt).toLocaleDateString("en-KE") : ""} · {formatKsh(resource.amount)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/dashboard/wealth/${resource.orderId}/read`} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">
                    <BookOpen className="h-4 w-4" /> Read online
                  </Link>
                  <a href={`/api/wealth/download?productId=${encodeURIComponent(resource.productId)}&reference=${encodeURIComponent(resource.reference)}`} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <Download className="h-4 w-4" /> Download
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {recommendations.length > 0 ? (
        <section className="space-y-4 border-t border-slate-200 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">You May Also Like</h2>
              <p className="mt-1 text-sm text-slate-600">More wealth resources related to your library.</p>
            </div>
            <Link href="/wealth" className="text-sm font-semibold text-emerald-700 hover:underline">
              Browse all
            </Link>
          </div>
          <div className="columns-2 gap-4 lg:columns-3">
            {recommendations.map((product) => (
              <WealthCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
