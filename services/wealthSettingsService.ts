import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

export async function getWealthPublicNavigationEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("wealth_settings")
    .select("public_navigation_enabled")
    .eq("id", "default")
    .single();
  if (error) throw new Error(error.message);
  return Boolean(data.public_navigation_enabled);
}

export async function setWealthPublicNavigationEnabled(enabled: boolean): Promise<void> {
  const { data, error } = await supabase
    .from("wealth_settings")
    .update({ public_navigation_enabled: enabled })
    .eq("id", "default")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Could not update Wealth Academy navigation settings.");
}
