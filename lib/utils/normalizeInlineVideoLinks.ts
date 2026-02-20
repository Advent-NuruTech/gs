import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";

const YOUTUBE_URL_REGEX =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]{11}[^\s<]*|youtube\.com\/embed\/[\w-]{11}[^\s<]*|youtube\.com\/shorts\/[\w-]{11}[^\s<]*|youtu\.be\/[\w-]{11}[^\s<]*)/gi;

export function normalizeInlineVideoLinks(content: string): string {
  const withoutBrokenAnchorArtifacts = content.replace(
    /(^|[^<])target="_blank"[^>]*>[^<]*(?=$|<|\n)/gi,
    "$1",
  );

  return withoutBrokenAnchorArtifacts.replace(YOUTUBE_URL_REGEX, (url) => {
    const id = extractYoutubeId(url);
    if (!id) return url;
    return `{{youtube:${id}}}`;
  });
}

