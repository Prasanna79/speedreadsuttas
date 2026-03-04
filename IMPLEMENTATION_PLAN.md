# PaliSpeedRead - Implementation Plan (v7)

Last updated: 2026-03-04
Source PRD: `speed-sutta-reading.md` (v2)

## 1. What This App Does

PaliSpeedRead is a minimalist RSVP (Rapid Serial Visual Presentation) speed reader for Pāli Canon suttas. It displays one word (or a small chunk of 2–4 words) at a time, highlighted at the Optimal Recognition Point (ORP), so readers can absorb suttas at 100–800 WPM without eye movement.

User flow:

1. User searches for a sutta by UID (`MN 1`), title (`root of all things`), Pāli title (`mūlapariyāya`), or SuttaCentral URL.
2. User picks a translation (defaults to English — Bhikkhu Sujato when available).
3. Reader displays words one-at-a-time with ORP highlighting. Punctuation, paragraph breaks, and long words automatically adjust pacing.
4. User controls: play/pause (Space), skip forward/back (←/→), adjust WPM (↑/↓), change chunk size (1/2/3/4), toggle dark mode (d), restart (r).
5. Progress bar shows position and estimated time remaining. Clickable to seek.
6. Preferences (WPM, chunk size, theme, font size) persist across sessions. Last reading position is saved for resume.

Supported collections: DN, MN, SN, AN, and KN subsets (Kp, Dhp, Ud, Iti, Snp, Thag, Thig).

## 2. Non-Negotiable Constraints

- 100% automated flow from code → test → deploy.
- 100% coverage gate on shared logic and worker. ≥90% on web components. 100% on web hooks/logic.
- No manual deploy, no manual release gate.
- R2 as runtime data source from day 1. Zero GitHub calls in production request path.
- Auto-deploy on merge to `main`. Quick-fix in prod if needed — no users to worry about.
- Rollback: manual `wrangler rollback` if a deploy breaks. No complex canary needed.

## 3. Architecture

### Monorepo layout

```text
packages/
  shared/   # Pure logic + types (no DOM, no runtime deps)
  worker/   # Cloudflare Worker API
  web/      # Vite + React SPA
scripts/
  build-search-index.ts    # Builds search index + translation manifest from local bilara-data
  sync-bilara-to-r2.ts     # Uploads sutta text files to R2
```

### Data source

- Clone `suttacentral/bilara-data` (`published` branch) locally.
- Index builder reads from this local clone to produce:
  1. `search-index.json` — compact search entries for all suttas.
  2. `translation-manifest.json` — UID → available translations with lang/author/metadata.
- R2 sync script uploads all sutta text JSON files to a Cloudflare R2 bucket, preserving bilara-data path structure.
- To update: `git pull` in the bilara-data clone, re-run builder + R2 sync.

### Runtime data flow

```
Web → Worker → R2 bucket (sutta text)
             → bundled JSON (search index, translation manifest)
```

No GitHub calls at runtime. Not in dev, not in production.

### Local dev

- Worker: `pnpm dev:worker` → `wrangler dev` on port 8787. Uses R2 local persistence (`--persist`) with data seeded from local bilara-data clone.
- Web: `pnpm dev:web` → Vite dev server on port 5173, configured with `VITE_API_URL=http://localhost:8787`.
- Both: `pnpm dev` runs both concurrently via `concurrently`.

### API endpoints

#### `GET /api/v1/sutta/:uid`

Returns sutta metadata and available translations from the bundled translation manifest.

```json
{
  "uid": "mn1",
  "collection": "mn",
  "title": "Mūlapariyāyasutta",
  "translations": [
    {
      "lang": "en", "langName": "English",
      "author": "sujato", "authorName": "Bhikkhu Sujato",
      "isRoot": false, "publication": "SuttaCentral", "licence": "CC0 1.0"
    },
    {
      "lang": "pli", "langName": "Pāli",
      "author": "ms", "authorName": "Mahāsaṅgīti Tipiṭaka",
      "isRoot": true, "publication": "SuttaCentral", "licence": "CC0 1.0"
    }
  ]
}
```

#### `GET /api/v1/sutta/:uid/text/:lang/:author`

Returns ordered segments from R2. Segments sorted numerically by ID (`mn1:2.1` before `mn1:10.1`).

