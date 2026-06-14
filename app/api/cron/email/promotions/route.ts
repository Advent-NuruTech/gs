import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentPromoPeriod, isAuthorizedCron } from "@/lib/email/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bi-monthly promotion. Scheduled by pg_cron for the 1st and 15th of each month
 * (twice per month, GLOBAL). Enqueues a promo email for every subscriber; the
 * period-scoped dedup_key makes re-runs in the same window a no-op. Actual
 * delivery is handled by the rate-limited /api/cron/email/process drain.
 */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const period = currentPromoPeriod();

  const { data, error } = await supabase.rpc("enqueue_promotion_emails", { p_period: period });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, period, enqueued: data ?? 0 });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
