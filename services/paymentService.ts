import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { InitializePaymentInput, Payment } from "@/types/payment";

const supabase = getSupabaseBrowserClient();

function mapPayment(data: Record<string, unknown>): Payment {
  return {
    id: String(data.id ?? ""),
    userId: String(data.user_id ?? ""),
    courseId: String(data.course_id ?? ""),
    courseTitle: data.course_title ? String(data.course_title) : undefined,
    planType: (data.plan_type as Payment["planType"]) ?? "full",
    lessonIds: (data.lesson_ids as string[]) ?? [],
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "KES"),
    paystackReference: String(data.paystack_reference ?? ""),
    status: (data.status as Payment["status"]) ?? "pending",
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    fullName: String(data.full_name ?? ""),
    paidAt: data.paid_at ? String(data.paid_at) : undefined,
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  };
}

/**
 * Starts a Paystack checkout. The server recomputes the amount, creates the
 * pending payment record, and returns the hosted checkout URL.
 */
export async function initializePayment(
  input: InitializePaymentInput,
): Promise<{ authorizationUrl: string; reference: string; amount: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in to continue.");

  const response = await fetch("/api/paystack/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as {
    authorizationUrl?: string;
    reference?: string;
    amount?: number;
    error?: string;
  };
  if (!response.ok || !payload.authorizationUrl) {
    throw new Error(payload.error ?? "Could not start payment.");
  }
  return {
    authorizationUrl: payload.authorizationUrl,
    reference: payload.reference ?? "",
    amount: payload.amount ?? 0,
  };
}

/**
 * Cancels a pending payment draft. The server verifies ownership + pending
 * state, marks it cancelled, and notifies the student (in-app + SMS).
 */
export async function cancelPayment(reference: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in to continue.");

  const response = await fetch("/api/payments/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reference }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Could not cancel payment.");
  }
}

/** Verifies a transaction after redirect (also handled by webhook). */
export async function verifyPayment(reference: string): Promise<{
  ok: boolean;
  status: string;
  courseId?: string;
  amount?: number;
  unlockedLessonIds?: string[];
}> {
  const response = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
  const payload = await response.json();
  return payload;
}

export async function getUserPaymentForCourse(
  userId: string,
  courseId: string,
): Promise<Payment | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPayment(data) : null;
}

export async function listUserPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPayment);
}

export async function listPayments(status?: Payment["status"]): Promise<Payment[]> {
  let queryBuilder = supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) queryBuilder = queryBuilder.eq("status", status);
  const { data, error } = await queryBuilder;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPayment);
}