```json
{
  "uid": "mn1", "lang": "en", "author": "sujato",
  "segments": [
    { "id": "mn1:0.1", "text": "Middle Discourses 1 " },
    { "id": "mn1:0.2", "text": "The Root of All Things " },
    { "id": "mn1:1.1", "text": "So I have heard. " }
  ]
}
```

AN range resolution: if `an1.3` doesn't match a direct file, Worker probes range files (`an1.1-10`) and returns segments for the requested UID.

#### `GET /api/v1/search/index`

Returns the full search index JSON. Loaded lazily by the client on first search keystroke.

```json
[
  { "uid": "mn1", "c": "mn", "t": "The Root of All Things", "p": "Mūlapariyāyasutta", "a": ["mulapariyaya"] }
]
```

### Error responses

All errors return JSON with `{ "error": "message" }` and appropriate HTTP status:
- `404` — unknown UID or translation not found
- `429` — rate limited (120 req/min per IP)
- `500` — upstream/internal failure

### CORS

Allowed origins: `http://localhost:5173` (dev), Pages domain (prod).

### Edge caching

Worker responses cached via Cloudflare Cache API. `Cache-Control: public, s-maxage=86400` (24h). Search index: `stale-while-revalidate=604800`.

## 4. Shared Module Specifications

### Types (`types.ts`)

```typescript
interface Segment { id: string; text: string; }

interface Token {
  word: string;
  index: number;
  segmentId: string;
  isParagraphStart: boolean;
  trailingPunctuation: string;
}

interface TranslationOption {
  lang: string; langName: string;
  author: string; authorName: string;
  isRoot: boolean; publication: string; licence: string;
}

interface SearchIndexEntry {
  uid: string; c: string; t: string; p: string; a: string[];
}

interface StoredPreferences {
  wpm: number; chunkSize: number;
  theme: 'light' | 'dark'; fontSize: 'normal' | 'large' | 'xlarge';
}

interface LastRead {
  uid: string; lang: string; author: string;
  position: number; timestamp: number;
}

interface SuttaMeta {
  uid: string; collection: string; title: string;
  translations: TranslationOption[];
}
```

### Constants (`constants.ts`)

| Constant | Value | Purpose |
|---|---|---|
| `WPM_MIN` | 100 | Minimum WPM |
| `WPM_MAX` | 800 | Maximum WPM |
| `WPM_DEFAULT` | 250 | Default WPM |
| `WPM_STEP` | 25 | WPM adjustment increment |
| `CHUNK_SIZE_DEFAULT` | 1 | Default words per chunk |
| `CHUNK_SIZE_MAX` | 4 | Maximum words per chunk |
| `PAUSE_SENTENCE` | 2.5 | Multiplier for `.` `!` `?` |
| `PAUSE_ELLIPSIS` | 3.0 | Multiplier for `…` |
| `PAUSE_CLAUSE` | 1.5 | Multiplier for `,` `;` `:` `—` `–` |
| `PAUSE_CLOSE_BRACKET` | 1.3 | Multiplier for `)` `]` `}` `'` `"` `"` |
| `PAUSE_PARAGRAPH` | 3.0 | Extra pause before new paragraph |
| `LONG_WORD_THRESHOLD` | 8 | Characters before long-word bonus applies |
| `LONG_WORD_BONUS` | 0.1 | Per-extra-character delay multiplier |
| `NIKAYA_ALIASES` | Map | `majjhima`→`mn`, `dīgha`→`dn`, etc. |
| `ORP_TABLE` | Array | Word-length → ORP character index mapping |

### UID module (`uid.ts`)

**`normalizeInput(input)`** — Parses user input into a UID or search query.

| Input | Result |
|---|---|
| `"MN 1"` | `{ uid: "mn1", searchQuery: null }` |
| `"sn12.2"` | `{ uid: "sn12.2", searchQuery: null }` |
| `"Majjhima Nikaya 1"` | `{ uid: "mn1", searchQuery: null }` |
| `"majjhima nikāya 1"` | `{ uid: "mn1", searchQuery: null }` |
| `"Dīgha 15"` | `{ uid: "dn15", searchQuery: null }` |
| `"https://suttacentral.net/mn1/en/sujato"` | `{ uid: "mn1", searchQuery: null }` |
| `"root of all things"` | `{ uid: null, searchQuery: "root of all things" }` |
| `""` | `{ uid: null, searchQuery: null }` |

**`parseUid(uid)`** — Extracts collection, nikaya, and subdir.

