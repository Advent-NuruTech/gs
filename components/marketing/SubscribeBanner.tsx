"use client";

import { useState } from "react";
import { BellRing, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useNotificationContext } from "@/context/NotificationContext";
import { setMarketingSubscribed } from "@/services/marketingService";

/**
 * Public-header subscription prompt. Renders ONLY when a logged-in user has
 * marketing_subscribed === false. Subscribing flips the DB flag and hides the
 * banner permanently (it won't reappear once the profile reloads as subscribed).
 */
export default function SubscribeBanner() {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);

  // Wait for the profile; only show when the user has explicitly opted out.
  if (hidden || !profile || profile.marketingSubscribed !== false) return null;

  const subscribe = async () => {
    setSaving(true);
    try {
      await setMarketingSubscribed(profile.id, true);
      setHidden(true);
      pushToast("You're subscribed to learning updates.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not subscribe.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BellRing className="h-4 w-4 shrink-0" />
          <span>Stay updated with new courses and learning materials.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={subscribe}
            disabled={saving}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-60"
          >
            {saving ? "Subscribing…" : "Subscribe"}
          </button>
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Dismiss"
            className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
