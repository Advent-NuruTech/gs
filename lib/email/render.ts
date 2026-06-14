import {
  RenderedEmail,
  campaignEmail,
  newCourseEmail,
  promotionEmail,
} from "./templates";

/**
 * Shared tuning for the rate-limited queue processor. Conservative defaults
 * keep usage inside the Resend / Supabase free tiers; override via env to scale.
 *
 *   MAX_PER_RUN          rows sent per cron invocation
 *   DELAY_BETWEEN_SENDS  ms paused between individual sends (rate limit)
 *   MAX_ATTEMPTS         retries before a row is marked permanently failed
 */
export const EMAIL_LIMITS = {
  maxPerRun: numEnv("EMAIL_MAX_PER_RUN", 40),
  delayBetweenSends: numEnv("EMAIL_DELAY_MS", 600),
  maxAttempts: numEnv("EMAIL_MAX_ATTEMPTS", 3),
};

function numEnv(key: string, fallback: number): number {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export interface QueueRowForRender {
  subject: string;
  html: string | null;
  template: string | null;
  payload: Record<string, unknown>;
}

/**
 * Resolves a queue row to a final {subject, html}. Precomputed HTML (campaigns)
 * is used as-is; otherwise the row is rendered from its template + payload.
 */
export function renderQueueRow(row: QueueRowForRender): RenderedEmail {
  if (row.html) {
    return { subject: row.subject, html: row.html };
  }
  const p = row.payload || {};
  switch (row.template) {
    case "new_course":
      return newCourseEmail({
        courseId: String(p.courseId ?? ""),
        title: String(p.title ?? "A new course"),
        thumbnail: p.thumbnail ? String(p.thumbnail) : undefined,
        category: p.category ? String(p.category) : undefined,
        outline: p.outline ? String(p.outline) : undefined,
      });
    case "promotion":
      return promotionEmail({ name: p.name ? String(p.name) : undefined });
    case "campaign":
      return campaignEmail({
        subject: row.subject,
        bodyHtml: String(p.bodyHtml ?? ""),
      });
    default:
      // Fallback: never send an empty body.
      return { subject: row.subject, html: `<p>${row.subject}</p>` };
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
