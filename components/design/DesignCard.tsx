"use client";

import Link from "next/link";
import { Download, Eye, Sparkles } from "lucide-react";

import { formatKsh } from "@/lib/utils/formatCurrency";
import { Design } from "@/types/design";

/**
 * A masonry-friendly design tile. The image is shown at its natural aspect
 * ratio with no cropping (Pinterest-style). The whole tile links to the
 * detail page where the download / customization flows begin.
 */
export default function DesignCard({ design, hidePrice = false }: { design: Design; hidePrice?: boolean }) {
  const canDownload = !hidePrice && Number(design.downloadPrice || 0) > 0;
  const canCustomize = !hidePrice && Number(design.customizationPrice || 0) > 0;
  const ratio =
    design.imageWidth && design.imageHeight
      ? `${design.imageWidth} / ${design.imageHeight}`
      : undefined;

  return (
    <Link
      href={`/designs/${design.id}`}
      className="group mb-4 block break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-xl"
    >
      <div className="relative w-full overflow-hidden bg-slate-100">
        {/* Plain img + natural aspect ratio = zero cropping. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.imageUrl}
          alt={design.title}
          loading="lazy"
          style={ratio ? { aspectRatio: ratio } : undefined}
          className="w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          {design.category}
        </span>
        {design.fileType === "pdf" ? (
          <span className="absolute right-3 top-3 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            PDF
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Download or Customize
          </span>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{design.title}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {canDownload ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              <Download className="h-3 w-3" /> {formatKsh(design.downloadPrice)}
            </span>
          ) : null}
          {canCustomize ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              <Sparkles className="h-3 w-3" /> {formatKsh(design.customizationPrice)}
            </span>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400">
            <Eye className="h-3.5 w-3.5" />
            {design.views.toLocaleString("en-KE")}
          </span>
        </div>
      </div>
    </Link>
  );
}
