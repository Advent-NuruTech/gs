import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/email/cron";
import { EMAIL_LIMITS, renderQueueRow, sleep } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QueueRow {
  id: string;
  recipient_email: string;
  subject: string;
  html: string | null;
  template: string | null;
  payload: Record<string, unknown>;
  attempts: number;
}

/**
 * Outbox processor. Run frequently (e.g. every 5 min via pg_cron). Each run:
 *   1. Promotes any due admin campaigns into the queue (fan-out in SQL).
 *   2. Drains up to EMAIL_LIMITS.maxPerRun pending rows, rate-limited, marking
 *      each sent/failed. This batching + cron cadence spreads large audiences
 *      over time, staying within Resend / Supabase free-tier limits.
 */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  // 1. Promote due scheduled campaigns into the outbox.
  let promoted = 0;
  const { data: dueCampaigns } = await supabase
    .from("email_campaigns")
    .select("id")
    .eq("status", "pending")
    .lte("scheduled_at", now);

  for (const c of dueCampaigns ?? []) {
    const { error } = await supabase.rpc("enqueue_campaign_emails", { p_campaign_id: c.id });
    if (!error) promoted += 1;
  }

  // 2. Claim a batch of pending rows (mark 'sending' so a second run skips them).
  const { data: claimable } = await supabase
    .from("email_queue")
    .select("id, recipient_email, subject, html, template, payload, attempts")
    .eq("status", "pending")
    .lt("attempts", EMAIL_LIMITS.maxAttempts)
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(EMAIL_LIMITS.maxPerRun);

  const rows = (claimable ?? []) as QueueRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, promoted, sent: 0, failed: 0 });
  }

  await supabase
    .from("email_queue")
    .update({ status: "sending" })
    .in("id", rows.map((r) => r.id));

  // 3. Send sequentially with a delay between sends to respect rate limits.
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const { subject, html } = renderQueueRow(row);
    const result = await sendEmail({ to: row.recipient_email, subject, html });

    if (result.ok) {
      sent += 1;
      await supabase
        .from("email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString(), attempts: row.attempts + 1 })
        .eq("id", row.id);
    } else {
      failed += 1;
      const attempts = row.attempts + 1;
      await supabase
        .from("email_queue")
        .update({
          status: attempts >= EMAIL_LIMITS.maxAttempts ? "failed" : "pending",
          attempts,
          last_error: result.error?.slice(0, 500) ?? "unknown error",
        })
        .eq("id", row.id);
    }

    if (i < rows.length - 1) await sleep(EMAIL_LIMITS.delayBetweenSends);
  }

  // Mark fully-drained campaigns as sent.
  await supabase.rpc("mark_drained_campaigns");

  return NextResponse.json({ ok: true, promoted, sent, failed, batch: rows.length });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
