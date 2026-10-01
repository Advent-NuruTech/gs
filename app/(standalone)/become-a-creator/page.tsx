"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  LogIn,
  Package,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatusCard from "@/components/ui/StatusCard";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api/client";

const benefits = [
  { label: "Share your knowledge", icon: BookOpen },
  { label: "Sell your products", icon: Package },
  { label: "Reach a wider audience", icon: UsersRound },
  { label: "Earn rewards", icon: ChartNoAxesColumnIncreasing },
];

export default function BecomeCreatorPage() {
  const { profile, loading } = useAuth();
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? "");
  useEffect(() => {
    if (profile?.whatsapp) setWhatsapp(profile.whatsapp);
  }, [profile?.whatsapp]);
  const submitApplication = useAsyncAction({
    action: async (number: string) => {
      await apiRequest("/api/creator/application", {
        method: "POST",
        body: JSON.stringify({ whatsapp: number }),
      });
    },
    successMessage:
      "Application submitted. Your creator account is in review. You can start creating now; sales will stay on the platform until an administrator verifies your account and payout details.",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitApplication.run(whatsapp);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
        <PageSkeleton label="Loading your account…" variant="plain" />
      </main>
    );
  }

  const alreadyCreator = profile?.role === "teacher";
  const applicationPending = profile?.creatorStatus === "pending";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-7 sm:space-y-8">
        <header className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100 sm:h-24 sm:w-24">
            <UserRoundPlus className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {alreadyCreator
              ? "Your creator account is ready"
              : applicationPending
                ? "Your application is in review"
                : profile
                  ? "Apply to become an AdventSkool creator"
                  : "Already learning with AdventSkool?"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            {alreadyCreator
              ? "Manage your courses and products from your creator dashboard."
              : applicationPending
                ? "We’ll review your application and let you know when your creator account is ready."
                : profile
                  ? "Add a working WhatsApp number to apply with your existing account."
                  : "Sign in with that account to apply. New to AdventSkool? Create your creator account here."}
          </p>
        </header>

        {submitApplication.status === "loading" ? (
          <StatusCard kind="loading" title="Submitting your application…" />
        ) : null}
        {submitApplication.status === "success" ? (
          <StatusCard
            kind="success"
            title="Application received"
            description={submitApplication.successMessage}
            onDismiss={submitApplication.reset}
          />
        ) : null}
        {submitApplication.status === "error" ? (
          <StatusCard kind="error" title="Could not submit your application" description={submitApplication.errorMessage} />
        ) : null}

        {alreadyCreator ? (
          <Link
            href="/dashboard/teacher"
            className="flex min-h-16 items-center justify-between gap-4 rounded-xl bg-blue-700 px-5 py-4 font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <span>Go to creator dashboard</span>
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
        ) : null}

        {applicationPending ? (
          <StatusCard kind="info" title="Application in review" description="An administrator will review your creator application." />
        ) : null}

        {!profile ? (
          <div className="space-y-4">
            <Link
              href="/login?redirect=%2Fbecome-a-creator"
              className="flex min-h-16 items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-5 py-4 font-semibold text-slate-900 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <span className="flex min-w-0 items-center gap-4">
                <LogIn className="h-6 w-6 shrink-0 text-slate-800" aria-hidden="true" />
                <span>Sign in</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
            </Link>
            <Link
              href="/register/creator"
              className="flex min-h-16 items-center justify-between gap-4 rounded-xl bg-blue-700 px-5 py-4 font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <span className="flex min-w-0 items-center gap-4">
                <UserRoundPlus className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span>Create creator account</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        {profile && !alreadyCreator && !applicationPending ? (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <Input
              label="Working WhatsApp number"
              type="tel"
              placeholder="+254712345678"
              autoComplete="tel"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              required
              disabled={submitApplication.isLoading}
            />
            <p className="text-sm leading-6 text-slate-600">
              Add payout details later from your creator dashboard. A reminder appears after you publish without payout details.
            </p>
            <Button type="submit" loading={submitApplication.isLoading} loadingText="Submitting application…">
              Apply to become a creator
            </Button>
          </form>
        ) : null}

        {!profile ? (
          <div className="flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-sm font-medium text-slate-500">OR</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        ) : null}

        <section aria-label="Creator benefits" className="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-3">
          {benefits.map(({ label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:h-16 sm:w-16">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <span className="max-w-32 text-sm font-semibold leading-5 text-slate-900">{label}</span>
            </div>
          ))}
        </section>

        <aside className="flex items-start gap-4 rounded-xl bg-blue-50 p-4 text-slate-600 sm:p-5">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" />
          <p className="text-sm leading-6">
            Your account and payouts are secure. We verify creator profiles and payout accounts before releasing earnings.
          </p>
        </aside>
      </div>
    </main>
  );
}
