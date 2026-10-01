import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterPageClient from "@/components/auth/RegisterPageClient";

export const metadata: Metadata = {
  title: "Creator Signup",
  description: "Create a creator account on AdventSkool and start publishing courses and digital products.",
};

export default function CreatorRegisterPage() {
  return <Suspense fallback={<main className="mx-auto max-w-md px-4 py-16 text-sm text-slate-600">Loading registration…</main>}><RegisterPageClient creatorMode /></Suspense>;
}
