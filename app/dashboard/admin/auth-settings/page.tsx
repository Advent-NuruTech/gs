"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";

import Button from "@/components/ui/Button";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import {
  AuthMethodSettings,
  getAuthMethodSettings,
  updateAuthMethodSettings,
} from "@/services/authSettingsService";

const options: Array<{
  key: keyof AuthMethodSettings;
  title: string;
  description: string;
}> = [
  {
    key: "googleEnabled",
    title: "Continue with Google",
    description: "Show Google authentication on both the public sign-in and sign-up pages.",
  },
  {
    key: "emailEnabled",
    title: "Continue with email",
    description: "Show the email and password forms on both the public sign-in and sign-up pages.",
  },
];

export default function AuthSettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { pushToast } = useNotificationContext();
  const [settings, setSettings] = useState<AuthMethodSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<AuthMethodSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (authLoading || profile?.role !== "admin") return;

    getAuthMethodSettings()
      .then((value) => {
        setSettings(value);
        setSavedSettings(value);
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Could not load auth settings.");
      });
  }, [authLoading, profile]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await updateAuthMethodSettings(settings);
      setSettings(saved);
      setSavedSettings(saved);
      pushToast("Authentication settings saved.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not save auth settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && profile?.role !== "admin") {
    return <p className="text-sm text-red-700">You do not have permission to manage authentication settings.</p>;
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
          <LockKeyhole className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Authentication Settings</h1>
          <p className="text-sm text-slate-600">Choose which sign-in methods visitors can see and use.</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {loadError ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </p>
        ) : !settings ? (
          <p className="text-sm text-slate-500">Loading authentication settings...</p>
        ) : (
          <>
            {options.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-start justify-between gap-5 rounded-lg border border-slate-200 p-4"
              >
                <span>
                  <span className="block font-semibold text-slate-900">{option.title}</span>
                  <span className="mt-1 block text-sm text-slate-600">{option.description}</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings[option.key]}
                  onChange={(event) =>
                    setSettings((current) =>
                      current ? { ...current, [option.key]: event.target.checked } : current,
                    )
                  }
                  className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            ))}

            {!settings.googleEnabled && !settings.emailEnabled ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Both public methods are off. Existing admin access remains available through the admin portal.
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={save}
                disabled={
                  saving ||
                  (savedSettings?.googleEnabled === settings.googleEnabled &&
                    savedSettings?.emailEnabled === settings.emailEnabled)
                }
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
