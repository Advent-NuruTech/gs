"use client";

import { FormEvent, useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncementsForUser,
} from "@/services/announcementService";
import { Announcement, AnnouncementAudience } from "@/types/announcement";

const AUDIENCE_OPTIONS: Array<{ value: AnnouncementAudience; label: string }> = [
  { value: "all", label: "General — everyone" },
  { value: "teachers", label: "Teachers only" },
  { value: "students", label: "Students only" },
];

export default function AnnouncementComposer() {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [submitting, setSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = async () => {
    if (!profile) return;
    const rows = await listAnnouncementsForUser(profile.id);
    setAnnouncements(rows);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || submitting) return;
    setSubmitting(true);
    try {
      await createAnnouncement({ authorId: profile.id, title, body, audience });
      pushToast("Announcement published.", "success");
      setTitle("");
      setBody("");
      setAudience("all");
      await reload();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not publish.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
        <p className="mt-1 text-sm text-slate-600">
          Broadcast a notice to everyone, only teachers, or only students.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Announcement title"
          required
        />
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Audience
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value as AnnouncementAudience)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Message
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your announcement..."
            rows={5}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 transition focus:ring-2"
          />
        </label>
        <Button type="submit" disabled={submitting || !title.trim() || !body.trim()}>
          {submitting ? "Publishing..." : "Publish Announcement"}
        </Button>
      </form>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">Published</h3>
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-600">Nothing published yet.</p>
        ) : (
          announcements.map((item) => (
            <article key={item.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                  {item.audience}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  onClick={async () => {
                    setDeletingId(item.id);
                    try {
                      await deleteAnnouncement(item.id);
                      setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
                    } catch (error) {
                      pushToast(error instanceof Error ? error.message : "Could not delete.", "error");
                    } finally {
                      setDeletingId(null);
                    }
                  }}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
