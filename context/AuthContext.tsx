"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase/config";
import { getUserProfile, logoutUser } from "@/lib/firebase/auth";
import { AppUser } from "@/types/user";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function syncRoleCookie(profile: AppUser | null, firebaseUser: User | null) {
  if (!profile || !firebaseUser) return;
  const maxAgeSeconds = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `adventskool_uid=${firebaseUser.uid}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
  document.cookie = `adventskool_role=${profile.role}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function clearRoleCookie() {
  document.cookie = "adventskool_uid=; path=/; max-age=0; samesite=lax";
  document.cookie = "adventskool_role=; path=/; max-age=0; samesite=lax";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        clearRoleCookie();
        setLoading(false);
        return;
      }

      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      if (userProfile) {
        syncRoleCookie(userProfile, user);
      } else {
        clearRoleCookie();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      logout: async () => {
        await logoutUser();
        clearRoleCookie();
      },
    }),
    [firebaseUser, profile, loading],
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
