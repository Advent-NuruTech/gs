"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, loginUser } from "@/services/authService";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const { pushToast } = useNotificationContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [rememberedUser, setRememberedUser] = useState<{email: string, name?: string} | null>(null);

  const redirectPath = useMemo(() => {
    const requested = searchParams.get("redirect");
    if (!requested) return null;
    if (!requested.startsWith("/") || requested.startsWith("//")) return null;
    return requested;
  }, [searchParams]);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (authLoading || !profile) return;
    router.replace(redirectPath ?? `/dashboard/${profile.role}`);
  }, [authLoading, profile, redirectPath, router]);

  // Load remembered email and user data
  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    const savedUserName = localStorage.getItem("remembered_user_name");
    
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
      if (savedUserName) {
        setRememberedUser({ email: savedEmail, name: savedUserName });
      } else {
        setRememberedUser({ email: savedEmail });
      }
    }
  }, []);

  const isValid = email.includes("@") && password.length >= 6;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const userId = await loginUser(email, password);
      const userProfile = await getUserProfile(userId);

      if (!userProfile) {
        pushToast("User profile not found.", "error");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
        if (userProfile.displayName) {
          localStorage.setItem("remembered_user_name", userProfile.displayName);
        }
      } else {
        localStorage.removeItem("remembered_email");
        localStorage.removeItem("remembered_user_name");
      }

      pushToast(`Welcome back, ${userProfile.displayName || 'learner'}!`, "success");
      router.push(redirectPath ?? `/dashboard/${userProfile.role}`);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Login failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Get personalized welcome message
  const getWelcomeMessage = () => {
    if (rememberedUser?.name) {
      return `Welcome back, ${rememberedUser.name.split(' ')[0]}!`;
    }
    return "Welcome Back";
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
            Continue your structured learning journey
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-slate-200/60 transition-all duration-300 hover:shadow-2xl"
        >
          <div className="space-y-1 text-center">
            <h1 className="text-3xl font-bold text-slate-900">
              {getWelcomeMessage()}
            </h1>
            <p className="text-sm text-slate-500">
              {rememberedUser?.name 
                ? "Great to see you again! Sign in to continue." 
                : "Sign in to continue your learning journey."}
            </p>
            {rememberedUser?.email && (
              <p className="text-xs text-indigo-600 mt-1">
                Signed in as {rememberedUser.email}
              </p>
            )}
          </div>

          <div className="space-y-5">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Mail className="w-4 h-4 text-indigo-500" />
                Email Address
              </label>
              <div className="relative">
                <Input
                
                  type="email"
                  label="Email Address"
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
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              {email && !email.includes("@") && (
                <p className="text-xs text-amber-600 mt-1">
                  Please enter a valid email address
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
                  type={showPassword ? "text" : "password"}
                  label="Password"
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
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
                />
                <span className="group-hover:text-indigo-600 transition-colors">Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !isValid}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                Sign In
              </span>
            )}
          </Button>

         
          <p className="text-center text-sm text-slate-600">
            No account?{" "}
            <Link
              href={
                redirectPath
                  ? `/register?redirect=${encodeURIComponent(redirectPath)}`
                  : "/register"
              }
              className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
            >
              Create student account
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          Secured login
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          Administrator?{" "}
          <Link href="/admin/login" className="font-semibold text-indigo-600 hover:underline">
            Go to Admin Portal
          </Link>
        </p>
      </div>
    </main>
  );
}