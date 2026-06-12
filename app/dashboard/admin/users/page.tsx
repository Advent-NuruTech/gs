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

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Users</h2>

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
        {users.map((user) => (
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
      </div>
    </section>
  );
}
