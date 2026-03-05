# Cloudflare Setup (suttaspeed.com)

This project is now configured for:
- Worker API custom domain: `api.suttaspeed.com`
- Web app domain: `https://suttaspeed.com`

## 1. Authenticate Wrangler

Run locally:

```bash
pnpm exec wrangler login
```

This opens OAuth in your browser.

## 2. Create R2 buckets

```bash
pnpm exec wrangler r2 bucket create speedreadsuttas-data
pnpm exec wrangler r2 bucket create speedreadsuttas-data-preview
```

## 3. Create Pages project

```bash
pnpm exec wrangler pages project create suttaspeed
```

Build output directory: `packages/web/dist`

## 4. Configure DNS / custom domains in Cloudflare dashboard

1. Add/verify zone for `suttaspeed.com`.
2. Worker route/custom domain:
   - `api.suttaspeed.com` -> `palispeedread-worker`
3. Pages custom domain:
   - `suttaspeed.com`
   - `www.suttaspeed.com` (optional)

## 5. Build web against API domain

Set:

```bash
VITE_API_URL=https://api.suttaspeed.com
```

Example file is provided at `packages/web/.env.production.example`.

## 6. Deploy

Worker:

```bash
pnpm --filter @palispeedread/worker deploy
```

Web:

```bash
pnpm --filter @palispeedread/web build
pnpm exec wrangler pages deploy packages/web/dist --project-name suttaspeed
```

## Notes

- Allowed CORS origins are configured in `packages/worker/wrangler.toml`.
- Runtime data path remains Worker -> R2.
