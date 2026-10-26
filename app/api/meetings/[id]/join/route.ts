import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Records a join then returns the host-provided session URL. */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id } = await ctx.params;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: meeting } = await userClient.from("meetings").select("id, status, meeting_url").eq("id", id).maybeSingle();
  if (!meeting) return NextResponse.json({ error: "Calendar event not found or not yours to join." }, { status: 404 });
  if (meeting.status === "cancelled") return NextResponse.json({ error: "This event was cancelled." }, { status: 409 });
  if (!meeting.meeting_url) return NextResponse.json({ error: "The host has not added a session link yet." }, { status: 409 });

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin.from("meeting_attendance").select("id, join_count").eq("meeting_id", id).eq("user_id", user.id).maybeSingle();
  if (existing) {
    await admin.from("meeting_attendance").update({ last_joined_at: new Date().toISOString(), join_count: Number(existing.join_count ?? 1) + 1 }).eq("id", existing.id);
  } else {
    await admin.from("meeting_attendance").insert({ meeting_id: id, user_id: user.id, source: "app" });
  }
  return NextResponse.json({ meetingUrl: meeting.meeting_url });
}
