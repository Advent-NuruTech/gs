import { Suspense } from "react";

import AdminSignupPageClient from "@/components/auth/AdminSignupPageClient";

function AdminSignupFallback() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-400">Loading…</main>;
}

export default function AdminSignupPage() {
  return (
    <Suspense fallback={<AdminSignupFallback />}>
      <AdminSignupPageClient />
    </Suspense>
  );
}
