"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, Sparkles } from "lucide-react";

import CatalogFilterBar from "@/components/catalog/CatalogFilterBar";
import DesignCard from "@/components/design/DesignCard";
import { listDesigns } from "@/services/designService";
import { Design } from "@/types/design";

export default function DesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listDesigns({ published: true, pageSize: 300 });
        if (active) setDesigns(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(designs.map((d) => d.category || "General"))].sort((a, b) => a.localeCompare(b)),
    [designs],
  );

  const resolvedCategory =
    activeCategory === "All" || categories.includes(activeCategory) ? activeCategory : "All";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return designs.filter((d) => {
      const matchesCategory = resolvedCategory === "All" || (d.category || "General") === resolvedCategory;
      const matchesSearch =
        !q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [designs, resolvedCategory, search]);

  // Most-viewed strip (top 4 by views) for inspiration.
  const trending = useMemo(
    () => [...designs].sort((a, b) => b.views - a.views).slice(0, 4),
    [designs],
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <header className="space-y-3 text-center">
        <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" /> AdventSkool Digital Products
        </p>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Professional digital products for work, learning and growth</h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Discover ebooks, guides, workbooks, templates, printables and professional graphics. Purchase once, then choose to
          <span className="font-semibold text-slate-800"> read online from your dashboard or download the full file.</span>
        </p>
      </header>

      <CatalogFilterBar
        query={search}
        onQueryChange={setSearch}
        searchPlaceholder="Search digital products (ebook, guide, template)…"
        searchLabel="Search digital products"
        categories={categories}
        activeCategory={resolvedCategory}
        onCategoryChange={setActiveCategory}
        resultCount={filtered.length}
        totalCount={designs.length}
        itemLabel={filtered.length === 1 ? "product" : "products"}
        accent="indigo"
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
            ? "No digital products match your search yet."
            : "No digital products published yet. Check back soon!"}
        </p>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((design) => (
            <DesignCard key={design.id} design={design} />
          ))}
        </div>
      ) : null}

      {!loading && trending.length > 0 && resolvedCategory === "All" && !search ? (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-700">Most viewed right now</p>
          <p className="mb-4 text-sm text-slate-600">The digital products readers are exploring most.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {trending.map((d) => (
              <Link
                key={d.id}
                href={`/designs/${d.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.imageUrl}
                    alt={d.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  {d.fileType === "pdf" ? (
                    <span className="absolute right-2 top-2 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      PDF
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
                  <span className="line-clamp-1 text-sm font-semibold text-slate-900">{d.title}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Eye className="h-3.5 w-3.5" /> {d.views.toLocaleString("en-KE")} views
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
