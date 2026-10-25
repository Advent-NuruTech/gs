"use client";

import Link from "next/link";
import { CreditCard, LogOut, UserRound } from "lucide-react";

import Button from "@/components/ui/Button";
import AdventPayNotifications from "@/components/adventpay/AdventPayNotifications";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAuth } from "@/hooks/useAuth";
import { useAppRouter } from "@/hooks/useAppRouter";

export default function AdventPayHeader() {
  const { profile, loading, logout } = useAuth();
  const router = useAppRouter();
  const signOut = useAsyncAction({ action: logout, onSuccess: () => router.push("/adventpay") });
  const dashboardHref = profile?.role === "admin" ? "/adventpay/admin" : "/adventpay/dashboard";
  return <header className="border-b border-sky-100 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
    <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
      <Link href={profile ? dashboardHref : "/adventpay"} className="inline-flex min-w-0 items-center gap-2 font-black tracking-tight text-slate-950 dark:text-white" aria-label={profile ? "Open your AdventPay dashboard" : "AdventPay home"}><span className="grid h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white"><CreditCard className="h-5 w-5" /></span><span className="truncate text-xl">AdventPay</span></Link>
      <nav className="flex items-center gap-2" aria-label="AdventPay navigation">
        {loading ? <span className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" aria-label="Loading account" /> : profile ? <><AdventPayNotifications profile={profile} /><Link href={dashboardHref} className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-slate-900 sm:inline-flex"><UserRound className="h-4 w-4" /> Dashboard</Link><Button variant="secondary" size="sm" loading={signOut.isLoading} loadingText="Signing out…" onClick={() => void signOut.run()}><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span></Button></> : <><Link href="/adventpay/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-slate-900">Log in</Link><Link href="/adventpay/signup" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-700">Sign up</Link></>}
      </nav>
    </div>
  </header>;
}
