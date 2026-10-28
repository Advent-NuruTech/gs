import { NextRequest, NextResponse } from "next/server";

import { removeStoredAsset } from "@/lib/cloudflare/assets";
import { getRequestUser } from "@/lib/api/requireUser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const reference = String(body?.reference ?? "");
  try {
    const removed = await removeStoredAsset(reference, user.id, user.role === "admin");
    if (!removed) return NextResponse.json({ error: "Not a Cloudflare asset." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove the file." },
      { status: 400 },
    );
  }
}
