"use client";

import { DependencyList, useCallback, useEffect, useRef, useState } from "react";

interface UseAsyncDataResult<T> {
  data: T | null;
  isLoading: boolean;
  errorMessage: string;
  /** Re-runs the loader, e.g. from a retry button. */
  reload: () => void;
}

/**
 * Loads data for a page and always exposes a loading and error state, so a page
 * never renders silently while its request is in flight.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage("");
    loaderRef
      .current()
      .then((result) => {
        if (!active) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setData(null);
        setErrorMessage(caught instanceof Error ? caught.message : "Could not load this content.");
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Caller controls when the loader re-runs through `deps`.
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, isLoading, errorMessage, reload };
}
