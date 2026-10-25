import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { data, error } = await getSupabaseAdminClient().from("profiles").select("id,full_name,email").order("full_name").limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: (data ?? []).map((p) => ({ id: String(p.id), name: String(p.full_name ?? ""), email: String(p.email ?? "") })) });
}
