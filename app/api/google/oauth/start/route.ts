import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { buildGoogleAuthUrl, signState } from "@/lib/google/oauth";

export const runtime = "nodejs";

/**
 * Starts the Google connect flow. Browser-navigated (cookies carry the
 * Supabase session), so we can redirect straight to Google's consent screen.
 */
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.redirect(new URL("/login?redirect=/dashboard/account", request.url));
  }

  const requested = request.nextUrl.searchParams.get("redirect") ?? "/dashboard/account";
  const redirect =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard/account";

  try {
    const state = signState({ userId: user.id, redirect });
    return NextResponse.redirect(buildGoogleAuthUrl(state));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth is not configured.";
    return NextResponse.redirect(
      new URL(`${redirect}?google_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
