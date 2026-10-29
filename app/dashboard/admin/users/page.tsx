"use client";

import { useEffect, useState } from "react";

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

  const creatorAction = async (id: string, action: string, hours?: number) => {
    setCreatorActionId(id);
    try {
      const { data } = await (await import("@/lib/supabase/client")).getSupabaseBrowserClient().auth.getSession();
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) }, body: JSON.stringify({ id, action, hours }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Account update failed.");
      pushToast("Account updated.", "success");
      await reload();
    } catch (error) { pushToast(error instanceof Error ? error.message : "Account update failed.", "error"); }
    finally { setCreatorActionId(null); }
  };

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const [allUsers, myInvites] = await Promise.all([
        listUsers(),
        listTeacherInvitesByAdmin(profile.id),
      ]);
      setUsers(allUsers);
      setInvites(myInvites);
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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">People</p><h1 className="text-3xl font-bold text-slate-950">User accounts</h1><p className="mt-1 text-sm text-slate-600">Search, filter, and manage account access.</p></div><Link href="/dashboard/admin/creator-applications" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Review creator applications</Link></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "All accounts", value: users.length }, { label: "Students", value: users.filter((u) => u.role === "student").length }, { label: "Teachers / creators", value: users.filter((u) => u.role === "teacher").length }, { label: "Admins", value: users.filter((u) => u.role === "admin").length }].map((stat) => <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-600">{stat.label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{stat.value}</p></article>)}</div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"><Input label="Search users" placeholder="Name or email" value={search} onChange={(event) => setSearch(event.target.value)} /><label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-700">Account category<select className="rounded-lg border border-slate-300 bg-white px-3 py-2.5" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="all">All categories ({users.length})</option><option value="student">Students ({users.filter((u) => u.role === "student").length})</option><option value="teacher">Teachers / creators ({users.filter((u) => u.role === "teacher").length})</option><option value="admin">Admins ({users.filter((u) => u.role === "admin").length})</option></select></label></div>

      <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">Create User</h3>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setCreating(true);
            try {
              await createManagedUser({
                displayName: newName,
                email: newEmail,
                password: newPassword,
                role: newRole,
              });
              pushToast("User account created.", "success");
              setNewName("");
              setNewEmail("");
              setNewPassword("");
              setNewRole("student");
              await reload();
            } catch (error) {
              pushToast(error instanceof Error ? error.message : "Failed to create user.", "error");
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
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </article>

      <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">Invite Teacher</h3>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!profile) return;
            setCreatingInvite(true);
            try {
              const invite = await createTeacherInvite({
                email: inviteEmail,
                invitedBy: profile.id,
                expiresInHours: Number(inviteExpiry),
              });
              const link = buildTeacherInviteLink(invite.token);
              setLatestInviteLink(link);
              pushToast("Teacher invite created.", "success");
              await reload();
            } catch (error) {
              pushToast(error instanceof Error ? error.message : "Failed to create invite.", "error");
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
            <Button type="submit" disabled={creatingInvite}>
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
                pushToast("Invite link copied.", "success");
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
      </article>

      <div className="space-y-3">
        {visibleUsers.map((user) => (
          <article key={user.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Name"
                value={user.displayName}
                onChange={(event) =>
                  setUsers((prev) =>
                    prev.map((item) =>
                      item.id === user.id ? { ...item, displayName: event.target.value } : item,
                    ),
                  )
                }
              />
              <Input label="Email" value={user.email} readOnly className="bg-slate-50 text-slate-500" />
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Role
                <select
                  value={user.role}
                  onChange={(event) =>
                    setUsers((prev) =>
                      prev.map((item) =>
                        item.id === user.id ? { ...item, role: event.target.value as AppUser["role"] } : item,
                      ),
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.creatorStatus === "pending" ? <>
                <span className="self-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">Creator application in review</span>
                <Button type="button" disabled={creatorActionId === user.id} onClick={() => creatorAction(user.id, "approve_creator")}>Approve creator</Button>
                <Button type="button" variant="secondary" disabled={creatorActionId === user.id} onClick={() => creatorAction(user.id, "reject_creator")}>Reject application</Button>
              </> : null}
              {user.role === "teacher" ? <>
                {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() ? <Button type="button" disabled={creatorActionId === user.id} onClick={() => creatorAction(user.id, "restore")}>Restore access</Button> : <Button type="button" variant="secondary" disabled={creatorActionId === user.id} onClick={() => creatorAction(user.id, "suspend", 24)}>Suspend 24 hours</Button>}
                <Button type="button" variant="secondary" disabled={creatorActionId === user.id} onClick={() => creatorAction(user.id, "suspend", 24 * 30)}>Suspend 30 days</Button>
                <Button type="button" variant="secondary" disabled={creatorActionId === user.id} onClick={() => { const days = Number(window.prompt("Suspend for how many days? (1–365)", "7")); if (Number.isInteger(days) && days >= 1 && days <= 365) void creatorAction(user.id, "suspend", days * 24); }}>Custom suspension…</Button>
              </> : null}
              <Button
                type="button"
                onClick={async () => {
                  setSavingId(user.id);
                  try {
                    await updateManagedUser(user.id, {
                      displayName: user.displayName,
                      role: user.role,
                    });
                    pushToast("User updated.", "success");
                  } catch (error) {
                    pushToast(error instanceof Error ? error.message : "Failed to update user.", "error");
                  } finally {
                    setSavingId(null);
                  }
                }}
                disabled={savingId === user.id}
              >
                {savingId === user.id ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  setDeletingId(user.id);
                  try {
                    await deleteManagedUser(user.id);
                    pushToast("User deleted from profile records.", "success");
                    setUsers((prev) => prev.filter((item) => item.id !== user.id));
                  } catch (error) {
                    pushToast(error instanceof Error ? error.message : "Failed to delete user.", "error");
                  } finally {
                    setDeletingId(null);
                  }
                }}
                disabled={user.id === profile?.id || deletingId === user.id}
              >
                {deletingId === user.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </article>
        ))}
        {visibleUsers.length === 0 ? <StatusCard kind="info" title="No matching accounts" description="Try another search or account category." /> : null}
      </div>
    </section>
  );
}
