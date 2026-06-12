import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms, sendSmsBulk } from "@/lib/sms/wasms";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  const name = String(profile?.full_name ?? "there");
  const at = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });

  // Student SMS.
  if (profile?.phone) {
    await sendSms(String(profile.phone), `AdventSkool: Hi ${name}, you just signed in (${at}). If this wasn't you, reset your password.`);
  }

  // Admin SMS (don't notify admins about their own logins).
  if (profile?.role !== "admin") {
    const { data: admins } = await admin.from("profiles").select("phone").eq("role", "admin");
    const phones = (admins ?? []).map((a) => String((a as Record<string, unknown>).phone ?? "")).filter(Boolean);
    await sendSmsBulk(phones, `AdventSkool: ${name} (${user.email}) signed in at ${at}.`);
  }

  return NextResponse.json({ ok: true });
}
