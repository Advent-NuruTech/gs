import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createUserAsAdmin, mapProfile } from "@/services/authService";
import { AppUser, CreateUserInput, UserRole } from "@/types/user";

const supabase = getSupabaseBrowserClient();

export async function listUsers(role?: UserRole): Promise<AppUser[]> {
  let queryBuilder = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (role) {
    queryBuilder = queryBuilder.eq("role", role);
  }
  const { data, error } = await queryBuilder;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProfile);
}

export async function createManagedUser(input: CreateUserInput): Promise<string> {
  return createUserAsAdmin(input);
}

export async function updateManagedUser(
  userId: string,
  updates: Partial<Pick<AppUser, "displayName" | "role">>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (typeof updates.displayName === "string") payload.full_name = updates.displayName;
  if (updates.role) payload.role = updates.role;
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteManagedUser(userId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const response = await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Could not delete user.");
  }
}
