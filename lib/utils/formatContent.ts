import { detectLinks } from "@/lib/utils/detectLinks";
import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";

function sanitizeRichHtml(rawHtml: string): string {
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

const YOUTUBE_URL_REGEX =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]{11}[^\s<]*|youtube\.com\/embed\/[\w-]{11}[^\s<]*|youtube\.com\/shorts\/[\w-]{11}[^\s<]*|youtu\.be\/[\w-]{11}[^\s<]*)/gi;

const IMAGE_URL_REGEX =
  /https?:\/\/[^\s<"]+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s<"]*)?/gi;
const INLINE_YOUTUBE_TOKEN_REGEX = /\{\{youtube:([A-Za-z0-9_-]{11})\}\}/gi;

function stripBrokenAnchorArtifacts(content: string): string {
  return content.replace(/(^|[^<])target="_blank"[^>]*>[^<]*(?=$|<|\n)/gi, "$1");
}

function embedYoutubeUrls(content: string): string {
  return content.replace(YOUTUBE_URL_REGEX, (url) => {
    const youtubeId = extractYoutubeId(url);
    if (!youtubeId) return url;
    return `<div class="my-4 overflow-hidden rounded-md border border-slate-200"><iframe class="aspect-video w-full" src="https://www.youtube.com/embed/${youtubeId}" title="Embedded YouTube video" allowfullscreen></iframe></div>`;
  });
}

function embedInlineYoutubeTokens(content: string): string {
  return content.replace(INLINE_YOUTUBE_TOKEN_REGEX, (_match, videoId: string) => {
    return `<div class="my-4 overflow-hidden rounded-md border border-slate-200"><iframe class="aspect-video w-full" src="https://www.youtube.com/embed/${videoId}" title="Embedded YouTube video" allowfullscreen></iframe></div>`;
  });
}

function embedImageUrls(content: string): string {
  return content.replace(IMAGE_URL_REGEX, (url) => {
    return `<figure class="my-4 overflow-hidden rounded-md border border-slate-200"><img src="${url}" alt="Embedded lesson media" class="h-auto w-full object-cover" loading="lazy" /></figure>`;
  });
}

export function formatContent(rawHtml: string): string {
  const cleaned = stripBrokenAnchorArtifacts(rawHtml);
  const safeContent = sanitizeRichHtml(cleaned);
  const withYoutubeTokens = embedInlineYoutubeTokens(safeContent);
  const withYoutube = embedYoutubeUrls(withYoutubeTokens);
  const withImages = embedImageUrls(withYoutube);
  return detectLinks(withImages);
}
