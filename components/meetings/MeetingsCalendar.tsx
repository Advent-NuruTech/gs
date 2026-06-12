"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";

import { Meeting } from "@/types/meeting";

interface MeetingsCalendarProps {
  meetings: Meeting[];
  onSelect?: (meeting: Meeting) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Month-grid calendar showing scheduled meetings (recurrence shown on the anchor date). */
export default function MeetingsCalendar({ meetings, onSelect }: MeetingsCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const firstWeekday = cursor.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const result: Array<Date | null> = [];
    for (let i = 0; i < firstWeekday; i += 1) result.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    return result;
  }, [cursor]);

  const meetingsOn = (day: Date) =>
    meetings.filter((meeting) => sameDay(new Date(meeting.startTime), day));

  const today = new Date();
  const monthLabel = cursor.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{monthLabel}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded p-1 text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded p-1 text-slate-600 hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-1">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="min-h-16" />;
          const dayMeetings = meetingsOn(day);
          const isToday = sameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-16 rounded border p-1 text-left ${
                isToday ? "border-blue-300 bg-blue-50" : "border-slate-100"
              }`}
            >
              <p className={`text-xs ${isToday ? "font-bold text-blue-700" : "text-slate-500"}`}>
                {day.getDate()}
              </p>
              <div className="mt-0.5 space-y-0.5">
                {dayMeetings.slice(0, 3).map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => onSelect?.(meeting)}
                    title={meeting.title}
                    className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${
                      meeting.meetingType === "reminder"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {meeting.googleMeetUrl ? <Video className="h-2.5 w-2.5 shrink-0" /> : null}
                    <span className="truncate">{meeting.title}</span>
                  </button>
                ))}
                {dayMeetings.length > 3 ? (
                  <p className="px-1 text-[10px] text-slate-400">+{dayMeetings.length - 3} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
