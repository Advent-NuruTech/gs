import { Suspense } from "react";

import LoginPageClient from "@/components/auth/LoginPageClient";

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
