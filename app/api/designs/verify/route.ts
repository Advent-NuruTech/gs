import { NextRequest, NextResponse } from "next/server";

import { fulfillDesignOrder } from "@/lib/designs/fulfill";

export const runtime = "nodejs";

// Called when the customer is redirected back from Paystack. Verifies the
// transaction server-side and marks the order paid. Idempotent.
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }

  try {
    const result = await fulfillDesignOrder(reference);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed." },
      { status: 500 },
    );
  }
}
