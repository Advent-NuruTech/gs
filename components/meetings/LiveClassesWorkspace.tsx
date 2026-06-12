"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  List,
  Pencil,
  Repeat,
  Trash2,
  Users,
  Video,
} from "lucide-react";

import GoogleConnectCard from "@/components/meetings/GoogleConnectCard";
import JoinMeetingButton from "@/components/meetings/JoinMeetingButton";
import MeetingScheduler from "@/components/meetings/MeetingScheduler";
import MeetingsCalendar from "@/components/meetings/MeetingsCalendar";
import { formatMeetingTime } from "@/components/meetings/UpcomingMeetingsWidget";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationContext } from "@/context/NotificationContext";
import {
  cancelMeeting,
  listMeetingAttendance,
  listMyMeetings,
  syncMeetingAttendance,
} from "@/services/meetingService";
import { Meeting, MeetingAttendanceRecord } from "@/types/meeting";
import { UserRole } from "@/types/user";

interface LiveClassesWorkspaceProps {
  role: UserRole;
}

const TYPE_LABELS: Record<Meeting["meetingType"], string> = {
  live_class: "Live class",
  general: "General meeting",
  custom: "Meeting",
  reminder: "Reminder",
};

/**
 * The Live Classes section: Google connection state, schedule button,
 * upcoming list / month calendar toggle, and (for hosts) edit, cancel and
 * attendance tools. Students see view + join only, plus personal reminders.
 */
export default function LiveClassesWorkspace({ role }: LiveClassesWorkspaceProps) {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();

  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<Meeting | null>(null);
  const [attendance, setAttendance] = useState<MeetingAttendanceRecord[] | null>(null);

  const reload = useCallback(() => {
    listMyMeetings()
      .then(setMeetings)
      .catch((error) => {
        setMeetings([]);
        pushToast(error instanceof Error ? error.message : "Could not load meetings.", "error");
      });
  }, [pushToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleCancel = async (meeting: Meeting) => {
    if (!window.confirm(`Cancel "${meeting.title}"? Attendees will be notified and the Google Calendar event removed.`)) {
      return;
    }
    try {
      await cancelMeeting(meeting.id);
      pushToast("Meeting cancelled and removed from Google Calendar.", "success");
      reload();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not cancel.", "error");
    }
  };

  const openAttendance = async (meeting: Meeting) => {
    setAttendanceFor(meeting);
    setAttendance(null);
    try {
      setAttendance(await listMeetingAttendance(meeting.id));
    } catch {
      setAttendance([]);
    }
  };

  const handleAttendanceSync = async (meeting: Meeting) => {
    try {
      const result = await syncMeetingAttendance(meeting.id);
      pushToast(
        result.note ?? `Synced ${result.recordsUpdated} record(s) from Google Meet.`,
        result.note ? "info" : "success",
      );
      setAttendance(await listMeetingAttendance(meeting.id));
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Attendance sync failed.", "error");
    }
  };

  const canManage = (meeting: Meeting) =>
    role === "admin" || meeting.createdBy === profile?.id || meeting.hostId === profile?.id;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Live Classes</h2>
          <p className="text-sm text-slate-600">
            {role === "student"
              ? "Join live classes for your courses and manage your learning reminders."
              : "Schedule Google Meet sessions — calendar invitations are sent automatically."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium ${
                view === "list" ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium ${
                view === "calendar" ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setSchedulerOpen(true);
            }}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            {role === "student" ? "New Reminder" : "Schedule"}
          </Button>
        </div>
      </div>

      <GoogleConnectCard redirectPath={`/dashboard/${role}/live-classes`} compact={role === "student"} />

      {view === "calendar" ? (
        <MeetingsCalendar meetings={meetings ?? []} />
      ) : meetings === null ? (
        <p className="text-sm text-slate-500">Loading meetings...</p>
      ) : meetings.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
          <Video className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            {role === "student"
              ? "No upcoming live classes yet. They will appear here when your teachers schedule them."
              : "Nothing scheduled yet. Create your first live class."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li
              key={meeting.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{meeting.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      meeting.meetingType === "reminder"
                        ? "bg-purple-100 text-purple-700"
                        : meeting.meetingType === "live_class"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {TYPE_LABELS[meeting.meetingType]}
                  </span>
                  {meeting.recurrenceRule ? (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Repeat className="h-3 w-3" /> recurring
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-slate-600">
                  {formatMeetingTime(meeting)}
                  {meeting.courseTitle ? ` · ${meeting.courseTitle}` : ""}
                </p>
                {meeting.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{meeting.description}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <JoinMeetingButton meeting={meeting} />
                {canManage(meeting) && meeting.meetingType !== "reminder" ? (
                  <button
                    type="button"
                    title="Attendance"
                    onClick={() => openAttendance(meeting)}
                    className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                ) : null}
                {canManage(meeting) ? (
                  <>
                    <button
                      type="button"
                      title="Edit / reschedule"
                      onClick={() => {
                        setEditing(meeting);
                        setSchedulerOpen(true);
                      }}
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Cancel meeting"
                      onClick={() => handleCancel(meeting)}
                      className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {profile ? (
        <MeetingScheduler
          open={schedulerOpen}
          role={role}
          userId={profile.id}
          editing={editing}
          onClose={() => {
            setSchedulerOpen(false);
            setEditing(null);
          }}
          onSaved={reload}
        />
      ) : null}

      <Modal
        open={Boolean(attendanceFor)}
        title={`Attendance — ${attendanceFor?.title ?? ""}`}
        onClose={() => setAttendanceFor(null)}
      >
        {attendance === null ? (
          <p className="text-sm text-slate-500">Loading attendance...</p>
        ) : attendance.length === 0 ? (
          <p className="text-sm text-slate-500">
            No attendance recorded yet. Records are created when participants click Join Meeting.
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {attendance.map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between rounded border border-slate-100 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">{record.userName ?? record.userId}</span>
                <span className="text-xs text-slate-500">
                  {new Date(record.firstJoinedAt).toLocaleString("en-KE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {record.durationMinutes ? ` · ${record.durationMinutes} min` : ""}
                  {record.joinCount > 1 ? ` · joined ${record.joinCount}×` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        {attendanceFor ? (
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => handleAttendanceSync(attendanceFor)}>
              Sync from Google Meet
            </Button>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
