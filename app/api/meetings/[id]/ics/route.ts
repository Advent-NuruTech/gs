import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsDate(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Download one visible AdventSkool calendar event as an RFC 5545 .ics file. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, description, start_time, end_time, location, meeting_url, recurrence_rule, status, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!meeting || meeting.status === "cancelled") return NextResponse.json({ error: "Calendar event not found." }, { status: 404 });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AdventSkool//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${meeting.id}@adventskool.co.ke`,
    `DTSTAMP:${icsDate(String(meeting.updated_at))}`,
    `DTSTART:${icsDate(String(meeting.start_time))}`,
    `DTEND:${icsDate(String(meeting.end_time))}`,
    `SUMMARY:${escapeIcs(String(meeting.title))}`,
    `DESCRIPTION:${escapeIcs([meeting.description, meeting.meeting_url ? `Session: ${meeting.meeting_url}` : ""].filter(Boolean).join("\n"))}`,
    meeting.location ? `LOCATION:${escapeIcs(String(meeting.location))}` : "",
    meeting.meeting_url ? `URL:${escapeIcs(String(meeting.meeting_url))}` : "",
    meeting.recurrence_rule ? String(meeting.recurrence_rule) : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const filename = `${String(meeting.title).replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "event"}.ics`;
  return new NextResponse(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
