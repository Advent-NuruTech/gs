import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Validate an invite token (used by the invitee, who is not yet authenticated).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ invite: null });

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("teacher_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  return NextResponse.json({ invite: data ?? null });
}

// Mark an invite consumed after the teacher account is created.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { token?: string; teacherId?: string };
  if (!body.token || !body.teacherId) {
    return NextResponse.json({ error: "Missing token or teacherId." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: invite } = await supabase
    .from("teacher_invites")
    .select("*")
    .eq("token", body.token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }
  if (invite.used) {
    return NextResponse.json({ error: "Invite already used." }, { status: 409 });
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 410 });
  }

  const { error } = await supabase
    .from("teacher_invites")
    .update({ used: true, used_by: body.teacherId, used_at: new Date().toISOString() })
    .eq("token", body.token);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
