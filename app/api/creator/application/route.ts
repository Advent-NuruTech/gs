import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in before applying." }, { status: 401 });
  if (user.role === "admin" || user.role === "teacher") return NextResponse.json({ error: "This account already has creator access." }, { status: 400 });
  const body = await request.json().catch(() => null);
  const whatsapp = String(body?.whatsapp ?? "").trim();
  const digits = whatsapp.replace(/\D/g, "");
  if (!/^254\d{9}$/.test(digits)) return NextResponse.json({ error: "Enter a valid WhatsApp number, including country code (e.g. +254712345678)." }, { status: 400 });
  const db = getSupabaseAdminClient();
  const { data: profile } = await db.from("profiles").select("creator_status").eq("id", user.id).maybeSingle();
  if (profile?.creator_status === "pending") return NextResponse.json({ error: "Your creator application is already in review." }, { status: 409 });
  const { error } = await db.from("profiles").update({ creator_status: "pending", whatsapp: `+${digits}` }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Could not submit your application." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
