import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/email/cron";
import { EMAIL_LIMITS, renderQueueRow, sleep } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QueueRow {
  id: string;
  lease_id: string;
  recipient_email: string;
  subject: string;
  html: string | null;
  template: string | null;
  payload: Record<string, unknown>;
  attempts: number;
}

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 503 });

  const supabase = getSupabaseAdminClient();
  const startedAt = Date.now();
  const { data: due, error: dueError } = await supabase.from("email_campaigns")
    .select("id").eq("status", "pending").lte("scheduled_at", new Date().toISOString()).limit(20);
  if (dueError) return NextResponse.json({ error: "Could not load scheduled campaigns" }, { status: 500 });

  let promoted = 0;
  for (const campaign of due ?? []) {
    if (Date.now() - startedAt > 15000) break;
    const { error } = await supabase.rpc("enqueue_campaign_emails", { p_campaign_id: campaign.id });
    if (error) return NextResponse.json({ error: "Could not queue a scheduled campaign" }, { status: 500 });
    promoted++;
  }

  let sent = 0;
  let failed = 0;
  let deferred = 0;
  for (let i = 0; i < EMAIL_LIMITS.maxPerRun && Date.now() - startedAt < 15000; i++) {
    const { data, error } = await supabase.rpc("claim_email_queue_item");
    if (error) return NextResponse.json({ error: "Could not claim email queue item" }, { status: 500 });
    const row = (data as QueueRow[] | null)?.[0];
    if (!row) break;

    const { subject, html } = renderQueueRow(row);
    const result = await sendEmail({ to: row.recipient_email, subject, html, idempotencyKey: `email-queue/${row.id}` });
    // Provider outages, limits and configuration failures should not exhaust a recipient's retries.
    const transient = !result.ok && (!result.status || result.status === 401 || result.status === 403 || result.status === 408 || result.status === 409 || result.status === 429 || result.status >= 500);
    const attempts = row.attempts + (transient ? 0 : 1);
    const update = result.ok
      ? { status: "sent", sent_at: new Date().toISOString(), attempts, last_error: null, lease_id: null, leased_at: null }
      : { status: !transient && attempts >= EMAIL_LIMITS.maxAttempts ? "failed" : "pending", attempts, last_error: (result.error ?? "unknown error").slice(0, 500), scheduled_at: new Date(Date.now() + (transient ? 15 * 60_000 : 5 * 60_000)).toISOString(), lease_id: null, leased_at: null };
    const { data: saved, error: saveError } = await supabase.from("email_queue").update(update)
      .eq("id", row.id).eq("lease_id", row.lease_id).eq("status", "sending").select("id");
    if (saveError || !saved?.length) return NextResponse.json({ error: "Could not record email result" }, { status: 500 });
    if (result.ok) sent++;
    else if (transient) { deferred++; break; }
    else failed++;
    if (i + 1 < EMAIL_LIMITS.maxPerRun && Date.now() - startedAt < 15000) await sleep(EMAIL_LIMITS.delayBetweenSends);
  }

  const { error: markError } = await supabase.rpc("mark_drained_campaigns");
  if (markError) return NextResponse.json({ error: "Could not update campaign status" }, { status: 500 });
  return NextResponse.json({ ok: deferred === 0, promoted, sent, failed, deferred }, { status: deferred ? 503 : 200 });
}

export async function POST(request: NextRequest) { return handle(request); }
export async function GET(request: NextRequest) { return handle(request); }
