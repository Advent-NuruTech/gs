/**
 * Email templates — mobile-responsive, table-based HTML for broad client
 * support. Primary brand colour #0EA5E9. No secrets / no server-only imports
 * so these can also power the admin live preview.
 */

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://skills.adventnurutech.xyz";

const BRAND = "#0EA5E9";
const BRAND_DARK = "#0284C7";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

export interface RenderedEmail {
  subject: string;
  html: string;
}

/** Shared responsive shell. `bodyHtml` is the inner content (already escaped). */
export function baseEmail(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  /** Footer note shown above the unsubscribe line. */
  footerNote?: string;
}): string {
  const { title, preheader = "", bodyHtml, footerNote } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});padding:22px 28px;">
            <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">Advent Skool</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px;color:${TEXT};font-size:16px;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px;border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;line-height:1.6;">
            ${footerNote ? `<p style="margin:0 0 8px;">${escapeHtml(footerNote)}</p>` : ""}
            <p style="margin:0;">You're receiving this because you subscribed to learning updates from Advent Skool.
            <a href="${APP_URL}/dashboard/account" style="color:${MUTED};text-decoration:underline;">Manage your email preferences</a>.</p>
            <p style="margin:8px 0 0;">© ${new Date().getFullYear()} Advent Skool · <a href="${APP_URL}" style="color:${MUTED};text-decoration:underline;">${APP_URL.replace(/^https?:\/\//, "")}</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Primary CTA button. */
function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:10px;background:${BRAND};">
      <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

export interface NewCoursePayload {
  courseId: string;
  title: string;
  thumbnail?: string;
  category?: string;
  outline?: string;
}

export function newCourseEmail(p: NewCoursePayload): RenderedEmail {
  const url = `${APP_URL}/courses/${p.courseId}`;
  const thumb = p.thumbnail
    ? `<img src="${escapeAttr(p.thumbnail)}" alt="${escapeAttr(p.title)}" width="544" style="width:100%;max-width:544px;height:auto;border-radius:12px;border:1px solid ${BORDER};margin-bottom:20px;" />`
    : "";
  const blurb = p.outline ? `<p style="margin:0 0 4px;color:${MUTED};font-size:15px;">${escapeHtml(p.outline)}</p>` : "";
  const body = `
    ${p.category ? `<p style="margin:0 0 8px;color:${BRAND_DARK};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">New in ${escapeHtml(p.category)}</p>` : ""}
    ${thumb}
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:${TEXT};">${escapeHtml(p.title)}</h1>
    ${blurb}
    <p style="margin:12px 0 0;">A new course just landed in a topic you're learning. Jump in while it's fresh.</p>
    ${ctaButton("Explore New Course", url)}
    <p style="margin:0;color:${MUTED};font-size:13px;">Or copy this link: <a href="${url}" style="color:${BRAND_DARK};">${url}</a></p>`;
  return {
    subject: `New course: ${p.title}`,
    html: baseEmail({
      title: `New course: ${p.title}`,
      preheader: `${p.title} is now live on Advent Skool`,
      bodyHtml: body,
    }),
  };
}

export interface PromotionPayload {
  name?: string;
}

export function promotionEmail(p: PromotionPayload = {}): RenderedEmail {
  const hi = p.name ? `Hi ${escapeHtml(p.name.split(" ")[0])},` : "Hi there,";
  const body = `
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:${TEXT};">Keep your learning momentum going</h1>
    <p style="margin:0 0 12px;">${hi}</p>
    <p style="margin:0 0 12px;">Fresh courses, sharper skills, real progress. Browse what's new on Advent Skool and pick up right where you left off.</p>
    <ul style="margin:0 0 8px;padding-left:20px;color:${MUTED};">
      <li style="margin-bottom:6px;">New, expert-led courses added regularly</li>
      <li style="margin-bottom:6px;">Progressive lessons with quizzes that stick</li>
      <li style="margin-bottom:6px;">Learn on any device, at your pace</li>
    </ul>
    ${ctaButton("Continue Your Journey", `${APP_URL}/courses`)}`;
  return {
    subject: "New courses & learning picks for you ✨",
    html: baseEmail({
      title: "Your Advent Skool learning update",
      preheader: "Fresh courses and picks to keep your momentum going",
      bodyHtml: body,
    }),
  };
}

/** Wraps admin-authored campaign HTML in the branded shell. */
export function campaignEmail(opts: { subject: string; bodyHtml: string }): RenderedEmail {
  return {
    subject: opts.subject,
    html: baseEmail({
      title: opts.subject,
      preheader: opts.subject,
      bodyHtml: opts.bodyHtml,
    }),
  };
}

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
