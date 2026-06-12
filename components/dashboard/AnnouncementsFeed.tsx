"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  listAnnouncementsForUser,
  markAllAnnouncementsRead,
} from "@/services/announcementService";
import { Announcement } from "@/types/announcement";

const AUDIENCE_LABEL: Record<Announcement["audience"], string> = {
  all: "Everyone",
  teachers: "Teachers",
  students: "Students",
};

export default function AnnouncementsFeed() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      try {
        const rows = await listAnnouncementsForUser(profile.id);
        if (!active) return;
        setAnnouncements(rows);
        // Opening the feed marks everything as read.
        const unread = rows.filter((row) => !row.read).map((row) => row.id);
        if (unread.length > 0) {
          await markAllAnnouncementsRead(unread, profile.id);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
        <p className="mt-1 text-sm text-slate-600">Updates and notices from the AdventSkool team.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No announcements yet.
        </p>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <article
              key={item.id}
              className={`rounded-lg border bg-white p-4 ${
                item.read ? "border-slate-200" : "border-blue-300 bg-blue-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {AUDIENCE_LABEL[item.audience]}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.body}</p>
              {item.createdAt ? (
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
