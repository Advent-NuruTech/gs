"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, X } from "lucide-react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import StatCard from "@/components/ui/StatCard";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import {
  buildTeacherInviteLink,
  createTeacherInvite,
  listTeacherInvitesByAdmin,
} from "@/services/teacherInviteService";
import {
  createManagedUser,
  deleteManagedUser,
  listUsers,
  updateManagedUser,
} from "@/services/userService";
import { TeacherInvite } from "@/types/teacherInvite";
import { AppUser } from "@/types/user";
import Link from "next/link";
import StatusCard from "@/components/ui/StatusCard";

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();
  const [feedback, setFeedback] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const detailsRef = useRef<HTMLDialogElement>(null);
  const report = (message: string, kind: "success" | "error") => { setFeedback({ message, kind }); pushToast(message, kind); };
  const [users, setUsers] = useState<AppUser[]>([]);
  const [invites, setInvites] = useState<TeacherInvite[]>([]);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppUser["role"]>("student");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteExpiry, setInviteExpiry] = useState("72");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [latestInviteLink, setLatestInviteLink] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatorActionId, setCreatorActionId] = useState<string | null>(null);
  const [category, setCategory] = useState<"all" | AppUser["role"]>("all");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (selectedUser?.id && detailsRef.current && !detailsRef.current.open) detailsRef.current.showModal();
  }, [selectedUser?.id]);

  const creatorAction = async (id: string, action: string, hours?: number) => {
    if (creatorActionId) return;
    setCreatorActionId(id);
    try {
      const { data } = await (await import("@/lib/supabase/client")).getSupabaseBrowserClient().auth.getSession();
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) }, body: JSON.stringify({ id, action, hours }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Account update failed.");
      report("Account updated.", "success");
      await reload();
      setSelectedUser(null);
    } catch (error) { report(error instanceof Error ? error.message : "Account update failed.", "error"); }
    finally { setCreatorActionId(null); }
  };

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const [allUsers, myInvites] = await Promise.all([listUsers(), listTeacherInvitesByAdmin(profile.id)]);
        setUsers(allUsers);
        setInvites(myInvites);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load accounts.");
      } finally { setLoading(false); }
    }
    load();
  }, [profile]);

  const reload = async () => {
    if (!profile) return;
    const [allUsers, myInvites] = await Promise.all([
      listUsers(),
      listTeacherInvitesByAdmin(profile.id),
    ]);
    setUsers(allUsers);
    setInvites(myInvites);
  };

  const visibleUsers = users.filter((user) =>
    (category === "all" || user.role === category) &&
    `${user.displayName} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading && profile) return <PageSkeleton label="Loading user accounts" variant="cards" />;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">People</p><h1 className="text-3xl font-bold text-slate-950">User accounts</h1><p className="mt-1 text-sm text-slate-600">Search, filter, and manage account access.</p></div><Link href="/dashboard/admin/creator-applications" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Review creator applications</Link></div>
      {feedback ? <StatusCard kind={feedback.kind} title={feedback.message} onDismiss={() => setFeedback(null)} /> : null}
      {loadError ? <StatusCard kind="error" title="Could not load accounts" description={loadError} /> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: "All accounts", value: users.length }, { label: "Students", value: users.filter((u) => u.role === "student").length }, { label: "Creators", value: users.filter((u) => u.role === "teacher").length }, { label: "Admins", value: users.filter((u) => u.role === "admin").length }].map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} />)}</div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row"><Input label="Search users" placeholder="Name or email" value={search} onChange={(event) => setSearch(event.target.value)} /><label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Account category<select className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="all">All categories ({users.length})</option><option value="student">Students ({users.filter((u) => u.role === "student").length})</option><option value="teacher">Teachers / creators ({users.filter((u) => u.role === "teacher").length})</option><option value="admin">Admins ({users.filter((u) => u.role === "admin").length})</option></select></label></div>

      <details className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer text-lg font-semibold text-slate-900 dark:text-slate-100">Create user</summary>
        <div className="mt-4">
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (creating) return;
            setCreating(true);
            try {
              await createManagedUser({
                displayName: newName,
                email: newEmail,
                password: newPassword,
                role: newRole,
              });
              report("User account created.", "success");
              setNewName("");
              setNewEmail("");
              setNewPassword("");
              setNewRole("student");
              await reload();
            } catch (error) {
              report(error instanceof Error ? error.message : "Failed to create user.", "error");
            } finally {
              setCreating(false);
            }
          }}
        >
          <Input label="Display Name" value={newName} onChange={(event) => setNewName(event.target.value)} required />
          <Input label="Email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required />
          <Input
            label="Temporary Password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Role
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as AppUser["role"])}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="submit" loading={creating} loadingText="Creating...">
              {creating ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
        </div>
      </details>

      <details className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer text-lg font-semibold text-slate-900 dark:text-slate-100">Invite a creator</summary>
        <div className="mt-4 space-y-4">
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!profile || creatingInvite) return;
            setCreatingInvite(true);
            try {
              const invite = await createTeacherInvite({
                email: inviteEmail,
                invitedBy: profile.id,
                expiresInHours: Number(inviteExpiry),
              });
              const link = buildTeacherInviteLink(invite.token);
              setLatestInviteLink(link);
              report("Teacher invite created.", "success");
              await reload();
            } catch (error) {
              report(error instanceof Error ? error.message : "Failed to create invite.", "error");
            } finally {
              setCreatingInvite(false);
            }
          }}
        >
          <Input
            label="Teacher Email"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            required
          />
          <Input
            label="Expiry Hours"
            type="number"
            min={1}
            value={inviteExpiry}
            onChange={(event) => setInviteExpiry(event.target.value)}
            required
          />
          <div className="md:col-span-2">
            <Button type="submit" loading={creatingInvite} loadingText="Generating...">
              {creatingInvite ? "Generating..." : "Generate Invite Link"}
            </Button>
          </div>
        </form>

        {latestInviteLink ? (
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-800">Latest Invite Link</p>
            <p className="break-all text-sm text-slate-600">{latestInviteLink}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(latestInviteLink);
                report("Invite link copied.", "success");
              }}
            >
              Copy Link
            </Button>
          </div>
        ) : null}

        {invites.length > 0 ? (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">{invite.email}</p>
                <p className="text-slate-600">Expires: {new Date(invite.expiresAt).toLocaleString()}</p>
                <p className={invite.used ? "text-emerald-700" : "text-blue-700"}>
                  {invite.used ? "Used" : "Active"}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        </div>
      </details>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label="Account directory">
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700"><h2 className="font-semibold text-slate-950 dark:text-white">Account directory</h2><p className="text-sm text-slate-500 dark:text-slate-400">{visibleUsers.length} {visibleUsers.length === 1 ? "account" : "accounts"} shown</p></div>
        <div className="hidden grid-cols-[3rem_minmax(0,2fr)_minmax(0,2fr)_8rem_5rem] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400 md:grid"><span>No.</span><span>Name</span><span>Email</span><span>Role</span><span>Details</span></div>
        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {visibleUsers.map((user, index) => <li key={user.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 md:grid-cols-[3rem_minmax(0,2fr)_minmax(0,2fr)_8rem_5rem]">
            <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{index + 1}</span>
            <div className="min-w-0"><p className="break-words font-semibold text-slate-900 dark:text-slate-100">{user.displayName || "Unnamed account"}</p><p className="break-all text-sm text-slate-500 dark:text-slate-400 md:hidden">{user.email}</p><p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400 md:hidden">{user.role === "teacher" ? "Creator" : user.role}</p></div>
            <span className="hidden min-w-0 break-all text-sm text-slate-600 dark:text-slate-300 md:block">{user.email}</span><span className="hidden text-sm capitalize text-slate-600 dark:text-slate-300 md:block">{user.role === "teacher" ? "Creator" : user.role}</span>
            <button type="button" onClick={() => { setFeedback(null); setSelectedUser({ ...user }); }} className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800" aria-label={`View details for ${user.displayName || user.email}`}><Eye className="h-5 w-5" /></button>
          </li>)}
        </ol>
        {visibleUsers.length === 0 ? <div className="p-4"><StatusCard kind="info" title="No matching accounts" description="Try another search or account category." /></div> : null}
      </section>
      {selectedUser ? <dialog ref={detailsRef} onClose={() => setSelectedUser(null)} aria-labelledby="account-details-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900 sm:p-6"><div className="space-y-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 id="account-details-title" className="text-lg font-semibold text-slate-950 dark:text-white">Account details</h2><p className="break-all text-sm text-slate-500 dark:text-slate-400">{selectedUser.email}</p></div><button type="button" onClick={() => setSelectedUser(null)} aria-label="Close account details" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
        {feedback ? <StatusCard kind={feedback.kind} title={feedback.message} onDismiss={() => setFeedback(null)} /> : null}
        <div className="grid gap-3 md:grid-cols-2"><Input label="Name" value={selectedUser.displayName} onChange={(event) => setSelectedUser({ ...selectedUser, displayName: event.target.value })} /><label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Role<select value={selectedUser.role} onChange={(event) => setSelectedUser({ ...selectedUser, role: event.target.value as AppUser["role"] })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="student">Student</option><option value="teacher">Creator</option><option value="admin">Admin</option></select></label></div>
        <dl className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2"><div><dt className="font-semibold">Phone</dt><dd className="break-words">{selectedUser.phone || "Not provided"}</dd></div><div><dt className="font-semibold">Joined</dt><dd>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "Unknown"}</dd></div><div><dt className="font-semibold">Creator application</dt><dd className="capitalize">{selectedUser.creatorStatus || "none"}</dd></div><div><dt className="font-semibold">Access</dt><dd>{selectedUser.suspendedUntil && new Date(selectedUser.suspendedUntil) > new Date() ? `Suspended until ${new Date(selectedUser.suspendedUntil).toLocaleString()}` : "Active"}</dd></div></dl>
        <div className="flex flex-wrap gap-2">
          <Button loading={savingId === selectedUser.id} loadingText="Saving..." disabled={!!creatorActionId || !!deletingId} onClick={async () => { if (savingId) return; setSavingId(selectedUser.id); try { await updateManagedUser(selectedUser.id, { displayName: selectedUser.displayName, role: selectedUser.role }); setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, displayName: selectedUser.displayName, role: selectedUser.role } : u)); report("User updated.", "success"); } catch (error) { report(error instanceof Error ? error.message : "Failed to update user.", "error"); } finally { setSavingId(null); } }}>Save changes</Button>
          {selectedUser.creatorStatus === "pending" ? <><Button disabled={!!creatorActionId || !!savingId || !!deletingId} loading={creatorActionId === selectedUser.id} onClick={() => creatorAction(selectedUser.id, "approve_creator")}>Approve creator</Button><Button variant="secondary" disabled={!!creatorActionId || !!savingId || !!deletingId} onClick={() => creatorAction(selectedUser.id, "reject_creator")}>Reject application</Button></> : null}
          {selectedUser.role === "teacher" ? <>{selectedUser.suspendedUntil && new Date(selectedUser.suspendedUntil) > new Date() ? <Button variant="secondary" disabled={!!creatorActionId || !!savingId || !!deletingId} onClick={() => creatorAction(selectedUser.id, "restore")}>Restore access</Button> : <><Button variant="secondary" disabled={!!creatorActionId || !!savingId || !!deletingId} onClick={() => creatorAction(selectedUser.id, "suspend", 24)}>Suspend 24 hours</Button><Button variant="secondary" disabled={!!creatorActionId || !!savingId || !!deletingId} onClick={() => creatorAction(selectedUser.id, "suspend", 720)}>Suspend 30 days</Button><Button variant="secondary" disabled={!!creatorActionId || !!savingId || !!deletingId} onClick={() => { const days = Number(window.prompt("Suspend for how many days? (1?365)", "7")); if (Number.isInteger(days) && days >= 1 && days <= 365) void creatorAction(selectedUser.id, "suspend", days * 24); }}>Custom suspension</Button></>}</> : null}
          <Button variant="danger" loading={deletingId === selectedUser.id} loadingText="Deleting..." disabled={selectedUser.id === profile?.id || !!creatorActionId || !!savingId} onClick={async () => { if (deletingId || !window.confirm(`Delete the account for ${selectedUser.displayName || selectedUser.email}?`)) return; setDeletingId(selectedUser.id); try { await deleteManagedUser(selectedUser.id); setUsers(prev => prev.filter(u => u.id !== selectedUser.id)); setSelectedUser(null); report("User deleted from profile records.", "success"); } catch (error) { report(error instanceof Error ? error.message : "Failed to delete user.", "error"); } finally { setDeletingId(null); } }}>Delete account</Button>
        </div>
      </div></dialog> : null}
    </section>
  );
}
