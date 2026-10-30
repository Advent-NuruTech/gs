"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";

import AuthShell from "@/components/auth/AuthShell";
import AuthLogo from "@/components/auth/AuthLogo";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusCard from "@/components/ui/StatusCard";
import { useNotificationContext } from "@/context/NotificationContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateUserPassword } from "@/services/authService";

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const { pushToast } = useNotificationContext();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // The recovery link drops the user here with an active session (created by the
  // /auth/callback route). Confirm it exists before allowing a password change.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error")) { setHasSession(false); return; }
    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => setHasSession(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (session) setHasSession(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isValid = password.length >= 6 && password === confirm;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setErrorMessage("");
    try {
      await updateUserPassword(password);
      setDone(true);
      pushToast("Password updated. You can sign in with it now.", "success");
      setTimeout(() => router.push("/login"), 1800);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-6">
          <AuthLogo />
          <p className="text-sm text-slate-600 mt-2">Choose a new password</p>
        </div>

        <div className="space-y-6 rounded-3xl bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl border border-white/60">
          {done ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto inline-flex items-center justify-center rounded-2xl bg-emerald-50 p-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Password updated</h1>
                <p className="text-sm text-slate-500">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : hasSession === false ? (
            <div className="space-y-5 text-center">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Link expired</h1>
                <p className="text-sm text-slate-500">
                  This reset link is invalid or has expired. Request a new one to continue.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Request a new link
              </Link>
            </div>
          ) : hasSession === null ? (
            <StatusCard kind="loading" title="Checking your reset link" />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage ? <StatusCard kind="error" title="Something went wrong" description={errorMessage} /> : null}
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
                <p className="text-sm text-slate-500">
                  Pick a strong password you don&apos;t use anywhere else.
                </p>
              </div>

              {/* New password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    label="New Password"
                    hideLabel
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-12"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && password.length < 6 && (
                  <p className="text-xs text-amber-600 mt-1">Use at least 6 characters</p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    label="Confirm Password"
                    hideLabel
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="pl-10"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-amber-600 mt-1">Passwords don&apos;t match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                loading={loading}
                loadingText="Updating..."
                disabled={!isValid}
              >
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
