import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Supabase OAuth callback (Google sign-in / sign-up). Exchanges the PKCE code
 * for a session, then sends the user to their role dashboard. The `profiles`
 * row is created automatically by the `handle_new_user` DB trigger, so Google
 * users share the exact same source of truth as email/password users.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message ?? "oauth_failed")}`, request.url),
    );
  }

  // Look up the role so we can land on the right dashboard and set the role
  // cookie the middleware relies on (AuthContext keeps it in sync afterwards).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = (profile?.role as string) ?? "student";

  const response = NextResponse.redirect(new URL(safeNext ?? `/dashboard/${role}`, request.url));
  const maxAge = 60 * 60 * 24 * 365;
  response.cookies.set("adventskool_uid", data.user.id, { path: "/", maxAge, sameSite: "lax" });
  response.cookies.set("adventskool_role", role, { path: "/", maxAge, sameSite: "lax" });
  return response;
}
