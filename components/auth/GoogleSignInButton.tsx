"use client";

import { useState } from "react";

import { useNotificationContext } from "@/context/NotificationContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  /** Where to land after sign-in (defaults to the role dashboard). */
  redirectPath?: string | null;
  label?: string;
}

/**
 * "Continue with Google" via Supabase Auth. New Google users get a `profiles`
 * row from the same DB trigger as email/password signups (role: student), so
 * both auth methods share one source of truth.
 */
export default function GoogleSignInButton({
  redirectPath = null,
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const { pushToast } = useNotificationContext();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const callback = new URL("/auth/callback", window.location.origin);
      if (redirectPath) callback.searchParams.set("next", redirectPath);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (error) throw new Error(error.message);
      // The browser is being redirected to Google now.
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Google sign-in failed.", "error");
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
        />
      </svg>
      {busy ? "Redirecting..." : label}
    </button>
  );
}
