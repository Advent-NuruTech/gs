import { NextRequest, NextResponse } from "next/server";
import { fulfillAdventPayInvoice } from "@/lib/advent-pay/invoices";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference?.startsWith("ap_")) return NextResponse.json({ error: "Invalid invoice payment reference." }, { status: 400 });
  try {
    const result = await fulfillAdventPayInvoice(reference);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify invoice payment." }, { status: 500 });
  }
}
