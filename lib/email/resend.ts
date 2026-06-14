import "server-only";

/**
 * Resend sender — https://resend.com (REST API, no SDK dependency, mirrors the
 * fetch-based lib/sms/wasms.ts pattern). Provider is already configured; this
 * only reads RESEND_API_KEY / EMAIL_FROM from the environment.
 *
 * Failures are returned (not thrown) so the queue processor can record a
 * per-recipient error and retry, never blocking other sends.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.EMAIL_FROM || "Advent Skool <noreply@adventnurutech.xyz>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<SendResult> {
  if (!API_KEY) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }
  if (!to || !to.includes("@")) {
    return { ok: false, error: `invalid recipient "${to}"` };
  }
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!response.ok) {
      return { ok: false, error: data.message || data.name || `Resend error ${response.status}` };
    }
    return { ok: true, id: data.id };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
