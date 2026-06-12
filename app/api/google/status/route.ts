import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { revokeGoogleToken } from "@/lib/google/oauth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Connection status for the signed-in user (never exposes tokens). */
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("google_accounts")
    .select("google_email, connected_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    connected: Boolean(data),
    email: data?.google_email ?? null,
    connectedAt: data?.connected_at ?? null,
  });
}

/** Disconnect Google: revoke the token (best-effort) and delete our copy. */
export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("google_accounts")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.refresh_token) {
    await revokeGoogleToken(String(data.refresh_token));
  }
  await supabase.from("google_accounts").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
