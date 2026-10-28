"use client";

import { useEffect, useRef, useState } from "react";
import StatusCard from "@/components/ui/StatusCard";

export default function PdfReader({ source, onTotalPages }: { source: string; onTotalPages?: (total: number) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const target = container.current;
    const controller = new AbortController();
    let destroy: (() => Promise<void>) | undefined;
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        let data: Uint8Array | undefined;
        if (onTotalPages) {
          const response = await fetch(source, { signal: controller.signal });
          if (!response.ok) throw new Error("Unable to load PDF preview");
          const total = Number(response.headers.get("X-PDF-Total-Pages"));
          data = new Uint8Array(await response.arrayBuffer());
          if (!cancelled && total > 0) onTotalPages(total);
        }
        const task = pdfjs.getDocument(data ? { data } : { url: source });
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
          if (!cancelled) target?.appendChild(canvas);
        }
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void render();
    return () => { cancelled = true; controller.abort(); void destroy?.(); target?.replaceChildren(); };
  }, [source, onTotalPages]);

  return <div className="space-y-3">
    {state === "loading" ? <StatusCard kind="loading" title="Opening your PDF" description="Please wait while the pages load." /> : null}
    {state === "error" ? <StatusCard kind="error" title="Could not open this PDF" description="Please try again later." /> : null}
    <div ref={container} className="space-y-3" />
  </div>;
}
