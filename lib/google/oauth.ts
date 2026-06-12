import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Google OAuth 2.0 helpers (no SDK — plain REST).
 * Used by the connect flow that lets teachers/admins (and students, for
 * personal reminders) link their Google account so AdventSkool can create
 * Calendar events + Meet links on their behalf.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

/** Scopes requested when a user connects Google for scheduling. */
export const GOOGLE_CONNECT_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  // Optional: lets the attendance sync read Google Meet conference records
  // (requires Google Workspace; harmless for consumer accounts).
  "https://www.googleapis.com/auth/meetings.space.readonly",
];

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${siteUrl}/api/google/oauth/callback`;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured.");
  }
  return { clientId, clientSecret, redirectUri, siteUrl };
}

// State parameter: HMAC-signed so the callback can trust the user id ---------

function stateSecret(): string {
  return process.env.GOOGLE_OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function signState(payload: { userId: string; redirect: string }): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 10 * 60 * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string): { userId: string; redirect: string } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      userId?: string;
      redirect?: string;
      exp?: number;
    };
    if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) return null;
    const redirect =
      parsed.redirect && parsed.redirect.startsWith("/") && !parsed.redirect.startsWith("//")
        ? parsed.redirect
        : "/dashboard/account";
    return { userId: parsed.userId, redirect };
  } catch {
    return null;
  }
}

// OAuth flow ------------------------------------------------------------------

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CONNECT_SCOPES.join(" "),
    access_type: "offline", // ask for a refresh token
    prompt: "consent",      // always re-issue the refresh token
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const payload = (await response.json()) as GoogleTokenResponse & { error_description?: string };
  if (!response.ok) {
    throw new Error(payload.error_description ?? "Google token exchange failed.");
  }
  return payload;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const payload = (await response.json()) as GoogleTokenResponse & { error_description?: string };
  if (!response.ok) {
    throw new Error(payload.error_description ?? "Google token refresh failed.");
  }
  return payload;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(
    () => undefined, // best-effort; we delete our copy regardless
  );
}

export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return "";
  const payload = (await response.json()) as { email?: string };
  return payload.email ?? "";
}
