import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_MASCOT_MESSAGES, MAX_MASCOT_MESSAGE_LENGTH, MAX_MASCOT_MESSAGES } from "@/lib/homeMascotMessages";

export async function getHomeMascotMessages(): Promise<string[]> {
  const { data, error } = await getSupabaseBrowserClient().from("public_display_settings").select("mascot_messages").eq("id", true).maybeSingle();
  if (error) throw new Error(error.message);
  return Array.isArray(data?.mascot_messages) && data.mascot_messages.length ? data.mascot_messages : DEFAULT_MASCOT_MESSAGES;
}

export async function updateHomeMascotMessages(messages: string[]): Promise<string[]> {
  const cleaned = messages.map((message) => message.trim()).filter(Boolean);
  if (!cleaned.length || cleaned.length > MAX_MASCOT_MESSAGES || cleaned.some((message) => message.length > MAX_MASCOT_MESSAGE_LENGTH)) {
    throw new Error(`Enter 1 to ${MAX_MASCOT_MESSAGES} messages, each no longer than ${MAX_MASCOT_MESSAGE_LENGTH} characters.`);
  }
  const { data, error } = await getSupabaseBrowserClient().from("public_display_settings").update({ mascot_messages: cleaned }).eq("id", true).select("mascot_messages").single();
  if (error) throw new Error(error.message);
  return data.mascot_messages as string[];
}
