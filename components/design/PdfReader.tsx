"use client";

import { useEffect, useRef, useState } from "react";
import StatusCard from "@/components/ui/StatusCard";

export default function PdfReader({ source }: { source: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => Promise<void>) | undefined;
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const task = pdfjs.getDocument({ url: source });
        destroy = () => task.destroy();
        const document = await task.promise;
        if (cancelled) { await task.destroy(); return; }
        for (let number = 1; number <= document.numPages && !cancelled; number++) {
          const page = await document.getPage(number);
          const viewport = page.getViewport({ scale: Math.min(2, 1200 / page.getViewport({ scale: 1 }).width) });
          const canvas = window.document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = "h-auto w-full rounded-xl border border-slate-200 bg-white";
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Unable to render PDF");
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          if (!cancelled) container.current?.appendChild(canvas);
        }
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void render();
    return () => { cancelled = true; void destroy?.(); };
  }, [source]);

  return <div className="space-y-3">
    {state === "loading" ? <StatusCard kind="loading" title="Opening your PDF" description="Please wait while the pages load." /> : null}
    {state === "error" ? <StatusCard kind="error" title="Could not open this PDF" description="Please try again later." /> : null}
    <div ref={container} className="space-y-3" />
  </div>;
}
