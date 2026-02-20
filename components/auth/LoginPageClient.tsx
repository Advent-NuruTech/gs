"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, loginUser } from "@/lib/firebase/auth";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const { pushToast } = useNotificationContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectPath = useMemo(() => {
    const requested = searchParams.get("redirect");
    if (!requested) return null;
    if (!requested.startsWith("/") || requested.startsWith("//")) return null;
    return requested;
  }, [searchParams]);

  useEffect(() => {
    if (authLoading || !profile) return;
    router.replace(redirectPath ?? `/dashboard/${profile.role}`);
  }, [authLoading, profile, redirectPath, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const credential = await loginUser(email, password);
      const userProfile = await getUserProfile(credential.user.uid);
      if (!userProfile) {
        pushToast("User profile not found.", "error");
        return;
      }
      router.push(redirectPath ?? `/dashboard/${userProfile.role}`);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <form className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-6" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-slate-900">Student Login</h1>
        <p className="text-sm text-slate-600">
          Teachers join through an invite link from admin.
        </p>
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </Button>
        <p className="text-sm text-slate-600">
          No account?{" "}
          <Link
            href={redirectPath ? `/register?redirect=${encodeURIComponent(redirectPath)}` : "/register"}
            className="text-blue-700 hover:underline"
          >
            Create student account
          </Link>
        </p>
      </form>
    </main>
  );
}
