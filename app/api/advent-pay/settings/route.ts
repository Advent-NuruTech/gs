import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ tillName: z.string().trim().max(120), tillNumber: z.string().trim().max(80), tillInstructions: z.string().trim().max(1000) });
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { data, error } = await getSupabaseAdminClient().from("advent_pay_settings").select("till_name,till_number,till_instructions").eq("id", true).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tillName: data?.till_name ?? "", tillNumber: data?.till_number ?? "", tillInstructions: data?.till_instructions ?? "" });
}
export async function PUT(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid Till details." }, { status: 400 });
  const { error } = await getSupabaseAdminClient().from("advent_pay_settings").upsert({ id: true, till_name: parsed.data.tillName, till_number: parsed.data.tillNumber, till_instructions: parsed.data.tillInstructions, updated_by: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(parsed.data);
}
