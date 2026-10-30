# Authentication email setup

Signup confirmation and password recovery are sent by Supabase Auth, independently of the app's Resend API integration. Deploy the application changes before installing the recovery template.

1. Verify `adventskool.co.ke` in Resend, including its required DNS records.
2. In Supabase Authentication > SMTP settings enable custom SMTP: host `smtp.resend.com`, port `465` (or `587`), username `resend`, password the Resend API key, sender `noreply@adventskool.co.ke`, and sender name `AdventSkool`. Store the key only in the provider's secret configuration; never commit it.
3. In Authentication > URL Configuration set Site URL to `https://adventskool.co.ke` and allow `https://adventskool.co.ke/auth/callback` and the local development equivalent. Keep email confirmation enabled.
4. In Authentication > Email Templates paste `supabase/email-templates/confirmation.html` into Confirm signup (subject: `Confirm your AdventSkool email`) and `supabase/email-templates/recovery.html` into Reset password (subject: `Reset your AdventSkool password`). The recovery template uses the token hash so links also work on a different device. It must point to the deployed callback. The signup template preserves Supabase's confirmation URL and redirect. Disable email link tracking in Resend.
5. Verify a real signup and password reset, including opening the reset email on a different device, using an account and mailbox you control. Check Resend delivery logs and the verified domain if an email does not arrive. Some email security scanners consume single-use links; if this occurs, request a new link or use an OTP-based flow.

The application email sender uses `RESEND_API_KEY` and `EMAIL_FROM`, separate from Supabase SMTP settings. Set these in the deployment environment as well. The sender address must belong to a verified Resend domain.

References: https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/auth/auth-email-templates.
