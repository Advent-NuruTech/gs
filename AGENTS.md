# AdventSkool — Project Memory

## Official domain

- **Official domain (current): `adventskool.co.ke`** — always use this. Full URL form: `https://adventskool.co.ke`.
- **Old/retired domain: `skills.adventnurutech.xyz` / `adventnurutech.xyz`** — do not reintroduce it anywhere (code, docs, metadata, OAuth redirect URIs, email `From:` domain).
- Canonical site URL comes from `NEXT_PUBLIC_SITE_URL`, with `https://adventskool.co.ke` as the hardcoded fallback (used in `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/(public)/designs/layout.tsx`, `lib/email/templates.ts`).
- Transactional email sender domain: `noreply@adventskool.co.ke` (`EMAIL_FROM` in `lib/email/resend.ts`).
- `adventnurutech@gmail.com` is the public contact/support address — it is an email, not the domain; leave it unless told otherwise.
- Auth-related domain config: Google OAuth authorized domain + origins/redirect URIs and Supabase Site URL / redirect URLs all use `adventskool.co.ke`. See `docs/GOOGLE_SETUP.md`.
- Domain change checklist when it changes again: app metadata fallbacks, email templates/sender, Google OAuth client (authorized JS origins + redirect URIs + authorized domain), Supabase Auth URL configuration, docs.

## Quality checks

```bash
npm run typecheck
npm run lint
```
