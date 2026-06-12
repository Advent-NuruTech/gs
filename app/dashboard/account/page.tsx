"use client";

import { FormEvent, useEffect, useState } from "react";
import { Mail, Lock, User, Phone, ShieldCheck } from "lucide-react";

import GoogleConnectCard from "@/components/meetings/GoogleConnectCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationContext } from "@/context/NotificationContext";
import {
  updateUserEmail,
  updateUserPassword,
  updateUserProfile,
} from "@/services/authService";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export default function AccountPage() {
  const { profile, loading } = useAuth();
  const { pushToast } = useNotificationContext();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setPhone(profile.phone || "");
    setNewEmail(profile.email);
  }, [profile]);

  if (loading || !profile) {
    return <div className="rounded-md border border-slate-200 bg-white p-4 text-slate-600">Loading account…</div>;
  }

  const normalizedPhone = normalizePhone(phone);
  const validPhone = /^254\d{9}$/.test(normalizedPhone);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (displayName.trim().length < 3) {
      pushToast("Name must be at least 3 characters.", "error");
      return;
    }
    if (!validPhone) {
      pushToast("Enter a valid Kenyan phone (e.g. 0712345678).", "error");
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile(profile.id, { displayName: displayName.trim(), phone: normalizedPhone });
      pushToast("Profile updated.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!newEmail.includes("@")) {
      pushToast("Enter a valid email address.", "error");
      return;
    }
    if (newEmail.trim().toLowerCase() === profile.email.toLowerCase()) {
      pushToast("That is already your email.", "info");
      return;
    }
    setSavingEmail(true);
    try {
      await updateUserEmail(newEmail.trim());
      pushToast(
        `Confirmation link sent to ${newEmail.trim()}. Your email changes once you confirm it.`,
        "success",
      );
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not update email.", "error");
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      pushToast("Password must be at least 6 characters.", "error");
      return;
    }
    if (password !== confirmPassword) {
      pushToast("Passwords do not match.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await updateUserPassword(password);
      setPassword("");
      setConfirmPassword("");
      pushToast("Password updated.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Could not update password.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Account Settings</h2>
        <p className="text-sm text-slate-600">Manage your profile, email, and password.</p>
      </div>

      <GoogleConnectCard redirectPath="/dashboard/account" />

      {/* Profile */}
      <form onSubmit={saveProfile} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <User className="h-4 w-4 text-indigo-500" /> Profile
        </h3>
        <Input label="Full Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <div>
          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712345678"
            required
          />
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Phone className="h-3 w-3" /> Saved as {normalizedPhone || "254…"} for SMS receipts &amp; alerts.
          </p>
        </div>
        <Button type="submit" disabled={savingProfile}>
          {savingProfile ? "Saving…" : "Save Profile"}
        </Button>
      </form>

      {/* Email */}
      <form onSubmit={saveEmail} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Mail className="h-4 w-4 text-indigo-500" /> Email Address
        </h3>
        <Input label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
        <p className="flex items-start gap-1 text-xs text-slate-500">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
          Changing your email sends a confirmation link to the new address. The change takes effect only after you
          click that link.
        </p>
        <Button type="submit" variant="secondary" disabled={savingEmail}>
          {savingEmail ? "Sending…" : "Update Email"}
        </Button>
      </form>

      {/* Password */}
      <form onSubmit={savePassword} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Lock className="h-4 w-4 text-indigo-500" /> Password
        </h3>
        <Input
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <Button type="submit" variant="secondary" disabled={savingPassword}>
          {savingPassword ? "Updating…" : "Change Password"}
        </Button>
      </form>
    </section>
  );
}
