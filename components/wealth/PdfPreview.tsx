"use client";

import { Lock } from "lucide-react";

import PdfPageStack from "@/components/wealth/PdfPageStack";
import Button from "@/components/ui/Button";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { freePreviewPageCount, pdfPageImageUrl } from "@/lib/wealth/pdfPreview";
import { WealthProduct } from "@/types/wealth";

interface Props {
  product: WealthProduct;
  /** Triggered by the paywall CTA to start the free/paid access flow. */
  onUnlock: () => void;
}

/**
 * Renders the free portion of a PDF resource — a quarter of its pages — then a
 * locked teaser of the next page behind a "pay to read more" paywall. Falls
 * back to the single-page preview image when the page count is unknown.
 */
export default function PdfPreview({ product, onUnlock }: Props) {
  const total = Math.max(0, Math.floor(product.pageCount ?? 0));
  // The page transforms render off the original PDF (fileUrl), not the JPG
  // preview stored in imageUrl.
  const source = product.fileUrl || product.imageUrl;
  const freeCount = freePreviewPageCount(total);
  const isFree = Number(product.downloadPrice || 0) <= 0;

  // Unknown page count → keep the existing first-page-only preview.
  if (!total || freeCount <= 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.title} className="h-auto w-full object-contain" />
        <span className="absolute left-3 top-3 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          PDF resource
        </span>
      </div>
    );
  }

  const lockedCount = Math.max(0, total - freeCount);
  // Page just past the free window, shown blurred as a teaser of what's locked.
  const teaserPage = freeCount + 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          PDF resource
        </span>
        <span className="text-xs font-medium text-slate-500">
          Free preview · {freeCount} of {total} page{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Free pages, stacked top-to-bottom like a document reader. */}
      <PdfPageStack source={source} title={product.title} pageCount={freeCount} />

      {/* Paywall: blurred teaser of the next page + unlock CTA. */}
      {lockedCount > 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pdfPageImageUrl(source, teaserPage)}
            alt=""
            aria-hidden
            loading="lazy"
            className="h-auto max-h-[420px] w-full select-none object-cover object-top blur-md"
            draggable={false}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/55 px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
              <Lock className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-bold text-white">
                {lockedCount} more page{lockedCount === 1 ? "" : "s"} locked
              </p>
              <p className="text-sm text-slate-200">
                {isFree
                  ? "Add the full resource to your library to keep reading."
                  : `Pay ${formatKsh(product.downloadPrice)} to read the full resource.`}
              </p>
            </div>
            <Button onClick={onUnlock}>
              {isFree ? "Read the full resource — Free" : `Read for ${formatKsh(product.downloadPrice)}`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
