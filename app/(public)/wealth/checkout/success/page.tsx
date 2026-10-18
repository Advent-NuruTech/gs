"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2, Download, Loader2, XCircle } from "lucide-react";

import Button from "@/components/ui/Button";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { verifyWealthOrder } from "@/services/wealthOrderService";
import { WealthOrderKind, WealthAccessMode } from "@/types/wealthOrder";

function triggerDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const [state, setState] = useState<"verifying" | "success" | "failed">("verifying");
  const [amount, setAmount] = useState(0);
  const [productTitle, setProductTitle] = useState("");
  const [kind, setKind] = useState<WealthOrderKind>("customization");
  const [accessMode, setAccessMode] = useState<WealthAccessMode>("download");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [libraryUrl, setLibraryUrl] = useState("");

  useEffect(() => {
    let active = true;
    async function run() {
      if (!reference) {
        setState("failed");
        return;
      }
      try {
        const result = await verifyWealthOrder(reference);
        if (!active) return;
        if (result.ok && result.status === "success") {
          setAmount(result.amount ?? 0);
          setProductTitle(result.productTitle ?? "");
          setKind(result.kind ?? "customization");
          setAccessMode(result.accessMode ?? "download");
          setDownloadUrl(result.downloadUrl ?? "");
          setLibraryUrl(result.libraryUrl ?? "");
          setState("success");
          if (result.kind === "download" && result.accessMode !== "read_online" && result.downloadUrl) {
            triggerDownload(result.downloadUrl);
          }
        } else {
          setState("failed");
        }
      } catch {
        if (active) setState("failed");
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [reference]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
      <section className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state === "verifying" ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-500" />
            <h1 className="text-xl font-bold text-slate-900">Confirming your payment…</h1>
            <p className="text-slate-600">This only takes a moment.</p>
          </>
        ) : null}

        {state === "success" && kind === "download" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="text-2xl font-bold text-slate-900">
              {accessMode === "read_online" ? "Your resource is in your library!" : "Your download is ready!"}
            </h1>
            <p className="text-slate-600">
              {formatKsh(amount)} received for{productTitle ? ` ${productTitle}` : " your wealth resource"}.{" "}
              {accessMode === "read_online"
                ? "Read it now and return anytime from My Wealth Library."
                : "Your full-quality file should be downloading now. If it did not start, use the button below."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {libraryUrl ? (
                <Link href={libraryUrl}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700"><span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4" /> Read online</span></Button>
                </Link>
              ) : null}
              {downloadUrl ? (
                <a href={downloadUrl} download>
                  <Button className="bg-emerald-600 hover:bg-emerald-700"><span className="inline-flex items-center gap-2"><Download className="h-4 w-4" /> Download again</span></Button>
                </a>
              ) : null}
              <Link href="/dashboard/wealth"><Button variant="secondary">My Wealth Library</Button></Link>
              <Link href="/wealth"><Button variant="secondary">Browse More Resources</Button></Link>
            </div>
          </>
        ) : null}

        {state === "success" && kind !== "download" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="text-2xl font-bold text-slate-900">Request received!</h1>
            <p className="text-slate-600">
              {formatKsh(amount)} received for{productTitle ? ` ${productTitle}` : " your resource"}. Our team has been notified and will begin your personalized work.
            </p>
            <Link href="/wealth"><Button>Browse More Resources</Button></Link>
          </>
        ) : null}

        {state === "failed" ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-900">We could not confirm your payment</h1>
            <p className="text-slate-600">If you were charged, your purchase is recorded automatically once Paystack confirms it.</p>
            <Link href="/wealth"><Button>Back to Wealth Academy</Button></Link>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function WealthCheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 py-10 text-slate-600">Loading…</main>}>
      <SuccessContent />
    </Suspense>
  );
}
