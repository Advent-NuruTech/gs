"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/user";

export function useRoleGuard(allowedRoles: UserRole[]) {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(profile.role)) {
      router.replace(`/dashboard/${profile.role}`);
    }
  }, [allowedRoles, loading, profile, router]);

  return {
    isAllowed: Boolean(profile && allowedRoles.includes(profile.role)),
    role: profile?.role,
    loading,
  };
}
