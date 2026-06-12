"use client";

import { FormEvent, useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { createReport, listReportsByReporter } from "@/services/reportService";
import { Report, ReportSeverity, ReportStatus } from "@/types/report";

const STATUS_STYLES: Record<ReportStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  in_review: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
};

export default function ReportProblemForm() {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [subject, setSubject] = useState("");
  const [severity, setSeverity] = useState<ReportSeverity>("normal");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      try {
        const rows = await listReportsByReporter(profile.id);
        if (active) setReports(rows);
      } catch {
        // History is non-critical; the form still works.
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || submitting) return;
    setSubmitting(true);
    try {
      await createReport({
        reporterId: profile.id,
        reporterRole: profile.role,
        subject,
        message,
        severity,
      });
      pushToast("Report sent to the admin team.", "success");
      setSubject("");
      setMessage("");
      setSeverity("normal");
      const rows = await listReportsByReporter(profile.id);
      setReports(rows);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not submit report.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-bold text-slate-900">Report a Problem</h2>
        <p className="mt-1 text-sm text-slate-600">
          Found a bug or something not working? Send it to the admin team and track its status here.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <Input
          label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Short summary of the problem"
          required
        />
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Severity
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as ReportSeverity)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="low">Low — minor annoyance</option>
            <option value="normal">Normal — affects my work</option>
            <option value="high">High — I&apos;m blocked</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Details
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What happened? What did you expect? Steps to reproduce..."
            rows={6}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
          />
        </label>
        <Button type="submit" disabled={submitting || !subject.trim() || !message.trim()}>
          {submitting ? "Sending..." : "Submit Report"}
        </Button>
      </form>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">Your Reports</h3>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-600">You haven&apos;t reported anything yet.</p>
        ) : (
          reports.map((report) => (
            <article key={report.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{report.subject}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[report.status]}`}
                >
                  {STATUS_LABEL[report.status]}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{report.message}</p>
              {report.adminNotes ? (
                <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-700">
                  <span className="font-semibold">Admin: </span>
                  {report.adminNotes}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
