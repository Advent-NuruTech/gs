"use client";

import { useEffect, useState } from "react";

import {
  AuthMethodSettings,
  defaultAuthMethodSettings,
  getAuthMethodSettings,
} from "@/services/authSettingsService";

export function useAuthMethodSettings(): AuthMethodSettings | null {
  const [settings, setSettings] = useState<AuthMethodSettings | null>(null);

  useEffect(() => {
    let active = true;

    getAuthMethodSettings()
      .then((value) => {
        if (active) setSettings(value);
      })
      .catch(() => {
        if (active) setSettings(defaultAuthMethodSettings);
      });

    return () => {
      active = false;
    };
  }, []);

  return settings;
}
