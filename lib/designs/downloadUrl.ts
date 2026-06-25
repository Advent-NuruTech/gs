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
