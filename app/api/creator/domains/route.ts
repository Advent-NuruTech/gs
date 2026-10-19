import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { normalizeRequestedDomain } from "@/lib/creators/validation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function requireCreator(request: NextRequest) {
  const user = await getRequestUser(request);
  return user && (user.role === "teacher" || user.role === "admin") ? user : null;
}

function serialize(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    requestedDomain: String(row.requested_domain),
    status: String(row.status),
    requestedAt: String(row.requested_at),
    updatedAt: String(row.updated_at),
    readyAt: row.ready_at ? String(row.ready_at) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const user = await requireCreator(request);
  if (!user) return NextResponse.json({ error: "Creator access required." }, { status: 403 });
  const db = getSupabaseAdminClient();
  const { data, error } = await db.from("creator_domain_requests").select("*").eq("creator_id", user.id).order("requested_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ requests: (data ?? []).map((row) => serialize(row as Record<string, unknown>)) });
}

export async function POST(request: NextRequest) {
  const user = await requireCreator(request);
  if (!user) return NextResponse.json({ error: "Creator access required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  let requestedDomain: string;
  try {
    requestedDomain = normalizeRequestedDomain(String(body?.domain ?? ""));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid domain." }, { status: 400 });
  }
  const db = getSupabaseAdminClient();
  const { data, error } = await db.from("creator_domain_requests").insert({ creator_id: user.id, requested_domain: requestedDomain }).select("*").single();
  if (error?.code === "23505") return NextResponse.json({ error: "That creator or domain already has an open request." }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not submit domain request." }, { status: 400 });
  const { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
  if (admins?.length) {
    await db.from("notifications").insert(admins.map((admin) => ({
      user_id: admin.id,
      title: "Custom domain request",
      message: `${user.fullName || "A creator"} requested ${requestedDomain}.`,
      link: "/dashboard/admin/creator-domains",
    })));
  }
  return NextResponse.json({ request: serialize(data as Record<string, unknown>) }, { status: 201 });
}
