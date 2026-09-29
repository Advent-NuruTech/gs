"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

type Accent = "blue" | "indigo";

const ACCENTS: Record<Accent, { focus: string; selected: string; hover: string }> = {
  blue: {
    focus: "focus-within:border-blue-500 focus-within:ring-blue-100",
    selected: "bg-blue-600 text-white hover:bg-blue-700",
    hover: "hover:bg-blue-50 hover:text-blue-700",
  },
  indigo: {
    focus: "focus-within:border-indigo-500 focus-within:ring-indigo-100",
    selected: "bg-indigo-600 text-white hover:bg-indigo-700",
    hover: "hover:bg-indigo-50 hover:text-indigo-700",
  },
};

type CatalogFilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  itemLabel: string;
  accent?: Accent;
  innerMaxWidth?: string;
  showCategoryFilter?: boolean;
};

export default function CatalogFilterBar({
  query,
  onQueryChange,
  searchPlaceholder,
  searchLabel,
  categories,
  activeCategory,
  onCategoryChange,
  resultCount,
  totalCount,
  itemLabel,
  accent = "blue",
  innerMaxWidth = "max-w-7xl",
  showCategoryFilter,
}: CatalogFilterBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const tones = ACCENTS[accent];
  const withCategory = showCategoryFilter ?? categories.length > 0;

  const options = useMemo(() => {
    const all = ["All", ...categories];
    const needle = categoryQuery.trim().toLocaleLowerCase();
    if (!needle) return all;
    return all.filter((category) => category.toLocaleLowerCase().includes(needle));
  }, [categories, categoryQuery]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setCategoryQuery("");
  }, []);

  const togglePicker = () => {
    if (pickerOpen) {
      closePicker();
    } else {
      setPickerOpen(true);
    }
  };

  useEffect(() => {
    if (!pickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePicker();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePicker();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePicker, pickerOpen]);

  const hasFilters = query.trim().length > 0 || activeCategory !== "All";
  const summary = hasFilters
    ? `${resultCount.toLocaleString("en-KE")} of ${totalCount.toLocaleString("en-KE")} ${itemLabel}`
    : `${resultCount.toLocaleString("en-KE")} ${itemLabel}`;

  return (
    <div
      ref={rootRef}
      className="sticky top-16 z-30 -mx-4 border-y border-slate-200 bg-[var(--background)]/95 px-4 py-3 shadow-sm backdrop-blur"
    >
      <div className={`mx-auto flex flex-col gap-2.5 sm:flex-row sm:items-center ${innerMaxWidth}`}>
        <div
          className={`flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm transition focus-within:ring-2 ${tones.focus}`}
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none dark:text-slate-100"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="relative shrink-0 sm:w-64">
          {withCategory ? (
            <button
              type="button"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={togglePicker}
              className={`flex h-11 w-full items-center gap-2 rounded-xl border bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 focus:outline-none focus:ring-2 ${
                pickerOpen ? "border-slate-400 ring-slate-200" : "border-slate-300"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {activeCategory === "All" ? "All categories" : activeCategory}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          ) : null}

          {pickerOpen ? (
            <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl sm:left-auto sm:right-0 sm:w-80">
              {categories.length > 12 ? (
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={categoryQuery}
                    onChange={(event) => setCategoryQuery(event.target.value)}
                    placeholder="Filter categories"
                    aria-label="Filter categories"
                    className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none dark:text-slate-100"
                  />
                </label>
              ) : null}
              <div role="listbox" aria-label="Categories" className="mt-2 max-h-64 overflow-y-auto overscroll-contain">
                {options.length > 0 ? (
                  options.map((category) => {
                    const selected = activeCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          onCategoryChange(category);
                          closePicker();
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                          selected ? tones.selected : `text-slate-700 ${tones.hover}`
                        }`}
                      >
                        <span className="min-w-0 truncate">{category}</span>
                        {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-sm text-slate-500">No matching categories.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`mx-auto flex items-center justify-between gap-3 sm:hidden ${innerMaxWidth}`}>
        <p className="truncate text-xs text-slate-500">{summary}</p>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              onQueryChange("");
              onCategoryChange("All");
            }}
            className="shrink-0 text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900 dark:text-slate-300"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
