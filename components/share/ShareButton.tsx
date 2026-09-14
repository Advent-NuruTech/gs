"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useNotificationContext } from "@/context/NotificationContext";
import { truncateText } from "@/lib/utils/plainText";

interface ShareButtonProps {
  title: string;
  description?: string;
  entityId: string;
  entityLabel: "Course" | "Product";
  path: string;
  className?: string;
}

function legacyCopy(text: string): boolean {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  return copied;
}

export default function ShareButton({
  title,
  description = "",
  entityId,
  entityLabel,
  path,
  className = "",
}: ShareButtonProps) {
  const { pushToast } = useNotificationContext();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyShareDetails = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (!legacyCopy(text)) {
        throw new Error("Copy command was rejected.");
      }

      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
      pushToast("Share link copied.", "success");
    } catch {
      pushToast("Could not share this link. Please copy it from your browser.", "error");
    }
  };

  const handleShare = async () => {
    const url = new URL(path, window.location.origin).toString();
    const summary = truncateText(description, 220);
    const shareText = [summary, `${entityLabel} ID: ${entityId}`].filter(Boolean).join("\n");

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copyShareDetails([title, shareText, url].filter(Boolean).join("\n"));
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${className}`}
      aria-label={`Share ${entityLabel.toLowerCase()} ${title}`}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
