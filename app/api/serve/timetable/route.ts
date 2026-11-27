import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function timetableValues(body: Record<string, unknown>) {
  const studyNumber = Number(body.study_number);
  const title = text(body.title, 160);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const sessionDate = body.session_date === "" || body.session_date == null ? null : text(body.session_date, 10);
  const startTime = body.start_time === "" || body.start_time == null ? null : text(body.start_time, 5);

  if (!Number.isInteger(studyNumber) || studyNumber < 1 || studyNumber > 200 || !title) return null;
  if (sessionDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return null;
    const [year, month, day] = sessionDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  }
  if (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null;
  if (typeof body.published !== "boolean") return null;

  return {
    study_number: studyNumber,
    title,
    description,
    session_date: sessionDate,
    start_time: startTime,
    published: body.published,
  };
}

async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (user.role !== "admin") return { response: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  return { user };
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const { data, error } = await getSupabaseAdminClient()
    .from("serve_timetable")
    .select("*")
    .order("study_number", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load the SERVE timetable." }, { status: 500 });
  return NextResponse.json({ timetable: data });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const body = await request.json().catch(() => null);
  const values = body && typeof body === "object" ? timetableValues(body) : null;
  if (!values) return NextResponse.json({ error: "Enter a valid study number, title, date, and time." }, { status: 400 });

  const { data, error } = await getSupabaseAdminClient()
    .from("serve_timetable")
    .insert(values)
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "That study number is already in use." : "Could not add this timetable entry.";
    return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 500 });
  }
  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const body = await request.json().catch(() => null);
  const id = text(body?.id, 64);
  const values = body && typeof body === "object" ? timetableValues(body) : null;
  if (!id || !values) return NextResponse.json({ error: "Enter a valid study number, title, date, and time." }, { status: 400 });

  const { data, error } = await getSupabaseAdminClient()
    .from("serve_timetable")
    .update(values)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    const message = error.code === "23505" ? "That study number is already in use." : "Could not update this timetable entry.";
    return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 500 });
  }
  if (!data) return NextResponse.json({ error: "Timetable entry not found." }, { status: 404 });
  return NextResponse.json({ entry: data });
}

