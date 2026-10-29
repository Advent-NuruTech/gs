import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

import { getAssetByReference, getR2SourceUrl } from "@/lib/cloudflare/assets";
import { freePreviewPageCount } from "@/lib/designs/pdfPreview";
import { getPublishedDesign } from "@/lib/designs/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  try {
    const design = await getPublishedDesign(designId);
    if (!design || design.fileType !== "pdf" || !design.fileUrl) {
      return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    }
    const asset = await getAssetByReference(design.fileUrl);
    if (!asset || asset.status !== "ready" || asset.productKind !== "design" || asset.purpose !== "deliverable") {
      return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    }
    const source = await getR2SourceUrl(design.fileUrl);
    if (!source) return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to read PDF");
    const original = await PDFDocument.load(await response.arrayBuffer());
    const total = original.getPageCount();
    const count = freePreviewPageCount(total, design.previewPageCount);
    if (!count) throw new Error("PDF has no pages");
    const preview = await PDFDocument.create();
    const pages = await preview.copyPages(original, Array.from({ length: count }, (_, index) => index));
    for (const page of pages) preview.addPage(page);
    const bytes = await preview.save();
    return new NextResponse(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-PDF-Total-Pages": String(total),
    } });
  } catch {
    return NextResponse.json({ error: "The PDF preview could not be opened." }, { status: 502 });
  }
}
