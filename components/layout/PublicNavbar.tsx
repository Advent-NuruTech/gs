"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CircleUser,
  GraduationCap,
  House,
  Info,
  LogIn,
  Menu,
  Moon,
  Package,
  Search,
  Sun,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useCourse } from "@/hooks/useCourse";
import { listDesigns } from "@/services/designService";
import { Design } from "@/types/design";

const navLinks: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Home", icon: House },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/designs", label: "Digital Products", icon: Package },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/about", label: "About", icon: Info },
  { href: "/become-a-creator", label: "Teach & sell", icon: GraduationCap },
];

/** Catalogue pages own their own filter bar, so the global search is hidden there. */
const CATALOGUE_ROUTES = ["/courses", "/designs"];

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PublicNavbar() {
  const pathname = usePathname();
  const { profile, loading: authLoading } = useAuth();
  const dashboardHref = profile ? `/dashboard/${profile.role}` : "/dashboard";
  const showSearch = !CATALOGUE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const { courses } = useCourse(undefined, { published: true, pageSize: 100 });
  const [designs, setDesigns] = useState<Design[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("adventskool-theme");
    const shouldUseDark = savedTheme === "dark";
    setDark(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  useEffect(() => {
    if (!showSearch) return;
    let active = true;
    void listDesigns({ published: true, pageSize: 100 })
      .then((items) => active && setDesigns(items))
      .catch(() => active && setDesigns([]));
    return () => {
      active = false;
    };
  }, [showSearch]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-global-search]")) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return { courses: [], designs: [] };
    return {
      courses: courses
        .filter((course) =>
          [course.title, course.category].some((field) => field?.toLowerCase().includes(value)),
        )
        .slice(0, 4),
      designs: designs
        .filter((design) =>
          [design.title, design.description, design.category].some((field) =>
            field?.toLowerCase().includes(value),
          ),
        )
        .slice(0, 4),
    };
  }, [courses, designs, query]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("adventskool-theme", next ? "dark" : "light");
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const searchBox = (
    <div data-global-search className="relative w-full">
      <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-blue-900">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onFocus={() => setSearchOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          placeholder="Search courses and products"
          aria-label="Search courses and digital products"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
      </label>
      {searchOpen && query.trim() ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.courses.length || results.designs.length ? (
            <>
              {results.courses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`} onClick={closeSearch} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800">
                  <BookOpen className="h-4 w-4 shrink-0 text-blue-600" />
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{course.title}</span><span className="block text-xs text-slate-500">Course · {course.category || "General"}</span></span>
                </Link>
              ))}
              {results.designs.map((design) => (
                <Link key={design.id} href={`/designs/${design.id}`} onClick={closeSearch} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-800">
                  <Package className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{design.title}</span><span className="block text-xs text-slate-500">Digital product · {design.category || "General"}</span></span>
                </Link>
              ))}
            </>
          ) : (
            <p className="px-3 py-5 text-center text-sm text-slate-500">No courses or products match “{query}”.</p>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-[var(--background)]/95 backdrop-blur dark:border-slate-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4">
          <Link href="/" className="shrink-0 text-lg font-black tracking-tight text-slate-950 dark:text-white">Advent<span className="text-blue-600">Skool</span></Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => {
              const active = isNavActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      : "text-slate-600 hover:bg-white hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-blue-400"
                  }`}
                >
                  <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{link.label}</span>
                </Link>
              );
            })}
          </nav>
          {showSearch ? (
            <div className="ml-auto hidden w-full max-w-sm md:block">{searchBox}</div>
          ) : null}
          {authLoading ? (
            <span
              className={`${showSearch ? "" : "ml-auto "}hidden h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200 md:block dark:bg-slate-800`}
              aria-hidden="true"
            />
          ) : profile ? (
            <Link
              href={dashboardHref}
              aria-label={`Go to your ${profile.role} dashboard`}
              title={`${profile.displayName} — dashboard`}
              className={`${showSearch ? "" : "ml-auto "}hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 md:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800`}
            >
              <CircleUser className="h-6 w-6" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href="/login"
              className={`${showSearch ? "" : "ml-auto "}hidden shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:text-blue-700 dark:text-slate-200 dark:hover:text-blue-400 md:inline-flex`}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Log in
            </Link>
          )}
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu" className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm md:ml-0 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"><Menu className="h-5 w-5" /></button>
        </div>
        {showSearch ? (
          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 md:hidden">
            <div className="mx-auto max-w-7xl">{searchBox}</div>
          </div>
        ) : null}
      </header>

      {menuOpen ? <div className="fixed inset-0 z-50 bg-slate-950/45" onClick={() => setMenuOpen(false)} aria-hidden="true" /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,22rem)] flex-col border-r border-slate-200 bg-[var(--background)] p-4 shadow-2xl transition-transform duration-300 dark:border-slate-800 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-hidden={!menuOpen}>
        <div className="flex items-center justify-between">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Advent<span className="text-blue-600">Skool</span></Link>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-900"><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-5 flex flex-col gap-1" aria-label="Mobile navigation">
          {navLinks.map((link) => {
            const active = isNavActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold ${
                  active
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "text-slate-700 hover:bg-white hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-900"
                }`}
              >
                <link.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">{link.label}</span>
              </Link>
            );
          })}
          {authLoading ? (
            <span className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-slate-400" aria-hidden="true">
              <CircleUser className="h-5 w-5 shrink-0 animate-pulse" />
              <span className="min-w-0 truncate">Checking session…</span>
            </span>
          ) : profile ? (
            <Link
              href={dashboardHref}
              onClick={() => setMenuOpen(false)}
              className="flex min-w-0 items-center gap-3 rounded-xl bg-blue-50 px-3 py-3 text-base font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
            >
              <CircleUser className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">My dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-blue-700 dark:text-blue-400"
            >
              <LogIn className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">Log in</span>
            </Link>
          )}
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
          <button type="button" onClick={toggleTheme} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <span className="flex items-center gap-2">{dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{dark ? "Dark mode" : "Light mode"}</span>
            <span className={`relative h-6 w-11 rounded-full transition ${dark ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${dark ? "left-6" : "left-1"}`} /></span>
          </button>
        </div>
      </aside>
    </>
  );
}
