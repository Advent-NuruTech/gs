"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { apiRequest } from "@/lib/api/client";
import { formatKsh } from "@/lib/utils/formatCurrency";
import Button from "@/components/ui/Button";
import StatusCard from "@/components/ui/StatusCard";
import ServeLoadingScreen from "@/components/serve/ServeLoadingScreen";
import Link from "next/link";
import ServeInstallButton from "@/components/serve/ServeInstallButton";

interface ServeLibraryItem {
  type: "course" | "design";
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  is_pdf: boolean;
  price: number;
}

function getCardText(title: string, description: string) {
  const titleWords = title.trim().split(/\s+/).filter(Boolean);
  const descriptionWords = description.trim().split(/\s+/).filter(Boolean);
  const visibleTitle = titleWords.slice(0, 15).join(" ");
  const visibleDescription = titleWords.length < 15
    ? descriptionWords.slice(0, 15 - titleWords.length).join(" ")
    : "";

  return { title: visibleTitle, description: visibleDescription };
}

function itemHref(item: ServeLibraryItem) {
  const path = item.type === "course" ? `/courses/${item.id}` : `/designs/${item.id}`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").replace(/\/$/, "");
  return `${siteUrl}${path}`;
}

export default function ServeLibraryPage() {
  const { data, isLoading, errorMessage, reload } = useAsyncData(
    () => apiRequest<{ items: ServeLibraryItem[] }>("/api/serve/library"),
    [],
  );

  if (isLoading) return <ServeLoadingScreen />;

  const items = data?.items ?? [];
  return (
    <main className="min-h-screen bg-[#06182b] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06182b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/serve" className="font-black text-[#a5ff00]">SERVE* <span className="font-bold text-white">If Saved</span></Link>
          <nav className="flex items-center gap-3 text-sm font-bold">
            <Link href="/serve/timetable" className="text-white/75 hover:text-[#a5ff00]">Timetable</Link>
            <Link href="/serve/register" className="rounded-full bg-[#a5ff00] px-4 py-2 text-[#06182b]">Register</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-8 px-5 py-16">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-[#a5ff00]">SERVE* If Saved</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Library</h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/70">Courses and digital resources selected for the SERVE learning community.</p>
          <div className="mt-5"><ServeInstallButton /></div>
        </div>

        {errorMessage ? (
          <StatusCard kind="error" title="The SERVE library could not be loaded" description={errorMessage} actions={<Button size="sm" onClick={reload}>Try again</Button>} />
        ) : null}
        {!errorMessage && items.length === 0 ? (
          <StatusCard kind="info" title="The library is being prepared" description="Selected courses and resources will appear here." />
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((item) => {
            const cardText = getCardText(item.title, item.description);
            return (
              <a
                key={`${item.type}:${item.id}`}
                href={itemHref(item)}
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[.04] transition hover:border-[#a5ff00]/60"
              >
                <div className="relative aspect-[16/10] bg-[#06182b]">
                  {/* Catalog covers are existing public AdventSkool assets. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url || "/images/serve/servelogo.png"} alt="" loading="lazy" className="h-full w-full object-contain" />
                  {item.is_pdf ? <span className="absolute right-3 top-3 rounded-full border border-[#a5ff00]/60 bg-[#06182b]/90 px-3 py-1 text-xs font-bold text-[#a5ff00]">PDF</span> : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
                  <p className="break-words text-xs font-bold uppercase tracking-wider text-[#a5ff00]">{item.type === "course" ? "Course · " : ""}{item.category}</p>
                  <div className="mt-2 min-h-20">
                    {cardText.title ? <h2 className="break-words text-base font-bold text-white group-hover:text-[#a5ff00] sm:text-lg">{cardText.title}</h2> : null}
                    {cardText.description ? <p className="mt-1 break-words text-sm leading-5 text-white/65">{cardText.description}</p> : null}
                  </div>
                  <div className="mt-auto flex min-w-0 flex-col items-start gap-1 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="text-sm font-semibold text-white/70">{item.price > 0 ? formatKsh(item.price) : "Free"}</p>
                    <span className="text-xs font-bold text-[#a5ff00] sm:text-sm">View resource →</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

    </main>
  );
}
