export function extractCloudinaryPublicId(url: string): string | null {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.includes("cloudinary.com")) return null;

    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    const uploadIndex = pathSegments.findIndex((segment) => segment === "upload");
    if (uploadIndex < 0) return null;

    const postUploadSegments = pathSegments.slice(uploadIndex + 1);
    const versionIndex = postUploadSegments.findIndex((segment) => /^v\d+$/.test(segment));
    const publicPathSegments =
      versionIndex >= 0
        ? postUploadSegments.slice(versionIndex + 1)
        : postUploadSegments;

    if (!publicPathSegments.length) return null;

    const lastSegment = publicPathSegments[publicPathSegments.length - 1];
    if (!lastSegment) return null;

    publicPathSegments[publicPathSegments.length - 1] = lastSegment.replace(/\.[^/.]+$/, "");
    return publicPathSegments.join("/");
  } catch {
    return null;
  }
}
