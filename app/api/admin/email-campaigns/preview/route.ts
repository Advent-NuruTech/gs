import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { campaignEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return false;
  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin";
}

/** Returns the fully-wrapped HTML for an in-progress campaign (admin preview). */
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const { subject, htmlContent } = (await request.json()) as { subject?: string; htmlContent?: string };
  const { html } = campaignEmail({
    subject: subject?.trim() || "Your subject line",
    bodyHtml: htmlContent || "<p>Your email content…</p>",
  });
  return NextResponse.json({ html });
}
