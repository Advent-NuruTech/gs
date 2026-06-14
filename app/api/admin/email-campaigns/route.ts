import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface AdminCaller {
  id: string;
}

async function requireAdmin(request: NextRequest): Promise<AdminCaller | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return null;
  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin" ? { id: user.id } : null;
}

interface CampaignBody {
  title?: string;
  subject?: string;
  htmlContent?: string;
  targetAudience?: "all" | "category";
  category?: string | null;
  scheduledAt?: string | null;
  sendNow?: boolean;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const body = (await request.json()) as CampaignBody;
  const targetAudience = body.targetAudience === "category" ? "category" : "all";

  if (!body.title?.trim() || !body.subject?.trim() || !body.htmlContent?.trim()) {
    return NextResponse.json({ error: "Title, subject and content are required." }, { status: 400 });
  }
  if (targetAudience === "category" && !body.category?.trim()) {
    return NextResponse.json({ error: "Select a category for category campaigns." }, { status: 400 });
  }

  // Immediate sends (or past dates) become 'pending' with scheduled_at=now and
  // are picked up by the next processor run; future dates wait until due.
  const scheduledAt = body.sendNow ? new Date().toISOString() : body.scheduledAt || new Date().toISOString();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({
      title: body.title.trim(),
      subject: body.subject.trim(),
      html_content: body.htmlContent,
      target_audience: targetAudience,
      category: targetAudience === "category" ? body.category?.trim() : null,
      scheduled_at: scheduledAt,
      status: "pending",
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create campaign." }, { status: 400 });
  }

  // If due now, enqueue immediately for snappy delivery instead of waiting for
  // the processor's promote step.
  if (new Date(scheduledAt).getTime() <= Date.now()) {
    await supabase.rpc("enqueue_campaign_emails", { p_campaign_id: data.id });
  }

  return NextResponse.json({ id: data.id });
}
