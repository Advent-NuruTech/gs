"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { registerUser } from "@/lib/firebase/auth";

export default function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useNotificationContext();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectPath = useMemo(() => {
    const redirect = searchParams.get("redirect");
    if (!redirect) return null;
    if (!redirect.startsWith("/") || redirect.startsWith("//")) return null;
    return redirect;
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await registerUser({ displayName, email, password, role: "student" });
      pushToast("Account created.", "success");
      router.push(redirectPath ?? "/dashboard/student");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Registration failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <form className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-6" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-slate-900">Student Registration</h1>
        <p className="text-sm text-slate-600">
          Teacher access is provisioned only through admin invite links.
        </p>
        <Input
          label="Display Name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </Button>
        <p className="text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="text-blue-700 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
