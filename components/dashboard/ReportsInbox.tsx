"use client";

import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import {
  listAllReports,
  saveReportNotes,
  updateReportStatus,
} from "@/services/reportService";
import { Report, ReportStatus } from "@/types/report";

const STATUS_FILTERS: Array<{ value: ReportStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
];

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  normal: "bg-slate-100 text-slate-700",
  low: "bg-slate-100 text-slate-500",
};

export default function ReportsInbox() {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | "all">("all");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await listAllReports();
        if (active) setReports(rows);
      } catch (error) {
        if (active) pushToast(error instanceof Error ? error.message : "Could not load reports.", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [pushToast]);

  const visible = useMemo(
    () => (filter === "all" ? reports : reports.filter((r) => r.status === filter)),
    [reports, filter],
  );

  const openCount = useMemo(() => reports.filter((r) => r.status !== "resolved").length, [reports]);

  const setStatus = async (report: Report, status: ReportStatus) => {
    setBusyId(report.id);
    try {
      await updateReportStatus(report.id, status, profile?.id);
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status } : r)));
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not update status.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const saveNotes = async (report: Report) => {
    const notes = notesDraft[report.id] ?? report.adminNotes;
    setBusyId(report.id);
    try {
      await saveReportNotes(report.id, notes);
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, adminNotes: notes } : r)));
      pushToast("Notes saved.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save notes.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
        <p className="mt-1 text-sm text-slate-600">
          Problems reported by students and teachers. {openCount} unresolved.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                filter === option.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading reports...</p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No reports in this view.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((report) => (
            <article key={report.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{report.subject}</p>
                  <p className="text-xs text-slate-500">
                    {report.reporterName || report.reporterEmail || "Unknown"} ·{" "}
                    <span className="capitalize">{report.reporterRole}</span>
                    {report.createdAt ? ` · ${new Date(report.createdAt).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      SEVERITY_STYLES[report.severity] ?? SEVERITY_STYLES.normal
                    }`}
                  >
                    {report.severity}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">
                    {report.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm text-slate-700">{report.message}</p>

              <textarea
                value={notesDraft[report.id] ?? report.adminNotes}
                onChange={(event) =>
                  setNotesDraft((prev) => ({ ...prev, [report.id]: event.target.value }))
                }
                placeholder="Internal / reply notes (visible to the reporter)"
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => saveNotes(report)} disabled={busyId === report.id}>
                  Save Notes
                </Button>
                {report.status !== "in_review" ? (
                  <Button type="button" variant="secondary" onClick={() => setStatus(report, "in_review")} disabled={busyId === report.id}>
                    Mark In Review
                  </Button>
                ) : null}
                {report.status !== "resolved" ? (
                  <Button type="button" onClick={() => setStatus(report, "resolved")} disabled={busyId === report.id}>
                    Resolve
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => setStatus(report, "open")} disabled={busyId === report.id}>
                    Reopen
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
