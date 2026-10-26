"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CalendarPlus, Download, List, MapPin, Pencil, Repeat, Trash2, Users, Video } from "lucide-react";

import JoinMeetingButton from "@/components/meetings/JoinMeetingButton";
import MeetingScheduler from "@/components/meetings/MeetingScheduler";
import MeetingsCalendar from "@/components/meetings/MeetingsCalendar";
import { formatMeetingTime } from "@/components/meetings/UpcomingMeetingsWidget";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusCard from "@/components/ui/StatusCard";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { cancelMeeting, listMeetingAttendance, listMyMeetings } from "@/services/meetingService";
import { Meeting, MeetingAttendanceRecord } from "@/types/meeting";
import { UserRole } from "@/types/user";

interface LiveClassesWorkspaceProps { role: UserRole; }

const TYPE_LABELS: Record<Meeting["meetingType"], string> = {
  live_class: "Live class", general: "General meeting", custom: "Meeting", reminder: "Reminder",
};

/** The native AdventSkool calendar workspace for classes, meetings and reminders. */
export default function LiveClassesWorkspace({ role }: LiveClassesWorkspaceProps) {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<Meeting | null>(null);
  const [attendance, setAttendance] = useState<MeetingAttendanceRecord[] | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    listMyMeetings().then(setMeetings).catch((error) => {
      setMeetings([]);
      pushToast(error instanceof Error ? error.message : "Could not load calendar events.", "error");
    });
  }, [pushToast]);
  useEffect(() => { reload(); }, [reload]);

  const handleCancel = async (meeting: Meeting) => {
    if (!window.confirm(`Cancel “${meeting.title}”? Participants will be notified in AdventSkool.`)) return;
    setCancellingId(meeting.id);
    try {
      await cancelMeeting(meeting.id);
      pushToast("Calendar event cancelled and participants notified.", "success");
      reload();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not cancel the event.", "error");
    } finally { setCancellingId(null); }
  };
  const openAttendance = async (meeting: Meeting) => {
    setAttendanceFor(meeting); setAttendance(null);
    try { setAttendance(await listMeetingAttendance(meeting.id)); } catch { setAttendance([]); }
  };
  const canManage = (meeting: Meeting) => role === "admin" || meeting.createdBy === profile?.id || meeting.hostId === profile?.id;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calendar</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {role === "student" ? "Your classes, sessions, and learning reminders in one place." : "Schedule events, notify participants, and track session attendance without an external calendar."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium ${view === "list" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><List className="h-3.5 w-3.5" />List</button>
            <button type="button" onClick={() => setView("calendar")} aria-pressed={view === "calendar"} className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium ${view === "calendar" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><CalendarDays className="h-3.5 w-3.5" />Calendar</button>
          </div>
          <Button onClick={() => { setEditing(null); setSchedulerOpen(true); }}><CalendarPlus className="mr-2 h-4 w-4" />{role === "student" ? "New Reminder" : "Schedule"}</Button>
        </div>
      </div>

      <StatusCard kind="info" title="AdventSkool Calendar" description="Invitations, updates, cancellations, and reminders are delivered inside AdventSkool. Add an optional secure session link when you schedule a live session." />

      {meetings === null ? <StatusCard kind="loading" title="Loading your calendar" description="Fetching events you can access." /> : view === "calendar" ? <MeetingsCalendar meetings={meetings} /> : meetings.length === 0 ? (
        <StatusCard kind="info" title="No upcoming events" description={role === "student" ? "Scheduled classes and your reminders will appear here." : "Create your first calendar event to get started."} />
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900 dark:text-slate-100">{meeting.title}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meeting.meetingType === "reminder" ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200" : meeting.meetingType === "live_class" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{TYPE_LABELS[meeting.meetingType]}</span>{meeting.recurrenceRule ? <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Repeat className="h-3 w-3" />Repeats</span> : null}</div>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{formatMeetingTime(meeting)}{meeting.courseTitle ? ` · ${meeting.courseTitle}` : ""}</p>
                {meeting.location ? <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><MapPin className="h-3.5 w-3.5" />{meeting.location}</p> : null}
                {meeting.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{meeting.description}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={`/api/meetings/${meeting.id}/ics`} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title="Download calendar file"><Download className="h-4 w-4" /></a>
                <JoinMeetingButton meeting={meeting} />
                {canManage(meeting) && meeting.meetingType !== "reminder" ? <button type="button" title="Attendance" onClick={() => openAttendance(meeting)} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Users className="h-4 w-4" /></button> : null}
                {canManage(meeting) ? <><button type="button" title="Edit event" onClick={() => { setEditing(meeting); setSchedulerOpen(true); }} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button><Button variant="secondary" loading={cancellingId === meeting.id} loadingText="Cancelling" onClick={() => handleCancel(meeting)} className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"><Trash2 className="h-4 w-4" /></Button></> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {profile ? <MeetingScheduler open={schedulerOpen} role={role} userId={profile.id} editing={editing} onClose={() => { setSchedulerOpen(false); setEditing(null); }} onSaved={reload} /> : null}
      <Modal open={Boolean(attendanceFor)} title={`Attendance — ${attendanceFor?.title ?? ""}`} onClose={() => setAttendanceFor(null)}>
        {attendance === null ? <StatusCard kind="loading" title="Loading attendance" /> : attendance.length === 0 ? <StatusCard kind="info" title="No attendance recorded" description="Attendance is recorded when participants select Join session." /> : <ul className="max-h-72 space-y-1 overflow-y-auto">{attendance.map((record) => <li key={record.id} className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"><span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">{record.userName ?? record.userId}</span><span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{new Date(record.firstJoinedAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}{record.joinCount > 1 ? ` · ${record.joinCount} joins` : ""}</span></li>)}</ul>}
      </Modal>
    </section>
  );
}
