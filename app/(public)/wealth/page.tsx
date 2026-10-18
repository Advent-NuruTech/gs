"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, TrendingUp } from "lucide-react";

import CatalogFilterBar from "@/components/catalog/CatalogFilterBar";
import WealthCard from "@/components/wealth/WealthCard";
import { listWealthProducts } from "@/services/wealthService";
import { WealthProduct } from "@/types/wealth";

export default function WealthAcademyPage() {
  const [products, setProducts] = useState<WealthProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listWealthProducts({ published: true, pageSize: 300 });
        if (active) setProducts(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category || "General"))].sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const resolvedCategory =
    activeCategory === "All" || categories.includes(activeCategory) ? activeCategory : "All";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = resolvedCategory === "All" || (p.category || "General") === resolvedCategory;
      const matchesSearch =
        !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, resolvedCategory, search]);

  // Most-viewed strip (top 4 by views) for inspiration.
  const trending = useMemo(
    () => [...products].sort((a, b) => b.views - a.views).slice(0, 4),
    [products],
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <header className="space-y-3 text-center">
        <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5" /> AdventSkool Wealth Academy
        </p>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Master money, build wealth, and secure your family&apos;s future</h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Learn how money works, how to preserve and grow what you earn, and how to end generational poverty —
          with practical ebooks, guides and workbooks you can
          <span className="font-semibold text-slate-800"> read online from your dashboard or download.</span>
        </p>
      </header>

      <CatalogFilterBar
        query={search}
        onQueryChange={setSearch}
        searchPlaceholder="Search wealth resources (budgeting, investing, legacy)…"
        searchLabel="Search wealth resources"
        categories={categories}
        activeCategory={resolvedCategory}
        onCategoryChange={setActiveCategory}
        resultCount={filtered.length}
        totalCount={products.length}
        itemLabel={filtered.length === 1 ? "resource" : "resources"}
        accent="emerald"
        innerMaxWidth="max-w-7xl"
      />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          {search || resolvedCategory !== "All"
            ? "No wealth resources match your search yet."
            : "No wealth resources published yet. Check back soon!"}
        </p>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((product) => (
            <WealthCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}

      {!loading && trending.length > 0 && resolvedCategory === "All" && !search ? (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-700">Most viewed right now</p>
          <p className="mb-4 text-sm text-slate-600">The wealth resources learners are exploring most.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {trending.map((p) => (
              <Link
                key={p.id}
                href={`/wealth/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  {p.fileType === "pdf" ? (
                    <span className="absolute right-2 top-2 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      PDF
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
                  <span className="line-clamp-1 text-sm font-semibold text-slate-900">{p.title}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Eye className="h-3.5 w-3.5" /> {p.views.toLocaleString("en-KE")} views
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
