"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

/**
 * Updates the signed-in user's marketing email preference. RLS ("profiles
 * update own") restricts this to the caller's own row.
 */
export async function setMarketingSubscribed(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ marketing_subscribed: value })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  // Keep auth metadata in sync so future sessions carry the same value.
  await supabase.auth.updateUser({ data: { marketing_subscribed: value } });
}
