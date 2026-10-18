import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { signedDownloadUrl } from "@/lib/cloudinary/signedDownloadUrl";
import { toWealthDownloadUrl } from "@/lib/wealth/downloadUrl";

export const runtime = "nodejs";

/**
 * Streams a purchased/free wealth resource back to the visitor from our own
 * domain.
 *
 * Why a proxy instead of linking straight to Cloudinary:
 *  - Cloudinary returns HTTP 401 for unsigned PDF delivery, so a direct link
 *    breaks for PDF resources. We sign the URL server-side and stream the bytes,
 *    so PDFs behave exactly like images.
 *  - The visitor never gets redirected off-site, and the file downloads with a
 *    friendly filename for both the automatic and manual "download again".
 *  - Paid files stay gated: a paid resource only streams with a settled order.
 */

function safeFileName(title: string, deliverableUrl: string): string {
  const base =
    title
      .trim()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "wealth";
  const ext = deliverableUrl.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "";
  return ext ? `${base}.${ext}` : base;
}

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId")?.trim() ?? "";
  const reference = request.nextUrl.searchParams.get("reference")?.trim() ?? "";
  if (!productId) {
    return NextResponse.json({ error: "Missing wealth resource." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: product } = await admin
    .from("wealth_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.published) {
    return NextResponse.json({ error: "Wealth resource not found." }, { status: 404 });
  }

  // Free resources are open; paid ones require a settled download order. Never
  // trust the client for pricing — read it from the resource row.
  const price = Math.max(0, Number(product.download_price ?? 0));
  if (price > 0) {
    if (!reference) {
      return NextResponse.json({ error: "Payment required." }, { status: 402 });
    }
    const { data: order } = await admin
      .from("wealth_orders")
      .select("payment_status, kind, product_id")
      .eq("paystack_reference", reference)
      .maybeSingle();
    const paid =
      order &&
      order.product_id === productId &&
      order.kind === "download" &&
      order.payment_status === "success";
    if (!paid) {
      return NextResponse.json({ error: "Payment not verified for this wealth resource." }, { status: 403 });
    }
  }

  // Deliver the original asset (PDF resource or full-quality image); fall back to
  // the preview image for legacy rows without a stored file_url.
  const deliverable = String(product.file_url ?? "") || String(product.image_url ?? "");
  if (!deliverable) {
    return NextResponse.json({ error: "No file is available for this wealth resource." }, { status: 404 });
  }

  const title = String(product.title ?? "wealth");
  // Prefer a signed URL (works for restricted PDFs); fall back to the unsigned
  // attachment URL when no API secret is configured.
  const sourceUrl = signedDownloadUrl(deliverable, title) ?? toWealthDownloadUrl(deliverable, title);

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
