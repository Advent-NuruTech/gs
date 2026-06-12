const URL_REGEX = /https?:\/\/(?:www\.)?[^\s<]+[^<.,:;"')\]\s]/gi;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceTextOutsideHtml(content: string, replacer: (text: string) => string): string {
  return content
    .split(/(<[^>]+>)/g)
    .map((segment) => (segment.startsWith("<") ? segment : replacer(segment)))
    .join("");
}

export function detectLinks(content: string): string {
  return replaceTextOutsideHtml(content, (text) =>
    text.replace(URL_REGEX, (url) => {
      const safeUrl = escapeHtml(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline decoration-2 underline-offset-2 break-all">${safeUrl}</a>`;
    }),
  );
}
