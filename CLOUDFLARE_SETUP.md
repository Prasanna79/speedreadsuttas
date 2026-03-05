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

## 4. DNS/custom domain automation

One-time prerequisite:
1. Add/verify zone for `suttaspeed.com` and point registrar nameservers to Cloudflare.

After that, CI handles the rest on every `main` deploy:
1. Worker custom domain:
   - `api.suttaspeed.com` -> `palispeedread-worker` (from `wrangler.toml`)
2. Pages custom domains:
   - `suttaspeed.com`
   - `www.suttaspeed.com`

Required token scopes for `CF_API_TOKEN`:
- Account: `Cloudflare Pages:Edit`
- Account: `Workers Scripts:Edit`
- Zone: `Zone:Read`

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
