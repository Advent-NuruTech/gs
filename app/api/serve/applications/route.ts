import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/api/requireUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServeApplicationStatus } from "@/lib/serve/types";

const statuses: ServeApplicationStatus[] = ["pending", "accepted", "declined"];

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (user.role !== "admin") return { response: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  return { user };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const fullName = cleanText(body?.full_name, 120);
  const email = cleanText(body?.email, 254).toLowerCase();
  const phone = cleanText(body?.phone, 32);
  const country = cleanText(body?.country, 100);
  const city = cleanText(body?.city, 120);
  const church = cleanText(body?.church, 160);
  const motivation = cleanText(body?.motivation, 1200);
  const website = cleanText(body?.website, 200);

  if (website) return NextResponse.json({ ok: true });
  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 7 || country.length < 2 || city.length < 2) {
    return NextResponse.json({ error: "Enter your name, a valid email address, phone number, country, and town or city." }, { status: 400 });
  }

  const { error } = await getSupabaseAdminClient()
    .from("serve_student_applications")
    .insert({ full_name: fullName, email, phone, country, city, church, motivation });

  if (error) return NextResponse.json({ error: "Your application could not be submitted. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const { data, error } = await getSupabaseAdminClient()
    .from("serve_student_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not load student applications." }, { status: 500 });
  return NextResponse.json({ applications: data });
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if ("response" in authorization) return authorization.response;

  const body = await request.json().catch(() => null);
  const id = cleanText(body?.id, 64);
  const status = body?.status;
  const fullName = cleanText(body?.full_name, 120);
  const email = cleanText(body?.email, 254).toLowerCase();
  const phone = cleanText(body?.phone, 32);
  const country = cleanText(body?.country, 100);
  const city = cleanText(body?.city, 120);

  if (!id || !statuses.includes(status) || fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 7) {
    return NextResponse.json({ error: "Check the applicant details and status, then try again." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("serve_student_applications")
    .update({
      full_name: fullName,
      email,
      phone,
      country,
      city,
      church: cleanText(body?.church, 160),
      motivation: cleanText(body?.motivation, 1200),
      admin_notes: cleanText(body?.admin_notes, 2000),
      status,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not update this application." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  return NextResponse.json({ application: data });
}
