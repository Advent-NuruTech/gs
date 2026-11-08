# AdventSkool

AdventSkool is a Kenya-focused learning and digital commerce platform at [adventskool.co.ke](https://adventskool.co.ke). It offers courses, Digital Products, creator storefronts and AdventPay invoicing.

## Stack and features

- Next.js App Router, React, TypeScript and Tailwind CSS.
- Supabase Auth and Postgres for accounts, application data and access policies.
- Paystack for course and product payments, creator splits and AdventPay payments.
- Private Cloudflare R2 and D1 for new Digital Product files; Cloudinary continues to serve legacy product assets and other media.
- Student, creator (`teacher` internally) and admin dashboards, lesson progress, live-class scheduling, notifications and creator payout management.
- Creator storefronts at `/@handle`, and AdventPay invoicing and collections at `/adventpay`.

## Local development

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Create `.env.local` with the configuration for your own services. The repository does not include an `.env.example`. Core Supabase configuration uses `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and server-only `SUPABASE_SERVICE_ROLE_KEY`. Set `NEXT_PUBLIC_SITE_URL` to the appropriate origin; production uses `https://adventskool.co.ke`.

Features require their own service configuration: `PAYSTACK_SECRET_KEY` for payments, Cloudinary settings for existing media, Cloudflare credentials for Digital Product storage, `RESEND_API_KEY` and sender settings for application email, and `CRON_SECRET` for scheduled jobs. Keep service-role keys, provider secrets and Cloudflare credentials server-side. See the setup guides below for details; features cannot be fully exercised without the corresponding services.

```bash
npm run typecheck
npm run lint
```

## Deployment and operations

Apply the applicable Supabase migrations in `supabase/migrations` in order before deploying the corresponding features. Existing databases should not blindly reapply migrations. The project memory in [AGENTS.md](AGENTS.md) describes feature-specific migration dependencies, payout safeguards, settlement reconciliation, and scheduled jobs.

- [Cloudflare Digital Product storage](docs/CLOUDFLARE_STORAGE_SETUP.md)
- [Google Sign-In](docs/GOOGLE_SETUP.md)
- [Authentication email](docs/AUTH_EMAIL_SETUP.md)
- [Email campaigns and scheduled processing](docs/email-notifications.md)

The admin-only handbook at `/dashboard/admin/documentation` is maintained in `lib/handbook/content.ts`; its screen, print-to-PDF and Markdown export use that shared content.

## Project structure

`app/` contains routes and APIs; `components/` contains UI and dashboard components; `services/`, `hooks/`, `context/`, `lib/` and `types/` contain application logic and shared types. Database migrations are in `supabase/migrations/`, and Cloudflare storage configuration is in `cloudflare/`.
