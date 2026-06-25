import type { Metadata } from "next";
import { Suspense } from "react";

import LoginPageClient from "@/components/auth/LoginPageClient";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your AdventSkool account to access your courses, track progress, and manage your learning.",
};

function LoginFallback() {
  return <main className="mx-auto max-w-md px-4 py-16 text-sm text-slate-600">Loading login...</main>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
