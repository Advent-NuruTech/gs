import Link from "next/link";
import { Instagram, Mail, MessageCircle, Music2, Phone, Youtube } from "lucide-react";

const usefulLinks = [
  { href: "/serve", label: "SERVE* If Saved home" },
  { href: "/serve/timetable", label: "Study timetable" },
  { href: "/serve/library", label: "Learning library" },
  { href: "/serve/register", label: "Register" },
];

const legalLinks = [
  { href: "/serve/terms", label: "Terms & Conditions" },
  { href: "/serve/privacy", label: "Privacy Policy" },
  { href: "/serve/cookies", label: "Cookies Policy" },
];

const socialLinks = [
  {
    label: "YouTube",
    icon: Youtube,
    className: "bg-[#ff0000] hover:bg-[#dc0000]",
  },
  {
    label: "TikTok",
    icon: Music2,
    className: "bg-[#010101] hover:bg-slate-800",
  },
  {
    label: "Instagram",
    icon: Instagram,
    className: "bg-gradient-to-br from-violet-600 via-pink-600 to-amber-500 hover:opacity-90",
  },
];

export default function ServeFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#06182b] px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <p className="text-xl font-black text-[#a5ff00]">SERVE* If Saved</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
              Study the Word. Live the Word. Serve the Word.
            </p>
            <a
              href="https://adventskool.co.ke/"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[#a5ff00]/60 px-5 py-2 text-sm font-bold text-[#a5ff00] transition hover:bg-[#a5ff00] hover:text-[#06182b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a5ff00]"
            >
              Visit AdventSkool
            </a>
          </div>

          <nav aria-label="Useful links">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Useful links</h2>
            <ul className="mt-4 space-y-3">
              {usefulLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/65 transition hover:text-[#a5ff00]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Contact</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="tel:+254142225233"
                  className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-[#a5ff00]"
                >
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  +254 142 225 233
                </a>
              </li>
              <li>
                <a
                  href="https://whatsapp.com/channel/0029Vb6ZCEgDp2Q1srU5ZU22"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-[#a5ff00]"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  WhatsApp channel
                </a>
              </li>
              <li>
                <a
                  href="mailto:adventskool@gmail.com"
                  className="inline-flex items-center gap-2 break-all text-sm text-white/65 transition hover:text-[#a5ff00]"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  adventskool@gmail.com
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Follow SERVE</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {socialLinks.map(({ label, icon: Icon, className }) => (
                <span
                  key={label}
                  title={`${label} profile coming soon`}
                  aria-label={`${label} profile coming soon`}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-white opacity-80 ${className}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/50">Social profiles coming soon</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/45">© {new Date().getFullYear()} SERVE* If Saved</p>
          <nav aria-label="Legal policies" className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs text-white/55 transition hover:text-[#a5ff00]">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
