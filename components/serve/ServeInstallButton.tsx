"use client";

import { Download } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import Spinner from "@/components/ui/Spinner";
import StatusCard from "@/components/ui/StatusCard";
import { useInstall } from "@/context/InstallContext";

interface Feedback {
  kind: "info" | "success" | "error";
  title: string;
  description: string;
}

const subscribeToHostname = () => () => {};
const getIsServeDomain = () => window.location.hostname === "serve.adventskool.co.ke";
const getServerHostnameSnapshot = () => false;

export default function ServeInstallButton({ compact = false }: { compact?: boolean }) {
  const { installed, installing, install } = useInstall();
  const isServeDomain = useSyncExternalStore(
    subscribeToHostname,
    getIsServeDomain,
    getServerHostnameSnapshot,
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  if (!isServeDomain || installed) return null;

  const handleInstall = async () => {
    setFeedback(null);
    const result = await install();
    if (result === "instructions") {
      const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setFeedback({
        kind: "info",
        title: "Install SERVE",
        description: isAppleMobile
          ? "Open this page in Safari, tap Share, then choose Add to Home Screen."
          : "Open your browser menu and choose Install SERVE or Add to Home screen, if available.",
      });
    } else if (result === "accepted") {
      setFeedback({
        kind: "success",
        title: "SERVE installation accepted",
        description: "Follow any remaining instructions from your browser.",
      });
    } else if (result === "error") {
      setFeedback({
        kind: "error",
        title: "Could not open the SERVE install prompt",
        description: "Try installing SERVE from your browser menu instead.",
      });
    } else {
      setFeedback({
        kind: "info",
        title: "Installation cancelled",
        description: "You can try again from your browser menu.",
      });
    }
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => void handleInstall()}
        disabled={installing}
        aria-label="Install SERVE"
        aria-busy={installing || undefined}
        title="Install SERVE"
        className="inline-flex items-center gap-2 rounded-full border border-[#a5ff00]/50 bg-transparent px-3 py-2 text-sm font-bold text-[#a5ff00] transition hover:bg-[#a5ff00]/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {installing ? <Spinner className="h-4 w-4 shrink-0" /> : <Download className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className={compact ? "hidden sm:inline" : ""}>{installing ? "Installing…" : "Install SERVE"}</span>
        {compact ? <span className="sr-only sm:hidden">Install SERVE</span> : null}
      </button>
      {feedback ? (
        <StatusCard
          {...feedback}
          onDismiss={() => setFeedback(null)}
          className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[90vw]"
        />
      ) : null}
    </div>
  );
}