| Input | collection | nikaya | subdir |
|---|---|---|---|
| `"mn1"` | `"mn"` | `"mn"` | `null` |
| `"sn12.2"` | `"sn"` | `"sn"` | `"sn12"` |
| `"an4.159"` | `"an"` | `"an"` | `"an4"` |
| `"dhp1-20"` | `"dhp"` | `"kn"` | `"dhp"` |
| `"ud1.1"` | `"ud"` | `"kn"` | `"ud"` |
| `"thag1.1"` | `"thag"` | `"kn"` | `"thag"` |

**`buildTextPath(uid, lang, author)`** — Constructs bilara-data file paths.

| uid | lang | author | Path |
|---|---|---|---|
| `"mn1"` | `"en"` | `"sujato"` | `translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json` |
| `"mn1"` | `"pli"` | `"ms"` | `root/pli/ms/sutta/mn/mn1_root-pli-ms.json` |
| `"sn12.2"` | `"en"` | `"sujato"` | `translation/en/sujato/sutta/sn/sn12/sn12.2_translation-en-sujato.json` |
| `"dhp1-20"` | `"pli"` | `"ms"` | `root/pli/ms/sutta/kn/dhp/dhp1-20_root-pli-ms.json` |

**`compareSegmentIds(a, b)`** — Numeric segment ordering. Splits on `:`, then `.`, compares section then sequence as numbers.

### Tokenizer (`tokenizer.ts`)

`tokenize(segments: Segment[]): Token[]`

- Sorts segments by ID using `compareSegmentIds`.
- Splits each segment's text on whitespace.
- Extracts trailing punctuation (`.` `,` `;` `!` `?` `…` `—` `–` `"` `'` `)` `]` `}`).
- Detects paragraph boundaries: first word of a segment whose section number differs from the previous segment's section number gets `isParagraphStart: true`.
- Preserves Pāli diacritics (ā, ī, ū, ṁ, ṇ, ṭ, ḍ, ḷ, ñ, ṅ).
- Skips empty segments. Collapses multiple whitespace.

### Chunker (`chunker.ts`)

`buildChunks(tokens: Token[], chunkSize: number): Token[][]`

- Groups tokens into chunks of `chunkSize`.
- Never crosses paragraph boundaries — flushes current chunk before a `isParagraphStart` token.
- Returns empty array for empty input or `chunkSize < 1`.

### Timing (`timing.ts`)

`getOrpIndex(wordLength: number): number` — Maps word length to ORP character index via `ORP_TABLE`.

`calculateChunkDelay(chunk: Token[], wpm: number, nextIsParagraphStart: boolean): number`

- Base delay: `60000 / wpm` ms per word.
- Last token's trailing punctuation applies a multiplier to that word's base delay.
- Long word bonus: for each word exceeding `LONG_WORD_THRESHOLD` characters, add `basePerWord * LONG_WORD_BONUS * (charCount - threshold)`.
- Paragraph pause: if `nextIsParagraphStart`, add `basePerWord * PAUSE_PARAGRAPH`.

### Search (`search.ts`)

`searchIndex(query: string, index: SearchIndexEntry[]): SearchIndexEntry[]`

- Strips diacritics for comparison (NFD normalize + remove combining marks).
- Matches against: UID (prefix match), English title (substring), Pāli title (substring), aliases (substring).
- Case-insensitive. Max 8 results.

## 5. Web Component and Hook Specifications

### Hooks

**`usePreferences`** — Reads/writes `palispeedread:preferences` in localStorage. Falls back to defaults (WPM 250, chunk 1, light theme, normal font). Detects `prefers-color-scheme` on first visit. Applies/removes `dark` class on `<html>`.

**`useRSVP(tokens, wpm, chunkSize)`** — Core playback engine.
- Builds chunks via `buildChunks()` when tokens or chunkSize change.
- `setTimeout`-based tick loop (not `setInterval`). Delay per chunk from `calculateChunkDelay()`.
- WPM changes take effect on next tick. Chunk size change preserves reading position (finds chunk containing current token).
- Returns: `{ currentChunk, currentIndex, totalChunks, isPlaying, progress, timeRemainingMs, play, pause, togglePlay, skipForward, skipBackward, restart, seekTo }`.
- Auto-pauses at end.

**`useKeyboard(handlers)`** — Registers `keydown` on `window`. Only active when no input/textarea focused.

