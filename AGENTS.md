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

## Creator payouts and Paystack splits

- Creator payout onboarding registers each teacher's Kenyan bank details with Paystack as a subaccount. Bank names/codes come from Paystack's `/bank?currency=KES` endpoint. New full account numbers are sent server-to-server to Paystack, then discarded; AdventSkool stores only the Paystack subaccount code and the last four digits. The subaccount code is server-only.
- Apply `supabase/migrations/0014_creator_payouts.sql` and `0015_paystack_creator_splits.sql` before deploying payout features. Migration 0015 masks and clears raw account numbers from the earlier payout form; affected teachers need to resubmit their bank details to create a Paystack subaccount.
- Admin verification is required after Paystack registers a subaccount. Only profiles marked verified/ready get split parameters at course checkout. Checkout snapshots the rate, amount, fee mode, and routing mode onto the payment before redirecting, so later settings changes affect future checkouts only.
- Paystack subaccount `percentage_charge` is kept equal to AdventSkool's commission percentage (the platform's share); creator-specific rates are synced when saved/verified, and default-rate changes update subaccounts without an individual override. New subaccounts are created with the effective platform rate. If Paystack cannot accept a rate update, the local rate/verification change is not saved. At checkout, the exact commission amount is also passed as a KES minor-unit `transaction_charge`, which overrides the subaccount percentage for that sale. `fee_mode=inclusive` sets Paystack's fee bearer to `account` (AdventSkool); `fee_mode=exclusive` sets it to `subaccount` (creator). Customer checkout amounts stay as currently calculated. Paystack's transaction verification fee is stored on the earnings ledger.
- Split-mode earnings are marked routed after verified customer payment. This means Paystack accepted the allocation; it is not proof that the creator's bank has settled. Confirm settlement in Paystack's settlement reports. Historical and platform-only earnings are not automatically transferred by this integration.
- The account must have live Paystack API credentials, a configured platform settlement account, and Paystack subaccount/split functionality enabled for KES. Confirm feature access with Paystack if subaccount creation or split initialization is rejected. Test in Paystack test mode first, then deploy the same flow with live keys and verify one low-value transaction and its settlement report.
- `PAYSTACK_SECRET_KEY` stays server-side. Never expose it, the Paystack subaccount code, or a full bank account number to browser code, logs, client responses, or git. Payout endpoints use the service-role client; authenticated browser clients have no direct table access to payout account data.

## Project memory maintenance

- Whenever a material change is made to product behavior, payments, authentication, data schema, third-party configuration, deployment, or operational setup, update this `AGENTS.md` in the same change with the current state, required configuration, and any rollout or safety notes.
- Remove or revise outdated project-memory entries when the implementation changes. Project memory must describe what the deployed system actually does, not planned behavior.
