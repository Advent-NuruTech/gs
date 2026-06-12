"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, loginUser, logoutUser } from "@/services/authService";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

async function notifyLoginBySms() {
  try {
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/auth/notify-login", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  } catch {
    /* best-effort */
  }
}

export default function AdminLoginPageClient() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { pushToast } = useNotificationContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If an admin is already signed in, send them straight to the console.
  useEffect(() => {
    if (authLoading || !profile) return;
    if (profile.role === "admin") router.replace("/dashboard/admin");
  }, [authLoading, profile, router]);

  const isValid = email.includes("@") && password.length >= 6;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const userId = await loginUser(email, password);
      const userProfile = await getUserProfile(userId);

      if (userProfile?.role !== "admin") {
        await logoutUser();
        pushToast("This portal is for administrators only. Use the main login instead.", "error");
        return;
      }

      void notifyLoginBySms();
      pushToast(`Welcome back, ${userProfile.displayName || "Admin"}.`, "success");
      router.push("/dashboard/admin");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-xl bg-slate-800 p-3">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="mt-1 text-sm text-slate-400">Restricted access — administrators only.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-700 bg-slate-800/70 p-8 shadow-2xl"
        >
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-200">
              <Mail className="h-4 w-4 text-emerald-400" /> Email
            </label>
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@adventskool.com"
              required
              className="bg-slate-900 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-200">
              <Lock className="h-4 w-4 text-emerald-400" /> Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-900 pr-12 text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !isValid}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? "Signing in…" : "Sign in to Admin"}
          </Button>

          <p className="text-center text-sm text-slate-400">
            Need an admin account?{" "}
            <Link href="/admin/signup" className="font-semibold text-emerald-400 hover:underline">
              Create one
            </Link>
          </p>
          <p className="text-center text-sm text-slate-400">
            Not an admin?{" "}
            <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
              Student / Teacher login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
