# Google Calendar + Meet Integration — Setup Guide

Production domain: **https://skills.adventnurutech.xyz**
Supabase project ref: **vngpizdxwrvbpdjlgiag**

Two separate Google flows are used (one OAuth client serves both):

1. **Sign in with Google** (Supabase Auth) — clean signup/login; Google users get the
   same `profiles` row as email/password users (single source of truth).
2. **Connect Google Calendar** (in-app OAuth) — lets teachers/admins (and students,
   for personal reminders) authorize AdventSkool to create Calendar events and
   Google Meet links on their behalf.

---

## 1. Environment variables

Add these to `.env.local` (development) **and** to your hosting provider's
environment settings (production):

```bash
# Google OAuth client (from Google Cloud Console — step 2 below)
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx

# Absolute URL of the app (used to build the OAuth redirect URI)
# Production:
NEXT_PUBLIC_SITE_URL=https://skills.adventnurutech.xyz
# Development: NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional — only set these if you want to override the defaults
# GOOGLE_OAUTH_REDIRECT_URI=https://skills.adventnurutech.xyz/api/google/oauth/callback
# GOOGLE_OAUTH_STATE_SECRET=<any long random string>   # defaults to the service-role key
```

Already configured (unchanged): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Google Cloud Console

https://console.cloud.google.com — create (or reuse) a project, e.g. *AdventSkool*.

### 2a. Enable APIs (APIs & Services → Library)

| API | Required for |
|---|---|
| **Google Calendar API** | Creating/updating/cancelling events + Meet links (required) |
| **Google Meet REST API** | Attendance sync from real Meet participation (optional — only works when the meeting host is a Google Workspace account) |

### 2b. OAuth consent screen (APIs & Services → OAuth consent screen)

- User type: **External**
- App name: `AdventSkool`, support email: `adventnurutech@gmail.com`
- **Authorized domain**: `adventnurutech.xyz`
- Scopes — add these non-sensitive + sensitive scopes:
  - `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
  - `https://www.googleapis.com/auth/calendar.events`
  - `https://www.googleapis.com/auth/meetings.space.readonly` (optional, for attendance)
- **Publishing status: In production.** While the app is in *Testing* mode, refresh
  tokens expire after 7 days and only test users can connect — fine for development,
  not for go-live. (Google may ask for verification because `calendar.events` is a
  sensitive scope; the app keeps working for users while verification is pending,
  they just see an "unverified app" warning.)

### 2c. OAuth client (APIs & Services → Credentials → Create credentials → OAuth client ID)

- Application type: **Web application**, name e.g. `AdventSkool Web`

**Authorized JavaScript origins** — add all of:

```
https://skills.adventnurutech.xyz
https://vngpizdxwrvbpdjlgiag.supabase.co
http://localhost:3000
```

**Authorized redirect URIs** — add all of:

```
https://skills.adventnurutech.xyz/api/google/oauth/callback
https://vngpizdxwrvbpdjlgiag.supabase.co/auth/v1/callback
http://localhost:3000/api/google/oauth/callback
```

- The first URI is the in-app **Connect Google Calendar** flow (production).
- The second is **Sign in with Google** through Supabase Auth.
- The third is the connect flow during local development.

Copy the generated **Client ID** and **Client secret** into the env vars above.

---

## 3. Supabase Dashboard

https://supabase.com/dashboard/project/vngpizdxwrvbpdjlgiag

### 3a. Enable the Google provider (Authentication → Sign In / Providers → Google)

- Toggle **Enable Sign in with Google** on.
- Paste the **same** Client ID and Client secret from step 2c.
- Leave the shown callback URL as is — it is the
  `https://vngpizdxwrvbpdjlgiag.supabase.co/auth/v1/callback` you already added in 2c.

### 3b. URL configuration (Authentication → URL Configuration)

- **Site URL**: `https://skills.adventnurutech.xyz`
- **Additional redirect URLs**:

```
https://skills.adventnurutech.xyz/auth/callback
http://localhost:3000/auth/callback
```

(`/auth/callback` is the app route that exchanges the OAuth code for a session and
drops the user on their role dashboard.)

### 3c. Database

Migration `supabase/migrations/0005_live_classes.sql` is **already applied** to this
project (google_accounts, meetings, meeting_invitees, meeting_attendance + RLS).
To re-apply on a fresh database: `node scripts/run-sql.mjs supabase/migrations/0005_live_classes.sql`.

---

## 4. How the pieces map to features

| Feature | Where |
|---|---|
| Sign up / log in with Google | Buttons on `/login` and `/register` → Supabase Auth → `app/auth/callback` |
| Connect Google account | Account page + Live Classes pages → `/api/google/oauth/start` |
| Schedule live class (teacher) | Dashboard → Live Classes → Schedule (own courses only) |
| Schedule any meeting (admin) | Dashboard → Live Classes → Schedule (course / everyone / teachers / students / hand-picked people) |
| Student learning reminder | Student → Live Classes → New Reminder (calendar event on their own Google if connected; no Meet link) |
| Calendar event + Meet link | Created automatically on the host's Google calendar; invitations + email/popup reminders sent by Google (`sendUpdates=all`) |
| Recurring classes | "Repeats" selector (daily / weekly RRULEs) |
| Edit / reschedule / cancel | Pencil / trash icons on meetings you host — Google Calendar stays in sync |
| Join Meeting button | Shown only to users who can see the meeting (RLS: enrolled students for live classes, audience role for general meetings, invitees for custom ones); active from 15 min before start |
| Attendance | Every Join click is recorded (`meeting_attendance`); hosts can also "Sync from Google Meet" (needs Workspace host) |
| Upcoming Meetings widget | Student/teacher/admin dashboards + inside each course page |

## 5. Production checklist

- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL=https://skills.adventnurutech.xyz` set in the production environment
- [ ] OAuth consent screen published **In production**
- [ ] All 3 redirect URIs + 3 origins added to the OAuth client
- [ ] Google provider enabled in Supabase with the same client credentials
- [ ] Supabase Site URL + redirect URLs configured
- [ ] Each teacher/admin opens **Account → Connect Google** once before scheduling
