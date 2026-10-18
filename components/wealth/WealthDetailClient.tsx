"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, Download, Eye, ShoppingCart, Sparkles } from "lucide-react";

import Button from "@/components/ui/Button";
import CustomizeModal from "@/components/wealth/CustomizeModal";
import DownloadModal from "@/components/wealth/DownloadModal";
import WealthCard from "@/components/wealth/WealthCard";
import PdfPreview from "@/components/wealth/PdfPreview";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { proxyWealthDownloadUrl } from "@/lib/wealth/downloadUrl";
import { recordWealthView } from "@/services/wealthService";
import { WealthProduct } from "@/types/wealth";
import { WealthAccessMode } from "@/types/wealthOrder";
import ShareButton from "@/components/share/ShareButton";

function triggerDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function WealthDetailClient({
  product,
  related = [],
}: {
  product: WealthProduct;
  related?: WealthProduct[];
}) {
  const searchParams = useSearchParams();
  const resumeReadPurchase = searchParams.get("purchase") === "read";
  const [showPurchase, setShowPurchase] = useState(resumeReadPurchase);
  const [showCustomize, setShowCustomize] = useState(false);
  const [revealed, setRevealed] = useState<"purchase" | "customize" | null>(null);
  const [accessMode, setAccessMode] = useState<WealthAccessMode>(resumeReadPurchase ? "read_online" : "download");

  const productFree = Number(product.downloadPrice || 0) <= 0;
  const customizeFree = Number(product.customizationPrice || 0) <= 0;

  const openPurchase = (mode: WealthAccessMode) => {
    setAccessMode(mode);
    setShowPurchase(true);
  };

  const handleFreeDownload = () => triggerDownload(proxyWealthDownloadUrl(product.id));

  useEffect(() => {
    void recordWealthView(product.id);
  }, [product.id]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 pb-32 pt-8">
      <Link href="/wealth" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> Back to Wealth Academy
      </Link>

      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
        {product.fileType === "pdf" ? (
          <PdfPreview product={product} onUnlock={() => openPurchase("read_online")} />
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={product.title} className="h-auto w-full object-contain" />
          </div>
        )}

        <div className="space-y-5 md:sticky md:top-6">
          <div className="space-y-2">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {product.category}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{product.title}</h1>
            <p className="inline-flex w-fit rounded-lg bg-emerald-50 px-3 py-1 text-2xl font-black text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
              {productFree ? "Free" : formatKsh(product.downloadPrice)}
            </p>
            {product.description ? <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{product.description}</p> : null}
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Eye className="h-3.5 w-3.5" /> {product.views.toLocaleString("en-KE")} views
            </p>
            <div>
              <ShareButton
                title={product.title}
                entityLabel="Resource"
                path={`/wealth/${product.id}`}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex min-w-0 items-start gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                <span className="min-w-0 break-words">Get this {product.category?.trim() || "wealth resource"}</span>
                {productFree ? (
                  <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Free</span>
                ) : null}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">Pay once, then download it or keep it in your dashboard to read online.</p>
              {productFree || revealed === "purchase" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openPurchase("read_online")}>
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
                  See {formatKsh(product.downloadPrice)} access options
                </Button>
              )}
            </div>

            {product.customizationEnabled ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-emerald-600" /> Request a personalized version
                  {customizeFree ? (
                    <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Free</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">Have our team tailor a plan or resource to your goals, family, or business.</p>
                {customizeFree ? (
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCustomize(true)}>
                    Request Personalization — Free
                  </Button>
                ) : revealed === "customize" ? (
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCustomize(true)}>
                    Personalize for {formatKsh(product.customizationPrice)}
                  </Button>
                ) : (
                  <Button variant="secondary" className="w-full" onClick={() => setRevealed("customize")}>
                    Personalize — see price
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
            <h2 className="text-xl font-bold text-slate-900">Related wealth resources</h2>
            <Link href="/wealth" className="text-sm font-semibold text-emerald-700 hover:underline">View all</Link>
          </div>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {related.map((item) => <WealthCard key={item.id} product={item} />)}
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">{product.title}</p>
            <p className="text-lg font-black text-emerald-700">
              {productFree ? "Free" : formatKsh(product.downloadPrice)}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 gap-2 bg-emerald-600 px-6 py-3 text-base hover:bg-emerald-700"
            onClick={() => openPurchase("download")}
          >
            <ShoppingCart className="h-4 w-4" /> Checkout
          </Button>
        </div>
      </div>

      <DownloadModal
        key={`${showPurchase}-${accessMode}`}
        product={product}
        open={showPurchase}
        onClose={() => setShowPurchase(false)}
        initialAccessMode={accessMode}
      />
      {product.customizationEnabled ? (
        <CustomizeModal product={product} open={showCustomize} onClose={() => setShowCustomize(false)} />
      ) : null}
    </main>
  );
}
