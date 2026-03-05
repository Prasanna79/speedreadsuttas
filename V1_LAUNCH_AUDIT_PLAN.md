# V1 Launch Audit And Plan

Date: 2026-03-05

## 1. Audit Summary

Status: **Ready after final governance step**.

Completed technical checks:

1. Local quality gates pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
2. Production domains respond:
   1. `https://suttaspeed.com` => HTTP 200
   2. `https://www.suttaspeed.com` => HTTP 200
   3. `https://api.suttaspeed.com/api/v1/sutta/mn1/text/en/sujato` => segment payload returned
3. Catalog/ingest checks:
   1. Search index length: `4050`
   2. Worker data files: `search-index.json=4050`, `translation-manifest.json=4050`
   3. Local R2 sync summary exists with full upload (`19358` files uploaded in run)
4. Secret exposure checks:
   1. `.env*` files are ignored by git
   2. Tracked file + history pattern scans found no committed token/private key values
   3. GitHub secrets confirmed: `CF_API_TOKEN`, `CF_ACCOUNT_ID`
5. Dependency security:
   1. `pnpm audit --prod` => no known vulnerabilities.

## 2. Changes Implemented For Launch Hardening

1. Branding and discoverability:
   1. Favicons, app icons, and apple touch icon wired into web app.
   2. Added canonical/OG/Twitter metadata.
   3. Added `site.webmanifest`.
   4. Added `robots.txt` and `sitemap.xml`.
   5. Added wordmark logo in top navigation.
2. Web response security:
   1. Added Cloudflare Pages `_headers` with CSP, HSTS, nosniff, frame denial, referrer policy, and permissions policy.
3. API hardening:
   1. Added stronger default security headers in Worker JSON responses.
   2. Added `/api/v1/healthz`.
   3. Fixed unsupported UID handling to avoid 500 for invalid text-route UID shapes.
4. CI/CD hardening:
   1. Added least-privilege `permissions` on workflows.
   2. Added CI secret scan gate (`gitleaks`).
   3. Added scheduled production health check workflow.
5. Local key hygiene:
   1. `.env.local` file mode tightened to `600`.
   2. Added `.cache` and `logs` to `.gitignore`.

## 3. Remaining Mandatory Step Before V1 Launch

1. Enable branch protection on `main`:
   1. Require pull request.
   2. Require status checks to pass before merge.
   3. Block force-push and branch deletion.
   4. Require conversation resolution.

Note: this is intentionally left as the final governance switch after pipeline changes are merged and checks are green.

## 4. Post-Launch (Day 1-3)

1. Rotate `CF_API_TOKEN` once and update GitHub + local `.env.local`.
2. Verify production health-check workflow history for at least 24 hours.
3. Review Cloudflare analytics for 5xx and latency outliers.
