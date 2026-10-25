"use client";

import { useCallback, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAppRouter } from "@/hooks/useAppRouter";
import { clearNotificationsForUser, getNotificationsForUser, markNotificationAsRead } from "@/services/notificationService";
import type { AppUser } from "@/types/user";

export default function AdventPayNotifications({ profile }: { profile: AppUser }) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const load = useCallback(() => getNotificationsForUser(profile.id), [profile.id]);
  const { data: notifications, isLoading, errorMessage, reload } = useAsyncData(load, [load]);
  const unread = useMemo(() => (notifications ?? []).filter((notification) => !notification.read), [notifications]);

  const markAllRead = useAsyncAction({
    action: () => clearNotificationsForUser(profile.id),
    successMessage: "All notifications marked as read.",
    onSuccess: reload,
  });

  const openNotification = useAsyncAction({
    action: async (id: string) => markNotificationAsRead(id),
    onSuccess: reload,
  });

  const visitNotification = (id: string, read: boolean, link?: string) => {
    if (!read) void openNotification.run(id);
    setOpen(false);
    if (link) router.push(link);
  };

  return <div className="relative shrink-0">
    <button
      type="button"
      onClick={() => setOpen((current) => !current)}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-slate-900"
      aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
      aria-expanded={open}
      aria-busy={isLoading || undefined}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread.length ? <span className="absolute right-0 top-0 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{unread.length > 99 ? "99+" : unread.length}</span> : null}
    </button>
    {open ? <>
      <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <section className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" aria-label="Notifications">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div><h2 className="font-semibold text-slate-950 dark:text-white">Notifications</h2><p className="text-xs text-slate-500 dark:text-slate-400">{unread.length ? `${unread.length} unread` : "You’re all caught up"}</p></div>
          {unread.length ? <Button variant="secondary" size="sm" loading={markAllRead.isLoading} loadingText="Marking…" onClick={() => void markAllRead.run()}><CheckCheck className="h-4 w-4" /> Mark all read</Button> : null}
        </div>
        <div className="max-h-[min(28rem,65vh)] space-y-2 overflow-y-auto p-3">
          {isLoading ? <StatusCard kind="loading" title="Loading notifications" description="Please wait a moment." /> : null}
          {errorMessage ? <StatusCard kind="error" title="Could not load notifications" description={errorMessage} actions={<Button variant="secondary" size="sm" onClick={reload}>Try again</Button>} /> : null}
          {markAllRead.status === "error" ? <StatusCard kind="error" title="Could not update notifications" description={markAllRead.errorMessage} /> : null}
          {!isLoading && !errorMessage && !notifications?.length ? <StatusCard kind="info" title="No notifications yet" description="Invoice and payment updates will appear here." /> : null}
          {notifications?.map((notification) => <button key={notification.id} type="button" disabled={openNotification.isLoading} onClick={() => visitNotification(notification.id, notification.read, notification.link)} className={`w-full rounded-lg border p-3 text-left transition ${notification.read ? "border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800" : "border-sky-200 bg-sky-50 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:hover:bg-sky-950/60"}`}>
            <span className="flex min-w-0 items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-sky-600"}`} aria-hidden="true" /><span className="min-w-0"><span className="block font-semibold text-slate-950 dark:text-white">{notification.title}</span><span className="mt-1 block break-words text-sm text-slate-600 dark:text-slate-300">{notification.message}</span></span></span>
          </button>)}
        </div>
      </section>
    </> : null}
  </div>;
}
