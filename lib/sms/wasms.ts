import "server-only";

/**
 * WASMS SMS sender — https://www.wasms.co.ke/sendsms
 *
 * POST with headers X-API-Key / X-API-Secret / Content-Type: application/json.
 * Single:  { recipient: "2547...", message, sender? }
 * Bulk:    { recipients: ["2547...", ...], message, sender? }
 * Success: { success: true, success_count, failed_count, remaining_credits, ... }
 *
 * Config (env): WASMS_BASE_URL, WASMS_SENDER_ID, WASMS_API_KEY, WASMS_API_SECRET.
 * All failures are swallowed (logged) so SMS never blocks payment/login flows.
 */

const BASE_URL = process.env.WASMS_BASE_URL || "https://www.wasms.co.ke/sendsms";
const SENDER_ID = process.env.WASMS_SENDER_ID || "";
const API_KEY = process.env.WASMS_API_KEY || "";
const API_SECRET = process.env.WASMS_API_SECRET || "";

/** Normalises a Kenyan phone number to the 2547######## / 2541######## form. */
export function normalizeMsisdn(raw: string): string | null {
  let msisdn = (raw || "").replace(/\D/g, "");
  if (msisdn.startsWith("0")) msisdn = `254${msisdn.slice(1)}`;
  else if (msisdn.startsWith("7") || msisdn.startsWith("1")) msisdn = `254${msisdn}`;
  return /^254\d{9}$/.test(msisdn) ? msisdn : null;
}

interface WasmsResponse {
  success?: boolean;
  status?: string;
  success_count?: number;
  failed_count?: number;
  remaining_credits?: number;
  error?: string;
  credits_available?: number;
  credits_needed?: number;
}

async function post(body: Record<string, unknown>): Promise<boolean> {
  if (!API_KEY || !API_SECRET) {
    console.warn("[wasms] skipped: missing API credentials");
    return false;
  }
  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
        "X-API-Secret": API_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(SENDER_ID ? { ...body, sender: SENDER_ID } : body),
    });

    const payload = (await response.json().catch(() => ({}))) as WasmsResponse;
    if (!response.ok || payload.success !== true) {
      if (payload.error?.toLowerCase().includes("credit")) {
        console.warn(`[wasms] insufficient credits: have ${payload.credits_available}, need ${payload.credits_needed}`);
      } else {
        console.warn(`[wasms] send failed (${response.status}): ${payload.error ?? payload.status ?? "unknown"}`);
      }
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`[wasms] send error: ${(error as Error).message}`);
    return false;
  }
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const recipient = normalizeMsisdn(to);
  if (!recipient) {
    console.warn(`[wasms] skipped: invalid phone "${to}"`);
    return false;
  }
  return post({ recipient, message });
}

/** Sends one message to several recipients via the bulk endpoint. */
export async function sendSmsBulk(recipients: string[], message: string): Promise<void> {
  const valid = recipients.map(normalizeMsisdn).filter((n): n is string => Boolean(n));
  if (valid.length === 0) return;
  await post({ recipients: valid, message });
}
