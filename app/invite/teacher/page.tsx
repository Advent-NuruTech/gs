"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { registerUser } from "@/lib/firebase/auth";
import {
  consumeTeacherInvite,
  findTeacherInviteByToken,
  isInviteExpired,
} from "@/services/teacherInviteService";
import { TeacherInvite } from "@/types/teacherInvite";

function TeacherInvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useNotificationContext();

  const [invite, setInvite] = useState<TeacherInvite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => searchParams?.get("token")?.trim() ?? "", [searchParams]);

  useEffect(() => {
    if (!token) {
      setInvite(null);
      setLoadingInvite(false);
      return;
    }

    const loadInvite = async () => {
      setLoadingInvite(true);
      try {
        const data = await findTeacherInviteByToken(token);
        setInvite(data);
      } catch {
        setInvite(null);
      } finally {
        setLoadingInvite(false);
      }
    };

    loadInvite();
  }, [token]);

  const inviteExpired = invite ? isInviteExpired(invite) : false;
  const inviteValid = Boolean(invite && !invite.used && !inviteExpired);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!invite || !inviteValid) return;

    setSubmitting(true);
    try {
      const credential = await registerUser({
        email: invite.email,
        password,
        displayName,
        role: "teacher",
      });
      await consumeTeacherInvite(invite.id, credential.user.uid);
      pushToast("Teacher account created.", "success");
      router.push("/dashboard/teacher");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Invite activation failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg items-center px-4 py-10">
      <section className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Teacher Invite</h1>
        <p className="text-sm text-slate-600">
          This page uses your secure invite token automatically from the link.
        </p>

        {loadingInvite && <p className="text-sm text-slate-600">Validating invite...</p>}
        {!loadingInvite && !token ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Missing invite token.
          </p>
        ) : null}
        {!loadingInvite && token && !invite ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Invite token is invalid.
          </p>
        ) : null}
        {!loadingInvite && invite?.used ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            This invite has already been used.
          </p>
        ) : null}
        {!loadingInvite && inviteExpired ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            This invite has expired. Ask admin for a new link.
          </p>
        ) : null}

        {inviteValid ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Invite Token"
              value={token}
              readOnly
              className="bg-slate-50 text-slate-500"
            />
            <Input
              label="Email"
              type="email"
              value={invite?.email ?? ""}
              readOnly
              className="bg-slate-50 text-slate-500"
            />
            <Input
              label="Display Name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Accept Invite"}
            </Button>
          </form>
        ) : null}

        <p className="text-sm text-slate-600">
          Student?{" "}
          <Link href="/login" className="font-semibold text-blue-700 hover:underline">
            Go to login
          </Link>
        </p>
      </section>
    </main>
  );
}

function TeacherInviteFallback() {
  return <main className="mx-auto max-w-lg px-4 py-10 text-sm text-slate-600">Loading invite...</main>;
}

export default function TeacherInvitePage() {
  return (
    <Suspense fallback={<TeacherInviteFallback />}>
      <TeacherInvitePageContent />
    </Suspense>
  );
}
