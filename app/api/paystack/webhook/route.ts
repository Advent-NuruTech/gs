import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

import { fulfillByReference } from "@/lib/paystack/fulfill";

export const runtime = "nodejs";

const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";

// Paystack webhook — the authoritative fulfillment trigger. Validates the
// x-paystack-signature (HMAC SHA512 of the raw body) before acting.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  if (!signature || signature.length !== expected.length) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const reference = event.data?.reference;
  if (event.event === "charge.success" && reference) {
    try {
      await fulfillByReference(reference);
    } catch (error) {
      // Acknowledge anyway so Paystack doesn't hammer retries on transient errors;
      // the redirect verify path is a backstop.
      console.error("[paystack webhook] fulfillment error:", (error as Error).message);
    }
  }

  return NextResponse.json({ received: true });
}
