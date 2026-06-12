import { NextRequest, NextResponse } from "next/server";

import { exchangeCodeForTokens, fetchGoogleEmail, verifyState } from "@/lib/google/oauth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Google redirects here after consent. Exchanges the code for tokens and
 * stores them (server-only) so AdventSkool can manage this user's calendar.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const stateParam = params.get("state") ?? "";
  const state = verifyState(stateParam);
  const fallback = state?.redirect ?? "/dashboard/account";

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`${fallback}?google_error=${encodeURIComponent(message)}`, request.url),
    );

  if (!state) return fail("Invalid or expired connect request. Please try again.");
  if (params.get("error")) return fail(`Google declined the request: ${params.get("error")}`);

  const code = params.get("code");
  if (!code) return fail("Google did not return an authorization code.");

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await fetchGoogleEmail(tokens.access_token);

    const supabase = getSupabaseAdminClient();

    // Keep any previously stored refresh token if Google didn't send a new one.
    const { data: existing } = await supabase
      .from("google_accounts")
      .select("refresh_token")
      .eq("user_id", state.userId)
      .maybeSingle();

    const refreshToken = tokens.refresh_token ?? String(existing?.refresh_token ?? "");
    if (!refreshToken) {
      return fail(
        "Google did not issue a refresh token. Remove AdventSkool from your Google account permissions and connect again.",
      );
    }

    const { error } = await supabase.from("google_accounts").upsert(
      {
        user_id: state.userId,
        google_email: email,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return fail(error.message);

    return NextResponse.redirect(new URL(`${fallback}?google=connected`, request.url));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not connect Google.");
  }
}
