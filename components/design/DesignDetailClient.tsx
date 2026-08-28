"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, Download, Eye, ShoppingCart, Sparkles } from "lucide-react";

import Button from "@/components/ui/Button";
import CustomizeModal from "@/components/design/CustomizeModal";
import DownloadModal from "@/components/design/DownloadModal";
import DesignCard from "@/components/design/DesignCard";
import PdfPreview from "@/components/design/PdfPreview";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { proxyDownloadUrl } from "@/lib/designs/downloadUrl";
import { recordDesignView } from "@/services/designService";
import { Design } from "@/types/design";
import { ProductAccessMode } from "@/types/designOrder";

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
  const searchParams = useSearchParams();
  const resumeReadPurchase = searchParams.get("purchase") === "read";
  const [showPurchase, setShowPurchase] = useState(resumeReadPurchase);
  const [showCustomize, setShowCustomize] = useState(false);
  const [revealed, setRevealed] = useState<"purchase" | "customize" | null>(null);
  const [accessMode, setAccessMode] = useState<ProductAccessMode>(resumeReadPurchase ? "read_online" : "download");

  const productFree = Number(design.downloadPrice || 0) <= 0;
  const customizeFree = Number(design.customizationPrice || 0) <= 0;

  const openPurchase = (mode: ProductAccessMode) => {
    setAccessMode(mode);
    setShowPurchase(true);
  };

  const handleFreeDownload = () => triggerDownload(proxyDownloadUrl(design.id));

  useEffect(() => {
    void recordDesignView(design.id);
  }, [design.id]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 pb-32 pt-8">
      <Link href="/designs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700">
        <ArrowLeft className="h-4 w-4" /> Back to digital products
      </Link>

      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
        {design.fileType === "pdf" ? (
          <PdfPreview design={design} onUnlock={() => openPurchase("read_online")} />
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
            <p className="text-2xl font-black text-indigo-700">
              {productFree ? "Free" : formatKsh(design.downloadPrice)}
            </p>
            {design.description ? <p className="text-sm leading-relaxed text-slate-600">{design.description}</p> : null}
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Eye className="h-3.5 w-3.5" /> {design.views.toLocaleString("en-KE")} views
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookOpen className="h-4 w-4 text-indigo-600" /> Buy this digital product
                {productFree ? (
                  <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Free</span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">Pay once, then download it or keep it in your dashboard to read online.</p>
              {productFree || revealed === "purchase" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => openPurchase("read_online")}>
                    <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Read Online</span>
                  </Button>
                  {productFree ? (
                    <Button variant="secondary" onClick={handleFreeDownload}>
                      <span className="inline-flex items-center gap-1.5"><Download className="h-4 w-4" /> Download</span>
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => openPurchase("download")}>
                      <span className="inline-flex items-center gap-1.5"><Download className="h-4 w-4" /> Download</span>
                    </Button>
                  )}
                </div>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => setRevealed("purchase")}>
                  See {formatKsh(design.downloadPrice)} access options
                </Button>
              )}
            </div>

            {design.customizationEnabled ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" /> Customize this product
                  {customizeFree ? (
                    <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Free</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">For editable designs: your text, colors and photos — professionally prepared for you.</p>
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
            ) : null}
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="space-y-4 border-t border-slate-100 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Related digital products</h2>
            <Link href="/designs" className="text-sm font-semibold text-indigo-700 hover:underline">View all</Link>
          </div>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {related.map((item) => <DesignCard key={item.id} design={item} />)}
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">{design.title}</p>
            <p className="text-lg font-black text-indigo-700">
              {productFree ? "Free" : formatKsh(design.downloadPrice)}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 gap-2 bg-indigo-600 px-6 py-3 text-base hover:bg-indigo-700"
            onClick={() => openPurchase("download")}
          >
            <ShoppingCart className="h-4 w-4" /> Checkout
          </Button>
        </div>
      </div>

      <DownloadModal
        key={`${showPurchase}-${accessMode}`}
        design={design}
        open={showPurchase}
        onClose={() => setShowPurchase(false)}
        initialAccessMode={accessMode}
      />
      {design.customizationEnabled ? (
        <CustomizeModal design={design} open={showCustomize} onClose={() => setShowCustomize(false)} />
      ) : null}
    </main>
  );
}
