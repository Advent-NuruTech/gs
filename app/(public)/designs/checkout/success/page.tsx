"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";

import Button from "@/components/ui/Button";
import { formatKsh } from "@/lib/utils/formatCurrency";
import { verifyDesignOrder } from "@/services/designOrderService";
import { DesignOrderKind } from "@/types/designOrder";

/** Kick off a browser download for the given URL (full-quality file). */
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
  const [designTitle, setDesignTitle] = useState("");
  const [kind, setKind] = useState<DesignOrderKind>("customization");
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    let active = true;
    async function run() {
      if (!reference) {
        setState("failed");
        return;
      }
      try {
        const result = await verifyDesignOrder(reference);
        if (!active) return;
        if (result.ok && result.status === "success") {
          setAmount(result.amount ?? 0);
          setDesignTitle(result.designTitle ?? "");
          setKind(result.kind ?? "customization");
          setDownloadUrl(result.downloadUrl ?? "");
          setState("success");
          // Instant downloads: start the file automatically.
          if (result.kind === "download" && result.downloadUrl) {
            triggerDownload(result.downloadUrl);
          }
        } else {
          setState("failed");
        }
      } catch {
        if (active) setState("failed");
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [reference]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
      <section className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state === "verifying" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900">Confirming your payment…</h1>
            <p className="text-slate-600">This only takes a moment.</p>
          </>
        )}

        {state === "success" && kind === "download" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="text-2xl font-bold text-slate-900">Your download is ready!</h1>
            <p className="text-slate-600">
              {formatKsh(amount)} received for{designTitle ? ` ${designTitle}` : " your design"}. Your full-quality file
              should be downloading now. If it didn’t start, tap the button below.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {downloadUrl ? (
                <a href={downloadUrl} download>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <span className="inline-flex items-center gap-2">
                      <Download className="h-4 w-4" /> Download again
                    </span>
                  </Button>
                </a>
              ) : null}
              <Link href="/designs">
                <Button variant="secondary">Browse More Designs</Button>
              </Link>
            </div>
          </>
        )}

        {state === "success" && kind !== "download" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="text-2xl font-bold text-slate-900">Order received!</h1>
            <p className="text-slate-600">
              {formatKsh(amount)} received for{designTitle ? ` ${designTitle}` : " your design"}. Our team has been
              notified and will start your custom design right away. We&apos;ll deliver it to your email or WhatsApp.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/designs">
                <Button>Browse More Designs</Button>
              </Link>
            </div>
          </>
        )}

        {state === "failed" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-900">We could not confirm your payment</h1>
            <p className="text-slate-600">
              If you were charged, your order is recorded automatically once Paystack confirms. You can browse and try
              again below.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/designs">
                <Button>Back to Gallery</Button>
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function DesignCheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 py-10 text-slate-600">Loading…</main>}>
      <SuccessContent />
    </Suspense>
  );
}
