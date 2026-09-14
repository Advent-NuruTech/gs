const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&#39;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

function decodeCodePoint(value: string, radix: number, original: string): string {
  const codePoint = Number.parseInt(value, radix);
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return original;
  return String.fromCodePoint(codePoint);
}

/** Convert trusted rich-text content into compact text for previews and sharing. */
export function toPlainText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|apos|#39|quot|lt|gt|nbsp);/gi, (entity) =>
      HTML_ENTITIES[entity.toLowerCase()] ?? entity,
    )
    .replace(/&#(\d+);/g, (entity, code: string) => decodeCodePoint(code, 10, entity))
    .replace(/&#x([0-9a-f]+);/gi, (entity, code: string) => decodeCodePoint(code, 16, entity))
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(value: string, maxLength = 200): string {
  const text = toPlainText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
