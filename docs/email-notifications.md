# Email Notification System

Resend-powered email automation, layered **on top of** the existing in-app
notification system (`notifications` table / `notificationService` / toast
`NotificationContext`) — none of which is modified. Everything here is additive.

## What it does

| Feature | Trigger | Audience |
| --- | --- | --- |
| **New course** | `courses.published` flips `false → true` (DB trigger) | Subscribers who enrolled in / paid for a course in the **same category** |
| **Bi-monthly promotion** | pg_cron on the 1st & 15th | All subscribers (`marketing_subscribed = true`) |
| **Admin campaigns** | Admin UI → immediate or scheduled | All subscribers, or a category's interested learners |
| **Subscription prompt** | Public header banner + signup checkbox | Logged-in users with `marketing_subscribed = false` |

## Architecture

```
producers ──────────────►  email_queue  ◄────── drained by ──── /api/cron/email/process
  • courses publish trigger     (outbox)           (rate-limited, batched)         │
  • enqueue_campaign_emails()                                                       ▼
  • enqueue_promotion_emails()                                              Resend REST API
```

- **`email_queue`** — one row per recipient. `html` precomputed (campaigns) or
  rendered at send time from `template` + `payload` (`new_course`, `promotion`).
  `dedup_key` (unique) makes every producer idempotent.
- **`email_campaigns`** — admin-authored campaigns (matches the spec schema:
  title, subject, html_content, target_audience, category, scheduled_at, status).
- **Processor** caps each run at `EMAIL_MAX_PER_RUN` (default 40) with a
  `EMAIL_DELAY_MS` (default 600 ms) pause between sends. Combined with the cron
  cadence this spreads large audiences over time within free-tier limits.

### Files
- `supabase/migrations/0007_email_notifications.sql` — schema, publish trigger, fan-out functions, RLS.
- `lib/email/{resend,templates,render,cron}.ts` — sender, HTML templates, render layer, cron auth.
- `app/api/cron/email/{process,promotions}/route.ts` — queue drainer & bi-monthly promo.
- `app/api/admin/email-campaigns/{route,preview}.ts` — admin campaign create/list/preview.
- `services/{emailCampaignService,marketingService}.ts` — client services.
- `components/dashboard/EmailCampaignComposer.tsx`, `app/dashboard/admin/email-campaigns/page.tsx` — admin UI.
- `components/marketing/SubscribeBanner.tsx` — public-header opt-in banner.

## Environment

Already present: `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`,
`SUPABASE_SERVICE_ROLE_KEY`. Added: **`CRON_SECRET`** (shared secret for the
cron routes — must match the value used in the pg_cron jobs).

Optional tuning: `EMAIL_MAX_PER_RUN`, `EMAIL_DELAY_MS`, `EMAIL_MAX_ATTEMPTS`.

## Setup (one-time)

1. **Apply the migration** (`supabase/migrations/0007_email_notifications.sql`).
2. **Schedule the cron jobs** in the Supabase SQL editor — see the commented
   block at the bottom of the migration. Replace `<APP_URL>` and `<CRON_SECRET>`:

   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;

   select cron.schedule('email-process', '*/5 * * * *',
     $$ select net.http_post(
          url := '<APP_URL>/api/cron/email/process',
          headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')); $$);

   select cron.schedule('email-promotions', '0 9 1,15 * *',
     $$ select net.http_post(
          url := '<APP_URL>/api/cron/email/promotions',
          headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')); $$);
   ```

3. **Verify** by publishing a course (in a category that has enrollments) and
   then triggering the processor manually:

   ```bash
   curl -H "x-cron-secret: <CRON_SECRET>" <APP_URL>/api/cron/email/process
   ```

## Notes / decisions

- Course URLs are **id-based** (`/courses/<id>`) — the app has no slug column or
  slug route, so emails link by id to avoid breaking routing.
- "Subscribed to a category" is **derived from enrollments/payments** (no
  separate category-subscription UI), per the chosen targeting model.
- The processor sends sequentially per row so each recipient's status/retry is
  tracked individually. Retries up to `EMAIL_MAX_ATTEMPTS`, then marked `failed`.
