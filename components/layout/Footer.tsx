import Link from "next/link";
import { MessageCircle } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/designs", label: "Digital Products" },
  { href: "/tools", label: "Tools" },
  { href: "/about", label: "About" },
  { href: "/become-a-creator", label: "Become a teacher" },
];

const legalLinks = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookies", label: "Cookies Policy" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-transparent dark:border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              AdventSkool LMS
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              AdventSkool is a guided, mobile-first learning platform - structured lessons, progress
              tracking, and role-based dashboards for students, teachers, and admins. AdventSkool is
              a product of <span className="font-semibold text-slate-800 dark:text-slate-100">Advent NuruTech</span>.
            </p>
            <a
              href="mailto:adventskool@gmail.com"
              className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              adventskool@gmail.com
            </a>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
              Explore
            </h3>
            <ul className="mt-4 space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 transition hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 transition hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {year} AdventSkool. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/254142225233?text=Hello%20Advent%20NuruTech%20Services%2C%20I%20would%20like%20your%20software%20services"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-center text-xs font-semibold text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:border-emerald-800 dark:hover:bg-emerald-950"
            >
              <MessageCircle className="h-4 w-4" />
              Designed by Advent NuruTech Services
            </a>
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-slate-500 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
