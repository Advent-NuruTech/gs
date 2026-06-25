import type { Metadata } from "next";
import { Suspense } from "react";

import RegisterPageClient from "@/components/auth/RegisterPageClient";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your AdventSkool student account and start learning with structured, mobile-first courses.",
};

function RegisterFallback() {
  return <main className="mx-auto max-w-md px-4 py-16 text-sm text-slate-600">Loading registration...</main>;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterPageClient />
    </Suspense>
  );
}
