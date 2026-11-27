"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusCard from "@/components/ui/StatusCard";

type ItemType = "course" | "design";

interface ServeLibraryItem {
  type: ItemType;
  id: string;
  title: string;
  category: string;
  image_url: string;
  published: boolean;
  selected: boolean;
  is_pdf: boolean;
  price: number;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "The request could not be completed.");
  return payload as T;
}

export default function ServeLibraryManager() {
  const [items, setItems] = useState<ServeLibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await requestJson<{ items: ServeLibraryItem[] }>("/api/serve/library?manage=true");
      setItems(result.items);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not load courses and products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      item.title.toLocaleLowerCase().includes(normalized) ||
      item.category.toLocaleLowerCase().includes(normalized),
    );
  }, [items, query]);
  const courses = filteredItems.filter((item) => item.type === "course");
  const designs = filteredItems.filter((item) => item.type === "design");

  const setDisplayed = async (item: ServeLibraryItem, selected: boolean) => {
    const key = `${item.type}:${item.id}`;
    setSavingKey(key);
    setFeedback(null);
    try {
      await requestJson("/api/serve/library", {
        method: "PATCH",
        body: JSON.stringify({ type: item.type, id: item.id, selected }),
      });
      setItems((current) => current.map((entry) => entry.type === item.type && entry.id === item.id ? { ...entry, selected } : entry));
      setFeedback({ kind: "success", message: `${item.title} ${selected ? "added to" : "removed from"} the SERVE library.` });
    } catch (caught) {
      setFeedback({ kind: "error", message: caught instanceof Error ? caught.message : "Could not update the SERVE library." });
    } finally {
      setSavingKey("");
    }
  };

  const renderItems = (heading: string, kind: ItemType, list: ServeLibraryItem[]) => (
    <section className="space-y-3" aria-labelledby={`serve-library-${kind}`}>
      <h3 id={`serve-library-${kind}`} className="text-lg font-bold text-slate-900 dark:text-white">{heading} <span className="text-sm font-medium text-slate-500 dark:text-white/60">({list.length})</span></h3>
      {list.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((item) => {
            const key = `${item.type}:${item.id}`;
            return (
              <label key={key} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                {/* Catalog thumbnails are remote public URLs; keep the card resilient if one is missing. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url || "/images/serve/servelogo.png"} alt="" className="h-16 w-20 shrink-0 rounded-lg bg-[#06182b] object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold text-slate-900 dark:text-white">{item.title}</span>
                  <span className="block text-sm text-slate-600 dark:text-slate-300">{item.category}{item.type === "design" && item.is_pdf ? " · PDF" : ""}</span>
                  {!item.published ? <span className="mt-1 inline-block rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">Unpublished</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-blue-700 dark:text-[#a5ff00]">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={Boolean(savingKey)}
                    onChange={(event) => void setDisplayed(item, event.target.checked)}
                    className="h-5 w-5 accent-blue-600 dark:accent-[#a5ff00]"
                    aria-label={`Display ${item.title} in SERVE`}
                  />
                  {savingKey === key ? "Saving" : "Display"}
                </span>
              </label>
            );
          })}
        </div>
      ) : <StatusCard kind="info" title={`No ${heading.toLocaleLowerCase()} found`} />}
    </section>
  );

  return (
    <section className="space-y-5 border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="serve-library-heading">
      <div>
        <h2 id="serve-library-heading" className="text-xl font-bold text-slate-950 dark:text-white">SERVE library</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Choose which AdventSkool courses and digital products appear in the SERVE library. Only selected, published items are public; their existing AdventSkool detail and checkout flows are unchanged.</p>
      </div>
      {feedback ? <StatusCard kind={feedback.kind} title={feedback.message} /> : null}
      {loading ? <StatusCard kind="loading" title="Loading courses and digital products" /> : null}
      {loadError ? <StatusCard kind="error" title="SERVE library items could not be loaded" description={loadError} actions={<Button size="sm" onClick={() => void reload()}>Retry</Button>} /> : null}
      {!loading && !loadError ? (
        <>
          <Input label="Search courses and products" value={query} onChange={(event) => setQuery(event.target.value)} />
          {renderItems("Courses", "course", courses)}
          {renderItems("Digital products", "design", designs)}
        </>
      ) : null}
    </section>
  );
}
