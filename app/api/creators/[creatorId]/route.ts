import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ creatorId: string }> }) {
  const { creatorId } = await params;
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("handle,role,creator_status,suspended_until")
    .eq("id", creatorId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load creator." }, { status: 400 });
  const suspended = data?.suspended_until && new Date(String(data.suspended_until)).getTime() > Date.now();
  if (!data || data.role !== "teacher" || !data.handle || suspended || !["pending", "approved"].includes(String(data.creator_status))) {
    return NextResponse.json({ handle: null });
  }
  return NextResponse.json({ handle: String(data.handle) });
}
