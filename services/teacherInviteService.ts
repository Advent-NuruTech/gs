import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TeacherInvite } from "@/types/teacherInvite";

const supabase = getSupabaseBrowserClient();

export function mapInvite(data: Record<string, unknown>): TeacherInvite {
  return {
    id: String(data.token ?? data.id ?? ""),
    email: String(data.email ?? ""),
    token: String(data.token ?? ""),
    invitedBy: String(data.invited_by ?? ""),
    expiresAt: String(data.expires_at ?? ""),
    used: Boolean(data.used),
    usedBy: data.used_by ? String(data.used_by) : undefined,
    usedAt: data.used_at ? String(data.used_at) : undefined,
    createdAt: data.created_at ? String(data.created_at) : undefined,
  };
}

function createInviteToken(length = 48): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  for (let index = 0; index < length; index += 1) {
    token += chars[values[index] % chars.length];
  }
  return token;
}

export async function createTeacherInvite(input: {
  email: string;
  invitedBy: string;
  expiresInHours?: number;
}): Promise<TeacherInvite> {
  const token = createInviteToken();
  const email = input.email.toLowerCase().trim();
  const expiresInHours = input.expiresInHours ?? 72;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("teacher_invites").insert({
    email,
    token,
    invited_by: input.invitedBy,
    expires_at: expiresAt,
    used: false,
  });
  if (error) throw new Error(error.message);

  return { id: token, email, token, invitedBy: input.invitedBy, expiresAt, used: false };
}

export async function findTeacherInviteByToken(token: string): Promise<TeacherInvite | null> {
  const response = await fetch(`/api/teacher-invites?token=${encodeURIComponent(token)}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as { invite?: Record<string, unknown> | null };
  return payload.invite ? mapInvite(payload.invite) : null;
}

export async function listTeacherInvitesByAdmin(adminId: string): Promise<TeacherInvite[]> {
  const { data, error } = await supabase
    .from("teacher_invites")
    .select("*")
    .eq("invited_by", adminId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapInvite);
}

export function isInviteExpired(invite: TeacherInvite): boolean {
  return new Date(invite.expiresAt).getTime() < Date.now();
}

export async function consumeTeacherInvite(token: string, teacherId: string): Promise<void> {
  const response = await fetch("/api/teacher-invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, teacherId }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Could not activate invite.");
  }
}

export function buildTeacherInviteLink(token: string): string {
  if (typeof window === "undefined") return `/invite/teacher?token=${encodeURIComponent(token)}`;
  return `${window.location.origin}/invite/teacher?token=${encodeURIComponent(token)}`;
}
