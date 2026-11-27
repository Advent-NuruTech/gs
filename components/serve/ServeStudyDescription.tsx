"use client";

import { useEffect, useRef, useState } from "react";

import { formatContent } from "@/lib/utils/formatContent";

export default function ServeStudyDescription({
  id,
  title,
  description,
  className = "",
}: {
  id: string;
  title: string;
  description: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  if (!description.trim()) return null;

  const safeDescription = formatContent(description);

  return (
    <>
      <div
        className={`prose-content max-h-20 overflow-hidden text-sm leading-6 ${className}`}
        dangerouslySetInnerHTML={{ __html: safeDescription }}
      />
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2 text-sm font-bold text-[#075f9b] underline underline-offset-2 hover:text-[#043b61] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Read more
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`serve-study-description-${id}`}
        onClose={() => setIsOpen(false)}
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-[#06182b] p-0 text-white backdrop:bg-black/80"
      >
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 py-6 sm:px-8 sm:py-10">
          <header className="flex items-start justify-between gap-5 border-b border-white/15 pb-5">
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[.18em] text-[#a5ff00]">Bible study description</p>
              <h2
                id={`serve-study-description-${id}`}
                className="mt-2 break-words text-2xl font-black sm:text-4xl"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded-lg border border-white/30 px-4 py-2 text-sm font-bold hover:border-[#a5ff00] hover:text-[#a5ff00]"
            >
              Cancel
            </button>
          </header>
          <article
            className="prose-content mt-6 flex-1 break-words text-base leading-8 text-white/85 sm:text-lg"
            dangerouslySetInnerHTML={{ __html: safeDescription }}
          />
          <footer className="mt-8 border-t border-white/15 pt-5">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-[#a5ff00] px-6 py-3 font-bold text-[#06182b] hover:bg-[#baff36]"
            >
              Read less
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
