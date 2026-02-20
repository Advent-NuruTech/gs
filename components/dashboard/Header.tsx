"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  getNotificationsForUser,
  markNotificationAsRead,
} from "@/services/notificationService";
import { NotificationItem } from "@/types/notification";

interface HeaderProps {
  onMenuClick?: () => void;
}

const ADMIN_SEARCH_LINKS: Array<{ label: string; href: string; keywords: string[] }> = [
  { label: "Admin Overview", href: "/dashboard/admin", keywords: ["overview", "home", "dashboard"] },
  { label: "Users", href: "/dashboard/admin/users", keywords: ["users", "students", "teachers", "admins"] },
  { label: "Courses", href: "/dashboard/admin/courses", keywords: ["courses", "course list", "publish"] },
  { label: "Create Course", href: "/dashboard/admin/courses/create", keywords: ["create course", "new course"] },
  { label: "Payments", href: "/dashboard/admin/payments", keywords: ["payments", "payment", "approve", "checkout"] },
  { label: "Analytics", href: "/dashboard/admin/analytics", keywords: ["analytics", "stats", "progress"] },
];

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;

    let active = true;
    (async () => {
      const rows = await getNotificationsForUser(profile.id);
      if (active) {
        setNotifications(rows);
      }
    })();

    return () => {
      active = false;
    };
  }, [profile]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const filteredAdminLinks = useMemo(() => {
    if (profile?.role !== "admin") return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ADMIN_SEARCH_LINKS;
    return ADMIN_SEARCH_LINKS.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.keywords.some((keyword) => keyword.toLowerCase().includes(query))
      );
    });
  }, [profile?.role, searchQuery]);

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        if (profile) {
          const rows = await getNotificationsForUser(profile.id);
          setNotifications(rows);
        }
      } catch {
        // Keep navigation responsive even if read-state update fails.
      }
    }
    setIsNotificationOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 lg:hidden"
        >
          Menu
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{profile?.role ?? "guest"}</p>
          <h1 className="text-lg font-semibold text-slate-900">{profile?.displayName ?? "Dashboard"}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {profile?.role === "admin" ? (
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Global search..."
              className="w-44 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
            />
            {searchQuery.trim() ? (
              <div className="absolute right-0 top-11 z-20 w-72 max-w-[85vw] space-y-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                {filteredAdminLinks.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-slate-600">No result found.</p>
                ) : (
                  filteredAdminLinks.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        router.push(item.href);
                        setSearchQuery("");
                      }}
                      className="block w-full rounded px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      {item.label}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            aria-label={`Notifications with ${unreadCount} unread`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-700" fill="none" aria-hidden="true">
              <path
                d="M15 17H5.2a1 1 0 0 1-.8-1.6l1.3-1.8V10a6 6 0 1 1 12 0v3.6l1.3 1.8a1 1 0 0 1-.8 1.6H15Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span>Notifications</span>
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
              {unreadCount}
            </span>
          </button>
          {isNotificationOpen ? (
            <div className="absolute right-0 top-11 z-20 w-80 max-w-[88vw] space-y-2 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-600">No notifications.</p>
              ) : (
                notifications.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`block w-full rounded border p-2 text-left text-sm ${
                      item.read ? "border-slate-100 bg-slate-50" : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-slate-600">{item.message}</p>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
