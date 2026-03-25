# Repository Instructions

## Project overview

SuttaSpeed — a Pali sutta speed-reading app. Monorepo with `packages/web` (React frontend), `packages/worker` (Cloudflare Worker API), and `packages/shared`.

## Git workflow

- Do not commit directly to `main` by default.
- For any non-trivial change, create and work on a feature branch first.
- Open a pull request and let CI run before merging.
- Only push directly to `main` if the user explicitly asks for it.
- If work is already in progress on `main`, pause before committing and either:
  - create a branch from the current state, or
  - ask the user whether to continue on `main`.

## Dev commands

- `pnpm install` — install dependencies
- `pnpm typecheck` — run TypeScript checks across all packages (always run before pushing)
- `pnpm test` — run vitest across all packages
- `pnpm lint` — eslint + prettier check
- `pnpm data:build-index` — build search index + translation manifest from bilara-data
- `pnpm data:sync-r2` — sync text files to Cloudflare R2 (uses `BILARA_DATA_DIR`, `R2_BUCKET`, `UPLOAD_CONCURRENCY`, `DRY_RUN` env vars)

## R2 sync architecture

Text data comes from `suttacentral/bilara-data` (published branch). The sync uses **git-diff incremental sync**:

1. The last-synced commit SHA is stored in R2 at `_sync/last-commit.txt`
2. On each run, `git diff --name-status` between stored SHA and HEAD determines changed files
3. Only changed files are uploaded; SHA is updated after successful sync
4. If SHA is missing or unreachable, falls back to full sync (19k+ files — avoid this)

Core sync logic: `packages/worker/src/lib/r2-sync.ts`
Entry script: `scripts/sync-bilara-to-r2.ts`

### Bootstrapping the SHA marker

If the sync marker is lost (e.g., R2 bucket recreated), seed it manually to avoid a 6-hour full sync:

```bash
# Get HEAD of bilara-data published branch
git ls-remote https://github.com/suttacentral/bilara-data refs/heads/published

# Upload as sync marker
echo -n "<SHA>" > /tmp/last-commit.txt
pnpm --filter @palispeedread/worker exec wrangler r2 object put \
  speedreadsuttas-data/_sync/last-commit.txt --file /tmp/last-commit.txt --remote
```

## GitHub Actions workflows

| Workflow | Schedule | Notes |
|---|---|---|
| `ci.yml` | on push/PR | Lint, typecheck, test |
| `deploy.yml` | on push to main | Deploys worker + web |
| `sync-bilara.yml` | daily 2am UTC | Incremental R2 sync, 30min timeout, concurrency=10 |
| `health-check.yml` | every 6 hours | Checks web, API, catalog size, sample sutta |
| `dependabot-automerge.yml` | on PR | Auto-merges dependabot PRs |
