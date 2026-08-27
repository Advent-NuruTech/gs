import Link from "next/link";
import { BookOpen, Download, Library } from "lucide-react";
import { redirect } from "next/navigation";

import { listOwnedDigitalProducts } from "@/lib/products/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatKsh } from "@/lib/utils/formatCurrency";

export default async function MyProductsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/products");

  const products = await listOwnedDigitalProducts(user);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600">Your personal library</p>
        <h1 className="text-2xl font-bold text-slate-900">My Digital Products</h1>
        <p className="mt-1 text-sm text-slate-600">Read your purchased products online or download them whenever you need them.</p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Library className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-bold text-slate-900">Your library is ready</h2>
          <p className="mt-1 text-sm text-slate-600">Products purchased with {user.email} will appear here.</p>
          <Link href="/designs" className="mt-4 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
            Browse Digital Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.orderId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[16/10] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{product.category}</p>
                  <h2 className="mt-1 font-bold text-slate-900">{product.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Purchased {product.purchasedAt ? new Date(product.purchasedAt).toLocaleDateString("en-KE") : ""} · {formatKsh(product.amount)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/dashboard/products/${product.orderId}/read`} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                    <BookOpen className="h-4 w-4" /> Read online
                  </Link>
                  <a href={`/api/designs/download?designId=${encodeURIComponent(product.designId)}&reference=${encodeURIComponent(product.reference)}`} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <Download className="h-4 w-4" /> Download
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
