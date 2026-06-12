export type AnnouncementAudience = "all" | "teachers" | "students";

export interface Announcement {
  id: string;
  authorId?: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  createdAt?: string;
  /** Derived per-user read state (from announcement_reads). */
  read?: boolean;
}

export interface CreateAnnouncementInput {
  authorId: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
}
