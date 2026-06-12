"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, User, Lock, GraduationCap, Phone } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { registerUser } from "@/services/authService";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export default function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useNotificationContext();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const redirectPath = useMemo(() => {
    const redirect = searchParams.get("redirect");
    if (!redirect) return null;
    if (!redirect.startsWith("/") || redirect.startsWith("//")) return null;
    return redirect;
  }, [searchParams]);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const validPhone = /^254\d{9}$/.test(normalizedPhone);

  const isValid =
    displayName.trim().length > 2 &&
    email.includes("@") &&
    validPhone &&
    password.length >= 6;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const { needsConfirmation } = await registerUser({
        displayName,
        email,
        phone: normalizedPhone,
        password,
        role: "student",
      });
      if (needsConfirmation) {
        pushToast(
          `Account created. We sent a confirmation link to ${email}. Confirm it, then log in.`,
          "success",
        );
        router.push(`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`);
        return;
      }
      pushToast("Welcome! Your account has been created.", "success");
      router.push(redirectPath ?? "/dashboard/student");
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Registration failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                adventskool
              </span>
            </div>
          </Link>
          <p className="text-sm text-slate-600 mt-2">
            Join thousands of learners advancing their careers
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/60 transition-all duration-300 hover:shadow-2xl"
        >
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Create Student Account
            </h1>
            <p className="text-sm text-slate-500">
              Start your structured learning journey today
            </p>
          </div>

          <div className="space-y-5">
            {/* Full Name Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <User className="w-4 h-4 text-indigo-500" />
                Full Name
              </label>
              <Input
                label="Full Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                placeholder="John Doe"
                required
                className={`pl-10 transition-all duration-200 ${
                  focusedField === "name" ? "ring-2 ring-indigo-200 border-indigo-400" : ""
                }`}
              />
              {displayName && displayName.length < 3 && displayName.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Name must be at least 3 characters
                </p>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Mail className="w-4 h-4 text-indigo-500" />
                Email Address
              </label>
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="you@example.com"
                required
                className={`pl-10 transition-all duration-200 ${
                  focusedField === "email" ? "ring-2 ring-indigo-200 border-indigo-400" : ""
                }`}
              />
              {email && !email.includes("@") && (
                <p className="text-xs text-amber-600 mt-1">
                  Please enter a valid email address
                </p>
              )}
            </div>

            {/* Phone Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Phone className="w-4 h-4 text-indigo-500" />
                Phone Number
              </label>
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
                placeholder="0712345678"
                required
                className={`pl-10 transition-all duration-200 ${
                  focusedField === "phone" ? "ring-2 ring-indigo-200 border-indigo-400" : ""
                }`}
              />
              <p className="text-xs text-slate-500 mt-1">
                Used for payment receipts &amp; alerts. Saved as {normalizedPhone || "254…"}.
              </p>
              {phone && !validPhone && (
                <p className="text-xs text-amber-600 mt-1">
                  Enter a valid Kenyan number (e.g. 0712345678).
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Lock className="w-4 h-4 text-indigo-500" />
                Password
              </label>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                  className={`pl-10 pr-12 transition-all duration-200 ${
                    focusedField === "password" ? "ring-2 ring-indigo-200 border-indigo-400" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        password.length >= level * 2
                          ? password.length >= 8
                            ? "bg-green-500"
                            : "bg-amber-500"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Minimum 6 characters</span>
                  {password.length > 0 && (
                    <span className={password.length >= 8 ? "text-green-600" : "text-amber-600"}>
                      {password.length >= 8 ? "Strong" : "Weak"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
      {/* Terms and Privacy */}
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                 By creating an account, you agree  to the{" "}
                  <Link href="#" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !isValid}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
           
          </div>

  
          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </form>

       


{/* Footer Links */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <Link href="/help" className="hover:text-gray-700">Help</Link>
            <span className="mx-2">·</span>
            <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:text-gray-700">Terms</Link>
          </div>

        
             
      </div>


      
    </main>
  );
}