| Key | Action |
|---|---|
| Space | togglePlay (preventDefault) |
| ← | skipBackward |
| → | skipForward |
| ↑ | increaseWpm (preventDefault) |
| ↓ | decreaseWpm (preventDefault) |
| r | restart |
| 1 2 3 4 | setChunkSize(n) |
| d | toggleTheme |
| Escape | goHome |

**`useLastRead`** — Saves `{ uid, lang, author, position, timestamp }` to localStorage every 30s during play and on pause. On reader mount with matching uid/lang/author, offers resume prompt.

### Components

**`RSVPDisplay`** — Renders current chunk with ORP highlighting. Three spans: before-ORP, ORP character (accent color), after-ORP. Triangular notch markers above/below ORP position. Font size mapped: normal→`text-4xl`, large→`text-5xl`, xlarge→`text-6xl`. `aria-live="polite"`.

**`ProgressBar`** — Thin bar showing progress fraction. Clickable to seek. Displays `"42% · ~3 min"`. Time format: `<60s` → `"< 1 min"`, `60-3599s` → `"~X min"`, `≥3600s` → `"~X hr Y min"`.

**`ReaderControls`** — Play/pause, skip back/forward, WPM slider with label, chunk size segmented control (1–4), restart button. All buttons have `aria-label`.

**`SettingsPanel`** — Collapsible. Dark mode toggle, font size selector (three sizes).

**`ReaderHeader`** — Displays `"MN 1 — The Root of All Things"` and `"English · Bhikkhu Sujato"`.

**`SearchInput`** — Text input with debounced (300ms) client-side search. Fetches search index lazily on first keystroke. Handles SuttaCentral URL paste via `normalizeInput()`. Dropdown with max 8 results. Arrow key navigation, Enter to select, Escape to close.

**`TranslationChooser`** — Fetches sutta meta on mount. Groups translations by language. **Defaults to English (Sujato preferred)** when available. Radio selection → "Start Reading" → navigates to `/read/:uid/:lang/:author`.

### Pages

**`HomePage`** — Centered: "PaliSpeedRead" title, "Speed-read the Pāli Canon" tagline, `<SearchInput />`, footer with SuttaCentral credit.

**`ReaderPage`** — Extracts uid/lang/author from URL. If lang/author missing → `TranslationChooser`. Otherwise: fetch text, tokenize, show reader. Error states: 404 ("Sutta not found"), network error ("Unable to load" + retry), empty segments ("No text available").

**`NotFoundPage`** — Error message + SearchInput + link to home.

### Routes

| Route | Page |
|---|---|
| `/` | HomePage |
| `/read/:uid` | ReaderPage (shows TranslationChooser) |
| `/read/:uid/:lang/:author` | ReaderPage (direct to reader) |
| `*` | NotFoundPage |

## 6. Milestones And Gates

### M0 - Scaffold + CI

Scope:

- Monorepo scaffold: pnpm workspaces, TypeScript, Vitest, Prettier, ESLint.
- `packages/shared` with empty barrel export and vitest config.
- `packages/web` via Vite React-TS template with Tailwind CSS v4.
- `packages/worker` with `wrangler.toml` and stub handler.
- Local dev: `pnpm dev` runs `wrangler dev` (port 8787) + Vite (port 5173) concurrently.
- GitHub Actions CI workflow: lint, typecheck, test, coverage gate on every PR/push.
- Clone bilara-data `published` branch locally.

Deliverables:

