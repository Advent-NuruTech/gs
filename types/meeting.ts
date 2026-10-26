export type MeetingType = "live_class" | "general" | "custom" | "reminder";
export type MeetingAudience = "course" | "all" | "teachers" | "students" | "custom" | "personal";
export type MeetingStatus = "scheduled" | "cancelled" | "completed";

export interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingType: MeetingType;
  audience: MeetingAudience;
  courseId?: string;
  courseTitle?: string;
  createdBy: string;
  hostId: string;
  startTime: string;
  endTime: string;
  timezone: string;
  recurrenceRule?: string;
  /** Optional provider-neutral URL supplied by the host for a virtual session. */
  meetingUrl?: string;
  location?: string;
  status: MeetingStatus;
  createdAt?: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  meetingType: MeetingType;
  audience?: MeetingAudience;
  courseId?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  meetingUrl?: string;
  location?: string;
  /** e.g. 'RRULE:FREQ=WEEKLY;COUNT=8' for recurring classes */
  recurrenceRule?: string | null;
  /** profile ids, only for meetingType 'custom' */
  inviteeIds?: string[];
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  meetingUrl?: string | null;
  location?: string;
  recurrenceRule?: string | null;
}

export interface MeetingAttendanceRecord {
  id: string;
  meetingId: string;
  userId: string;
  userName?: string;
  firstJoinedAt: string;
  lastJoinedAt: string;
  joinCount: number;
  durationMinutes?: number;
  source: string;
}
