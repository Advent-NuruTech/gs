import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";

const YOUTUBE_URL_SOURCE =
  String.raw`https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]{11}(?:[^\s<"']*)?|youtube\.com\/embed\/[\w-]{11}(?:[^\s<"']*)?|youtube\.com\/shorts\/[\w-]{11}(?:[^\s<"']*)?|youtu\.be\/[\w-]{11}(?:[^\s<"']*)?)`;
const YOUTUBE_URL_REGEX = new RegExp(YOUTUBE_URL_SOURCE, "gi");
const YOUTUBE_ANCHOR_REGEX = new RegExp(
  String.raw`<a\b[^>]*href=(["'])(${YOUTUBE_URL_SOURCE})\1[^>]*>[\s\S]*?<\/a>`,
  "gi",
);

function replaceTextOutsideHtml(content: string, replacer: (text: string) => string): string {
  return content
    .split(/(<[^>]+>)/g)
    .map((segment) => (segment.startsWith("<") ? segment : replacer(segment)))
    .join("");
}

export function normalizeInlineVideoLinks(content: string): string {
  const withoutBrokenAnchorArtifacts = content.replace(
    /(^|[^<])target="_blank"[^>]*>[^<]*(?=$|<|\n)/gi,
    "$1",
  );

  const withYoutubeAnchorTokens = withoutBrokenAnchorArtifacts.replace(
    YOUTUBE_ANCHOR_REGEX,
    (match, _quote: string, url: string) => {
      const id = extractYoutubeId(url);
      if (!id) return match;
      return `{{youtube:${id}}}`;
    },
  );

  return replaceTextOutsideHtml(withYoutubeAnchorTokens, (text) =>
    text.replace(YOUTUBE_URL_REGEX, (url) => {
      const id = extractYoutubeId(url);
      if (!id) return url;
      return `{{youtube:${id}}}`;
    }),
  );
}
