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

## 4. One-time DNS/custom domain setup (local)

One-time prerequisite:
1. Add/verify zone for `suttaspeed.com` and point registrar nameservers to Cloudflare.

Worker custom domain is configured by deploy:
- `api.suttaspeed.com` -> `palispeedread-worker` (from `wrangler.toml`)

Run once locally to attach Pages domains:

```bash
curl -X POST \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/suttaspeed/domains" \
  --data '{"name":"suttaspeed.com"}'

curl -X POST \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/suttaspeed/domains" \
  --data '{"name":"www.suttaspeed.com"}'
```

Then create DNS records once:
- `CNAME suttaspeed.com -> suttaspeed.pages.dev` (proxied)
- `CNAME www.suttaspeed.com -> suttaspeed.pages.dev` (proxied)

Required token scopes for local API setup:
- Account: `Cloudflare Pages:Edit`
- Account: `Workers Scripts:Edit`
- Zone: `Zone:Read`
- Zone: `DNS:Edit`

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
