"use client";

import { useEffect, useState } from "react";

import {
  AuthMethodSettings,
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
        // Fail closed: a method must never briefly appear when the app cannot
        // confirm that an administrator has enabled it.
        if (active) setSettings({ googleEnabled: false, emailEnabled: false });
      });

    return () => {
      active = false;
    };
  }, []);

  return settings;
}
