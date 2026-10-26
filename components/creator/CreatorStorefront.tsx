"use client";

import Link from "next/link";
import { CircleUser, Menu, Search, ShoppingCart, Store, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import StorefrontProductCard from "@/components/creator/StorefrontProductCard";
import StatusCard from "@/components/ui/StatusCard";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { CreatorStorefrontProfile, StorefrontProduct } from "@/types/creator";

export default function CreatorStorefront({
  creator,
  products,
  recommendations,
  highlightedProduct,
}: {
  creator: CreatorStorefrontProfile;
  products: StorefrontProduct[];
  recommendations: StorefrontProduct[];
  highlightedProduct?: string;
}) {
  const { profile, loading: authLoading } = useAuth();
  const { items: cartItems } = useCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const name = product.category || "General";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const value = query.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatches = category === "all" || product.category === category;
      const queryMatches = !value || [product.title, product.category, product.kind].some((field) => field.toLowerCase().includes(value));
      return categoryMatches && queryMatches;
    });
  }, [category, products, query]);

  useEffect(() => {
    document.body.style.overflow = categoriesOpen ? "hidden" : "";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoriesOpen(false);
    };
    if (categoriesOpen) document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [categoriesOpen]);

  const dashboardHref = profile ? `/dashboard/${profile.role}` : `/login?redirect=${encodeURIComponent(`/@${creator.handle}`)}`;
  const activeCategoryLabel = category === "all" ? "All products" : category;

  const productGrid = (items: StorefrontProduct[], allowHighlight = false) => (
    <div className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((product) => (
        <StorefrontProductCard
          key={`${product.kind}-${product.id}`}
          product={product}
          creatorHandle={creator.handle}
          highlighted={allowHighlight && highlightedProduct === `${product.kind}-${product.id}`}
        />
      ))}
    </div>
  );

  return (
    <div className="creator-storefront min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <Link href={`/@${creator.handle}/profile`} className="shrink-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" aria-label={`View ${creator.name}'s profile`} title={`View ${creator.name}'s profile`}>
            {creator.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.photoUrl} alt="" className="h-14 w-14 rounded-2xl border border-emerald-200 object-cover shadow-sm dark:border-emerald-900 sm:h-16 sm:w-16" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 sm:h-16 sm:w-16 dark:bg-emerald-950 dark:text-emerald-200"><Store className="h-7 w-7" /></span>
            )}
            </Link>
            <Link href={`/@${creator.handle}`} className="min-w-0" aria-label={`${creator.name} online store home`}>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black tracking-tight text-slate-950 sm:text-2xl dark:text-white">{creator.name}</span>
              <span className="block text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm dark:text-emerald-300">Online store</span>
            </span>
            </Link>
          </div>

          <button type="button" onClick={() => setCategoriesOpen(true)} className="hidden h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:inline-flex" aria-label="Open product categories">
            <Menu className="h-5 w-5" />
            <span>Categories</span>
          </button>
          <Link href="/checkout" className="relative hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:inline-flex" aria-label={`Cart with ${cartItems.length} item${cartItems.length === 1 ? "" : "s"}`}>
            <ShoppingCart className="h-6 w-6" />
            {cartItems.length ? <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-black text-white ring-2 ring-white dark:ring-slate-950">{cartItems.length}</span> : null}
          </Link>
          {authLoading ? (
            <span className="hidden h-11 w-11 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 lg:block" aria-label="Loading account" />
          ) : (
            <Link href={dashboardHref} className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:inline-flex" aria-label={profile ? "Open my dashboard" : "Log in"}>
              <CircleUser className="h-6 w-6" />
            </Link>
          )}
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-emerald-950">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${creator.name}'s products`} aria-label={`Search products in ${creator.name}'s store`} className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white" />
            {query ? <button type="button" onClick={() => setQuery("")} className="rounded p-1 text-slate-500 hover:text-slate-950 dark:hover:text-white" aria-label="Clear search"><X className="h-4 w-4" /></button> : null}
          </label>
        </div>
      </header>

      {categoriesOpen ? <button type="button" className="fixed inset-0 z-50 bg-slate-950/45" onClick={() => setCategoriesOpen(false)} aria-label="Close category menu" /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,22rem)] flex-col border-r border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 ${categoriesOpen ? "translate-x-0" : "-translate-x-full"}`} aria-hidden={!categoriesOpen} inert={!categoriesOpen}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="min-w-0"><p className="truncate font-bold text-slate-950 dark:text-white">{creator.name}</p><p className="text-sm text-slate-500 dark:text-slate-400">Product categories</p></div>
          <button type="button" onClick={() => setCategoriesOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Close product categories"><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Store product categories">
          <button type="button" onClick={() => { setCategory("all"); setCategoriesOpen(false); }} aria-current={category === "all" ? "page" : undefined} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${category === "all" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"}`}><span>All products</span><span>{products.length}</span></button>
          {categories.map(([name, count]) => (
            <button key={name} type="button" onClick={() => { setCategory(name); setCategoriesOpen(false); }} aria-current={category === name ? "page" : undefined} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${category === name ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"}`}><span className="min-w-0 break-words">{name}</span><span className="shrink-0">{count}</span></button>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 pb-28 pt-6 sm:px-6 sm:pb-28 sm:pt-10 lg:py-10">
        <section className="space-y-5" aria-labelledby="creator-products">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
            <div className="min-w-0"><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{activeCategoryLabel}</p><h1 id="creator-products" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{creator.name}&apos;s products</h1></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}</p>
          </div>
          {visibleProducts.length ? productGrid(visibleProducts, true) : <StatusCard kind="info" title="No matching products" description={products.length ? "Try another search or product category." : "This creator's products will appear here when they are published."} />}
        </section>

        <section className="space-y-5" aria-labelledby="you-may-also-like">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Discover more</p><h2 id="you-may-also-like" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">You may also like</h2></div>
          {recommendations.length ? productGrid(recommendations) : <StatusCard kind="info" title="More products coming soon" description="More courses and digital products will appear here as creators publish them." />}
        </section>
      </main>

      <nav aria-label="Store navigation" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_14px_38px_rgba(15,23,42,0.22)] backdrop-blur dark:border-slate-700/90 dark:bg-slate-950/95 lg:hidden">
          <button type="button" onClick={() => setCategoriesOpen(true)} aria-expanded={categoriesOpen} className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-200">
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span>Categories</span>
        </button>
        <Link href="/checkout" className="relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-200" aria-label={`Cart with ${cartItems.length} item${cartItems.length === 1 ? "" : "s"}`}>
          <span className="relative"><ShoppingCart className="h-5 w-5" aria-hidden="true" />{cartItems.length ? <span className="absolute -right-3 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">{cartItems.length}</span> : null}</span>
          <span>Cart</span>
        </Link>
        {authLoading ? (
          <span className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400" aria-label="Loading account"><span className="h-5 w-5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" /><span>Profile</span></span>
        ) : (
          <Link href={dashboardHref} className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-200" aria-label={profile ? "Open my profile" : "Log in"}>
            <CircleUser className="h-5 w-5" aria-hidden="true" />
            <span>{profile ? "Profile" : "Log in"}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
