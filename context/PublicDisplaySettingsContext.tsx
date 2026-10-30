"use client";

import { createContext, ReactNode, useContext } from "react";

import { useAsyncData } from "@/hooks/useAsyncData";
import { useAuth } from "@/hooks/useAuth";
import { getPublicDisplaySettings } from "@/services/publicDisplaySettingsService";

interface PublicDisplaySettingsContextValue {
  showViewCounts: boolean;
}

const PublicDisplaySettingsContext = createContext<PublicDisplaySettingsContextValue>({
  showViewCounts: false,
});

export function PublicDisplaySettingsProvider({ children }: { children: ReactNode }) {
  const settings = useAsyncData(getPublicDisplaySettings, []);
  const { profile } = useAuth();

  return (
    <PublicDisplaySettingsContext.Provider value={{ showViewCounts: profile?.role === "admin" || (settings.data?.showViewCounts ?? false) }}>
      {children}
    </PublicDisplaySettingsContext.Provider>
  );
}

export function usePublicDisplaySettings() {
  return useContext(PublicDisplaySettingsContext);
}
