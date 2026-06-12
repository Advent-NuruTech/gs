import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/google/oauth";

export interface GoogleConnection {
  userId: string;
  googleEmail: string;
  accessToken: string;
}

/**
 * Returns a valid (refreshed if necessary) Google access token for a user,
 * or null when the user has not connected Google. Persists refreshed tokens.
 */
export async function getGoogleConnection(userId: string): Promise<GoogleConnection | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !data.refresh_token) return null;

  const expiresAt = data.token_expires_at ? new Date(String(data.token_expires_at)).getTime() : 0;
  let accessToken = String(data.access_token ?? "");

  // Refresh when missing or expiring within the next 60 seconds.
  if (!accessToken || expiresAt < Date.now() + 60_000) {
    const refreshed = await refreshAccessToken(String(data.refresh_token));
    accessToken = refreshed.access_token;
    await supabase
      .from("google_accounts")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        // Google occasionally rotates refresh tokens.
        ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
      })
      .eq("user_id", userId);
  }

  return {
    userId,
    googleEmail: String(data.google_email ?? ""),
    accessToken,
  };
}
