import type { Metadata } from "next";
import { Suspense } from "react";

import AdminLoginPageClient from "@/components/auth/AdminLoginPageClient";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "AdventSkool administrator sign-in portal.",
  robots: { index: false, follow: false },
};

function AdminLoginFallback() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-400">Loading…</main>;
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginPageClient />
    </Suspense>
  );
}
