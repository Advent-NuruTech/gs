import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { CreatorDomainStatus } from "@/types/creator";

export const runtime = "nodejs";

const STATUSES: CreatorDomainStatus[] = ["pending", "in_progress", "awaiting_dns", "ready", "rejected", "cancelled"];

async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  return user?.role === "admin" ? user : null;
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const db = getSupabaseAdminClient();
  const { data, error } = await db.from("creator_domain_requests").select("*").order("requested_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const creatorIds = [...new Set((data ?? []).map((row) => String(row.creator_id)))];
  const { data: creators } = creatorIds.length
    ? await db.from("profiles").select("id,full_name,handle").in("id", creatorIds)
    : { data: [] };
  const byId = new Map((creators ?? []).map((creator) => [String(creator.id), creator]));
  return NextResponse.json({
    requests: (data ?? []).map((row) => ({
      id: row.id,
      creatorId: row.creator_id,
      creatorName: byId.get(String(row.creator_id))?.full_name ?? "Creator",
      creatorHandle: byId.get(String(row.creator_id))?.handle ?? "",
      requestedDomain: row.requested_domain,
      status: row.status,
      requestedAt: row.requested_at,
      updatedAt: row.updated_at,
      readyAt: row.ready_at,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const status = String(body?.status ?? "") as CreatorDomainStatus;
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "Choose a valid request status." }, { status: 400 });
  const db = getSupabaseAdminClient();
  const { data: current } = await db.from("creator_domain_requests").select("creator_id,requested_domain,status").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Domain request not found." }, { status: 404 });
  const { error } = await db.from("creator_domain_requests").update({ status, ready_at: status === "ready" ? new Date().toISOString() : null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (status === "ready" && current.status !== "ready") {
    await db.from("notifications").insert({
      user_id: current.creator_id,
      title: "Your custom domain is ready",
      message: `${current.requested_domain} is ready for your AdventSkool storefront.`,
      link: "/dashboard/teacher/storefront",
    });
  }
  return NextResponse.json({ ok: true });
}
