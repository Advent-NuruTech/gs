import { NextRequest, NextResponse } from "next/server";

import { bindAssetsToProduct } from "@/lib/cloudflare/assets";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = body?.kind === "wealth" ? "wealth" : body?.kind === "design" ? "design" : null;
  const productId = String(body?.productId ?? "");
  const references = Array.isArray(body?.references) ? body.references.map(String).slice(0, 4) : [];
  if (!kind || !productId || references.length === 0) {
    return NextResponse.json({ error: "Invalid asset binding." }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  const table = kind === "design" ? "designs" : "wealth_products";
  const { data: product } = await db.from(table).select("created_by").eq("id", productId).maybeSingle();
  if (!product || (user.role !== "admin" && product.created_by !== user.id)) {
    return NextResponse.json({ error: "Not authorized to bind these files." }, { status: 403 });
  }
  try {
    await bindAssetsToProduct(
      references,
      kind,
      productId,
      user.id,
      String(product.created_by ?? user.id),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not bind the product files." },
      { status: 500 },
    );
  }
}
