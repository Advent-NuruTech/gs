"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { finishNavigation, startNavigation } from "@/lib/ui/navigationProgress";

/**
 * Router wrapper that turns on the top progress bar for imperative navigations,
 * so `router.push` calls behave like `<Link>` clicks and never feel silent.
 */
export function useAppRouter() {
  const router = useRouter();

  const navigate = useCallback(
    (href: string, replace: boolean) => {
      startNavigation();
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    },
    [router],
  );

  return {
    push: useCallback((href: string) => navigate(href, false), [navigate]),
    replace: useCallback((href: string) => navigate(href, true), [navigate]),
    back: useCallback(() => {
      startNavigation();
      finishNavigation();
      router.back();
    }, [router]),
    refresh: router.refresh,
  };
}
