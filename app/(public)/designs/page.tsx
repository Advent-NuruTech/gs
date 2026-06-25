"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";

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
          <Sparkles className="h-3.5 w-3.5" /> AdventSkool Design Marketplace
        </p>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Browse stunning designs, get yours customized</h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          Thumbnails, posters, flyers, banners, certificates and more. Browsing is free — found one you love? Click{" "}
          <span className="font-semibold text-slate-800">“Get Customized Like This”</span> and we’ll make it yours.
        </p>
      </header>

      <div className="relative mx-auto max-w-xl">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search designs (e.g. church flyer, thumbnail)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-4 shadow-sm outline-none transition focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("All")}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              resolvedCategory === "All"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                resolvedCategory === category
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="mb-4 break-inside-avoid rounded-2xl border border-slate-200 bg-slate-100 animate-pulse"
              style={{ height: `${180 + (i % 3) * 70}px` }}
            />
          ))}
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          {search || resolvedCategory !== "All"
            ? "No designs match your search yet."
            : "No designs published yet. Check back soon!"}
        </p>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {filtered.map((design) => (
            <DesignCard key={design.id} design={design} />
          ))}
        </div>
      ) : null}

      {!loading && trending.length > 0 && resolvedCategory === "All" && !search ? (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-700">Most viewed right now</p>
          <p className="mb-3 text-sm text-slate-600">The designs everyone’s loving.</p>
          <div className="flex flex-wrap gap-2">
            {trending.map((d) => (
              <Link
                key={d.id}
                href={`/designs/${d.id}`}
                className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
              >
                {d.title} · {d.views.toLocaleString("en-KE")} views
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
