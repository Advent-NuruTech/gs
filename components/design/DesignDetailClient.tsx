"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Eye, Sparkles } from "lucide-react";

import Button from "@/components/ui/Button";
import CustomizeModal from "@/components/design/CustomizeModal";
import DownloadModal from "@/components/design/DownloadModal";
import DesignCard from "@/components/design/DesignCard";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { recordDesignView } from "@/services/designService";
import { Design } from "@/types/design";

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

  const canDownload = Number(design.downloadPrice || 0) > 0;
  const canCustomize = Number(design.customizationPrice || 0) > 0;

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
        {/* Full image, no cropping. */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={design.imageUrl} alt={design.title} className="h-auto w-full object-contain" />
        </div>

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

          {/* Two separate, independently-billed offerings. The price is revealed
              when the customer engages with each option. */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            {canDownload ? (
              <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Download className="h-4 w-4 text-indigo-600" /> Download this design
                </div>
                <p className="text-xs text-slate-500">Get the full-quality file instantly. No customization.</p>
                {revealed === "download" ? (
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => setShowDownload(true)}
                  >
                    Pay {formatKsh(design.downloadPrice)} &amp; Download
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setRevealed("download")}
                  >
                    Download — see price
                  </Button>
                )}
              </div>
            ) : null}

            {canCustomize ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" /> Customize this design
                </div>
                <p className="text-xs text-slate-500">Your text, colors and photos — we make it yours.</p>
                {revealed === "customize" ? (
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => setShowCustomize(true)}
                  >
                    Customize for {formatKsh(design.customizationPrice)}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setRevealed("customize")}
                  >
                    Customize — see price
                  </Button>
                )}
              </div>
            ) : null}

            {!canDownload && !canCustomize ? (
              <p className="text-center text-sm text-slate-500">This design isn’t available for purchase yet.</p>
            ) : null}
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
