# AdventSkool — Project Memory

## Official domain

- **Official domain (current): `adventskool.co.ke`** — always use this. Full URL form: `https://adventskool.co.ke`.
- **Old/retired domain: `skills.adventnurutech.xyz` / `adventnurutech.xyz`** — do not reintroduce it anywhere (code, docs, metadata, OAuth redirect URIs, email `From:` domain).
- Canonical site URL comes from `NEXT_PUBLIC_SITE_URL`, with `https://adventskool.co.ke` as the hardcoded fallback (used in `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/(public)/designs/layout.tsx`, `lib/email/templates.ts`).
- Transactional email sender domain: `noreply@adventskool.co.ke` (`EMAIL_FROM` in `lib/email/resend.ts`).
- `adventskool@gmail.com` is the public contact/support address — it is an email, not the domain; leave it unless told otherwise. The older `adventnurutech@gmail.com` address is retired and must not be reintroduced.
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
- Standard creator payout terms are a 10% AdventSkool commission with Paystack processing fees charged to the creator (`fee_mode=exclusive`). Migration `0017_creator_payout_defaults.sql` sets this platform default; creator-specific overrides remain as saved. The public `/creator-payout-agreement` page documents the terms and directs special deal requests to `adventskool@gmail.com`; special arrangements apply only after written confirmation and settings update. Apply migration 0017 before deploying this default change. Existing commission overrides are not overwritten.
- Existing students can apply from the public “Teach & sell” link using their existing account, or new creators can register through `/register/creator` using the student signup UI with WhatsApp added. Creator accounts can create courses/products while pending admin review; checkout keeps sales platform-only until creator approval and payout verification. Admin user controls allow rejecting applications, timed suspension, restoration, and account deletion. Suspended sessions are denied by authenticated API routes until suspension expiry. Creator onboarding supports payout setup later; the teacher dashboard prompts creators who have published without payout details.
- Admin creator operations are available at `/dashboard/admin/creator-applications` and `/dashboard/admin/users`. The application page filters pending versus all applications, shows applicant WhatsApp and decision status, and approves/declines through the admin users API. Submissions through `/api/creator/application` and new creator registrations notify administrators in the dashboard notification feed; review decisions notify the applicant. The users page includes account totals, role filtering, and name/email search while retaining edit, delete, suspension, and restoration controls. Apply migration `0018_creator_application_notifications.sql` to enable notifications for creator registrations made through the signup flow.
- Email signup blocks a maintained list of common disposable email domains in the client registration service. Supabase email confirmation should remain enabled to ensure applicants verify ownership; the disposable domain block is not a substitute for configuring email confirmation or a maintained disposable-email provider.
- `PAYSTACK_SECRET_KEY` stays server-side. Never expose it, the Paystack subaccount code, or a full bank account number to browser code, logs, client responses, or git. Payout endpoints use the service-role client; authenticated browser clients have no direct table access to payout account data.

## UI feedback, loading, and navigation conventions

- **Always show a loading state to the user.** Never keep an action silent. For page loads, use `<PageSkeleton>` (with an accessible `label`) and `loading.tsx` files for routes. For button/form actions, pass `loading`/`loadingText` to `<Button>` or use `useAsyncAction` so the button is disabled, shows a spinner, and announces `aria-busy`.
- **Separate feedback from the page.** Use `<StatusCard>` for loading, success, error, warning, and info. Messages must appear in a raised, tinted card (not inline paragraph text that blends in). Use the `role`/`aria-live` that `StatusCard` provides (assertive for errors).
- **Block double submits.** Use `useAsyncAction` for any user-initiated request (forms, clicks). It ignores extra clicks while in flight. When you need manual state, set an explicit `isLoading` boolean and disable the trigger.
- **Route transitions are visible.** Mount `<RouteProgress>` in the root layout so all client-side navigations show the top progress bar (handled for `<Link>` clicks and for `useAppRouter`'s `push/replace`).
- **Consistent UI primitives.** Use shared components: `Card`, `CardHeader`, `CardBody`, `StatCard`, `Badge`, `Field`, `Input`, `Select`, `Button`, `Spinner`, `Skeleton`, `PageSkeleton`, `StatusCard`.
- **Icons: `lucide-react` only.** It is the house icon set and the only icon dependency. Do not add `react-icons`, Heroicons, Radix icons, or Font Awesome. Navigation link definitions (`PublicNavbar.navLinks`, `dashboard/Sidebar.linkMap`) each carry an `icon: LucideIcon` field that both the desktop and mobile/drawer renders draw from, so icons stay in sync automatically. Do not hand-inline raw `<svg>` markup; convert any that exist to lucide components.
- **Public nav account control.** `PublicNavbar` is the single public header (mounted in `app/(public)/layout.tsx`, so it covers every public route). It reads `useAuth()` and renders a three-way account control: a pulse placeholder while `authLoading`, a `CircleUser` profile button linking to `/dashboard/${profile.role}` when a profile exists, and the `Log in` link otherwise. Never render an unconditional `Log in` link here — a signed-in user must never see it. Both the desktop header and the mobile drawer implement this, plus `aria-current="page"` active states via `isNavActive`.
- **Data fetching pattern.** Prefer `useAsyncData` for page loads (always exposes `isLoading`, `errorMessage`, `reload`). Prefer `apiRequest<T>` for browser fetches — it parses JSON and throws the server's `error` message so failures are never silent.
- **Put these rules in memory.** Every new page must have a loading state (skeleton or status card), and every action that waits on the network must block repeats and display success/error in a distinct `StatusCard`. Apply these conventions to existing pages when you touch them.

## Mobile layout and overflow

- Every dashboard page and shared header control must fit narrow phone viewports without horizontal page scrolling or clipping. Use `min-w-0` on flex/grid children that contain text, allow long labels and prices to wrap, and stack cards/actions when side-by-side content no longer fits.
- Search results and notification panels must stay within the viewport, scroll internally when their content is long, and wrap long notification text. Check responsive behavior at a narrow mobile width whenever changing dashboard listings or header controls.

## Theme contrast follow-up

- Dark mode has reported text visibility/contrast problems in the cart, the homepage “Why new learners stay” section, the “Designed by Advent NuruTech” attribution, and the creator agreement title. Review these areas when working on theme styling and ensure text remains readable against its background in both light and dark modes.

## Project memory maintenance

- Whenever a material change is made to product behavior, payments, authentication, data schema, third-party configuration, deployment, or operational setup, update this `AGENTS.md` in the same change with the current state, required configuration, and any rollout or safety notes.
- Remove or revise outdated project-memory entries when the implementation changes. Project memory must describe what the deployed system actually does, not planned behavior.
