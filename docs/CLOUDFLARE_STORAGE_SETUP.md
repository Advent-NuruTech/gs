# Cloudflare product storage

Digital Product uploads use Cloudflare D1 for file metadata and a private R2 bucket for the file bytes. Supabase continues to hold accounts, product commerce rows, orders, and payments during the staged migration. Product `image_url` and `file_url` values become stable AdventSkool `/api/storage/assets/{id}` references rather than exposing R2 credentials or object keys.

## 1. Create Cloudflare resources

Create:

- a private R2 bucket (for example `adventskool-products`);
- a D1 database (the worker example expects `adventskool-storage`);
- an R2 API token restricted to Object Read & Write for only that bucket.

Never use a public R2 development URL for paid deliverables.

Apply the D1 schema:

```bash
npx wrangler d1 execute adventskool-storage --remote --file=cloudflare/d1/migrations/0001_asset_storage.sql
```

The schema seeds the current global default. Users are not shown the numeric default; an over-limit upload receives an instruction to apply for more upload size. Administrators can change the global value or set a custom/unlimited account override at `/dashboard/admin/storage-settings`.

## 2. Configure R2 CORS

Direct signed browser uploads require this bucket CORS policy (keep only origins actually used):

The ready-to-apply Wrangler policy is `cloudflare/r2-cors.json`. Apply and verify it with:

```bash
npx wrangler r2 bucket cors set adventskool-products --file=cloudflare/r2-cors.json
npx wrangler r2 bucket cors list adventskool-products
```

The Cloudflare dashboard JSON editor uses the HTTP API field format instead of Wrangler's configuration-file format. Prefer the Wrangler commands above to avoid mixing the two schemas.

Presigned URLs use the R2 S3 endpoint, not a custom domain. They expire after 15 minutes for uploads and after a few minutes for reads.

## 3. Deploy the D1 proxy worker (recommended)

Edit the D1 `database_id` in `cloudflare/storage-worker/wrangler.toml`, then deploy:

```bash
cd cloudflare/storage-worker
npx wrangler secret put STORAGE_SHARED_SECRET
npx wrangler deploy
```

The worker exposes only an authenticated server-to-server query endpoint. The Next.js application never sends this secret to the browser. The Cloudflare D1 REST API fallback is supported for initial rollout, but Cloudflare recommends a Worker binding for application traffic because the REST endpoint shares the global Cloudflare API rate limit.

## 4. Application environment

Required for R2:

```text
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_BUCKET=adventskool-products
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
```

Preferred D1 connection:

```text
CLOUDFLARE_STORAGE_WORKER_URL=https://adventskool-storage-metadata.<subdomain>.workers.dev
CLOUDFLARE_STORAGE_SHARED_SECRET=
```

Temporary D1 REST fallback (use instead of the two worker values):

```text
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_API_TOKEN=
```

Keep all credentials server-side. None of these variables may use a `NEXT_PUBLIC_` prefix.

## 5. Gradual migration

New Digital Product uploads go directly to R2 after the server checks the effective account allowance. D1 first records a pending asset; completion performs an R2 `HEAD` check and marks it ready only when the size exactly matches.

Existing products continue to work from Cloudinary. On either admin product list, click **Sync** for one product at a time. Sync performs this order:

1. read the legacy image and deliverable;
2. enforce the product owner's effective allowance;
3. copy each object to R2;
4. verify its R2 size and reopen path;
5. bind the D1 assets to the product;
6. switch the Supabase product URLs;
7. delete the old Cloudinary object.

If any step before the URL switch fails, the live product keeps its old URLs. If Cloudinary cleanup fails, the product remains live from R2 and the UI reports that the old copy needs manual cleanup.

The server sends a fixed `Content-Length` when copying to R2, and checks that the uploaded object can be read before switching the product. If an older PDF uses the same URL for its cover and deliverable, add a separate cover before syncing so the PDF is not made public.

R2 single-request limits still apply to an account marked unlimited. Add multipart uploads before allowing objects that exceed R2's single-`PUT` limit.
