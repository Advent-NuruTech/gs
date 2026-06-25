"use client";

import { Lock } from "lucide-react";

import Button from "@/components/ui/Button";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { freePreviewPageCount, pdfPageImageUrl } from "@/lib/designs/pdfPreview";
import { Design } from "@/types/design";

interface Props {
  design: Design;
  /** Triggered by the paywall CTA to start the free/paid download flow. */
  onUnlock: () => void;
}

/**
 * Renders the free portion of a PDF template — a quarter of its pages — then a
 * locked teaser of the next page behind a "pay to read more" paywall. Falls
 * back to the single-page preview image when the page count is unknown (legacy
 * PDFs uploaded before page counts were captured).
 */
export default function PdfPreview({ design, onUnlock }: Props) {
  const total = Math.max(0, Math.floor(design.pageCount ?? 0));
  // The page transforms render off the original PDF (file_url), not the JPG
  // preview stored in image_url.
  const source = design.fileUrl || design.imageUrl;
  const freeCount = freePreviewPageCount(total);
  const isFree = Number(design.downloadPrice || 0) <= 0;

  // Unknown page count → keep the existing first-page-only preview.
  if (!total || freeCount <= 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={design.imageUrl} alt={design.title} className="h-auto w-full object-contain" />
        <span className="absolute left-3 top-3 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          PDF template
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
          PDF template
        </span>
        <span className="text-xs font-medium text-slate-500">
          Free preview · {freeCount} of {total} page{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Free pages, stacked top-to-bottom like a document reader. */}
      <div className="space-y-3">
        {Array.from({ length: freeCount }, (_, i) => i + 1).map((page) => (
          <div key={page} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pdfPageImageUrl(source, page)}
              alt={`${design.title} — page ${page}`}
              loading={page === 1 ? undefined : "lazy"}
              className="h-auto w-full object-contain"
            />
            <span className="absolute bottom-2 right-2 rounded bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
              Page {page} / {total}
            </span>
          </div>
        ))}
      </div>

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
                  ? "Get the full document to keep reading."
                  : `Pay ${formatKsh(design.downloadPrice)} to read the full document.`}
              </p>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={onUnlock}>
              {isFree ? "Unlock full document — Free" : `Unlock for ${formatKsh(design.downloadPrice)}`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
