"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  ChevronDown,
  CircleUser,
  ClipboardCheck,
  CreditCard,
  FileText,
  Flag,
  GraduationCap,
  Globe2,
  House,
  Images,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
  PlusCircle,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  TrendingUp,
  Video,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

import { UserRole } from "@/types/user";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { getWealthPublicNavigationEnabled } from "@/services/wealthSettingsService";
import { useEffect, useMemo, useState } from "react";

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

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  links: NavLink[];
}

type NavItem = NavLink | NavGroup;

const isNavGroup = (item: NavItem): item is NavGroup => "links" in item;

const publicLinks: NavLink[] = [
  { href: "/", label: "Public Home", icon: House },
  { href: "/courses", label: "Browse Courses", icon: BookOpen },
  { href: "/designs", label: "Browse Digital Products", icon: Package },
  { href: "/wealth", label: "Browse Wealth Academy", icon: TrendingUp },
];

const linkMap: Record<UserRole, NavItem[]> = {
  student: [
    { href: "/dashboard/student", label: "Overview", icon: LayoutDashboard },
    {
      id: "student-products",
      label: "My Products",
      icon: Package,
      links: [
        { href: "/dashboard/student/my-courses", label: "My Courses", icon: GraduationCap },
        { href: "/dashboard/products", label: "My Digital Products", icon: Library },
        { href: "/dashboard/wealth", label: "My Wealth Resources", icon: TrendingUp },
        { href: "/dashboard/teacher/wealth", label: "Create Wealth Products", icon: PlusCircle },
      ],
    },
    {
      id: "student-learning",
      label: "Classes & Updates",
      icon: Video,
      links: [
        { href: "/dashboard/student/live-classes", label: "Live Classes", icon: Video },
        { href: "/dashboard/student/messages", label: "Messages", icon: MessageSquare },
        { href: "/dashboard/student/announcements", label: "Announcements", icon: Megaphone },
        //{ href: "/dashboard/student/chat", label: "Chat with AI" },
      ],
    },
    {
      id: "student-support",
      label: "Help & Tools",
      icon: Wrench,
      links: [
        { href: "/tools", label: "Useful Tools", icon: Wrench },
        { href: "/dashboard/student/report", label: "Report a Problem", icon: Flag },
      ],
    },
    {
      id: "student-settings",
      label: "Settings",
      icon: SlidersHorizontal,
      links: [
        { href: "/adventpay/dashboard", label: "AdventPay", icon: CreditCard },
        { href: "/dashboard/account", label: "Account", icon: CircleUser },
      ],
    },
    { id: "student-explore", label: "Explore", icon: Globe2, links: publicLinks },
  ],
  teacher: [
    { href: "/dashboard/teacher", label: "Overview", icon: LayoutDashboard },
    {
      id: "teacher-products",
      label: "Products",
      icon: Package,
      links: [
        { href: "/dashboard/teacher/storefront", label: "My Storefront", icon: Store },
        { href: "/dashboard/teacher/courses", label: "Courses", icon: BookOpen },
        { href: "/dashboard/teacher/designs/create", label: "Create Digital Product", icon: PlusCircle },
        { href: "/dashboard/products", label: "My Digital Products", icon: Library },
        { href: "/dashboard/wealth", label: "My Wealth Resources", icon: TrendingUp },
      ],
    },
    {
      id: "teacher-orders",
      label: "Orders & Payouts",
      icon: ShoppingBag,
      links: [{ href: "/dashboard/teacher/payouts", label: "Payout Details", icon: Wallet }],
    },
    {
      id: "teacher-workspace",
      label: "Classes & Updates",
      icon: Video,
      links: [
        { href: "/dashboard/teacher/live-classes", label: "Live Classes", icon: Video },
        { href: "/dashboard/teacher/messages", label: "Messages", icon: MessageSquare },
        { href: "/dashboard/teacher/announcements", label: "Announcements", icon: Megaphone },
        // { href: "/dashboard/teacher/chat", label: "Chat with AI" },
      ],
    },
    {
      id: "teacher-support",
      label: "Help & Tools",
      icon: Wrench,
      links: [{ href: "/dashboard/teacher/report", label: "Report a Problem", icon: Flag }],
    },
    {
      id: "teacher-settings",
      label: "Settings",
      icon: SlidersHorizontal,
      links: [
        { href: "/adventpay/dashboard", label: "AdventPay", icon: CreditCard },
        { href: "/dashboard/account", label: "Account", icon: CircleUser },
      ],
    },
    { id: "teacher-explore", label: "Explore", icon: Globe2, links: publicLinks },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    {
      id: "admin-users",
      label: "Users",
      icon: CircleUser,
      links: [
        { href: "/dashboard/admin/users", label: "All Users", icon: CircleUser },
        { href: "/dashboard/admin/creator-applications", label: "Creator Applications", icon: ClipboardCheck },
        { href: "/dashboard/admin/creator-domains", label: "Creator Domains", icon: Globe2 },
      ],
    },
    {
      id: "admin-products",
      label: "Products",
      icon: Package,
      links: [
        { href: "/dashboard/admin/courses", label: "Courses", icon: BookOpen },
        { href: "/dashboard/admin/courses/create", label: "Create Course", icon: PlusCircle },
        { href: "/dashboard/admin/designs", label: "Digital Products", icon: Package },
        { href: "/dashboard/admin/wealth", label: "Wealth Academy", icon: TrendingUp },
        { href: "/dashboard/products", label: "My Digital Products", icon: Library },
        { href: "/dashboard/wealth", label: "My Wealth Resources", icon: TrendingUp },
      ],
    },
    {
      id: "admin-orders",
      label: "Orders",
      icon: ShoppingBag,
      links: [
        { href: "/dashboard/admin/designs/orders", label: "Product Orders", icon: ShoppingBag },
        { href: "/dashboard/admin/wealth/orders", label: "Wealth Orders", icon: ShoppingBag },
        { href: "/dashboard/admin/payments", label: "Payments", icon: CreditCard },
        { href: "/adventpay/admin", label: "AdventPay", icon: Wallet },
        { href: "/dashboard/admin/creator-payouts", label: "Creator Payouts", icon: Wallet },
      ],
    },
    {
      id: "admin-operations",
      label: "Operations",
      icon: BarChart3,
      links: [
        { href: "/dashboard/admin/live-classes", label: "Live Classes", icon: Video },
        { href: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/dashboard/admin/announcements", label: "Announcements", icon: Megaphone },
        { href: "/dashboard/admin/email-campaigns", label: "Email Campaigns", icon: Mail },
        { href: "/dashboard/admin/reports", label: "Reports", icon: FileText },
      ],
    },
    {
      id: "admin-settings",
      label: "Settings",
      icon: SlidersHorizontal,
      links: [
        { href: "/dashboard/admin/auth-settings", label: "Auth Settings", icon: KeyRound },
        { href: "/dashboard/admin/display-settings", label: "Display Settings", icon: SlidersHorizontal },
        { href: "/dashboard/admin/homepage-hero", label: "Homepage Hero", icon: Images },
        { href: "/dashboard/admin/documentation", label: "Documentation", icon: BookMarked },
        { href: "/adventpay/dashboard", label: "My AdventPay", icon: CreditCard },
        { href: "/dashboard/account", label: "Account", icon: CircleUser },
      ],
    },
    //{ href: "/dashboard/admin/chat", label: "Chat with AI" },
    { id: "admin-explore", label: "Explore", icon: Globe2, links: publicLinks },
  ],
};

const linkClasses = (active: boolean) =>
  `flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    active ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
  }`;

export default function Sidebar({ role, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useAppRouter();
  const { profile, logout } = useAuth();
  const [wealthPublicNavigation, setWealthPublicNavigation] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const signOut = useAsyncAction({
    action: async () => {
      await logout();
      onClose?.();
      router.push("/login");
    },
  });

  useEffect(() => {
    let active = true;
    void getWealthPublicNavigationEnabled()
      .then((enabled) => active && setWealthPublicNavigation(enabled))
      .catch((error) => console.error("Could not load public Wealth Academy navigation setting.", error));
    return () => {
      active = false;
    };
  }, []);

  const links = useMemo(() => {
    const rolePublicLinks = role === "teacher"
      ? publicLinks.map((link) => link.href === "/designs"
        ? {
            href: profile?.handle ? `/@${profile.handle}` : "/dashboard/teacher/storefront",
            label: "Browse My Store",
            icon: Store,
          }
        : link,
      )
      : publicLinks;

    const shouldShowLink = (link: NavLink) => {
      if (link.href === "/wealth" && !wealthPublicNavigation) return false;
      if (link.href === "/dashboard/teacher/wealth") {
        return Boolean(profile?.role === "teacher" && profile.creatorStatus === "approved" && profile.wealthEnabled);
      }
      return true;
    };

    return linkMap[role]
      .map((item) => isNavGroup(item) && item.id === "teacher-explore" ? { ...item, links: rolePublicLinks } : item)
      .map((item) => (isNavGroup(item) ? { ...item, links: item.links.filter(shouldShowLink) } : item))
      .filter((item) => !isNavGroup(item) || item.links.length > 0);
  }, [profile?.creatorStatus, profile?.handle, profile?.role, profile?.wealthEnabled, role, wealthPublicNavigation]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const activeGroupIds = links
      .filter(isNavGroup)
      .filter((group) => group.links.some((link) => isActive(link.href)))
      .map((group) => group.id);

    if (activeGroupIds.length > 0) {
      setOpenGroups((current) => {
        const unopenedGroupIds = activeGroupIds.filter((groupId) => !current.has(groupId));
        return unopenedGroupIds.length > 0 ? new Set([...current, ...unopenedGroupIds]) : current;
      });
    }
  }, [pathname, links]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const renderLinks = (onNavigate?: () => void) =>
    links.map((item) => {
      if (!isNavGroup(item)) {
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClasses(active)} aria-current={active ? "page" : undefined}>
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{item.label}</span>
          </Link>
        );
      }

      const open = openGroups.has(item.id);
      const groupActive = item.links.some((link) => isActive(link.href));

      return (
        <div key={item.id} className="space-y-1">
          <button
            type="button"
            onClick={() => toggleGroup(item.id)}
            aria-expanded={open}
            className={`flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
              groupActive
                ? "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {open ? (
            <div className="ml-4 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-800">
              {item.links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link key={link.href} href={link.href} onClick={onNavigate} className={linkClasses(active)} aria-current={active ? "page" : undefined}>
                    <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    });

  return (
    <>
      <aside className="hidden w-64 shrink-0 self-start border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">AdventSkool</h2>
        <nav className="space-y-1" aria-label="Dashboard navigation">{renderLinks()}</nav>
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
            <nav className="space-y-1" aria-label="Dashboard navigation">{renderLinks(onClose)}</nav>
            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                loading={signOut.isLoading}
                loadingText="Signing out…"
                onClick={() => void signOut.run()}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
