"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUserProfile, logoutUser } from "@/services/authService";
import { AppUser } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function syncRoleCookie(profile: AppUser | null, userId: string | null) {
  if (!profile || !userId) return;
  const maxAgeSeconds = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `adventskool_uid=${userId}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
  document.cookie = `adventskool_role=${profile.role}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function clearRoleCookie() {
  document.cookie = "adventskool_uid=; path=/; max-age=0; samesite=lax";
  document.cookie = "adventskool_role=; path=/; max-age=0; samesite=lax";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function applySession(nextUser: User | null) {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        clearRoleCookie();
        setLoading(false);
        return;
      }
      try {
        const userProfile = await getUserProfile(nextUser.id);
        if (!active) return;
        setProfile(userProfile);
        if (userProfile) {
          syncRoleCookie(userProfile, nextUser.id);
        } else {
          clearRoleCookie();
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (active) applySession(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      applySession(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      logout: async () => {
        await logoutUser();
        clearRoleCookie();
        setProfile(null);
        setUser(null);
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
