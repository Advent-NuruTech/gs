import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { fetchMeetParticipants } from "@/lib/google/meet";
import { getGoogleConnection } from "@/lib/google/tokens";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Best-effort sync of attendance from the Google Meet REST API (host/admin
 * only). Works when the host is a Google Workspace user; otherwise the
 * in-app Join-click records remain the attendance source.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, host_id, created_by, google_meet_url")
    .eq("id", id)
    .maybeSingle();
  if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });

  const canManage =
    user.role === "admin" ||
    String(meeting.host_id) === user.id ||
    String(meeting.created_by) === user.id;
  if (!canManage) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  if (!meeting.google_meet_url) {
    return NextResponse.json({ error: "This meeting has no Meet link." }, { status: 409 });
  }

  const google = await getGoogleConnection(String(meeting.host_id));
  if (!google) {
    return NextResponse.json({ error: "Host's Google account is not connected." }, { status: 409 });
  }

  const participants = await fetchMeetParticipants(google.accessToken, String(meeting.google_meet_url));

  // Match Meet participants to profiles by display name (Meet API does not
  // expose emails) and enrich existing attendance rows with durations.
  let updated = 0;
  if (participants.length > 0) {
    const { data: rows } = await supabase
      .from("meeting_attendance")
      .select("id, user_id, profiles!meeting_attendance_user_id_fkey(full_name)")
      .eq("meeting_id", id);
    const attendance = (rows ?? []) as unknown as Array<{
      id: string;
      user_id: string;
      profiles: { full_name: string } | null;
    }>;
    for (const participant of participants) {
      if (!participant.displayName || !participant.earliestStart || !participant.latestEnd) continue;
      const match = attendance.find(
        (row) =>
          (row.profiles?.full_name ?? "").trim().toLowerCase() ===
          participant.displayName!.trim().toLowerCase(),
      );
      if (!match) continue;
      const minutes = Math.max(
        1,
        Math.round(
          (new Date(participant.latestEnd).getTime() - new Date(participant.earliestStart).getTime()) /
            60000,
        ),
      );
      await supabase
        .from("meeting_attendance")
        .update({ duration_minutes: minutes, source: "google_meet" })
        .eq("id", match.id);
      updated += 1;
    }
  }

  return NextResponse.json({
    participantsFound: participants.length,
    recordsUpdated: updated,
    note:
      participants.length === 0
        ? "No Meet conference records available (requires a Google Workspace host). In-app Join clicks are still tracked."
        : undefined,
  });
}
