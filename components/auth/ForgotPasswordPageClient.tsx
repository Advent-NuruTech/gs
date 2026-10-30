"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";

import AuthShell from "@/components/auth/AuthShell";
import AuthLogo from "@/components/auth/AuthLogo";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusCard from "@/components/ui/StatusCard";
import { sendPasswordReset } from "@/services/authService";

export default function ForgotPasswordPageClient() {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);

  const isValid = email.includes("@");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setErrorMessage("");
    try {
      await sendPasswordReset(email.trim());
      setSent(true);

    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-6">
          <AuthLogo />
          <p className="text-sm text-slate-600 mt-2">Reset your account password</p>
        </div>

        <div className="space-y-6 rounded-3xl bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl border border-white/60">
          {sent ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto inline-flex items-center justify-center rounded-2xl bg-emerald-50 p-3">
                <MailCheck className="h-8 w-8 text-emerald-600" />
              </div>
              <StatusCard kind="success" title="Check your inbox" description="If an account exists for this email, a reset link is on its way." />
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Check your inbox</h1>
                <p className="text-sm text-slate-500">
                  If an account exists for{" "}
                  <span className="font-medium text-slate-700">{email}</span>, we sent a link to choose a new
                  password.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  try a different email
                </button>
                .
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage ? <StatusCard kind="error" title="Something went wrong" description={errorMessage} /> : null}
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
                <p className="text-sm text-slate-500">
                  Enter the email tied to your account and we&apos;ll send a link to reset it.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    label="Email Address"
                    hideLabel
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    required
                    className={`pl-10 transition-all duration-200 ${
                      focused ? "ring-2 ring-indigo-200 border-indigo-400" : ""
                    }`}
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {email && !email.includes("@") && (
                  <p className="text-xs text-amber-600 mt-1">Please enter a valid email address</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                loading={loading}
                loadingText="Sending link..."
                disabled={!isValid}
              >
                Send reset link
              </Button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
