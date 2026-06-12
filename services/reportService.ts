import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CreateReportInput, Report, ReportStatus } from "@/types/report";
import { UserRole } from "@/types/user";

const supabase = getSupabaseBrowserClient();

function mapReport(data: Record<string, unknown>): Report {
  const reporter = (data.reporter as Record<string, unknown> | null) ?? null;
  return {
    id: String(data.id ?? ""),
    reporterId: String(data.reporter_id ?? ""),
    reporterRole: (data.reporter_role as UserRole) ?? "student",
    subject: String(data.subject ?? ""),
    message: String(data.message ?? ""),
    severity: (data.severity as Report["severity"]) ?? "normal",
    status: (data.status as ReportStatus) ?? "open",
    adminNotes: String(data.admin_notes ?? ""),
    resolvedBy: data.resolved_by ? String(data.resolved_by) : undefined,
    resolvedAt: data.resolved_at ? String(data.resolved_at) : undefined,
    createdAt: data.created_at ? String(data.created_at) : undefined,
    updatedAt: data.updated_at ? String(data.updated_at) : undefined,
    reporterName: reporter ? String(reporter.full_name ?? "") : undefined,
    reporterEmail: reporter ? String(reporter.email ?? "") : undefined,
  };
}

export async function createReport(input: CreateReportInput): Promise<string> {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: input.reporterId,
      reporter_role: input.reporterRole,
      subject: input.subject,
      message: input.message,
      severity: input.severity ?? "normal",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not submit report.");
  return String(data.id);
}

/** Reports raised by a single user (their own history). */
export async function listReportsByReporter(reporterId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("reporter_id", reporterId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReport);
}

/** Admin inbox — all reports with the reporter profile joined. */
export async function listAllReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReport);
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  resolvedBy?: string,
): Promise<void> {
  const payload: Record<string, unknown> = { status };
  if (status === "resolved") {
    payload.resolved_at = new Date().toISOString();
    if (resolvedBy) payload.resolved_by = resolvedBy;
  }
  const { error } = await supabase.from("reports").update(payload).eq("id", reportId);
  if (error) throw new Error(error.message);
}

export async function saveReportNotes(reportId: string, adminNotes: string): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({ admin_notes: adminNotes })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
}
