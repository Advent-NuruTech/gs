import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

/**
 * Privileged secret-key client. BYPASSES Row Level Security.
 * Server-only — must never be imported by client code. Used for payment
 * fulfillment (webhook/verify), admin user creation, and other trusted writes.
 */
export function getSupabaseAdminClient() {
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured.");
  }
  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
