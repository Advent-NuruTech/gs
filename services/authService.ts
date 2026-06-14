"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppUser, CreateUserInput } from "@/types/user";

const supabase = getSupabaseBrowserClient();

export function mapProfile(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    displayName: String(row.full_name ?? ""),
    phone: String(row.phone ?? ""),
    role: (row.role as AppUser["role"]) ?? "student",
    photoURL: row.photo_url ? String(row.photo_url) : undefined,
    marketingSubscribed: row.marketing_subscribed === undefined ? undefined : Boolean(row.marketing_subscribed),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export interface RegisterResult {
  userId: string;
  /** True when Supabase requires the user to confirm their email before logging in. */
  needsConfirmation: boolean;
}

/**
 * Registers a student/teacher. The `profiles` row is created automatically by
 * the `handle_new_user` DB trigger from the signup metadata. When the project
 * has "Confirm email" enabled, `session` is null until the user confirms.
 */
export async function registerUser(input: CreateUserInput): Promise<RegisterResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.displayName,
        phone: input.phone ?? "",
        role: input.role ?? "student",
        marketing_subscribed: input.marketingSubscribed ?? true,
      },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Registration failed.");
  return { userId: data.user.id, needsConfirmation: !data.session };
}

/** Updates the signed-in user's email. Supabase emails a confirmation link. */
export async function updateUserEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw new Error(error.message);
}

/** Updates the signed-in user's password. */
export async function updateUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

/**
 * Sends a password-reset email. The link lands on `/auth/callback`, which
 * exchanges the code for a (recovery) session and forwards to `/reset-password`
 * where the user can set a new password.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

/** Updates the signed-in user's profile (name / phone) in the profiles table. */
export async function updateUserProfile(
  userId: string,
  updates: { displayName?: string; phone?: string },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (typeof updates.displayName === "string") payload.full_name = updates.displayName;
  if (typeof updates.phone === "string") payload.phone = updates.phone;
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) throw new Error(error.message);
  // Keep auth metadata in sync so future sessions carry the same values.
  await supabase.auth.updateUser({ data: payload });
}

export async function loginUser(email: string, password: string): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Login failed.");
  return data.user.id;
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapProfile(data);
}

/**
 * Admin-only: create a managed user (teacher/admin/student) without disturbing
 * the current admin session. Delegates to a server route that uses the
 * service-role Admin API.
 */
export async function createUserAsAdmin(input: CreateUserInput): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as { id?: string; error?: string };
  if (!response.ok || !payload.id) {
    throw new Error(payload.error ?? "Could not create user.");
  }
  return payload.id;
}
