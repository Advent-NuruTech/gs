"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { useInstall } from "@/context/InstallContext";
import Button from "@/components/ui/Button";
import StatusCard from "@/components/ui/StatusCard";

export default function InstallAppButton({ compact = false }: { compact?: boolean }) {
  const { installed, installing, install } = useInstall();
  const [message, setMessage] = useState<{ kind: "info" | "success" | "error"; title: string; description: string } | null>(null);

  if (installed) return null;

  const handleInstall = async () => {
    setMessage(null);
    const result = await install();
    if (result === "instructions") {
      const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setMessage({ kind: "info", title: "Install AdventSkool", description: isAppleMobile
        ? "Open this site in Safari, tap Share, then choose Add to Home Screen."
        : "Open your browser menu and choose Install app or Add to Home screen, if available." });
    } else if (result === "accepted") {
      setMessage({ kind: "success", title: "Installation accepted", description: "Follow any remaining instructions from your browser." });
    } else if (result === "error") {
      setMessage({ kind: "error", title: "Could not open the install prompt", description: "Try installing from your browser menu instead." });
    } else {
      setMessage({ kind: "info", title: "Installation cancelled", description: "You can try again from your browser menu." });
    }
  };

  return (
    <div className={compact ? "relative" : "min-w-0"}>
      <Button variant="secondary" size="sm" className={compact ? "whitespace-nowrap" : "w-full"} loading={installing} loadingText="Opening…" onClick={() => void handleInstall()}>
        <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" aria-hidden="true" />Install app</span>
      </Button>
      {message ? <StatusCard {...message} onDismiss={() => setMessage(null)} className={compact ? "absolute right-0 top-full z-50 mt-2 w-72 max-w-[90vw]" : "mt-2"} /> : null}
    </div>
  );
}
