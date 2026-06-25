"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Eye, Sparkles } from "lucide-react";

import Button from "@/components/ui/Button";
import CustomizeModal from "@/components/design/CustomizeModal";
import DownloadModal from "@/components/design/DownloadModal";
import DesignCard from "@/components/design/DesignCard";
import PdfPreview from "@/components/design/PdfPreview";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { toDownloadUrl } from "@/lib/designs/downloadUrl";
import { recordDesignView } from "@/services/designService";
import { Design } from "@/types/design";

/** Kick off a browser download for the given URL (free, full-quality file). */
function triggerDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function DesignDetailClient({
  design,
  related = [],
}: {
  design: Design;
  related?: Design[];
}) {
  const [showDownload, setShowDownload] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [revealed, setRevealed] = useState<"download" | "customize" | null>(null);

  // A price of 0 means free. Both options are always offered; free downloads
  // are delivered instantly and free customization requests skip payment.
  const downloadFree = Number(design.downloadPrice || 0) <= 0;
  const customizeFree = Number(design.customizationPrice || 0) <= 0;

  const handleFreeDownload = () => {
    triggerDownload(toDownloadUrl(design.fileUrl || design.imageUrl, design.title));
  };

  // Paywall on the PDF preview: free designs hand over the file immediately,
  // paid ones open the same download checkout used by the sidebar button.
  const handleUnlock = () => {
    if (downloadFree) {
      handleFreeDownload();
    } else {
      setRevealed("download");
      setShowDownload(true);
    }
  };

  // Count a view once per mount (analytics for the gallery + admin).
  useEffect(() => {
    void recordDesignView(design.id);
  }, [design.id]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link href="/designs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700">
        <ArrowLeft className="h-4 w-4" /> Back to gallery
      </Link>

      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
        {/* Full image, no cropping. PDFs show a quarter of their pages free and
            paywall the rest; images render uncropped as before. */}
        {design.fileType === "pdf" ? (
          <PdfPreview design={design} onUnlock={handleUnlock} />
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={design.imageUrl} alt={design.title} className="h-auto w-full object-contain" />
          </div>
        )}

        <div className="space-y-5 md:sticky md:top-6">
          <div className="space-y-2">
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {design.category}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{design.title}</h1>
            {design.description ? <p className="text-sm leading-relaxed text-slate-600">{design.description}</p> : null}
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Eye className="h-3.5 w-3.5" /> {design.views.toLocaleString("en-KE")} views
            </p>
          </div>

          {/* Two separate, independently-billed offerings. Paid options reveal
              their price on engagement; free options act immediately. */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Download className="h-4 w-4 text-indigo-600" /> Download this design
                {downloadFree ? (
                  <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Free</span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">Get the full-quality file instantly. No customization.</p>
              {downloadFree ? (
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleFreeDownload}>
                  Download for Free
                </Button>
              ) : revealed === "download" ? (
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowDownload(true)}>
                  Pay {formatKsh(design.downloadPrice)} &amp; Download
                </Button>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => setRevealed("download")}>
                  Download — see price
                </Button>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-indigo-600" /> Customize this design
                {customizeFree ? (
                  <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Free</span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">Your text, colors and photos — we make it yours.</p>
              {customizeFree ? (
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowCustomize(true)}>
                  Request Customization — Free
                </Button>
              ) : revealed === "customize" ? (
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowCustomize(true)}>
                  Customize for {formatKsh(design.customizationPrice)}
                </Button>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => setRevealed("customize")}>
                  Customize — see price
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="space-y-4 border-t border-slate-100 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Related designs</h2>
            <Link href="/designs" className="text-sm font-semibold text-indigo-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {related.map((item) => (
              <DesignCard key={item.id} design={item} />
            ))}
          </div>
        </section>
      ) : null}

      <DownloadModal design={design} open={showDownload} onClose={() => setShowDownload(false)} />
      <CustomizeModal design={design} open={showCustomize} onClose={() => setShowCustomize(false)} />
    </main>
  );
}
