import { Suspense } from "react";

import AdminLoginPageClient from "@/components/auth/AdminLoginPageClient";

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
