"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ServeTimetableEntry } from "@/lib/serve/types";

export function useServeTimetable() {
  const [studies, setStudies] = useState<ServeTimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    setError("");
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    const loadTimetable = async () => {
      const { data, error: queryError } = await supabase
        .from("serve_timetable")
        .select("id,study_number,title,description,session_date,start_time,published,created_at,updated_at")
        .eq("published", true)
        .order("study_number", { ascending: true });

      if (!active) return;
      if (queryError) {
        setError(queryError.message);
      } else {
        setStudies((data ?? []) as ServeTimetableEntry[]);
        setError("");
      }
      setLoading(false);
    };

    void loadTimetable();
    const channel = supabase
      .channel("serve-public-timetable")
      .on("postgres_changes", { event: "*", schema: "public", table: "serve_timetable_revisions" }, () => {
        void loadTimetable();
      })
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" && active) {
          setError("Live timetable updates are temporarily unavailable. Reload the page to check for changes.");
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [refreshKey]);

  return { studies, loading, error, reload };
}
