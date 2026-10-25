import { Suspense } from "react";
import AdventPayAuth from "@/components/adventpay/AdventPayAuth";
import PageSkeleton from "@/components/ui/PageSkeleton";
export default function AdventPayLoginPage() { return <Suspense fallback={<PageSkeleton label="Loading AdventPay login…" variant="cards" />}><AdventPayAuth mode="login" /></Suspense>; }
