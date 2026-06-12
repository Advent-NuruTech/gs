"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, Repeat } from "lucide-react";

import JoinMeetingButton from "@/components/meetings/JoinMeetingButton";
import { listMyMeetings } from "@/services/meetingService";
import { Meeting } from "@/types/meeting";
import { UserRole } from "@/types/user";

interface UpcomingMeetingsWidgetProps {
  role: UserRole;
  /** Limit to one course (course dashboards). */
  courseId?: string;
  limit?: number;
}

export function formatMeetingTime(meeting: Meeting): string {
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  return `${start.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })} · ${start.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Compact "Upcoming Meetings" card for dashboards and course pages. */
export default function UpcomingMeetingsWidget({
  role,
  courseId,
  limit = 5,
}: UpcomingMeetingsWidgetProps) {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);

  useEffect(() => {
    listMyMeetings({ courseId })
      .then((all) => setMeetings(all.slice(0, limit)))
      .catch(() => setMeetings([]));
  }, [courseId, limit]);

  const liveClassesHref = `/dashboard/${role}/live-classes`;

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarClock className="h-4 w-4 text-blue-600" />
          Upcoming Meetings
        </h3>
        <Link href={liveClassesHref} className="text-xs font-medium text-blue-600 hover:underline">
          View all
        </Link>
      </div>

      {meetings === null ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : meetings.length === 0 ? (
        <p className="text-sm text-slate-500">No upcoming meetings.</p>
      ) : (
        <ul className="space-y-2">
          {meetings.map((meeting) => (
            <li
              key={meeting.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900">
                  {meeting.title}
                  {meeting.recurrenceRule ? (
                    <Repeat className="h-3 w-3 shrink-0 text-slate-400" />
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {formatMeetingTime(meeting)}
                  {meeting.courseTitle ? ` · ${meeting.courseTitle}` : ""}
                </p>
              </div>
              <JoinMeetingButton meeting={meeting} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
