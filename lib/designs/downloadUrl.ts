/**
 * Turn a Cloudinary "upload" URL into a forced full-quality download URL.
 *
 * Cloudinary serves the original asset when no resizing transforms are applied,
 * and the `fl_attachment` flag makes the browser download the file (with a
 * friendly filename) instead of opening it inline — the same way other apps
 * hand you the file on download.
 */
export function toDownloadUrl(imageUrl: string, filename?: string): string {
  if (!imageUrl || !imageUrl.includes("/upload/")) return imageUrl;

  const safeName = (filename ?? "design")
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "design";

  // Insert the attachment flag right after `/upload/`. Skip if already present.
  if (/\/upload\/fl_attachment/.test(imageUrl)) return imageUrl;
  return imageUrl.replace("/upload/", `/upload/fl_attachment:${safeName}/`);
}

/**
 * Same-origin download link for a purchased/free design. Routing through our own
 * API (instead of linking straight to Cloudinary) avoids the PDF 401, forces a
 * real file download, and never redirects the visitor off-site. Pass the paid
 * order `reference` for paid designs; free designs need only the id.
 */
export function proxyDownloadUrl(designId: string, reference?: string): string {
  const params = new URLSearchParams({ designId });
  if (reference) params.set("reference", reference);
  return `/api/designs/download?${params.toString()}`;
}
