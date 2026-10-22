import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface PublicDisplaySettings {
  showViewCounts: boolean;
}

export const defaultPublicDisplaySettings: PublicDisplaySettings = {
  showViewCounts: true,
};

type PublicDisplaySettingsRow = {
  show_view_counts: boolean;
};

export async function getPublicDisplaySettings(): Promise<PublicDisplaySettings> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("public_display_settings")
    .select("show_view_counts")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return defaultPublicDisplaySettings;
  const row = data as PublicDisplaySettingsRow;

  return { showViewCounts: row.show_view_counts };
}

export async function updatePublicDisplaySettings(
  settings: PublicDisplaySettings,
): Promise<PublicDisplaySettings> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("public_display_settings")
    .update({ show_view_counts: settings.showViewCounts })
    .eq("id", true)
    .select("show_view_counts")
    .single();

  if (error) throw new Error(error.message);
  const row = data as PublicDisplaySettingsRow;
  return { showViewCounts: row.show_view_counts };
}
