"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { UserRole } from "@/types/user";

interface SidebarProps {
  role: UserRole;
  mobileOpen?: boolean;
  onClose?: () => void;
}

const linkMap: Record<UserRole, Array<{ href: string; label: string }>> = {
  student: [
    { href: "/dashboard/student", label: "Overview" },
    { href: "/dashboard/student/my-courses", label: "My Courses" },
    { href: "/dashboard/student/live-classes", label: "Live Classes" },
    { href: "/dashboard/student/messages", label: "Messages" },
    { href: "/dashboard/student/announcements", label: "Announcements" },
    //{ href: "/dashboard/student/chat", label: "Chat with AI" },
     { href: "/tools", label: "useful tools" },
    { href: "/dashboard/student/report", label: "Report a Problem" },
    { href: "/dashboard/account", label: "Account" },
  ],
  teacher: [
    { href: "/dashboard/teacher", label: "Overview" },
    { href: "/dashboard/teacher/courses", label: "Courses" },
    { href: "/dashboard/teacher/courses/create", label: "Create Course" },
    { href: "/dashboard/teacher/live-classes", label: "Live Classes" },
    { href: "/dashboard/teacher/messages", label: "Messages" },
    { href: "/dashboard/teacher/announcements", label: "Announcements" },
   // { href: "/dashboard/teacher/chat", label: "Chat with AI" },
    { href: "/dashboard/teacher/report", label: "Report a Problem" },
    { href: "/dashboard/account", label: "Account" },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Overview" },
    { href: "/dashboard/admin/users", label: "Users" },
    { href: "/dashboard/admin/courses", label: "Courses" },
    { href: "/dashboard/admin/courses/create", label: "Create Course" },
    { href: "/dashboard/admin/designs", label: "Designs" },
    { href: "/dashboard/admin/designs/orders", label: "Design Orders" },
    { href: "/dashboard/admin/live-classes", label: "Live Classes" },
    { href: "/dashboard/admin/payments", label: "Payments" },
    { href: "/dashboard/admin/analytics", label: "Analytics" },
    { href: "/dashboard/admin/announcements", label: "Announcements" },
    { href: "/dashboard/admin/email-campaigns", label: "Email Campaigns" },
    { href: "/dashboard/admin/reports", label: "Reports" },
    //{ href: "/dashboard/admin/chat", label: "Chat with AI" },
    { href: "/dashboard/account", label: "Account" },
  ],
};

export default function Sidebar({ role, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const links = linkMap[role];

  return (
    <>
      <aside className="hidden w-64 shrink-0 self-start border-r border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <h2 className="mb-6 text-xl font-semibold text-slate-900">AdventSkool</h2>
        <nav className="space-y-2">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-blue-100 text-blue-700" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-label="Close menu"
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-slate-200 bg-white p-4">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">AdventSkool</h2>
              <button type="button" className="rounded-md border px-2 py-1 text-sm" onClick={onClose}>
                Close
              </button>
            </div>
            <nav className="space-y-2">
              {links.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-blue-100 text-blue-700" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
