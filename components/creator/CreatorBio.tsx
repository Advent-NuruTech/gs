"use client";

import { useState } from "react";

const PREVIEW_WORDS = 20;

export default function CreatorBio({ bio, full = false }: { bio: string; full?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const words = bio.trim().split(/\s+/);
  const canExpand = !full && words.length > PREVIEW_WORDS;
  const text = canExpand && !expanded ? `${words.slice(0, PREVIEW_WORDS).join(" ")}…` : bio;

  return (
    <div className="max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-200 sm:text-base">
      <p className="whitespace-pre-line">{text}</p>
      {canExpand ? (
        <button
          type="button"
          className="mt-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
