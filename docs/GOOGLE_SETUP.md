# Google Sign-In Setup

Production domain: **https://adventskool.co.ke**
Supabase project ref: **vngpizdxwrvbpdjlgiag**

Google is used only as an optional Supabase authentication provider. AdventSkool
does not connect to, read from, or write to Google Calendar or Google Meet.

## Environment variables

Configure these in development and production:

```bash
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_SITE_URL=https://adventskool.co.ke
```

## Google Cloud Console

Create an OAuth **Web application** client and configure:

- Authorized domain: `adventskool.co.ke`
- Authorized JavaScript origins:
  - `https://adventskool.co.ke`
  - `https://vngpizdxwrvbpdjlgiag.supabase.co`
  - `http://localhost:3000`
- Authorized redirect URIs:
  - `https://vngpizdxwrvbpdjlgiag.supabase.co/auth/v1/callback`

Only the standard identity scopes are needed: `openid`, `email`, and `profile`.
Do not enable Calendar or Meet API scopes for AdventSkool.

## Supabase configuration

In **Authentication → Sign In / Providers → Google**, enable Google and add the
same client ID and secret. In **URL Configuration**, set the Site URL to
`https://adventskool.co.ke` and allow:

```text
https://adventskool.co.ke/auth/callback
http://localhost:3000/auth/callback
```

Google-authenticated users follow the same role-aware signup and dashboard flow
as email/password users. Calendar scheduling is entirely native to AdventSkool.
