"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  finishNavigation,
  startNavigation,
  subscribeNavigation,
} from "@/lib/ui/navigationProgress";

/**
 * Top progress bar shown while the router fetches the next route.
 * Mounted once in the root layout so every navigation is visible, never silent.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => subscribeNavigation(setPending), []);

  useEffect(() => {
    finishNavigation();
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || /^(mailto:|tel:|blob:|data:)/i.test(href)) return;
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith(window.location.origin)) return;
      if (anchor.getAttribute("href") === pathname) return;
      startNavigation();
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100]" aria-hidden={!pending}>
      <div role="progressbar" aria-label="Loading page" aria-busy={pending} className="h-1 w-full overflow-hidden">
        <div
          className={`h-full bg-blue-600 transition-all duration-500 ${pending ? "w-2/3 opacity-100" : "w-full opacity-0"}`}
        />
      </div>
      {pending ? (
        <div role="status" aria-live="polite" className="sr-only">
          Loading page…
        </div>
      ) : null}
    </div>
  );
}
