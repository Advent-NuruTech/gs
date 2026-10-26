"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, LayoutDashboard, Store, type LucideIcon } from "lucide-react";

import { AppUser } from "@/types/user";

type FooterLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function isActive(pathname: string, href: string) {
  return href === "/dashboard/teacher" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Keeps the three most important creator destinations within thumb reach on
 * phones, leaving the header free to show who is signed in.
 */
export default function MobileDashboardFooter({ profile }: { profile: AppUser }) {
  const pathname = usePathname();
  const overviewHref = `/dashboard/${profile.role}`;
  const storefrontHref = profile.role === "teacher"
    ? profile.handle
      ? `/@${profile.handle}`
      : "/dashboard/teacher/storefront"
    : profile.role === "admin"
      ? "/dashboard/admin/users"
      : "/dashboard/products";
  const storefrontLabel = profile.role === "teacher" ? "My store" : profile.role === "admin" ? "Users" : "Library";

  const links: FooterLink[] = [
    { href: overviewHref, label: "Dashboard", icon: LayoutDashboard },
    { href: storefrontHref, label: storefrontLabel, icon: Store },
    { href: "/dashboard/account", label: "Account", icon: CircleUser },
  ];

  return (
    <nav
      aria-label="Mobile dashboard navigation"
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_14px_38px_rgba(15,23,42,0.22)] backdrop-blur dark:border-slate-700/90 dark:bg-slate-950/95 lg:hidden"
    >
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="max-w-full truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
