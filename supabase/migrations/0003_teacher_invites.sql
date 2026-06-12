-- Reconcile teacher_invites columns with the TeacherInvite type.
alter table teacher_invites
  add column if not exists expires_at timestamptz,
  add column if not exists used boolean not null default false,
  add column if not exists used_by uuid references profiles(id) on delete set null,
  add column if not exists used_at timestamptz;

alter table teacher_invites drop column if exists status;
alter table teacher_invites drop column if exists accepted_at;
