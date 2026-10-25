"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthShell from "@/components/auth/AuthShell";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusCard from "@/components/ui/StatusCard";
import { useAuth } from "@/hooks/useAuth";
import { useAuthMethodSettings } from "@/hooks/useAuthMethodSettings";
import { getUserProfile, loginUser, registerUser } from "@/services/authService";

const dashboardFor = (role: string) => role === "admin" ? "/adventpay/admin" : "/adventpay/dashboard";
const isAdventPayPath = (value: string | null) => Boolean(value?.startsWith("/adventpay/") && !value.startsWith("//"));

function syncDashboardCookie(userId: string, role: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `adventskool_uid=${userId}; path=/; max-age=${maxAge}; samesite=lax`;
  document.cookie = `adventskool_role=${role}; path=/; max-age=${maxAge}; samesite=lax`;
}

export default function AdventPayAuth({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter(); const searchParams = useSearchParams(); const { profile, loading: authLoading } = useAuth(); const methods = useAuthMethodSettings();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [phone, setPhone] = useState(""); const [showPassword, setShowPassword] = useState(false); const [isLoading, setIsLoading] = useState(false); const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const redirect = useMemo(() => {
    const value = searchParams.get("redirect");
    return isAdventPayPath(value) ? value : null;
  }, [searchParams]);
  useEffect(() => { if (!authLoading && profile) router.replace(redirect ?? dashboardFor(profile.role)); }, [authLoading, profile, redirect, router]);
  const isSignup = mode === "signup";
  const valid = isSignup ? name.trim().length > 2 && email.includes("@") && password.length >= 6 : email.includes("@") && password.length >= 6;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!valid || !methods?.emailEnabled) return; setIsLoading(true); setMessage(null);
    try {
      if (isSignup) {
        const result = await registerUser({
          displayName: name,
          email,
          phone,
          password,
          role: "student",
          marketingSubscribed: false,
          emailConfirmationRedirectPath: "/adventpay/dashboard",
        });
        if (result.needsConfirmation) { setMessage({ kind: "success", text: `Your account is ready. Confirm the email sent to ${email}, then log in to AdventPay.` }); return; }
        syncDashboardCookie(result.userId, "student");
        router.replace("/adventpay/dashboard");
      } else {
        const id = await loginUser(email, password); const account = await getUserProfile(id);
        if (!account) throw new Error("Your account profile could not be loaded.");
        syncDashboardCookie(id, account.role);
        router.replace(redirect ?? dashboardFor(account.role));
      }
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "We could not complete that request." }); }
    finally { setIsLoading(false); }
  };
  const href = isSignup ? "/adventpay/login" : "/adventpay/signup";
  return <AuthShell><div className="w-full max-w-md"><div className="mb-6 text-center"><Link href="/adventpay" className="inline-flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white"><CreditCard className="h-6 w-6" /></span><span className="text-3xl font-black tracking-tight text-sky-700">AdventPay</span></Link><p className="mt-3 text-sm text-slate-600">Secure invoices, payments, and PDF receipts.</p></div><form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8"><div className="text-center"><h1 className="text-2xl font-bold text-slate-950">{isSignup ? "Sign up to AdventPay" : "Log in to AdventPay"}</h1><p className="mt-1 text-sm text-slate-500">{isSignup ? "Create an account to access your AdventPay dashboard." : "Use your AdventPay account to continue."}</p></div>{message ? <StatusCard kind={message.kind} title={message.kind === "error" ? "Unable to continue" : "Check your inbox"} description={message.text} /> : null}{methods?.googleEnabled ? <GoogleSignInButton redirectPath={redirect ?? "/adventpay/dashboard"} /> : null}{methods?.googleEnabled && methods.emailEnabled ? <div className="flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-xs uppercase text-slate-400">or email</span><span className="h-px flex-1 bg-slate-200" /></div> : null}{methods?.emailEnabled ? <><div className="space-y-4">{isSignup ? <Input label="Full name" required value={name} onChange={(event) => setName(event.target.value)} /> : null}<Input label="Email address" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />{isSignup ? <Input label="Phone number (optional)" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /> : null}<div className="relative"><Input label="Password" type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} className="pr-12" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-9 text-slate-500" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div><Button type="submit" className="w-full" loading={isLoading} loadingText={isSignup ? "Creating account…" : "Logging in…"} disabled={!valid}>{isSignup ? "Sign up to AdventPay" : "Log in to AdventPay"}</Button></> : null}{methods && !methods.emailEnabled && !methods.googleEnabled ? <StatusCard kind="warning" title="Sign-in unavailable" description="Please try again later." /> : null}{!methods ? <StatusCard kind="loading" title="Loading sign-in options" description="Please wait a moment." /> : null}<p className="text-center text-sm text-slate-600">{isSignup ? "Already have an account?" : "New to AdventPay?"} <Link href={href} className="font-semibold text-sky-700 hover:underline">{isSignup ? "Log in" : "Sign up"}</Link></p></form></div></AuthShell>;
}
