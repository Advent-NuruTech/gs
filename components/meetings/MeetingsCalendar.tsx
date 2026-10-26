"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Link as LinkIcon, MapPin } from "lucide-react";

import { meetingOccurrencesInRange, MeetingOccurrence } from "@/lib/meetings/occurrences";
import { Meeting } from "@/types/meeting";

interface MeetingsCalendarProps {
  meetings: Meeting[];
  onSelect?: (meeting: Meeting) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Accessible native month view, including every occurrence of AdventSkool's repeat rules. */
export default function MeetingsCalendar({ meetings, onSelect }: MeetingsCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<MeetingOccurrence | null>(null);

  const cells = useMemo(() => {
    const firstWeekday = cursor.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
      index < firstWeekday ? null : new Date(cursor.getFullYear(), cursor.getMonth(), index - firstWeekday + 1),
    );
  }, [cursor]);
  const occurrences = useMemo(
    () => meetingOccurrencesInRange(meetings, cursor, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)),
    [cursor, meetings],
  );
  const today = new Date();
  const monthLabel = cursor.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{monthLabel}</h3>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))} className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800">Today</button>
          <button type="button" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 sm:text-xs dark:text-slate-400">
        {WEEKDAYS.map((weekday) => <div key={weekday} className="py-1">{weekday}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="min-h-20 sm:min-h-24" />;
          const dayEvents = occurrences.filter((occurrence) => sameDay(new Date(occurrence.startTime), day));
          const isToday = sameDay(day, today);
          return (
            <div key={day.toISOString()} className={`min-h-20 overflow-hidden rounded border p-1 sm:min-h-24 ${isToday ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40" : "border-slate-100 dark:border-slate-800"}`}>
              <p className={`text-xs ${isToday ? "font-bold text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}>{day.getDate()}</p>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((occurrence) => (
                  <button key={occurrence.id} type="button" onClick={() => { setSelected(occurrence); onSelect?.(occurrence.meeting); }} title={occurrence.meeting.title} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${occurrence.meeting.meetingType === "reminder" ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-200"}`}>
                    {new Date(occurrence.startTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} {occurrence.meeting.title}
                  </button>
                ))}
                {dayEvents.length > 3 ? <p className="px-1 text-[10px] text-slate-400">+{dayEvents.length - 3} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
      {selected ? (
        <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-900 dark:text-slate-100">{selected.meeting.title}</p><button type="button" onClick={() => setSelected(null)} className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-300">Close</button></div>
          <p className="mt-1 text-slate-700 dark:text-slate-200">{new Date(selected.startTime).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p>
          {selected.meeting.location ? <p className="mt-1 flex items-center gap-1 text-slate-600 dark:text-slate-300"><MapPin className="h-3.5 w-3.5" />{selected.meeting.location}</p> : null}
          {selected.meeting.meetingUrl ? <a href={selected.meeting.meetingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-blue-700 hover:underline dark:text-blue-300"><LinkIcon className="h-3.5 w-3.5" />Open session link</a> : null}
        </div>
      ) : null}
    </div>
  );
}
