import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { signedDownloadUrl } from "@/lib/cloudinary/signedDownloadUrl";
import { toDownloadUrl } from "@/lib/designs/downloadUrl";

export const runtime = "nodejs";

/**
 * Streams a purchased/free design file back to the visitor from our own domain.
 *
 * Why a proxy instead of linking straight to Cloudinary:
 *  - Cloudinary returns HTTP 401 for unsigned PDF delivery, so the old direct
 *    link broke for PDF templates. We sign the URL server-side (bypassing the
 *    PDF restriction) and stream the bytes, so PDFs behave exactly like images.
 *  - The visitor never gets redirected off-site, and the file downloads with a
 *    friendly filename for both the automatic and the manual "download again".
 *  - Paid files stay gated: a paid design only streams with a settled order.
 */

function safeFileName(title: string, deliverableUrl: string): string {
  const base =
    title
      .trim()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "design";
  const ext = deliverableUrl.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "";
  return ext ? `${base}.${ext}` : base;
}

export async function GET(request: NextRequest) {
  const designId = request.nextUrl.searchParams.get("designId")?.trim() ?? "";
  const reference = request.nextUrl.searchParams.get("reference")?.trim() ?? "";
  if (!designId) {
    return NextResponse.json({ error: "Missing design." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: design } = await admin
    .from("designs")
    .select("*")
    .eq("id", designId)
    .maybeSingle();

  if (!design || !design.published) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  // Free designs are open; paid ones require a settled download order. Never
  // trust the client for pricing — read it from the design row.
  const price = Math.max(0, Number(design.download_price ?? 0));
  if (price > 0) {
    if (!reference) {
      return NextResponse.json({ error: "Payment required." }, { status: 402 });
    }
    const { data: order } = await admin
      .from("design_orders")
      .select("payment_status, kind, design_id")
      .eq("paystack_reference", reference)
      .maybeSingle();
    const paid =
      order &&
      order.design_id === designId &&
      order.kind === "download" &&
      order.payment_status === "success";
    if (!paid) {
      return NextResponse.json({ error: "Payment not verified for this design." }, { status: 403 });
    }
  }

  // Deliver the original asset (PDF template or full-quality image); fall back to
  // the preview image for legacy rows without a stored file_url.
  const deliverable = String(design.file_url ?? "") || String(design.image_url ?? "");
  if (!deliverable) {
    return NextResponse.json({ error: "No file is available for this design." }, { status: 404 });
  }

  const title = String(design.title ?? "design");
  // Prefer a signed URL (works for restricted PDFs); fall back to the unsigned
  // attachment URL when no API secret is configured (works for images, and for
  // PDFs once PDF delivery is enabled in the Cloudinary console).
  const sourceUrl = signedDownloadUrl(deliverable, title) ?? toDownloadUrl(deliverable, title);

  let upstream: Response;
  try {
    upstream = await fetch(sourceUrl, { cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "Could not reach the file host." }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "The file could not be downloaded." },
      { status: upstream.status === 401 ? 502 : upstream.status || 502 },
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Content-Disposition", `attachment; filename="${safeFileName(title, deliverable)}"`);
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(upstream.body, { status: 200, headers });
}
