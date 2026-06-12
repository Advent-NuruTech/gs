import { detectLinks } from "@/lib/utils/detectLinks";
import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";

function sanitizeRichHtml(rawHtml: string): string {
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"');
}

const YOUTUBE_URL_SOURCE =
  String.raw`https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]{11}(?:[^\s<"']*)?|youtube\.com\/embed\/[\w-]{11}(?:[^\s<"']*)?|youtube\.com\/shorts\/[\w-]{11}(?:[^\s<"']*)?|youtu\.be\/[\w-]{11}(?:[^\s<"']*)?)`;
const YOUTUBE_URL_REGEX = new RegExp(YOUTUBE_URL_SOURCE, "gi");
const YOUTUBE_ANCHOR_REGEX = new RegExp(
  String.raw`<a\b[^>]*href=(["'])(${YOUTUBE_URL_SOURCE})\1[^>]*>[\s\S]*?<\/a>`,
  "gi",
);

const IMAGE_URL_REGEX =
  /https?:\/\/[^\s<"']+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s<"']*)?/gi;
const INLINE_YOUTUBE_TOKEN_REGEX = /\{\{youtube:([A-Za-z0-9_-]{11})\}\}/gi;

function stripBrokenAnchorArtifacts(content: string): string {
  return content.replace(/(^|[^<])target="_blank"[^>]*>[^<]*(?=$|<|\n)/gi, "$1");
}

function replaceTextOutsideHtml(content: string, replacer: (text: string) => string): string {
  return content
    .split(/(<[^>]+>)/g)
    .map((segment) => (segment.startsWith("<") ? segment : replacer(segment)))
    .join("");
}

function buildYoutubeEmbed(videoId: string): string {
  return `<div class="my-4 overflow-hidden rounded-md border border-slate-200"><iframe class="aspect-video w-full" src="https://www.youtube.com/embed/${videoId}" title="Embedded YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe></div>`;
}

function embedLinkedYoutubeUrls(content: string): string {
  return content.replace(YOUTUBE_ANCHOR_REGEX, (match, _quote: string, url: string) => {
    const youtubeId = extractYoutubeId(url);
    if (!youtubeId) return match;
    return buildYoutubeEmbed(youtubeId);
  });
}

function embedYoutubeUrls(content: string): string {
  return replaceTextOutsideHtml(content, (text) =>
    text.replace(YOUTUBE_URL_REGEX, (url) => {
      const youtubeId = extractYoutubeId(url);
      if (!youtubeId) return url;
      return buildYoutubeEmbed(youtubeId);
    }),
  );
}

function embedInlineYoutubeTokens(content: string): string {
  return replaceTextOutsideHtml(content, (text) =>
    text.replace(INLINE_YOUTUBE_TOKEN_REGEX, (_match, videoId: string) => {
      return buildYoutubeEmbed(videoId);
    }),
  );
}

function embedImageUrls(content: string): string {
  return replaceTextOutsideHtml(content, (text) =>
    text.replace(IMAGE_URL_REGEX, (url) => {
      return `<figure class="my-4 overflow-hidden rounded-md border border-slate-200"><img src="${url}" alt="Embedded lesson media" class="h-auto w-full object-cover" loading="lazy" /></figure>`;
    }),
  );
}

export function formatContent(rawHtml: string): string {
  const cleaned = stripBrokenAnchorArtifacts(rawHtml);
  const safeContent = sanitizeRichHtml(cleaned);
  const withLinkedYoutube = embedLinkedYoutubeUrls(safeContent);
  const withYoutubeTokens = embedInlineYoutubeTokens(withLinkedYoutube);
  const withYoutube = embedYoutubeUrls(withYoutubeTokens);
  const withImages = embedImageUrls(withYoutube);
  return detectLinks(withImages);
}
