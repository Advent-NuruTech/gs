# SERVE subdomain setup

The SERVE public pages are served from the existing AdventSkool application deployment:

- `https://serve.adventskool.co.ke/` — landing page
- `https://serve.adventskool.co.ke/register` — registration
- `https://serve.adventskool.co.ke/timetable` — public timetable

Before launch:

1. Attach `serve.adventskool.co.ke` as a domain/hostname to the existing production deployment in its hosting provider.
2. Add the exact DNS record(s) the hosting provider specifies for that hostname in the authoritative DNS zone for `adventskool.co.ke`.
3. Wait for DNS and TLS verification to complete, then verify the landing page, registration, timetable, and gallery asset URLs using the subdomain.
4. Keep `NEXT_PUBLIC_SITE_URL`, the main platform canonical URL, Supabase auth URLs, OAuth origins, and email sender configuration on `https://adventskool.co.ke`. The SERVE subdomain is an additional public hostname, not a replacement for the main application origin.

The application middleware maps the subdomain root, `/register`, and `/timetable` to the existing SERVE routes. Existing `/serve/*` links are redirected to their shorter subdomain paths. DNS and hosting-provider domain attachment are external deployment steps and are not changed by this repository code.

SERVE gallery uploads are stored as public image assets in Cloudflare R2 with metadata in D1, using the existing Cloudflare storage configuration described in [CLOUDFLARE_STORAGE_SETUP.md](./CLOUDFLARE_STORAGE_SETUP.md). Do not configure or use Cloudinary for new SERVE gallery uploads.
