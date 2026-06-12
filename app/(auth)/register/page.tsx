import { Suspense } from "react";

import RegisterPageClient from "@/components/auth/RegisterPageClient";

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
