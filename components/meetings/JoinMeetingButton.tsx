"use client";

import { useState } from "react";
import { Video } from "lucide-react";

import { useNotificationContext } from "@/context/NotificationContext";
import { joinMeeting } from "@/services/meetingService";
import { Meeting } from "@/types/meeting";

interface JoinMeetingButtonProps {
  meeting: Meeting;
  className?: string;
}

/** Joinable from 15 minutes before start until 2 hours after start. */
export function isJoinableNow(meeting: Meeting): boolean {
  if (meeting.status !== "scheduled" || !meeting.googleMeetUrl) return false;
  const start = new Date(meeting.startTime).getTime();
  const now = Date.now();
  // Recurring meetings keep the original start date — always allow joining
  // within the weekly window around the scheduled time of day.
  if (meeting.recurrenceRule) return true;
  return now >= start - 15 * 60 * 1000 && now <= start + 2 * 60 * 60 * 1000;
}

/**
 * One-click join: records attendance through the API, then opens Google Meet.
 * Only rendered for users who can see the meeting (RLS already filtered).
 */
export default function JoinMeetingButton({ meeting, className = "" }: JoinMeetingButtonProps) {
  const { pushToast } = useNotificationContext();
  const [busy, setBusy] = useState(false);

  if (!meeting.googleMeetUrl || meeting.status !== "scheduled") return null;

  const joinable = isJoinableNow(meeting);

  const handleJoin = async () => {
    setBusy(true);
    try {
      const meetUrl = await joinMeeting(meeting.id);
      window.open(meetUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not join.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={busy || !joinable}
      title={joinable ? "Open Google Meet" : "Available 15 minutes before start"}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        joinable
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : "bg-slate-100 text-slate-500"
      } ${className}`}
    >
      <Video className="h-4 w-4" />
      {busy ? "Opening..." : "Join Meeting"}
    </button>
  );
}
