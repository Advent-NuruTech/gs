import "server-only";

import crypto from "crypto";

/**
 * Cloudinary blocks *unsigned* delivery of PDF (and ZIP) files by default — the
 * "Allow delivery of PDF and ZIP files" security setting — so a plain
 * `fl_attachment` PDF link returns HTTP 401. A *signed* delivery URL bypasses
 * that restriction, which is how we hand over purchased PDF templates without
 * touching the account-wide setting. Images aren't restricted, but signing them
 * is harmless and keeps one code path.
 *
 * Signing needs only the cloud name + API secret (never exposed to the client).
 */

interface ParsedCloudinaryUrl {
  cloudName: string;
  resourceType: string; // usually "image" (PDFs are stored as image resources)
  deliveryType: string; // usually "upload"
  version?: string;
  publicIdWithFormat: string; // e.g. adventskool/designs/abc.pdf
}

function parseCloudinaryUrl(url: string): ParsedCloudinaryUrl | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("cloudinary.com")) return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    // /<cloud>/<resourceType>/<deliveryType>/[s--sig--]/[transforms]/[v123]/<public id>.<ext>
    const [cloudName, resourceType, deliveryType, ...rest] = segments;
    if (!cloudName || !resourceType || !deliveryType || rest.length === 0) return null;

    // Drop any existing signature segment so we can sign cleanly.
    const withoutSignature = rest.filter((segment) => !/^s--[\w-]+--$/.test(segment));

    // A `v<digits>` segment marks the start of the public id; anything before it
    // is a version/transform we ignore for the deliverable.
    const versionIndex = withoutSignature.findIndex((segment) => /^v\d+$/.test(segment));
    const publicSegments =
      versionIndex >= 0 ? withoutSignature.slice(versionIndex + 1) : withoutSignature;
    if (publicSegments.length === 0) return null;

    return {
      cloudName,
      resourceType,
      deliveryType,
      version: versionIndex >= 0 ? withoutSignature[versionIndex].slice(1) : undefined,
      publicIdWithFormat: publicSegments.join("/"),
    };
  } catch {
    return null;
  }
}

function safeAttachmentName(name?: string): string {
  return (
    (name ?? "design")
      .trim()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "design"
  );
}

/**
 * Build a signed, force-download Cloudinary URL for the given asset. Returns
 * `null` when the URL isn't a Cloudinary upload URL or the API secret isn't
 * configured, so callers can fall back to the unsigned attachment URL.
 */
export function signedDownloadUrl(url: string, filename?: string): string | null {
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  const parsed = parseCloudinaryUrl(url);
  if (!apiSecret || !parsed) return null;

  const transformation = `fl_attachment:${safeAttachmentName(filename)}`;
  // Cloudinary signs the transformation + public id (with extension), excluding
  // the version. Default signatures are SHA-1, url-safe base64, first 8 chars.
  const toSign = `${transformation}/${parsed.publicIdWithFormat}`;
  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, 8);

  const versionPart = parsed.version ? `v${parsed.version}/` : "";
  return (
    `https://res.cloudinary.com/${parsed.cloudName}/${parsed.resourceType}/${parsed.deliveryType}` +
    `/s--${signature}--/${transformation}/${versionPart}${parsed.publicIdWithFormat}`
  );
}
