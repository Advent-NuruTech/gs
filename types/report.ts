import { UserRole } from "@/types/user";

export type ReportStatus = "open" | "in_review" | "resolved";
export type ReportSeverity = "low" | "normal" | "high";

export interface Report {
  id: string;
  reporterId: string;
  reporterRole: UserRole;
  subject: string;
  message: string;
  severity: ReportSeverity;
  status: ReportStatus;
  adminNotes: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Joined reporter profile (when selected). */
  reporterName?: string;
  reporterEmail?: string;
}

export interface CreateReportInput {
  reporterId: string;
  reporterRole: UserRole;
  subject: string;
  message: string;
  severity?: ReportSeverity;
}
