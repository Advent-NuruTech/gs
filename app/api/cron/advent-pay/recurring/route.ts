import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/email/cron";
import { syncAdventPayRecurringInvoices } from "@/lib/advent-pay/recurring";

export const runtime = "nodejs";

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await syncAdventPayRecurringInvoices()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not process recurring invoices." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
