import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AuthMethodSettings {
  googleEnabled: boolean;
  emailEnabled: boolean;
}

export const defaultAuthMethodSettings: AuthMethodSettings = {
  googleEnabled: true,
  emailEnabled: true,
};

type AuthSettingsRow = {
  google_enabled: boolean;
  email_enabled: boolean;
};

export async function getAuthMethodSettings(): Promise<AuthMethodSettings> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("auth_method_settings")
    .select("google_enabled,email_enabled")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return defaultAuthMethodSettings;
  const row = data as AuthSettingsRow;

  return {
    googleEnabled: row.google_enabled,
    emailEnabled: row.email_enabled,
  };
}

export async function updateAuthMethodSettings(
  settings: AuthMethodSettings,
): Promise<AuthMethodSettings> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("auth_method_settings")
    .update({
      google_enabled: settings.googleEnabled,
      email_enabled: settings.emailEnabled,
    })
    .eq("id", true)
    .select("google_enabled,email_enabled")
    .single();

  if (error) throw new Error(error.message);

  const row = data as AuthSettingsRow;
  return {
    googleEnabled: row.google_enabled,
    emailEnabled: row.email_enabled,
  };
}
