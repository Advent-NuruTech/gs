import { AtSign, Facebook, Globe2, Instagram, Linkedin, Music2, Youtube } from "lucide-react";

import { CreatorSocialLinks as SocialLinks } from "@/types/creator";

const platforms = {
  website: { label: "Website", icon: Globe2 },
  instagram: { label: "Instagram", icon: Instagram },
  facebook: { label: "Facebook", icon: Facebook },
  youtube: { label: "YouTube", icon: Youtube },
  linkedin: { label: "LinkedIn", icon: Linkedin },
  x: { label: "X", icon: AtSign },
  tiktok: { label: "TikTok", icon: Music2 },
} as const;

export default function CreatorSocialLinks({ links }: { links: SocialLinks }) {
  const entries = Object.entries(platforms).flatMap(([key, details]) => {
    const href = links[key as keyof SocialLinks];
    return href ? [{ href, ...details }] : [];
  });
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2 md:justify-start" aria-label="Creator social links">
      {entries.map(({ href, label, icon: Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} profile`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Icon className="h-4 w-4" aria-hidden="true" /> {label}
        </a>
      ))}
    </div>
  );
}
