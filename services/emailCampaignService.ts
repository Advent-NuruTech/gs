"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

export interface EmailCampaign {
  id: string;
  title: string;
  subject: string;
  htmlContent: string;
  targetAudience: "all" | "category";
  category: string | null;
  scheduledAt: string;
  status: "pending" | "queued" | "sent" | "failed" | "canceled";
  recipientsCount: number;
  createdAt?: string;
}

export interface CreateCampaignInput {
  title: string;
  subject: string;
  htmlContent: string;
  targetAudience: "all" | "category";
  category?: string | null;
  scheduledAt?: string | null;
  sendNow?: boolean;
}

function mapCampaign(row: Record<string, unknown>): EmailCampaign {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    subject: String(row.subject ?? ""),
    htmlContent: String(row.html_content ?? ""),
    targetAudience: (row.target_audience as EmailCampaign["targetAudience"]) ?? "all",
    category: row.category ? String(row.category) : null,
    scheduledAt: String(row.scheduled_at ?? ""),
    status: (row.status as EmailCampaign["status"]) ?? "pending",
    recipientsCount: Number(row.recipients_count ?? 0),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function listCampaigns(): Promise<EmailCampaign[]> {
  const response = await fetch("/api/admin/email-campaigns", { headers: await authHeaders() });
  const payload = (await response.json()) as { campaigns?: Record<string, unknown>[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Could not load campaigns.");
  return (payload.campaigns ?? []).map(mapCampaign);
}

export async function createCampaign(input: CreateCampaignInput): Promise<string> {
  const response = await fetch("/api/admin/email-campaigns", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { id?: string; error?: string };
  if (!response.ok || !payload.id) throw new Error(payload.error ?? "Could not create campaign.");
  return payload.id;
}

export async function previewCampaign(subject: string, htmlContent: string): Promise<string> {
  const response = await fetch("/api/admin/email-campaigns/preview", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ subject, htmlContent }),
  });
  const payload = (await response.json()) as { html?: string; error?: string };
  if (!response.ok || !payload.html) throw new Error(payload.error ?? "Could not render preview.");
  return payload.html;
}
