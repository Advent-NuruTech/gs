"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useNotificationContext } from "@/context/NotificationContext";
import { listCourses } from "@/services/courseService";
import { createMeeting, updateMeeting } from "@/services/meetingService";
import { listUsers } from "@/services/userService";
import { Course } from "@/types/course";
import { CreateMeetingInput, Meeting, MeetingType } from "@/types/meeting";
import { AppUser, UserRole } from "@/types/user";

interface MeetingSchedulerProps {
  open: boolean;
  role: UserRole;
  userId: string;
  /** When set, the form edits/reschedules this meeting instead of creating. */
  editing?: Meeting | null;
  onClose: () => void;
  onSaved: () => void;
}

const RECURRENCE_OPTIONS = [
  { value: "", label: "One-time meeting" },
  { value: "RRULE:FREQ=DAILY;COUNT=5", label: "Daily (5 sessions)" },
  { value: "RRULE:FREQ=WEEKLY;COUNT=4", label: "Weekly (4 weeks)" },
  { value: "RRULE:FREQ=WEEKLY;COUNT=8", label: "Weekly (8 weeks)" },
  { value: "RRULE:FREQ=WEEKLY;COUNT=12", label: "Weekly (12 weeks)" },
];

function toLocalInputValue(iso?: string): string {
  const date = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Role-aware scheduling form:
 *  - teachers: live classes for their own courses
 *  - admins:   live classes, general meetings (all/teachers/students), or
 *              custom meetings with hand-picked participants
 *  - students: personal learning reminders only
 */
export default function MeetingScheduler({
  open,
  role,
  userId,
  editing = null,
  onClose,
  onSaved,
}: MeetingSchedulerProps) {
  const { pushToast } = useNotificationContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>(
    role === "student" ? "reminder" : "live_class",
  );
  const [audience, setAudience] = useState<"all" | "teachers" | "students">("all");
  const [courseId, setCourseId] = useState("");
  const [start, setStart] = useState(toLocalInputValue());
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [recurrence, setRecurrence] = useState("");
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [saving, setSaving] = useState(false);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Nairobi",
    [],
  );

  // Hydrate when opened (and prefill when editing).
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description);
      setMeetingType(editing.meetingType);
      setCourseId(editing.courseId ?? "");
      setStart(toLocalInputValue(editing.startTime));
      const minutes = Math.max(
        15,
        Math.round(
          (new Date(editing.endTime).getTime() - new Date(editing.startTime).getTime()) / 60000,
        ),
      );
      setDurationMinutes(minutes);
      setRecurrence(editing.recurrenceRule ?? "");
    } else {
      setTitle("");
      setDescription("");
      setMeetingType(role === "student" ? "reminder" : "live_class");
      setCourseId("");
      setStart(toLocalInputValue());
      setDurationMinutes(60);
      setRecurrence("");
      setInviteeIds([]);
    }

    if (role === "teacher") {
      listCourses({ instructorId: userId, pageSize: 100 })
        .then((response) => setCourses(response.courses))
        .catch(() => setCourses([]));
    } else if (role === "admin") {
      listCourses({ pageSize: 100 })
        .then((response) => setCourses(response.courses))
        .catch(() => setCourses([]));
      listUsers()
        .then((all) => setUsers(all.filter((candidate) => candidate.id !== userId)))
        .catch(() => setUsers([]));
    }
  }, [open, editing, role, userId]);

  const isReminder = meetingType === "reminder";
  const needsCourse = meetingType === "live_class";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    setSaving(true);
    try {
      if (editing) {
        await updateMeeting(editing.id, {
          title: title.trim(),
          description,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          timezone,
          recurrenceRule: recurrence || null,
        });
        pushToast("Meeting updated. Google Calendar invitations were refreshed.", "success");
      } else {
        const input: CreateMeetingInput = {
          title: title.trim(),
          description,
          meetingType,
          audience:
            meetingType === "live_class"
              ? "course"
              : meetingType === "custom"
                ? "custom"
                : meetingType === "reminder"
                  ? "personal"
                  : audience,
          courseId: needsCourse ? courseId : undefined,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          timezone,
          recurrenceRule: recurrence || null,
          inviteeIds: meetingType === "custom" ? inviteeIds : [],
        };
        const created = await createMeeting(input);
        pushToast(
          isReminder
            ? "Reminder saved."
            : created.meetUrl
              ? "Meeting scheduled. Google Meet link is ready and invitations were sent."
              : "Meeting scheduled.",
          "success",
        );
      }
      onSaved();
      onClose();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save the meeting.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleInvitee = (id: string) => {
    setInviteeIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  };

  const modalTitle = editing
    ? "Reschedule Meeting"
    : role === "student"
      ? "New Learning Reminder"
      : role === "teacher"
        ? "Schedule Live Class"
        : "Schedule Meeting";

  return (
    <Modal open={open} title={modalTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {!editing && role === "admin" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Meeting type</label>
            <select
              value={meetingType}
              onChange={(event) => setMeetingType(event.target.value as MeetingType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="live_class">Live class (course)</option>
              <option value="general">General meeting (by role)</option>
              <option value="custom">Custom (pick participants)</option>
              <option value="reminder">Personal reminder</option>
            </select>
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder={isReminder ? "e.g. Revise Lesson 3" : "e.g. Week 4 Live Class"}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="What is this session about?"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {!editing && needsCourse && role !== "student" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select a course...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Every enrolled student receives a Google Calendar invitation and sees the Join button.
            </p>
          </div>
        ) : null}

        {!editing && meetingType === "general" && role === "admin" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Audience</label>
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value as typeof audience)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Everyone</option>
              <option value="teachers">All teachers</option>
              <option value="students">All students</option>
            </select>
          </div>
        ) : null}

        {!editing && meetingType === "custom" && role === "admin" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Participants ({inviteeIds.length} selected)
            </label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
              {users.map((candidate) => (
                <label
                  key={candidate.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={inviteeIds.includes(candidate.id)}
                    onChange={() => toggleInvitee(candidate.id)}
                  />
                  <span className="flex-1">{candidate.displayName || candidate.email}</span>
                  <span className="text-xs text-slate-400">{candidate.role}</span>
                </label>
              ))}
              {users.length === 0 ? (
                <p className="px-2 py-1 text-xs text-slate-500">No users found.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Starts</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Duration</label>
            <select
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {[30, 45, 60, 90, 120, 180].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Repeats</label>
          <select
            value={recurrence}
            onChange={(event) => setRecurrence(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || (needsCourse && !editing && !courseId)}>
            {saving ? "Saving..." : editing ? "Save Changes" : isReminder ? "Save Reminder" : "Schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
