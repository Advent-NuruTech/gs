import { AtSign, Facebook, Globe2, Instagram, Linkedin, Music2, Youtube } from "lucide-react";

import { CreatorSocialLinks as SocialLinks } from "@/types/creator";

const platforms = {
  website: { label: "Website", icon: Globe2, className: "bg-sky-600 hover:bg-sky-700" },
  instagram: { label: "Instagram", icon: Instagram, className: "bg-gradient-to-br from-violet-600 via-pink-600 to-amber-500 hover:opacity-90" },
  facebook: { label: "Facebook", icon: Facebook, className: "bg-[#1877f2] hover:bg-[#166fe5]" },
  youtube: { label: "YouTube", icon: Youtube, className: "bg-[#ff0000] hover:bg-[#dc0000]" },
  linkedin: { label: "LinkedIn", icon: Linkedin, className: "bg-[#0a66c2] hover:bg-[#0958a8]" },
  x: { label: "X", icon: AtSign, className: "bg-slate-950 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" },
  tiktok: { label: "TikTok", icon: Music2, className: "bg-[#010101] hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" },
} as const;

export default function CreatorSocialLinks({ links }: { links: SocialLinks }) {
  const entries = Object.entries(platforms).flatMap(([key, details]) => {
    const href = links[key as keyof SocialLinks];
    return href ? [{ href, ...details }] : [];
  });
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2 md:justify-start" aria-label="Creator social links">
      {entries.map(({ href, label, icon: Icon, className }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} profile`} title={label} className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
