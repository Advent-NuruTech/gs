import { Suspense } from "react";
import AdventPayAuth from "@/components/adventpay/AdventPayAuth";
import PageSkeleton from "@/components/ui/PageSkeleton";
export default function AdventPaySignupPage() { return <Suspense fallback={<PageSkeleton label="Loading AdventPay sign up…" variant="cards" />}><AdventPayAuth mode="signup" /></Suspense>; }
