"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  CircleUser,
  ClipboardCheck,
  CreditCard,
  FileText,
  Flag,
  GraduationCap,
  House,
  KeyRound,
  LayoutDashboard,
  Library,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
  PlusCircle,
  ShoppingBag,
  Video,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

import { UserRole } from "@/types/user";

interface SidebarProps {
  role: UserRole;
  mobileOpen?: boolean;
  onClose?: () => void;
}

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const publicLinks: NavLink[] = [
  { href: "/", label: "Public Home", icon: House },
  { href: "/courses", label: "Browse Courses", icon: BookOpen },
  { href: "/designs", label: "Browse Digital Products", icon: Package },
];

const linkMap: Record<UserRole, NavLink[]> = {
  student: [
    { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/student/my-courses", label: "My Courses", icon: GraduationCap },
    { href: "/dashboard/products", label: "My Digital Products", icon: Library },
    { href: "/dashboard/student/live-classes", label: "Live Classes", icon: Video },
    { href: "/dashboard/student/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/student/announcements", label: "Announcements", icon: Megaphone },
    //{ href: "/dashboard/student/chat", label: "Chat with AI" },
    { href: "/tools", label: "Useful Tools", icon: Wrench },
    { href: "/dashboard/student/report", label: "Report a Problem", icon: Flag },
    { href: "/dashboard/account", label: "Account", icon: CircleUser },
    ...publicLinks,
  ],
  teacher: [
    { href: "/dashboard/teacher", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/teacher/courses", label: "Courses", icon: BookOpen },
    { href: "/dashboard/teacher/payouts", label: "Payout Details", icon: Wallet },
    { href: "/dashboard/teacher/courses/create", label: "Create Course", icon: PlusCircle },
    { href: "/dashboard/products", label: "My Digital Products", icon: Library },
    { href: "/dashboard/teacher/live-classes", label: "Live Classes", icon: Video },
    { href: "/dashboard/teacher/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/teacher/announcements", label: "Announcements", icon: Megaphone },
    // { href: "/dashboard/teacher/chat", label: "Chat with AI" },
    { href: "/dashboard/teacher/report", label: "Report a Problem", icon: Flag },
    { href: "/dashboard/account", label: "Account", icon: CircleUser },
    ...publicLinks,
  ],
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Users", icon: CircleUser },
    { href: "/dashboard/admin/creator-applications", label: "Creator Applications", icon: ClipboardCheck },
    { href: "/dashboard/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/dashboard/admin/courses/create", label: "Create Course", icon: PlusCircle },
    { href: "/dashboard/admin/designs", label: "Digital Products", icon: Package },
    { href: "/dashboard/admin/designs/orders", label: "Product Orders", icon: ShoppingBag },
    { href: "/dashboard/products", label: "My Digital Products", icon: Library },
    { href: "/dashboard/admin/live-classes", label: "Live Classes", icon: Video },
    { href: "/dashboard/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/admin/creator-payouts", label: "Creator Payouts", icon: Wallet },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/dashboard/admin/email-campaigns", label: "Email Campaigns", icon: Mail },
    { href: "/dashboard/admin/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/admin/auth-settings", label: "Auth Settings", icon: KeyRound },
    { href: "/dashboard/admin/documentation", label: "Documentation", icon: BookMarked },
    //{ href: "/dashboard/admin/chat", label: "Chat with AI" },
    { href: "/dashboard/account", label: "Account", icon: CircleUser },
    ...publicLinks,
  ],
};

const linkClasses = (active: boolean) =>
  `flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    active ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
  }`;

export default function Sidebar({ role, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const links = linkMap[role];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderLinks = () =>
    links.map((link) => {
      const active = isActive(link.href);
      return (
        <Link key={link.href} href={link.href} className={linkClasses(active)} aria-current={active ? "page" : undefined}>
          <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{link.label}</span>
        </Link>
      );
    });

  return (
    <>
      <aside className="hidden w-64 shrink-0 self-start border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">AdventSkool</h2>
        <nav className="space-y-1">{renderLinks()}</nav>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-label="Close menu"
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-xl font-semibold text-slate-900 dark:text-white">AdventSkool</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Close
              </button>
            </div>
            <nav className="space-y-1">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link key={link.href} href={link.href} onClick={onClose} className={linkClasses(active)} aria-current={active ? "page" : undefined}>
                    <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{link.label}</span>
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
