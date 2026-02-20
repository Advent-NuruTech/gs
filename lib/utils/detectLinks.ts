const URL_REGEX =
  /(?<!href=")(?<!src=")(https?:\/\/(?:www\.)?[^\s<]+[^<.,:;"')\]\s])/gi;

function formatLinkText(url: string, index: number): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    return `Visit ${host}${index > 0 ? ` (${index + 1})` : ""}`;
  } catch {
    return `Open link${index > 0 ? ` ${index + 1}` : ""}`;
  }
}

export function detectLinks(content: string): string {
  let matchIndex = 0;
  return content.replace(URL_REGEX, (url) => {
    const linkText = formatLinkText(url, matchIndex);
    matchIndex += 1;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline decoration-2 underline-offset-2">${linkText}</a>`;
  });
}
