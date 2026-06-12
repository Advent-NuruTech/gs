import "server-only";

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export interface RequestUser {
  id: string;
  email: string;
  role: "student" | "teacher" | "admin";
  fullName: string;
}

/**
 * Resolves the signed-in caller of an API route from either the
 * `Authorization: Bearer` header (fetch from services) or the Supabase
 * session cookie (browser navigations like the OAuth redirect flow).
 */
export async function getRequestUser(request: NextRequest): Promise<RequestUser | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (token) {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;
    const { data: profile } = await client
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return null;
    return {
      id: user.id,
      email: String(profile.email ?? user.email ?? ""),
      role: profile.role as RequestUser["role"],
      fullName: String(profile.full_name ?? ""),
    };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    id: user.id,
    email: String(profile.email ?? user.email ?? ""),
    role: profile.role as RequestUser["role"],
    fullName: String(profile.full_name ?? ""),
  };
}
