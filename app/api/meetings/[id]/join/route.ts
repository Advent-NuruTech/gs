import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Records that the caller joined a meeting and returns the Meet URL.
 * Visibility is enforced by re-reading the meeting AS the caller (RLS):
 * only enrolled students, the audience, invitees, hosts and admins can join.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { id } = await ctx.params;

  // RLS check: can this user see the meeting?
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: meeting } = await userClient
    .from("meetings")
    .select("id, status, google_meet_url")
    .eq("id", id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found or not yours to join." }, { status: 404 });
  }
  if (meeting.status === "cancelled") {
    return NextResponse.json({ error: "This meeting was cancelled." }, { status: 409 });
  }
  if (!meeting.google_meet_url) {
    return NextResponse.json({ error: "This meeting has no Meet link." }, { status: 409 });
  }

  // Upsert attendance (count repeat joins).
  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from("meeting_attendance")
    .select("id, join_count")
    .eq("meeting_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await admin
      .from("meeting_attendance")
      .update({
        last_joined_at: new Date().toISOString(),
        join_count: Number(existing.join_count ?? 1) + 1,
      })
      .eq("id", existing.id);
  } else {
    await admin
      .from("meeting_attendance")
      .insert({ meeting_id: id, user_id: user.id, source: "app" });
  }

  return NextResponse.json({ meetUrl: meeting.google_meet_url });
}
