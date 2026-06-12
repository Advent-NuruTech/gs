import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { NotificationItem } from "@/types/notification";

const supabase = getSupabaseBrowserClient();

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  read?: boolean;
  link?: string;
}

function mapNotification(data: Record<string, unknown>): NotificationItem {
  return {
    id: String(data.id ?? ""),
    userId: String(data.user_id ?? ""),
    title: String(data.title ?? "Notice"),
    message: String(data.message ?? ""),
    read: Boolean(data.read),
    link: data.link ? String(data.link) : undefined,
    createdAt: data.created_at ? String(data.created_at) : undefined,
  };
}

export async function createNotification(payload: NotificationPayload): Promise<string> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      read: payload.read ?? false,
      link: payload.link ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create notification.");
  return String(data.id);
}

export async function getNotificationsForUser(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotification);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
}

export async function clearNotificationsForUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw new Error(error.message);
}
