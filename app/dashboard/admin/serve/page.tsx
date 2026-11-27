"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageSkeleton from "@/components/ui/PageSkeleton";
import RichTextEditor from "@/components/ui/RichTextEditor";
import StatusCard from "@/components/ui/StatusCard";
import ServeGalleryManager from "./ServeGalleryManager";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import type { ServeApplication, ServeApplicationStatus, ServeTimetableEntry } from "@/lib/serve/types";

type ApplicationDraft = Omit<ServeApplication, "created_at" | "updated_at">;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "The request could not be completed.");
  return payload as T;
}

function TimetableEntryEditor({
  entry,
  onSaved,
}: {
  entry: ServeTimetableEntry;
  onSaved: (entry: ServeTimetableEntry) => void;
}) {
  const [draft, setDraft] = useState(entry);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const update = (key: keyof ServeTimetableEntry, value: string | boolean | number | null) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await requestJson<{ entry: ServeTimetableEntry }>("/api/serve/timetable", {
        method: "PATCH",
        body: JSON.stringify({
          id: draft.id,
          study_number: Number(draft.study_number),
          title: draft.title,
          description: draft.description,
          session_date: draft.session_date ?? "",
          start_time: draft.start_time?.slice(0, 5) ?? "",
          published: draft.published,
        }),
      });
      setDraft(result.entry);
      onSaved(result.entry);
      setFeedback({ kind: "success", message: "Saved. The public timetable is updating now." });
    } catch (caught) {
      setFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "Could not save this timetable entry." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      {feedback ? <StatusCard kind={feedback.kind} title={feedback.message} /> : null}
      <div className="grid gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
        <Input label="Study #" type="number" min={1} max={200} required value={draft.study_number} onChange={(event) => update("study_number", Number(event.target.value))} />
        <Input label="Study title" required maxLength={160} value={draft.title} onChange={(event) => update("title", event.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Date (optional)" type="date" value={draft.session_date ?? ""} onChange={(event) => update("session_date", event.target.value || null)} />
        <Input label="Start time (optional)" type="time" value={draft.start_time?.slice(0, 5) ?? ""} onChange={(event) => update("start_time", event.target.value || null)} />
      </div>
      <div className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
        <p>Description (optional)</p>
        <RichTextEditor
          value={draft.description}
          onChange={(value) => update("description", value)}
          placeholder=""
          ariaLabel={`Description for ${draft.title}`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-blue-600" />
          Visible on public timetable
        </label>
        <Button type="submit" loading={saving} loadingText="Saving..." size="sm">Save study</Button>
      </div>
    </form>
  );
}

export default function ServeAdminPage() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const [applications, setApplications] = useState<ServeApplication[]>([]);
  const [timetable, setTimetable] = useState<ServeTimetableEntry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingApplication, setSavingApplication] = useState(false);
  const [applicationFeedback, setApplicationFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [newEntry, setNewEntry] = useState({ study_number: 41, title: "", description: "", session_date: "", start_time: "", published: true });
  const [addingEntry, setAddingEntry] = useState(false);
  const [timetableFeedback, setTimetableFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [applicationResult, timetableResult] = await Promise.all([
        requestJson<{ applications: ServeApplication[] }>("/api/serve/applications"),
        requestJson<{ timetable: ServeTimetableEntry[] }>("/api/serve/timetable"),
      ]);
      setApplications(applicationResult.applications);
      setTimetable(timetableResult.timetable);
      setNewEntry((current) => ({
        ...current,
        study_number: Math.max(0, ...timetableResult.timetable.map((entry) => entry.study_number)) + 1,
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load SERVE management.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [isAllowed, reload]);

  const chooseApplication = (application: ServeApplication) => {
    setSelectedId(application.id);
    setDraft({
      id: application.id,
      full_name: application.full_name,
      email: application.email,
      phone: application.phone,
      country: application.country,
      city: application.city,
      church: application.church,
      motivation: application.motivation,
      status: application.status,
      admin_notes: application.admin_notes,
    });
    setApplicationFeedback(null);
  };

  const saveApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || savingApplication) return;
    setSavingApplication(true);
    setApplicationFeedback(null);
    try {
      const result = await requestJson<{ application: ServeApplication }>("/api/serve/applications", {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setApplications((current) => current.map((item) => item.id === result.application.id ? result.application : item));
      chooseApplication(result.application);
      setApplicationFeedback({ kind: "success", message: "Student application updated." });
    } catch (caught) {
      setApplicationFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "Could not update this application." });
    } finally {
      setSavingApplication(false);
    }
  };

  const addTimetableEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addingEntry) return;
    setAddingEntry(true);
    setTimetableFeedback(null);
    try {
      const result = await requestJson<{ entry: ServeTimetableEntry }>("/api/serve/timetable", {
        method: "POST",
        body: JSON.stringify(newEntry),
      });
      setTimetable((current) => [...current, result.entry].sort((a, b) => a.study_number - b.study_number));
      setNewEntry({
        study_number: Math.max(newEntry.study_number, result.entry.study_number, ...timetable.map((entry) => entry.study_number)) + 1,
        title: "",
        description: "",
        session_date: "",
        start_time: "",
        published: true,
      });
      setTimetableFeedback({ kind: "success", message: "Study added. It will appear on the public timetable." });
    } catch (caught) {
      setTimetableFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "Could not add this study." });
    } finally {
      setAddingEntry(false);
    }
  };

  if (guardLoading || !isAllowed || loading) return <PageSkeleton label="Loading SERVE management" variant="cards" />;
  if (error) return <StatusCard kind="error" title="SERVE management could not be loaded" description={error} actions={<Button onClick={() => void reload()}>Retry</Button>} />;

  const pendingCount = applications.filter((application) => application.status === "pending").length;

  return (
    <section className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-700 dark:text-blue-300">SERVE* If Saved</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Applications & timetable</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Review student registrations and manage the public 40-study learning path.</p>
        </div>
        <Link href="/serve" target="_blank" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          View public SERVE page
        </Link>
      </header>

      <section className="space-y-4" aria-labelledby="serve-applications-heading">
        <div>
          <h2 id="serve-applications-heading" className="text-xl font-bold text-slate-950 dark:text-white">Student applications</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{applications.length} received · {pendingCount} pending review</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.85fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {applications.length ? (
              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {applications.map((application) => (
                  <li key={application.id}>
                    <button
                      type="button"
                      onClick={() => chooseApplication(application)}
                      aria-pressed={selectedId === application.id}
                      className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left hover:bg-slate-50 aria-pressed:bg-blue-50 dark:hover:bg-slate-800 dark:aria-pressed:bg-slate-800"
                    >
                      <span className="min-w-0">
                        <span className="block break-words font-semibold text-slate-950 dark:text-white">{application.full_name}</span>
                        <span className="block break-all text-sm text-slate-600 dark:text-slate-300">{application.email}</span>
                        <span className="mt-1 block break-words text-xs text-slate-500 dark:text-slate-400">
                          {[application.city, application.country].filter(Boolean).join(", ") || "Location not provided"}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{new Date(application.created_at).toLocaleDateString()}</span>
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${application.status === "pending" ? "bg-amber-100 text-amber-900" : application.status === "accepted" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
                        {application.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="p-4"><StatusCard kind="info" title="No student applications yet" description="New public registrations will appear here." /></div>
            )}
          </div>

          {draft ? (
            <form onSubmit={saveApplication} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-950 dark:text-white">Edit application</h3>
                <button type="button" onClick={() => { setSelectedId(""); setDraft(null); }} className="text-sm font-semibold text-slate-600 hover:text-blue-700 dark:text-slate-300">Close</button>
              </div>
              {applicationFeedback ? <StatusCard kind={applicationFeedback.kind} title={applicationFeedback.message} /> : null}
              <Input label="Full name" required minLength={2} maxLength={120} value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} />
              <Input label="Email" type="email" required maxLength={254} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              <Input label="Phone" type="tel" required minLength={7} maxLength={32} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              <Input label="Country" maxLength={100} value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })} />
              <Input label="Town or city" maxLength={120} value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
              <Input label="Church or fellowship" maxLength={160} value={draft.church} onChange={(event) => setDraft({ ...draft, church: event.target.value })} />
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                Applicant&apos;s learning goals
                <textarea rows={3} maxLength={1200} value={draft.motivation} onChange={(event) => setDraft({ ...draft, motivation: event.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                Application status
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ServeApplicationStatus })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                Private admin notes
                <textarea rows={3} maxLength={2000} value={draft.admin_notes} onChange={(event) => setDraft({ ...draft, admin_notes: event.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <Button type="submit" loading={savingApplication} loadingText="Saving...">Save application</Button>
            </form>
          ) : (
            <StatusCard kind="info" title="Select an application" description="Applicant details and editing controls will appear here." />
          )}
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="serve-timetable-heading">
        <div>
          <h2 id="serve-timetable-heading" className="text-xl font-bold text-slate-950 dark:text-white">Public timetable</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Updates are published live to the public timetable. Uncheck visibility to hide a study without deleting it.</p>
        </div>
        {timetableFeedback ? <StatusCard kind={timetableFeedback.kind} title={timetableFeedback.message} /> : null}
        <form onSubmit={addTimetableEntry} className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:grid-cols-2 lg:grid-cols-[6rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input label="Study #" type="number" min={1} max={200} required value={newEntry.study_number} onChange={(event) => setNewEntry({ ...newEntry, study_number: Number(event.target.value) })} />
          <Input label="New study title" required maxLength={160} value={newEntry.title} onChange={(event) => setNewEntry({ ...newEntry, title: event.target.value })} />
          <Input label="Date (optional)" type="date" value={newEntry.session_date} onChange={(event) => setNewEntry({ ...newEntry, session_date: event.target.value })} />
          <Input label="Time (optional)" type="time" value={newEntry.start_time} onChange={(event) => setNewEntry({ ...newEntry, start_time: event.target.value })} />
          <div className="flex items-end"><Button type="submit" loading={addingEntry} loadingText="Adding..." className="w-full">Add study</Button></div>
          <div className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2 lg:col-span-full">
            <p>Study description (optional)</p>
            <RichTextEditor
              value={newEntry.description}
              onChange={(description) => setNewEntry((current) => ({ ...current, description }))}
              placeholder=""
              ariaLabel="New study description"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 lg:col-span-full">
            <input type="checkbox" checked={newEntry.published} onChange={(event) => setNewEntry({ ...newEntry, published: event.target.checked })} className="h-4 w-4 accent-blue-600" />
            Publish this study immediately
          </label>
        </form>
        <div className="grid gap-3">
          {timetable.map((entry) => (
            <TimetableEntryEditor
              key={entry.id}
              entry={entry}
              onSaved={(updated) => setTimetable((current) => current.map((item) => item.id === updated.id ? updated : item).sort((a, b) => a.study_number - b.study_number))}
            />
          ))}
        </div>
      </section>

      <ServeGalleryManager />
    </section>
  );
}
