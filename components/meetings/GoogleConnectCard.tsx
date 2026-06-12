"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, Link2, Unlink } from "lucide-react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import {
  disconnectGoogle,
  getGoogleStatus,
  startGoogleConnect,
} from "@/services/meetingService";
import { GoogleConnectionStatus } from "@/types/meeting";

interface GoogleConnectCardProps {
  /** Where Google should send the user back to after consent. */
  redirectPath: string;
  /** Compact banner style for embedding above schedulers. */
  compact?: boolean;
}

/**
 * Shows whether the signed-in user has linked their Google account (needed to
 * create Calendar events + Meet links) and lets them connect / disconnect.
 */
export default function GoogleConnectCard({ redirectPath, compact = false }: GoogleConnectCardProps) {
  const { pushToast } = useNotificationContext();
  const [status, setStatus] = useState<GoogleConnectionStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getGoogleStatus().then(setStatus).catch(() => setStatus({ connected: false, email: null, connectedAt: null }));

    // Surface result of a just-finished OAuth redirect.
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      pushToast("Google Calendar connected.", "success");
      window.history.replaceState({}, "", window.location.pathname);
    }
    const oauthError = params.get("google_error");
    if (oauthError) {
      pushToast(oauthError, "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [pushToast]);

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectGoogle();
      setStatus({ connected: false, email: null, connectedAt: null });
      pushToast("Google account disconnected.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not disconnect.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return compact ? null : (
      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Checking Google Calendar connection...
      </div>
    );
  }

  if (status.connected) {
    if (compact) {
      return (
        <p className="flex items-center gap-2 text-xs text-emerald-700">
          <CalendarCheck2 className="h-4 w-4" />
          Google Calendar connected as {status.email}
        </p>
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <CalendarCheck2 className="h-6 w-6 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Google Calendar connected</p>
            <p className="text-xs text-slate-600">
              {status.email} — meetings you schedule create Calendar events and Meet links automatically.
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={handleDisconnect} disabled={busy}>
          <Unlink className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center gap-3">
        <Link2 className="h-6 w-6 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Connect Google Calendar</p>
          <p className="text-xs text-slate-600">
            Required to schedule meetings with automatic Google Meet links and calendar invitations.
          </p>
        </div>
      </div>
      <Button onClick={() => startGoogleConnect(redirectPath)}>Connect Google</Button>
    </div>
  );
}
