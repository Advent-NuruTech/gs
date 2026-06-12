import { NextRequest, NextResponse } from "next/server";

import { fulfillByReference } from "@/lib/paystack/fulfill";

export const runtime = "nodejs";

// Called when the user is redirected back from Paystack. Verifies the
// transaction server-side and grants access. Idempotent with the webhook.
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }

  try {
    const result = await fulfillByReference(reference);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed." },
      { status: 500 },
    );
  }
}
