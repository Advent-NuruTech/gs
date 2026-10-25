"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { useAuth } from "@/hooks/useAuth";

export default function AdventPayDashboardShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { profile, loading } = useAuth(); const router = useRouter();
  useEffect(() => { if (loading) return; if (!profile) router.replace(`/adventpay/login?redirect=${encodeURIComponent(admin ? "/adventpay/admin" : "/adventpay/dashboard")}`); else if (admin && profile.role !== "admin") router.replace("/adventpay/dashboard"); else if (!admin && profile.role === "admin") router.replace("/adventpay/admin"); }, [admin, loading, profile, router]);
  if (loading || !profile || (admin && profile.role !== "admin") || (!admin && profile.role === "admin")) return <div className="p-4 sm:p-6"><PageSkeleton label="Loading your AdventPay dashboard…" variant="cards" /></div>;
  return <section className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</section>;
}
