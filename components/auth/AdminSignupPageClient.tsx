"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";

import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { loginUser } from "@/services/authService";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export default function AdminSignupPageClient() {
  const router = useRouter();
  const { pushToast } = useNotificationContext();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const validPhone = /^254\d{9}$/.test(normalizedPhone);
  const isValid =
    displayName.trim().length > 2 &&
    email.includes("@") &&
    validPhone &&
    password.length >= 6 &&
    code.trim().length > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          phone: normalizedPhone,
          password,
          code: code.trim(),
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Could not create admin account.");
      }

      // Account is email-confirmed by the server, so sign straight in.
      await loginUser(email.trim(), password);
      pushToast("Admin account created. Welcome aboard.", "success");
      router.push("/dashboard/admin");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Signup failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell variant="dark">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-xl bg-slate-800 p-3">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Admin Account</h1>
          <p className="mt-1 text-sm text-slate-400">Requires the admin signup code.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-slate-700 bg-slate-900/85 p-6 backdrop-blur-md sm:p-8 shadow-2xl"
        >
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-200">
              <User className="h-4 w-4 text-emerald-400" /> Full Name
            </label>
            <Input
              label="Full Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Admin"
              required
              className="bg-slate-900 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-200">
              <Mail className="h-4 w-4 text-emerald-400" /> Email
            </label>
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@adventskool.com"
              required
              className="bg-slate-900 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-200">
              <Phone className="h-4 w-4 text-emerald-400" /> Phone
            </label>
            <Input
              type="tel"
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              required
              className="bg-slate-900 text-white placeholder:text-slate-500"
            />
            {phone && !validPhone ? (
              <p className="text-xs text-amber-400">Enter a valid Kenyan number (e.g. 0712345678).</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-200">
              <Lock className="h-4 w-4 text-emerald-400" /> Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-900 pr-12 text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-200">
              <KeyRound className="h-4 w-4 text-emerald-400" /> Admin Signup Code
            </label>
            <Input
              label="Admin Signup Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Provided by your organisation"
              required
              className="bg-slate-900 text-white placeholder:text-slate-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !isValid}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? "Creating…" : "Create Admin Account"}
          </Button>

          <p className="text-center text-sm text-slate-400">
            Already an admin?{" "}
            <Link href="/admin/login" className="font-semibold text-emerald-400 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
