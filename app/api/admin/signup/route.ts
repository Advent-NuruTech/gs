import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SIGNUP_CODE = process.env.ADMIN_SIGNUP_CODE ?? "";

function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

// Creates an administrator account. Gated by ADMIN_SIGNUP_CODE so it cannot be
// abused for privilege escalation. The profile row is created by the
// handle_new_user trigger from the user metadata.
export async function POST(request: NextRequest) {
  if (!SIGNUP_CODE) {
    return NextResponse.json(
      { error: "Admin signup is disabled. Set ADMIN_SIGNUP_CODE to enable it." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
    phone?: string;
    code?: string;
  };

  if (!body.email || !body.password || !body.displayName || !body.phone) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (body.password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (body.code !== SIGNUP_CODE) {
    return NextResponse.json({ error: "Invalid admin signup code." }, { status: 401 });
  }

  const phone = normalizePhone(body.phone);
  if (!/^254\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid Kenyan phone number." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.displayName,
      phone,
      role: "admin",
    },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Could not create admin." }, { status: 400 });
  }

  return NextResponse.json({ id: data.user.id });
}
