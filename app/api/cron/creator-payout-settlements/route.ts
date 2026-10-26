import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/email/cron";
import { syncCreatorPayoutSettlements } from "@/lib/paystack/creatorPayoutSettlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });

  try {
    return NextResponse.json({ ok: true, ...(await syncCreatorPayoutSettlements()) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not reconcile creator payout settlements." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
