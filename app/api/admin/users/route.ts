import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  // Validate the caller's token and look up their role.
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

  return profile?.role === "admin" ? user : null;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
    phone?: string;
    role?: string;
  };

  if (!body.email || !body.password || !body.displayName) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.displayName,
      phone: body.phone ?? "",
      role: body.role ?? "student",
    },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Could not create user." }, { status: 400 });
  }

  return NextResponse.json({ id: data.user.id });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  // Deleting the auth user cascades to the profile row (FK on delete cascade).
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const userId = String(body?.id ?? "");
  const action = String(body?.action ?? "");
  if (!userId || !["approve_creator", "reject_creator", "suspend", "restore"].includes(action)) return NextResponse.json({ error: "Invalid account action." }, { status: 400 });
  if (userId === admin.id) return NextResponse.json({ error: "You cannot change your own account." }, { status: 400 });
  const db = getSupabaseAdminClient();
  let result;
  if (action === "approve_creator") result = await db.from("profiles").update({ role: "teacher", creator_status: "approved" }).eq("id", userId);
  else if (action === "reject_creator") result = await db.from("profiles").update({ creator_status: "rejected" }).eq("id", userId);
  else if (action === "restore") result = await db.from("profiles").update({ suspended_until: null, suspension_reason: null }).eq("id", userId);
  else {
    const hours = Number(body?.hours);
    if (!Number.isFinite(hours) || hours < 1 || hours > 24 * 365) return NextResponse.json({ error: "Suspension duration must be 1 hour to 365 days." }, { status: 400 });
    result = await db.from("profiles").update({ suspended_until: new Date(Date.now() + hours * 3600000).toISOString(), suspension_reason: String(body?.reason ?? "Account suspended by administrator.").slice(0, 500) }).eq("id", userId);
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
