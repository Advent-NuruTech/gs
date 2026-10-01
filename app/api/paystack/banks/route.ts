import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { listKenyanBanks } from "@/lib/paystack/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Teachers only." }, { status: 403 });
  try {
    return NextResponse.json({ banks: await listKenyanBanks() }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load Kenyan banks." }, { status: 502 });
  }
}