- [ ] `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `.gitignore`, `.nvmrc`, `prettier.config.js`
- [ ] `packages/shared` initialized (empty source, vitest configured)
- [ ] `packages/web` initialized (Vite + React + Tailwind, dev server works)
- [ ] `packages/worker` initialized (`wrangler dev` serves stub response)
- [ ] `pnpm dev` starts both web + worker concurrently
- [ ] `.github/workflows/ci.yml` — lint, typecheck, test, coverage gate
- [ ] Local bilara-data clone exists with expected structure

Exit gate:

- [ ] `pnpm install && pnpm build && pnpm test` succeeds locally
- [ ] `pnpm dev` starts Vite on 5173 and Wrangler on 8787
- [ ] CI workflow runs and passes (on zero tests, that's OK)

---

### M1 - Shared Core (TDD, 100% coverage)

Scope:

- Implement all shared modules using strict TDD: write tests first, implement until green.
- Modules: `types.ts`, `constants.ts`, `uid.ts`, `tokenizer.ts`, `chunker.ts`, `timing.ts`, `search.ts`.
- AN range UID resolution logic in `uid.ts` / `buildTextPath`.

Coverage target: 100% lines, branches, functions, statements. Every happy path has a test. Edge cases tested: empty input, malformed input, boundary values, unicode/diacritics.

Required test cases (see §4 for input/output tables):

- `uid.ts`: `normalizeInput` (all entries in table), `parseUid` (all entries), `buildTextPath` (all entries), `compareSegmentIds` (numeric ordering, same-section, cross-section).
- `tokenizer.ts`: whitespace split, trailing punctuation extraction (all punctuation types), paragraph boundary detection, Pāli diacritics preserved, empty segments skipped, segments sorted before tokenizing, sequential indices, multiple spaces collapsed.
- `chunker.ts`: chunk sizes 1–4, partial last chunk, no cross-paragraph chunks, empty input, single token.
- `timing.ts`: `getOrpIndex` (word lengths 1–20), `calculateChunkDelay` at 100/250/300/800 WPM, all punctuation multipliers, paragraph pause, long word bonus, combined multipliers, multi-word chunks.
- `search.ts`: exact UID, UID prefix, title substring, Pāli title (diacritic-insensitive), alias match, case insensitive, no match, max 8 results.

Deliverables:

- [ ] `packages/shared/src/*.ts` — all modules
- [ ] `packages/shared/src/__tests__/*.test.ts` — comprehensive test suite
- [ ] Coverage thresholds: 100/100/100/100
- [ ] CI passes with coverage gate

Exit gate:

- [ ] All tests pass
- [ ] 100% coverage
- [ ] No TODOs in source

---

### M1b - Search Index + Translation Manifest + R2 Mirror

Scope:

- `scripts/build-search-index.ts` reads local bilara-data clone and produces:
  1. `search-index.json` — `SearchIndexEntry[]` for all suttas.
  2. `translation-manifest.json` — `Record<string, TranslationOption[]>` keyed by UID.
- `scripts/sync-bilara-to-r2.ts` uploads sutta text JSON files to R2 bucket, preserving bilara-data path structure. Only uploads changed files (hash comparison).
- Translation manifest eliminates runtime GitHub API calls for translation discovery.

Process:

1. Read from `BILARA_DATA_DIR` env var (default `../bilara-data`).
2. Walk `root/pli/ms/sutta/` to discover all UIDs.
3. For each UID: extract Pāli title (segment `:0.2`), English title (Sujato translation), scan `translation/` for all lang/author combos.
4. Build aliases: lowercase de-diacriticked versions of titles.
5. Enrich author/lang names from `_author.json` and `_publication.json`.
6. Write index + manifest to `packages/worker/src/data/`.
7. R2 sync uploads all text files to bucket.

Test coverage:

- Unit tests for title extraction, alias generation, manifest entry construction.
- Integration test against a small fixture directory tree.

Deliverables:

- [ ] `scripts/build-search-index.ts`
- [ ] `scripts/sync-bilara-to-r2.ts`
- [ ] `packages/worker/src/data/search-index.json` (generated)
- [ ] `packages/worker/src/data/translation-manifest.json` (generated)
- [ ] Tests for builder parsing logic

Exit gate:

- [ ] Builder runs against local bilara-data clone
- [ ] Search index covers DN, MN, SN, AN, KN collections
- [ ] Translation manifest spot-checked for mn1, sn12.2, an4.159, dhp1-20, thag1.1
- [ ] R2 sync completes (local R2 persistence in dev, or real bucket)
- [ ] Both JSON files valid and importable

---

### M2 - Worker API (TDD, 100% coverage)

Scope:

- Router with three endpoints (see §3 API endpoints).
- Data access abstraction: reads from local bilara-data clone in dev (via `BILARA_DATA_DIR`), from R2 bucket in production.
- Search index + translation manifest bundled as static JSON imports.
- AN range resolution: if direct R2 key miss, probe range files.
- CORS, cache headers, rate limiting.
- Error responses (404, 429, 500) per §3 contracts.

Test coverage target: 100% lines, branches, functions, statements. Mocked `fetch`, `caches`, and R2 binding.

Required tests:

- Valid UID returns correct `SuttaMeta` shape from manifest.
- Text endpoint returns sorted segments.
- Unknown UID returns 404 JSON.
- AN range UID (`an1.3`) resolves to range file.
- CORS headers present.
- Malformed requests return appropriate errors.
- Search index endpoint returns valid JSON array.
- Cache-control headers set correctly.

Deliverables:

- [ ] `packages/worker/src/index.ts` — router
- [ ] `packages/worker/src/routes/` — route handlers
- [ ] `packages/worker/src/lib/data.ts` — R2/local data access
- [ ] `wrangler.toml` with R2 bucket binding
- [ ] Worker tests with mocked data layer
- [ ] Error responses for all error cases

Exit gate:

- [ ] All tests pass, 100% coverage
- [ ] `wrangler dev` serves all endpoints locally against local bilara-data
- [ ] `curl` confirms: correct JSON shapes, CORS headers, cache headers, 404 for unknown UIDs
- [ ] AN range resolution works locally

---

### M3 - Web MVP (TDD, 100% hooks/logic, ≥90% components)

Scope:

- All pages, components, and hooks from §5.
- API client (`src/lib/api.ts`).
- Error state handling (404, network, empty text).

Coverage targets:

- Hooks (`useRSVP`, `usePreferences`, `useKeyboard`, `useLastRead`): 100%.
- Logic modules (`api.ts`, any utilities): 100%.
- Components: ≥90%. Functional assertions required (no snapshot-only tests).

Required tests:

- `useRSVP`: starts paused, play advances, pause stops, skip forward/back, restart, seekTo, chunk size change preserves position, auto-pause at end.
- `usePreferences`: returns defaults when empty, persists changes, handles corrupt localStorage, applies dark class.
- `useKeyboard`: each key dispatches correct handler, ignored when input focused, Space prevents scroll.
- `useLastRead`: saves on pause, saves periodically, resume prompt on matching reader load, no prompt on mismatch.
- `SearchInput`: debounce fires, results render, arrow key navigation, Enter selects, Escape closes, URL paste extracts UID.
- `TranslationChooser`: defaults to English Sujato, groups by language, navigates on selection.
- `RSVPDisplay`: single word ORP highlight, multi-word chunk, null chunk empty state, font size classes.
- `ProgressBar`: width matches progress, time formatted correctly, click calls seekTo.
- `ReaderControls`: correct icon for play/pause, slider value matches WPM, chunk selector highlights active, callbacks fire.

Deliverables:

- [ ] `packages/web/src/lib/api.ts`
- [ ] All pages and components from §5
- [ ] All hooks from §5
- [ ] Test suites for hooks, components, and pages

Exit gate:

- [ ] All tests pass. Hooks/logic at 100%, components at ≥90%.
- [ ] "MN 1 → choose English Sujato → play reader" works end-to-end locally
- [ ] Direct URL `/read/sn12.2/en/sujato` loads correctly
- [ ] AN sutta loads (e.g., `/read/an4.159/en/sujato`)
- [ ] Error states render without crash

---

### M4 - Polish + Accessibility

Scope:

- Progress bar drag-to-seek (pointer events).
- Last-read resume prompt UI.
- Mobile responsive layout (320px minimum). Touch tap zones on RSVPDisplay (left 40% = back, center 20% = play/pause, right 40% = forward).
- Loading skeletons while text loads.
- `prefers-reduced-motion` support (disable transitions).
- Accessibility: WCAG AA contrast, `aria-label` on all icon buttons, `aria-live` on RSVPDisplay, visible focus rings (`:focus-visible`), logical tab order.

Tests:

- `useLastRead` resume flow.
- Touch gesture handler.
- Reduced motion hook.

Exit gate:

- [ ] Tests pass
- [ ] Keyboard-only navigation works for full read flow
- [ ] No contrast violations in light or dark theme
- [ ] Mobile layout usable at 320px width

---

### M5 - Deploy + CI/CD + Sync

Scope:

- Push to GitHub. Create Cloudflare Pages project + R2 bucket.
- Deploy workflow: Worker + Pages on merge to `main`. Auto-deploy, no approval.
- Sync workflow (scheduled daily): pull bilara-data in CI, compare SHA, rebuild index/manifest + sync R2 if changed, redeploy Worker.
- Dependabot for monthly dependency updates.
- Playwright E2E tests against deployed environment.

Rollback: manual `wrangler rollback` or `wrangler pages deployment rollback`. No automated canary — project has no users, quick-fix-and-redeploy is fine.

Deliverables:

- [ ] GitHub repository with code pushed
- [ ] `.github/workflows/deploy.yml` — auto-deploy on merge to `main`
- [ ] `.github/workflows/sync-bilara.yml` — daily bilara-data sync
- [ ] `.github/dependabot.yml`
- [ ] Playwright E2E suite in `e2e/`
- [ ] `ROLLBACK.md` — short doc: how to rollback Worker and Pages deployments

Exit gate:

- [ ] CI passes on push
- [ ] Merge to `main` auto-deploys to Cloudflare
- [ ] Sync job runs idempotently when no upstream change
- [ ] E2E tests pass against production URL
- [ ] App is live and accessible

---

### M6 - Release Gate (v1)

Release checklist:

- [ ] PRD §16 Definition of Done scenarios validated by automated tests
- [ ] Coverage gates: shared 100%, worker 100%, web hooks/logic 100%, web components ≥90%
- [ ] E2E suite passes against production
- [ ] README with setup, architecture, deployment, and rollback instructions
- [ ] Tagged release `v1.0.0`

Optional post-v1:

- PWA installability and offline reading for previously fetched suttas

## 7. CI/CD Specification

### `ci.yml` (runs on every PR and push to main)

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (all packages, with coverage)
- Coverage assertion: shared 100%, worker 100%, web hooks/logic 100%, web components ≥90%
- Any failure blocks merge

### `deploy.yml` (runs on merge to main)

- Build web (`pnpm --filter @speedreadsuttas/web build`)
- Deploy Worker (`wrangler deploy`)
- Deploy Pages (`wrangler pages deploy`)

### `sync-bilara.yml` (daily schedule + manual trigger)

- Clone/pull bilara-data `published` branch
- Compare HEAD SHA against last-synced SHA (stored in repo or as R2 metadata)
- If changed: run `build-search-index.ts`, run `sync-bilara-to-r2.ts`, run tests, deploy Worker

### `dependabot.yml`

- npm ecosystem, monthly, max 10 open PRs
- GitHub Actions ecosystem, monthly

## 8. Testing Strategy

### TDD process

1. Write failing tests for all happy paths and key edge cases.
2. Implement minimum code to make tests pass.
3. Refactor while green.
4. Verify coverage before moving on.

### Coverage targets

| Package | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| `shared` | 100% | 100% | 100% | 100% |
| `worker` | 100% | 100% | 100% | 100% |
| `web` hooks + logic | 100% | 100% | 100% | 100% |
| `web` components | ≥90% | ≥90% | ≥90% | ≥90% |

### Test types

- **Unit** (M1, M2, M3): algorithms, route handlers, hooks, components.
- **E2E** (M5): Playwright — search → choose → read → controls → theme → direct URL → 404.
- **No snapshot-only tests.** All component tests must make functional assertions.

## 9. Risk Register

| Risk | Mitigation |
|---|---|
| bilara-data path edge cases | Table-driven path tests for all collections. Fixture-based integration tests. |
| GitHub rate limits / bot checks | Eliminated. R2 serves all runtime data. GitHub only accessed in CI sync (low frequency). |
| AN range file resolution | Test with real AN UIDs across vaggas. Probe multiple range patterns. Clear error on failure. |
| Reader timing jitter at high WPM | Isolate scheduler logic. Benchmark with large token sets. Avoid unnecessary rerenders. |
| Accessibility regressions | a11y checks in CI. Manual keyboard/screen-reader validation in M4. |
| Cache staleness after bilara updates | SHA-based sync job. Explicit cache purge on change. |

## 10. User-Managed Setup

- Clone bilara-data: `git clone --branch published --single-branch https://github.com/suttacentral/bilara-data.git`
- Create R2 bucket: `wrangler r2 bucket create speedreadsuttas-data`
- Authenticate wrangler: `npx wrangler login`
- Create Cloudflare API token → add as `CF_API_TOKEN` GitHub secret
- Create Pages project: `npx wrangler pages project create speedreadsuttas`
- Set GitHub variable `API_URL` for frontend build

## 11. Execution Order

1. M0 — scaffold + CI
2. M1 — shared core (TDD)
3. M1b — search index + translation manifest + R2 mirror
4. M2 — worker API (TDD)
5. M3 — web MVP (TDD)
6. M4 — polish + accessibility
7. M5 — deploy + CI/CD + sync
8. M6 — release gate
