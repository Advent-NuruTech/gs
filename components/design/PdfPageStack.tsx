import { pdfPageImageUrl } from "@/lib/designs/pdfPreview";

interface PdfPageStackProps {
  source: string;
  title: string;
  pageCount: number;
}

/**
 * Shared, mobile-friendly reading surface for public previews and purchased
 * PDFs. Pages are images, so phones do not show a separate "Open" prompt.
 */
export default function PdfPageStack({ source, title, pageCount }: PdfPageStackProps) {
  const total = Math.max(0, Math.floor(pageCount));

  return (
    <div className="space-y-3">
      {Array.from({ length: total }, (_, index) => index + 1).map((page) => (
        <div
          key={page}
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pdfPageImageUrl(source, page)}
            alt={`${title} — page ${page}`}
            loading={page === 1 ? "eager" : "lazy"}
            className="h-auto w-full object-contain"
          />
          <span className="absolute bottom-2 right-2 rounded bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
            Page {page} / {total}
          </span>
        </div>
      ))}
    </div>
  );
}
