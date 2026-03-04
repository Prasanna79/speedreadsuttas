# PaliSpeedRead - Implementation Plan (v6, Fully Autonomous + R2 Day 1)

Last updated: 2026-03-04
Source PRD: `speed-sutta-reading.md` (v2)

## 1. Non-Negotiable Constraints

- 100% automated flow from coding -> testing -> deployment.
- 100% automated test execution in CI on every change.
- 100% coverage gate (lines, branches, functions, statements) for `shared`, `worker`, and `web`.
- No manual QA, no manual deploy, no manual release gate.

## 2. Delivery Model (No Human In Loop)

Autonomous pipeline:

1. Work item appears in `IMPLEMENTATION_BACKLOG.md` or issue label `autobot`.
2. Agent workflow generates code changes on a branch.
3. Agent pushes commit and opens PR automatically.
4. CI runs full test matrix + coverage gate + lint + typecheck + E2E.
5. If all checks pass, PR auto-merges.
6. Merge to `main` auto-deploys Worker and Pages.
7. Post-deploy synthetic checks run; rollback is automatic on failure.

No manual approval steps are part of this path.

## 3. Runtime Architecture (R2 Day 1)

Frontend:

- React + TypeScript (Vite), client search via `/api/v1/search/index`.

Backend:

- Cloudflare Worker endpoints:
  - `GET /api/v1/sutta/:uid`
  - `GET /api/v1/sutta/:uid/text/:lang/:author`
  - `GET /api/v1/search/index`
- Runtime text source: Cloudflare R2 bucket (mandatory from day 1)
- Edge caching enabled on Worker responses.

Build artifact:

- `scripts/build-search-index.ts` emits `search-index.json` and translation manifest.
- `scripts/sync-bilara-to-r2.ts` ingests bilara-data `published` content into R2.

Data flow:

- Runtime path: Web -> Worker -> R2 (no GitHub calls in request path).
- Ingestion path (automated only): bilara-data `published` -> sync job -> R2 + index rebuild -> deploy.

## 4. Milestones And Automated Gates

### M0 - Bootstrap Automation

Scope:

- Monorepo scaffold and root scripts.
- GitHub Actions workflows scaffolded from day 1.
- Branch protection + auto-merge rules configured by script/API.
- R2 bucket binding and automated bootstrap validation.
- First automated bilara ingest to R2.

Exit gate (all automated):

- [ ] `pnpm build` green in CI
- [ ] `pnpm test` green in CI
- [ ] workflow required checks enforced on PRs
- [ ] R2 bucket reachable via Worker binding in CI/dev
- [ ] initial sync populated R2 objects for smoke UIDs (`mn1`, `sn12.2`)

### M1 - Shared Core (TDD + 100%)

Scope:

- Implement `uid.ts`, `tokenizer.ts`, `chunker.ts`, `timing.ts`, `search.ts`, shared types/constants.

Must-have tests:

- UID normalization and aliases
- Segment numeric ordering
- DN/MN/SN/AN/KN path generation
- AN grouped range fallback
- Tokenization punctuation and diacritics
- Chunking boundaries and timing multipliers

Exit gate:

- [ ] 100% coverage in `packages/shared`
- [ ] all shared tests pass in CI

### M2 - Worker API (TDD + 100%)

Scope:

- Implement required API routes and error contracts.
- Implement R2-backed data access for text and metadata lookup.
- Cache headers, CORS, and rate-limit handling.
- Serve generated search index.

Exit gate:

- [ ] 100% coverage in `packages/worker`
- [ ] route contract tests pass
- [ ] endpoint schema checks pass in CI
- [ ] runtime data fetches come from R2 only

### M3 - Web MVP (TDD + 100%)

Scope:

- Build routes `/`, `/read/:uid`, `/read/:uid/:lang/:author`.
- Build reader components and hooks.
- Integrate API and error states.

Exit gate:

- [ ] 100% coverage in `packages/web` (including hooks/components logic)
- [ ] Playwright E2E suite passes in CI
- [ ] happy path + error paths validated by automated tests only

### M4 - Autonomous CI/CD And Release

Scope:

- CI workflow (lint, typecheck, unit, integration, E2E, coverage).
- Auto-merge workflow on green checks.
- Deploy workflow on merge to `main`.
- Post-deploy canary and rollback automation.

Exit gate:

- [ ] zero manual deployment steps
- [ ] auto-merge and auto-deploy proven in test run
- [ ] rollback workflow verified

### M5 - Autonomous Scale-Up (Trigger-Based)

Automatic triggers:

- p95 Worker response > 1.5s for 3 consecutive days
- R2 read latency/error budget breach
- sustained traffic beyond free-tier thresholds

Automatic actions:

- optimize R2 key layout + cache strategy
- increase sync parallelism and delta-sync tuning
- redeploy Worker automatically

No human intervention for trigger handling.

## 5. CI/CD Spec (Strict)

## 5.1 `ci.yml` (required checks)

Runs on every PR and push:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (all packages)
- `pnpm test:e2e`
- coverage assertion: 100% for each package and overall
- artifact upload (coverage + test reports)

Any failure blocks merge.

## 5.2 `automerge.yml`

- Auto-merge PR when all required checks are green.
- Reject auto-merge if branch is stale or coverage drops below 100%.

## 5.3 `deploy.yml`

On merge to `main`:

- deploy Worker
- deploy Pages
- run post-deploy synthetic tests
- trigger automatic rollback on failure

## 5.4 `sync-bilara.yml`

Scheduled:

- check latest `published` SHA
- if changed: sync bilara delta to R2, rebuild index/manifest, run tests, deploy automatically

## 6. Testing Strategy (100% Coverage Policy)

Coverage policy is mandatory:

- `shared`: 100/100/100/100
- `worker`: 100/100/100/100
- `web`: 100/100/100/100

Enforcement:

- CI fails on any uncovered line/branch/function/statement.
- New code without tests cannot merge.
- Snapshot tests are not accepted as sole evidence for behavior; functional assertions required.

## 7. Zero-Manual Operations

Operational rules:

- No manual QA gates.
- No manual promotion between environments.
- No manual deploy approvals.
- No manual release tagging.

Automation replacements:

- E2E and synthetic checks replace manual QA.
- Release tagging done by workflow after successful deployment.
- Changelog generated automatically from merged PR metadata.

## 8. Prerequisite Automation Bootstrap

One-time platform setup must also be scripted (not hand-operated during delivery):

- Scripted creation/validation of GitHub secrets and variables.
- Scripted Cloudflare auth and project binding checks.
- Scripted Cloudflare R2 bucket creation/binding checks.
- Scripted branch protection and required-check configuration.

After bootstrap, normal operation remains fully autonomous.

## 9. Execution Order

1. M0 bootstrap automation
2. M1 shared core
3. M2 worker API
4. M3 web MVP
5. M4 autonomous CI/CD + release
6. M5 autonomous scale-up triggers

This plan satisfies your constraint: no human in the coding-to-deploy path, 100% test/coverage enforcement, and R2 as day-1 runtime content source.
