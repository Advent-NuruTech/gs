/**
 * Helpers for the "read a quarter of the pages for free, pay for the rest" PDF
 * preview. Cloudinary stores uploaded PDFs as image resources, so any page can
 * be rendered as a JPG with the `pg_<n>` transformation — no client-side PDF
 * library needed.
 */

/**
 * Cloudinary URL that renders a single page of a PDF as a JPG the browser can
 * show in an <img>. We swap the `.pdf` extension for `.jpg` and insert the
 * `pg_<page>` page-select transform right after `/upload/`.
 */
export function pdfPageImageUrl(pdfUrl: string, page: number): string {
  if (!pdfUrl || !pdfUrl.includes("/upload/")) return pdfUrl;
  const safePage = Math.max(1, Math.floor(page || 1));
  const asJpg = pdfUrl.replace(/\.pdf($|\?)/i, ".jpg$1");
  // Skip if a page transform is somehow already present.
  if (/\/upload\/pg_\d+\//.test(asJpg)) return asJpg;
  return asJpg.replace("/upload/", `/upload/pg_${safePage}/`);
}

/**
 * How many pages a visitor may read for free: a quarter of the document,
 * rounded up, but always at least one page. Returns 0 when the page count is
 * unknown (legacy PDFs) so callers can fall back to the single-page preview.
 */
export function freePreviewPageCount(totalPages?: number): number {
  const total = Math.max(0, Math.floor(totalPages ?? 0));
  if (total <= 0) return 0;
  if (total === 1) return 1;
  return Math.max(1, Math.ceil(total / 4));
}
