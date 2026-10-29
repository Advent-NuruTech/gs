"use client";

import { BookOpen, Eye, FileDown } from "lucide-react";
import Link from "next/link";

import ShareButton from "@/components/share/ShareButton";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { StorefrontProduct } from "@/types/creator";
import { usePublicDisplaySettings } from "@/context/PublicDisplaySettingsContext";

const kindDetails = {
  course: { label: "Course", icon: BookOpen, href: (id: string) => `/courses/${id}` },
  design: { label: "Digital product", icon: FileDown, href: (id: string) => `/designs/${id}` },
} as const;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");

export default function StorefrontProductCard({
  product,
  creatorHandle,
  highlighted = false,
}: {
  product: StorefrontProduct;
  creatorHandle: string;
  highlighted?: boolean;
}) {
  const { showViewCounts } = usePublicDisplaySettings();
  const details = kindDetails[product.kind];
  const Icon = details.icon;
  const anchor = `product-${product.kind}-${product.id}`;
  const shareHandle = product.creatorHandle ?? creatorHandle;
  const sharePath = `${siteUrl}/@${shareHandle}?product=${product.kind}-${product.id}#${anchor}`;
  const productHref = `${siteUrl}${details.href(product.id)}`;

  return (
    <article
      id={anchor}
      className={`flex min-w-0 scroll-mt-28 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
        highlighted ? "border-blue-500 ring-4 ring-blue-100 dark:ring-blue-950" : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <Link href={productHref} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
          {/* Product media can come from creator-configured Cloudinary assets. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.title} loading="lazy" className="h-full w-full object-contain transition duration-300 hover:scale-[1.02]" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {details.label}
          </span>
          <span className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">{product.category}</span>
        </div>
        <Link href={productHref} className="min-w-0">
          <h3 className="line-clamp-2 font-semibold text-slate-950 hover:text-blue-700 dark:text-white dark:hover:text-blue-300">{product.title}</h3>
        </Link>
        <div className="mt-auto flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-bold text-slate-950 dark:text-white">{product.price > 0 ? formatKsh(product.price) : "Free"}</span>
          {product.originalPrice && product.originalPrice > product.price ? (
            <span className="text-xs text-slate-400 line-through">{formatKsh(product.originalPrice)}</span>
          ) : null}
          {showViewCounts && product.views > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Eye className="h-3.5 w-3.5" />{product.views.toLocaleString("en-KE")}</span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href={productHref} className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            View
          </Link>
          <ShareButton title={product.title} entityLabel={product.kind === "course" ? "Course" : "Product"} path={sharePath} className="px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
        </div>
      </div>
    </article>
  );
}
