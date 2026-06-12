import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Announcement, CreateAnnouncementInput } from "@/types/announcement";

const supabase = getSupabaseBrowserClient();

function mapAnnouncement(data: Record<string, unknown>): Announcement {
  return {
    id: String(data.id ?? ""),
    authorId: data.author_id ? String(data.author_id) : undefined,
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    audience: (data.audience as Announcement["audience"]) ?? "all",
    createdAt: data.created_at ? String(data.created_at) : undefined,
  };
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<string> {
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      author_id: input.authorId,
      title: input.title,
      body: input.body,
      audience: input.audience,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create announcement.");
  return String(data.id);
}

/**
 * Announcements visible to the user (RLS filters by audience/role), annotated
 * with the user's read state from announcement_reads.
 */
export async function listAnnouncementsForUser(userId: string): Promise<Announcement[]> {
  const [{ data, error }, { data: reads }] = await Promise.all([
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.from("announcement_reads").select("announcement_id").eq("user_id", userId),
  ]);
  if (error) throw new Error(error.message);
  const readSet = new Set(
    (reads ?? []).map((row: Record<string, unknown>) => String(row.announcement_id)),
  );
  return (data ?? []).map((row: Record<string, unknown>) => {
    const announcement = mapAnnouncement(row);
    announcement.read = readSet.has(announcement.id);
    return announcement;
  });
}

export async function markAnnouncementRead(
  announcementId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from("announcement_reads")
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: "announcement_id,user_id", ignoreDuplicates: true },
    );
}

export async function markAllAnnouncementsRead(
  announcementIds: string[],
  userId: string,
): Promise<void> {
  if (announcementIds.length === 0) return;
  await supabase
    .from("announcement_reads")
    .upsert(
      announcementIds.map((id) => ({ announcement_id: id, user_id: userId })),
      { onConflict: "announcement_id,user_id", ignoreDuplicates: true },
    );
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", announcementId);
  if (error) throw new Error(error.message);
}
