import { CreatorSocialLinks, CreatorSocialPlatform } from "@/types/creator";

export const RESERVED_CREATOR_HANDLES = new Set([
  "admin", "api", "auth", "checkout", "cookies", "courses", "dashboard",
  "designs", "invite", "login", "privacy", "register", "reset-password",
  "terms", "tools", "wealth",
]);

export const CREATOR_SOCIAL_PLATFORMS: CreatorSocialPlatform[] = [
  "website", "instagram", "facebook", "youtube", "linkedin", "x", "tiktok",
];

export function normalizeCreatorHandle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

export function validateCreatorHandle(value: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(value)) {
    return "Use 3–30 lowercase letters, numbers, or single hyphens.";
  }
  if (RESERVED_CREATOR_HANDLES.has(value)) return "That handle is reserved by AdventSkool.";
  return null;
}

export function sanitizeSocialLinks(value: unknown): CreatorSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const output: CreatorSocialLinks = {};
  for (const platform of CREATOR_SOCIAL_PLATFORMS) {
    const raw = typeof input[platform] === "string" ? input[platform].trim() : "";
    if (!raw) continue;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`Enter a complete https:// link for ${platform}.`);
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(`Only web links are allowed for ${platform}.`);
    }
    output[platform] = parsed.toString().slice(0, 500);
  }
  return output;
}

export function normalizeRequestedDomain(value: string): string {
  const input = value.trim().toLowerCase();
  if (!input) throw new Error("Enter the domain you own.");
  let parsed: URL;
  try {
    parsed = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new Error("Enter a valid domain, for example meshack.com.");
  }
  const hostname = parsed.hostname.replace(/^www\./, "").replace(/\.$/, "");
  if (
    !hostname.includes(".") ||
    hostname.length > 253 ||
    !/^[a-z0-9.-]+$/.test(hostname) ||
    hostname.split(".").some((part) => !part || part.length > 63 || part.startsWith("-") || part.endsWith("-")) ||
    hostname === "adventskool.co.ke" ||
    hostname.endsWith(".adventskool.co.ke")
  ) {
    throw new Error("Enter a valid custom domain that is not an AdventSkool address.");
  }
  return hostname;
}
