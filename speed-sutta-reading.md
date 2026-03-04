# PaliSpeedRead
## Product Requirements Document (PRD) — v2

---

# 1. Vision

PaliSpeedRead is a minimalist, fast, open-source web application that enables users to speed-read the **Pāli Canon Suttas (DN, MN, SN, AN, KN)** using SuttaCentral's open data.

The app focuses purely on reading acceleration via RSVP (Rapid Serial Visual Presentation) — single-word or small chunk display — with selectable languages and translators.

The experience must feel:

- Quiet
- Focused
- Fast
- Canonically accurate
- Free and open

This is not a study tool. It is a reading accelerator for suttas.

---

# 2. Scope

## 2.1 Included in v1

- Pāli Canon Suttas only:
  - DN (Dīgha Nikāya) — 34 suttas, UIDs: `dn1`–`dn34`
  - MN (Majjhima Nikāya) — 152 suttas, UIDs: `mn1`–`mn152`
  - SN (Saṁyutta Nikāya) — 56 saṁyuttas, UIDs: `sn1.1`–`sn56.131`
  - AN (Aṅguttara Nikāya) — 11 nipātas, UIDs: `an1.1`–`an11.992`
  - KN (Sutta collections within Khuddaka Nikāya only):
    - Khuddakapāṭha (`kp1`–`kp9`)
    - Dhammapada (`dhp1-20`, `dhp21-32`, ... verse-range UIDs per vagga)
    - Udāna (`ud1.1`–`ud8.10`)
    - Itivuttaka (`iti1`–`iti112`)
    - Sutta Nipāta (`snp1.1`–`snp5.19`)
    - Therāgathā (`thag1.1`–`thag21.1`)
    - Therīgāthā (`thig1.1`–`thig16.1`)
- Root Pāli texts
- All available translations in bilara-data
- Translator + language + publication metadata
- Alias resolution (see §7)
- Translation chooser before reading
- RSVP reading with ORP (Optimal Recognition Point) highlighting
- Chunk modes: 1–4 words
- Punctuation-aware timing with pause multipliers
- Client-side tokenization
- Real-time play/pause/skip with keyboard shortcuts
- Progress bar with time remaining
- Dark/Light theme with persistence
- Minimal backend (Cloudflare Workers)
- Open-source (MIT license)
- Extensive TDD (Vitest)
- CI/CD with automated SuttaCentral sync
- Monthly dependency updates via Dependabot

---

## 2.2 Out of Scope (v1)

- Login / accounts
- Bookmarks
- Full offline corpus
- Footnotes / commentary layers
- Parallel bilingual display
- Dictionary popovers
- Audio / TTS
- Abhidhamma / Vinaya / Commentaries

---

# 3. Architecture Overview

## 3.1 Technology Stack (Concrete)

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | **Vite + React 18 + TypeScript** | Fast dev loop, small bundle, mature ecosystem |
| Styling | **Tailwind CSS** | Utility-first, easy dark mode, minimal CSS bundle |
| State | **React Context + useReducer** | No external state lib needed for this scope |
| Testing | **Vitest + React Testing Library + Playwright** | Fast unit tests, component tests, E2E |
| Backend | **Cloudflare Worker (TypeScript)** | Edge caching, GitHub proxy, search index |
| Hosting | **Cloudflare Pages** (SPA) + **Worker** (API) | Free tier sufficient, global CDN |
| Build | **Wrangler CLI** | Official CF tooling for Workers + Pages |
| CI/CD | **GitHub Actions** | Standard, free for open-source |
| Package Manager | **pnpm** | Fast, disk-efficient |

> **Note:** "Cloudflare Vinext" does not exist as a product. The original PRD referenced it in error. The stack above is production-ready and concrete.

## 3.2 Project Structure

```
palispeedread/
├── packages/
│   ├── web/                    # Vite + React SPA
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Pure logic (tokenizer, uid, timing)
│   │   │   ├── pages/          # Route-level components
│   │   │   ├── types/          # TypeScript type definitions
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   ├── worker/                 # Cloudflare Worker API
│   │   ├── src/
│   │   │   ├── index.ts        # Worker entry point + router
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── lib/            # Shared logic (uid normalization, etc.)
│   │   │   └── types.ts
│   │   ├── wrangler.toml
│   │   └── tsconfig.json
│   └── shared/                 # Shared types + constants
│       ├── src/
│       │   ├── types.ts        # Shared TypeScript interfaces
│       │   ├── constants.ts    # Nikāya names, UID patterns, etc.
│       │   └── uid.ts          # UID parsing/normalization (used by both)
│       └── tsconfig.json
├── scripts/
│   └── build-search-index.ts   # Offline index builder
├── pnpm-workspace.yaml
├── package.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       └── sync-bilara.yml
└── README.md
```

## 3.3 Frontend Architecture

### URL Routes

| Route | Component | Description |
|---|---|---|
| `/` | `HomePage` | Search input, logo, tagline |
| `/read/:uid` | `ReaderPage` | Translation chooser → RSVP reader |
| `/read/:uid/:lang/:author` | `ReaderPage` | Direct link to specific translation |

React Router v6 with `createBrowserRouter`. Cloudflare Pages handles SPA fallback (`/* → /index.html`).

### Component Hierarchy

```
App
├── HomePage
│   ├── Logo
│   ├── SearchInput          # Autocomplete search box
│   └── SearchResults        # Dropdown suggestion list
├── ReaderPage
│   ├── TranslationChooser   # Modal: pick language + translator
│   └── Reader
│       ├── ReaderHeader      # Sutta title + translator info
│       ├── RSVPDisplay       # The main word display with ORP
│       ├── ProgressBar       # Clickable/scrubbable progress
│       ├── ReaderControls    # Play/pause, skip, WPM, chunk size
│       └── SettingsPanel     # Theme, font size (collapsible)
└── NotFoundPage
```

### State Shape

```typescript
interface AppState {
  // Reader state
  tokens: Token[];              // Tokenized word list
  currentIndex: number;         // Current token position
  isPlaying: boolean;
  wpm: number;                  // 100–800, default 250
  chunkSize: number;            // 1–4, default 1

  // Sutta metadata
  suttaUid: string;             // e.g., "mn1"
  suttaTitle: string;           // e.g., "The Root of All Things"
  language: string;             // e.g., "en"
  author: string;               // e.g., "sujato"
  authorName: string;           // e.g., "Bhikkhu Sujato"

  // Preferences (persisted to localStorage)
  theme: 'light' | 'dark';
  fontSize: 'normal' | 'large' | 'xlarge';
}
```

### localStorage Schema

```typescript
// Key: "palispeedread:preferences"
interface StoredPreferences {
  wpm: number;
  chunkSize: number;
  theme: 'light' | 'dark';
  fontSize: 'normal' | 'large' | 'xlarge';
}

// Key: "palispeedread:lastRead"
interface LastRead {
  uid: string;
  lang: string;
  author: string;
  position: number;         // Token index for resume
  timestamp: number;         // Unix ms
}
```

## 3.4 Backend Architecture (Cloudflare Worker)

### API Endpoints

All endpoints are prefixed with `/api/v1`.

#### `GET /api/v1/sutta/:uid`

Returns metadata and available translations for a sutta.

**Request:** `GET /api/v1/sutta/mn1`

**Response:**
```json
{
  "uid": "mn1",
  "collection": "mn",
  "title": "Mūlapariyāyasutta",
  "translations": [
    {
      "lang": "en",
      "langName": "English",
      "author": "sujato",
      "authorName": "Bhikkhu Sujato",
      "publication": "SuttaCentral",
      "licence": "CC0 1.0",
      "isRoot": false
    },
    {
      "lang": "pli",
      "langName": "Pāli",
      "author": "ms",
      "authorName": "Mahāsaṅgīti Tipiṭaka",
      "publication": "SuttaCentral",
      "licence": "CC0 1.0",
      "isRoot": true
    }
  ]
}
```

**Caching:** `Cache-Control: public, s-maxage=86400` (24h edge cache). Invalidated on sync.

#### `GET /api/v1/sutta/:uid/text/:lang/:author`

Returns the ordered segment text for a specific translation.

**Request:** `GET /api/v1/sutta/mn1/text/en/sujato`

**Response:**
```json
{
  "uid": "mn1",
  "lang": "en",
  "author": "sujato",
  "segments": [
    { "id": "mn1:0.1", "text": "Middle Discourses 1 " },
    { "id": "mn1:0.2", "text": "The Root of All Things " },
    { "id": "mn1:1.1", "text": "So I have heard. " },
    { "id": "mn1:1.2", "text": "At one time the Buddha was staying near Ukkattha..." }
  ]
}
```

**Segment ordering:** Segments MUST be sorted by parsing the segment ID numerically: split on `:`, then split the right side on `.`, compare section numbers first, then sequence numbers. String sorting will fail (e.g., `mn1:10.1` before `mn1:2.1`).

**Caching:** `Cache-Control: public, s-maxage=86400` (24h).

#### `GET /api/v1/search?q=:query`

Returns matching suttas for a search query.

**Request:** `GET /api/v1/search?q=root+of+all`

**Response:**
```json
{
  "results": [
    {
      "uid": "mn1",
      "collection": "mn",
      "title": "The Root of All Things",
      "paliTitle": "Mūlapariyāyasutta",
      "matchType": "title"
    }
  ]
}
```

**Caching:** `Cache-Control: public, s-maxage=3600` (1h).

#### `GET /api/v1/search/index`

Returns the full search index for client-side searching (lazy loaded).

**Response:** Compact JSON array (~200KB gzipped for the full canon).

```json
[
  {
    "uid": "mn1",
    "c": "mn",
    "t": "The Root of All Things",
    "p": "Mūlapariyāyasutta",
    "a": ["mulapariyaya", "root of all things"]
  }
]
```

**Caching:** `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.

### Worker Data Flow

```
Client Request
  → Cloudflare Edge Cache (Cache API)
    → HIT: return cached response
    → MISS:
      → Worker fetches from GitHub raw content API
        URL pattern: https://raw.githubusercontent.com/suttacentral/bilara-data/published/{path}
      → Worker processes (orders segments, normalizes)
      → Worker caches response (ctx.waitUntil + cache.put)
      → Returns response
```

### Worker Rate Limiting

Use Cloudflare's `RateLimiter` binding:

```toml
# wrangler.toml
[[rate_limits]]
binding = "RATE_LIMITER"
namespace_id = "palispeedread"
simple = { period = 60, limit = 120 }
```

Limit: 120 requests per minute per IP. Returns `429 Too Many Requests` when exceeded.

---

# 4. Data Source Specification

## 4.1 Primary Repository

**Repository:** `suttacentral/bilara-data`
**Branch:** `published` (NOT `main`)
**Base URL:** `https://raw.githubusercontent.com/suttacentral/bilara-data/published/`

## 4.2 Directory Structure

```
bilara-data/
├── root/pli/ms/sutta/          # Root Pāli texts (Mahāsaṅgīti edition)
│   ├── dn/                     # DN is flat: dn1_root-pli-ms.json
│   ├── mn/                     # MN is flat: mn1_root-pli-ms.json
│   ├── sn/
│   │   ├── sn1/                # SN grouped by saṁyutta
│   │   ├── sn12/
│   │   └── ...
│   ├── an/
│   │   ├── an1/                # AN grouped by nipāta
│   │   └── ...
│   └── kn/
│       ├── kp/                 # Khuddakapāṭha
│       ├── dhp/                # Dhammapada
│       ├── ud/                 # Udāna
│       ├── iti/                # Itivuttaka
│       ├── snp/                # Sutta Nipāta
│       ├── thag/               # Therāgathā
│       └── thig/               # Therīgāthā
├── translation/{lang}/{author}/sutta/   # Translations mirror root structure
├── html/pli/ms/sutta/          # HTML markup segments
├── _author.json                # Author metadata (repo root)
└── _publication.json           # Publication metadata (repo root)
```

## 4.3 File Naming Convention

Pattern: `{uid}_{type}-{lang}-{author}.json`

| Type | Example Path |
|---|---|
| Root Pāli | `root/pli/ms/sutta/mn/mn1_root-pli-ms.json` |
| English (Sujato) | `translation/en/sujato/sutta/mn/mn1_translation-en-sujato.json` |
| German (Sabbamitta) | `translation/de/sabbamitta/sutta/mn/mn1_translation-de-sabbamitta.json` |
| HTML structure | `html/pli/ms/sutta/mn/mn1_html.json` |

### Path Construction Algorithm

```typescript
function buildTextPath(uid: string, lang: string, author: string): string {
  const { collection, subdir } = parseUid(uid);  // e.g., { collection: "sn", subdir: "sn12" }
  const nikaya = collection === 'kp' || collection === 'dhp' || collection === 'ud'
    || collection === 'iti' || collection === 'snp' || collection === 'thag'
    || collection === 'thig' ? 'kn' : collection;

  const needsSubdir = ['sn', 'an'].includes(nikaya) || nikaya === 'kn';
  const subdirPart = needsSubdir ? `${subdir}/` : '';

  if (lang === 'pli' && author === 'ms') {
    return `root/pli/ms/sutta/${nikaya}/${subdirPart}${uid}_root-pli-ms.json`;
  }
  return `translation/${lang}/${author}/sutta/${nikaya}/${subdirPart}${uid}_translation-${lang}-${author}.json`;
}
```

## 4.4 Segment JSON Format

Each text file is a flat JSON object. Keys are segment IDs, values are text strings.

```json
{
  "mn1:0.1": "Middle Discourses 1 ",
  "mn1:0.2": "The Root of All Things ",
  "mn1:1.1": "So I have heard. ",
  "mn1:1.2": "At one time the Buddha was staying near Ukkattha, in the Subhaga Grove..."
}
```

**Segment ID anatomy:** `{uid}:{section}.{sequence}`
- Section `0` = header/title area
- Sections `1, 2, 3...` = progressive paragraph divisions
- Sequences `1, 2, 3...` = sentences/clauses within a section

## 4.5 Segment Ordering Algorithm

Segment IDs are strings and MUST be sorted numerically, not lexicographically.

```typescript
function compareSegmentIds(a: string, b: string): number {
  // Extract the part after ":"
  const [, aPart] = a.split(':');
  const [, bPart] = b.split(':');

  const [aSection, aSeq] = aPart.split('.').map(Number);
  const [bSection, bSeq] = bPart.split('.').map(Number);

  if (aSection !== bSection) return aSection - bSection;
  return aSeq - bSeq;
}
```

## 4.6 Metadata Schemas

### `_author.json`

```json
{
  "sujato": {
    "author_uid": "sujato",
    "author_name": "Bhikkhu Sujato",
    "author_short_name": "Sujato",
    "author_github_handle": "sujato"
  },
  "bodhi": {
    "author_uid": "bodhi",
    "author_name": "Bhikkhu Bodhi",
    "author_short_name": "Bodhi"
  }
}
```

### `_publication.json`

```json
{
  "scpub1": {
    "publication_number": "scpub1",
    "author_uid": "sujato",
    "author_name": "Bhikkhu Sujato",
    "text_uid": "dn-mn-sn-an",
    "is_published": "true",
    "publication_status": "published",
    "licence": "https://creativecommons.org/publicdomain/zero/1.0/",
    "licence_type": "CC0",
    "root_lang": "pli",
    "translation_lang": "en",
    "edition": [
      {
        "edition_number": "ed2",
        "publication_date": "2023",
        "publisher": "SuttaCentral"
      }
    ]
  }
}
```

## 4.7 Discovering Available Translations

To find all translations for a given UID, the Worker must:

1. Fetch the directory listing for `translation/*/sutta/{nikaya}/...` (via GitHub API: `GET /repos/suttacentral/bilara-data/contents/{path}?ref=published`)
2. Match files with pattern `{uid}_translation-{lang}-{author}.json`
3. Extract `lang` and `author` from the filename
4. Enrich with `_author.json` and `_publication.json` metadata

This discovery is performed at index build time (not per-request).

## 4.8 Special UID Cases

| Case | Example | Handling |
|---|---|---|
| AN range UIDs | `an1.1-10` | A single file groups multiple short suttas. If user requests `an1.3`, resolve to file `an1.1-10` and extract relevant segments. |
| DHP vagga ranges | `dhp1-20` | Each vagga is a verse range. The UID is the range itself. |
| SN/AN sub-directories | `sn12.2` | File lives in `sn/sn12/sn12.2_...json`, not `sn/sn12.2_...json` |

---

# 5. Core User Flows

## 5.1 Enter Sutta (Home Page)

**UI:** Single centered search input with autocomplete. Placeholder: `"Enter a sutta — e.g., MN 1, Dhammapada, sn12.2"`

**Flow:**

1. User types into search input
2. After 2+ characters, client-side search runs against the loaded index
3. Results appear as a dropdown (max 8 results)
4. Each result shows: `{UID} — {English Title}` with collection badge
5. User clicks result or presses Enter → navigates to `/read/{uid}`
6. User can also paste a SuttaCentral URL (e.g., `https://suttacentral.net/mn1/en/sujato`) — the app extracts the UID

**Search index loading:** Fetched lazily on first keystroke from `/api/v1/search/index`. Cached in memory for session. ~200KB gzipped.

## 5.2 Translation Chooser

**Trigger:** When `/read/:uid` loads without `:lang/:author` params.

**UI:** Modal overlay with:

```
┌──────────────────────────────────────┐
│  MN 1 — Mūlapariyāyasutta           │
│                                      │
│  Choose a translation:               │
│                                      │
│  ○ Pāli (Root Text)                  │
│    Mahāsaṅgīti Tipiṭaka · CC0       │
│                                      │
│  ● English — Bhikkhu Sujato          │
│    SuttaCentral · CC0                │
│                                      │
│  ○ English — Bhikkhu Bodhi           │
│    Wisdom Publications · ©           │
│                                      │
│  ○ Deutsch — Anagarika Sabbamitta    │
│    SuttaCentral · CC0                │
│                                      │
│           [ Start Reading ]          │
└──────────────────────────────────────┘
```

- Grouped by language
- Default selection: English (Sujato) if available, else first available
- Clicking "Start Reading" navigates to `/read/{uid}/{lang}/{author}` and begins loading text

## 5.3 Reading Experience

### Layout

```
┌──────────────────────────────────────────────┐
│  MN 1 — The Root of All Things               │
│  English · Bhikkhu Sujato                     │
│──────────────────────────────────────────────│
│                                              │
│                                              │
│           pe̲r̲ception               │
│                                              │
│                                              │
│──────────────────────────────────────────────│
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░  42% · ~3 min │
│──────────────────────────────────────────────│
│  ◀◀  ▶ Play   ▶▶   │  250 WPM  │  1 word    │
│  ⟲ Restart          │  ◐ Theme  │  Aa Size   │
└──────────────────────────────────────────────┘
```

- The RSVP display area is vertically centered and occupies the middle 60% of viewport height
- The ORP (focus letter) is underlined and highlighted in accent color
- A thin vertical guide line marks the ORP position (fixed horizontal position)

### Controls

| Control | Action |
|---|---|
| Play / Pause | Toggle reading. Big center button. |
| Skip Forward | Jump +10 tokens |
| Skip Backward | Jump -10 tokens |
| WPM Slider | Range 100–800, step 25, default 250 |
| Chunk Size | Selector: 1 / 2 / 3 / 4 words |
| Restart | Return to token 0, paused |
| Theme Toggle | Light ↔ Dark. Persists to localStorage. |
| Font Size | Normal / Large / XLarge. Persists. |

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `←` | Skip backward 10 tokens |
| `→` | Skip forward 10 tokens |
| `↑` | Increase WPM by 25 |
| `↓` | Decrease WPM by 25 |
| `r` | Restart |
| `1` `2` `3` `4` | Set chunk size |
| `d` | Toggle dark mode |
| `Escape` | Return to home |

---

# 6. RSVP Engine Specification

## 6.1 ORP (Optimal Recognition Point)

The ORP is the character in each word where the eye naturally fixates. It must be visually highlighted and aligned to a fixed horizontal position.

**ORP position lookup table:**

| Word Length | ORP Index (0-based) |
|---|---|
| 1 | 0 |
| 2–5 | 1 |
| 6–9 | 2 |
| 10–13 | 3 |
| 14+ | 4 |

**Rendering:** Split each word into three spans:
```html
<span class="before-orp">perc</span><span class="orp">e</span><span class="after-orp">ption</span>
```

The `.orp` span is styled with accent color (e.g., red in dark mode, blue in light mode) and the container uses `padding-left` calculated so the ORP character always aligns to the same horizontal pixel.

```typescript
function getOrpIndex(wordLength: number): number {
  if (wordLength <= 1) return 0;
  if (wordLength <= 5) return 1;
  if (wordLength <= 9) return 2;
  if (wordLength <= 13) return 3;
  return 4;
}
```

## 6.2 Tokenization (Client-Side)

Tokenization MUST occur on the client after receiving ordered segments from the API.

### Tokenization Pipeline

```typescript
interface Token {
  word: string;            // The display text (e.g., "perception")
  index: number;           // Position in token array
  segmentId: string;       // Source segment ID (e.g., "mn1:3.1")
  isParagraphStart: boolean;  // True if this is the first token of a new section
  trailingPunctuation: string; // e.g., ".", ",", "!" — extracted for timing
}
```

### Rules

1. Concatenate segment texts in order (sorted by segment ID).
2. Detect section boundaries: when `section` number changes in segment IDs, mark as paragraph break.
3. Split each segment's text by whitespace (`/\s+/`).
4. Trailing punctuation (`. , ; : ! ? … — " ' ) ]`) stays attached to the word — do NOT split it off into a separate token. But extract it into `trailingPunctuation` for timing calculations.
5. Preserve all diacritics (ā, ī, ū, ṁ, ṇ, ṭ, etc.). Critical for Pāli text.
6. Normalize Unicode to NFC form.
7. Do not remove or collapse ellipses (`…` or `...`).
8. Treat em-dash (`—`) as inline punctuation attached to the preceding word.
9. Strip segment IDs that are purely structural (section `0.x` segments are title/header — include them as tokens but mark them).

### Example

Input segments:
```json
{
  "mn1:0.2": "The Root of All Things",
  "mn1:1.1": "So I have heard.",
  "mn1:1.2": "At one time the Buddha was staying near Ukkattha."
}
```

Output tokens:
```
[
  { word: "The",       segmentId: "mn1:0.2", isParagraphStart: true,  trailingPunctuation: "" },
  { word: "Root",      segmentId: "mn1:0.2", isParagraphStart: false, trailingPunctuation: "" },
  { word: "of",        segmentId: "mn1:0.2", isParagraphStart: false, trailingPunctuation: "" },
  { word: "All",       segmentId: "mn1:0.2", isParagraphStart: false, trailingPunctuation: "" },
  { word: "Things",    segmentId: "mn1:0.2", isParagraphStart: false, trailingPunctuation: "" },
  { word: "So",        segmentId: "mn1:1.1", isParagraphStart: true,  trailingPunctuation: "" },
  { word: "I",         segmentId: "mn1:1.1", isParagraphStart: false, trailingPunctuation: "" },
  { word: "have",      segmentId: "mn1:1.1", isParagraphStart: false, trailingPunctuation: "" },
  { word: "heard.",    segmentId: "mn1:1.1", isParagraphStart: false, trailingPunctuation: "." },
  ...
]
```

## 6.3 Chunking

Modes: 1, 2, 3, or 4 words per display.

When chunk size > 1, group consecutive tokens. Display all words in the chunk separated by spaces. ORP is calculated on the longest word in the chunk.

Chunks never cross paragraph boundaries (i.e., never combine a token with `isParagraphStart: true` with the previous token).

```typescript
function buildChunks(tokens: Token[], chunkSize: number): Token[][] {
  const chunks: Token[][] = [];
  let i = 0;
  while (i < tokens.length) {
    const chunk: Token[] = [tokens[i]];
    let j = 1;
    while (j < chunkSize && i + j < tokens.length && !tokens[i + j].isParagraphStart) {
      chunk.push(tokens[i + j]);
      j++;
    }
    chunks.push(chunk);
    i += chunk.length;
  }
  return chunks;
}
```

## 6.4 Timing Model

### Base Timing

```
baseDelayMs = 60000 / wpm
chunkDelayMs = baseDelayMs * wordsInChunk
```

### Punctuation Pause Multipliers

Applied to the **last word** in a chunk based on its `trailingPunctuation`:

| Punctuation | Multiplier | Effect at 300 WPM (200ms base) |
|---|---|---|
| `.` `!` `?` | 2.5× | 500ms |
| `…` | 3.0× | 600ms |
| `,` `;` `:` | 1.5× | 300ms |
| `—` | 1.5× | 300ms |
| `)` `]` `"` `'` | 1.3× | 260ms |
| None | 1.0× | 200ms |

### Paragraph Break Pause

When the next chunk starts a new paragraph (`isParagraphStart`), add a pause **after** the current chunk:

```
paragraphPauseMs = baseDelayMs * 3.0
```

### Long Word Bonus

Words longer than 8 characters get extra display time:

```
longWordBonusMs = baseDelayMs * 0.1 * (wordLength - 8)
```

Applied to the longest word in the chunk.

### Final Delay Calculation

```typescript
function calculateChunkDelay(
  chunk: Token[],
  wpm: number,
  nextChunkIsParagraphStart: boolean
): number {
  const baseDelay = 60000 / wpm;
  let delay = baseDelay * chunk.length;

  // Punctuation multiplier (from last word)
  const lastWord = chunk[chunk.length - 1];
  const punct = lastWord.trailingPunctuation;
  if (/[.!?]/.test(punct)) delay *= 2.5;
  else if (punct === '…' || punct === '...') delay *= 3.0;
  else if (/[,;:\u2014]/.test(punct)) delay *= 1.5;
  else if (/[)\]"']/.test(punct)) delay *= 1.3;

  // Long word bonus
  const longestWord = Math.max(...chunk.map(t => t.word.length));
  if (longestWord > 8) {
    delay += baseDelay * 0.1 * (longestWord - 8);
  }

  // Paragraph pause
  if (nextChunkIsParagraphStart) {
    delay += baseDelay * 3.0;
  }

  return delay;
}
```

## 6.5 Playback Engine

Use `setTimeout` (not `setInterval`) for variable-duration timing.

```typescript
function tick() {
  if (!isPlaying || currentIndex >= chunks.length) return;

  displayChunk(chunks[currentIndex]);
  updateProgress(currentIndex, chunks.length);

  const nextIsParagraphStart = currentIndex + 1 < chunks.length
    && chunks[currentIndex + 1][0].isParagraphStart;
  const delay = calculateChunkDelay(chunks[currentIndex], wpm, nextIsParagraphStart);

  currentIndex++;
  timerId = setTimeout(tick, delay);
}
```

**Requirements:**
- Speed (`wpm`) changes take effect on the next tick — no restart needed.
- Chunk size changes re-chunk the tokens and adjust `currentIndex` to the nearest equivalent position.
- Pause clears the current `setTimeout`. Resume starts a new `tick()`.
- Skip forward/backward adjusts `currentIndex` by ±10 (clamped to bounds) and restarts the tick if playing.

---

# 7. Search and UID Normalization

## 7.1 Accepted Input Formats

| Input | Normalized UID |
|---|---|
| `MN 1` | `mn1` |
| `mn1` | `mn1` |
| `Majjhima 1` | `mn1` |
| `Majjhima Nikaya 1` | `mn1` |
| `majjhima nikāya 1` | `mn1` |
| `sn12.2` | `sn12.2` |
| `SN 12.2` | `sn12.2` |
| `AN 4.159` | `an4.159` |
| `Dhammapada` | Search by title |
| `root of all things` | Search by title |
| `https://suttacentral.net/mn1/en/sujato` | `mn1` |

## 7.2 Nikāya Alias Map

```typescript
const NIKAYA_ALIASES: Record<string, string> = {
  'digha': 'dn',
  'dīgha': 'dn',
  'digha nikaya': 'dn',
  'dīgha nikāya': 'dn',
  'majjhima': 'mn',
  'majjhima nikaya': 'mn',
  'majjhima nikāya': 'mn',
  'samyutta': 'sn',
  'saṁyutta': 'sn',
  'samyutta nikaya': 'sn',
  'saṁyutta nikāya': 'sn',
  'anguttara': 'an',
  'aṅguttara': 'an',
  'anguttara nikaya': 'an',
  'aṅguttara nikāya': 'an',
  'khuddakapatha': 'kp',
  'khuddakapāṭha': 'kp',
  'dhammapada': 'dhp',
  'udana': 'ud',
  'udāna': 'ud',
  'itivuttaka': 'iti',
  'sutta nipata': 'snp',
  'sutta nipāta': 'snp',
  'theragatha': 'thag',
  'therāgathā': 'thag',
  'therigatha': 'thig',
  'therīgāthā': 'thig',
};
```

## 7.3 UID Normalization Algorithm

```typescript
function normalizeInput(input: string): { uid: string | null; searchQuery: string | null } {
  let s = input.trim();

  // Handle SuttaCentral URLs
  const urlMatch = s.match(/suttacentral\.net\/([a-z]+[\d.]+)/i);
  if (urlMatch) return { uid: urlMatch[1].toLowerCase(), searchQuery: null };

  // Handle direct UIDs: "mn1", "sn12.2", "dn1", "an4.159"
  const directMatch = s.match(/^(dn|mn|sn|an|kp|dhp|ud|iti|snp|thag|thig)\s*(\d+(?:[.\-]\d+(?:-\d+)?)?)\s*$/i);
  if (directMatch) {
    const prefix = directMatch[1].toLowerCase();
    const number = directMatch[2];
    return { uid: `${prefix}${number}`, searchQuery: null };
  }

  // Handle nikāya aliases: "Majjhima 1", "Digha Nikaya 15"
  const lower = s.toLowerCase().replace(/[āáà]/g, 'a').replace(/[īíì]/g, 'i')
    .replace(/[ūúù]/g, 'u').replace(/[ṁṃ]/g, 'm').replace(/[ṇ]/g, 'n')
    .replace(/[ṭ]/g, 't').replace(/[ñ]/g, 'n');

  for (const [alias, prefix] of Object.entries(NIKAYA_ALIASES)) {
    const aliasNorm = alias.replace(/[āáà]/g, 'a').replace(/[īíì]/g, 'i')
      .replace(/[ūúù]/g, 'u').replace(/[ṁṃ]/g, 'm').replace(/[ṇ]/g, 'n')
      .replace(/[ṭ]/g, 't').replace(/[ñ]/g, 'n');
    const pattern = new RegExp(`^${aliasNorm}\\s+(\\d+(?:\\.\\d+)?)$`);
    const match = lower.match(pattern);
    if (match) return { uid: `${prefix}${match[1]}`, searchQuery: null };
  }

  // Fallback: treat as title search
  return { uid: null, searchQuery: s };
}
```

## 7.4 Search Index Schema

Built offline by `scripts/build-search-index.ts` and served by the Worker.

```typescript
interface SearchIndexEntry {
  uid: string;           // "mn1"
  c: string;             // collection: "mn"
  t: string;             // English title: "The Root of All Things"
  p: string;             // Pāli title: "Mūlapariyāyasutta"
  a: string[];           // Aliases for search: ["mulapariyaya", "root of all things"]
}
```

### Client-Side Search Algorithm

```typescript
function search(query: string, index: SearchIndexEntry[]): SearchIndexEntry[] {
  const q = query.toLowerCase().trim();

  // 1. Exact UID match
  const uidMatch = index.find(e => e.uid === q);
  if (uidMatch) return [uidMatch];

  // 2. Prefix match on UID
  const uidPrefixMatches = index.filter(e => e.uid.startsWith(q));
  if (uidPrefixMatches.length > 0 && uidPrefixMatches.length <= 20) {
    return uidPrefixMatches.slice(0, 8);
  }

  // 3. Substring match on title fields
  return index
    .filter(e =>
      e.t.toLowerCase().includes(q) ||
      e.p.toLowerCase().includes(q) ||
      e.a.some(alias => alias.includes(q))
    )
    .slice(0, 8);
}
```

---

# 8. Translator & Metadata Model

## 8.1 Translation Option Type

```typescript
interface TranslationOption {
  lang: string;              // ISO 639 code: "en", "de", "pli"
  langName: string;          // Display name: "English", "Deutsch", "Pāli"
  author: string;            // Author UID: "sujato", "bodhi"
  authorName: string;        // Display name: "Bhikkhu Sujato"
  isRoot: boolean;           // true for root Pāli text
  publication: string;       // "SuttaCentral", "Wisdom Publications"
  licence: string;           // "CC0 1.0", "CC BY-NC"
}
```

## 8.2 Language Display Order

1. Root Pāli (always first)
2. English
3. Other languages alphabetically by `langName`

Within a language, sort by author name alphabetically.

---

# 9. Phase Plan

## Phase 0 — Prototype (Design Validation)

**Goal:** Validate the RSVP reading experience with static text. No API, no real data.

**Deliverables:**
- [ ] Project scaffolding: Vite + React + TypeScript + Tailwind + Vitest
- [ ] `Token` type and tokenizer with unit tests
- [ ] `calculateChunkDelay` with punctuation multipliers and unit tests
- [ ] `getOrpIndex` with unit tests
- [ ] `RSVPDisplay` component with ORP rendering
- [ ] `ReaderControls` component (play/pause, WPM slider, chunk selector)
- [ ] `ProgressBar` component (shows % and time remaining)
- [ ] Hardcoded sample text (MN 1 excerpt, ~500 words)
- [ ] Dark/light theme toggle with Tailwind `dark:` classes
- [ ] Keyboard shortcuts (Space, arrows, 1-4, d, r)
- [ ] localStorage persistence for preferences
- [ ] All components have RTL unit tests

**Exit Criteria:** A user can speed-read a hardcoded sutta excerpt at adjustable WPM with smooth ORP display, punctuation pauses, and keyboard controls.

---

## Phase 1 — Data Integration

**Goal:** Connect to real SuttaCentral data. Full search-to-read flow.

**Deliverables:**
- [ ] Cloudflare Worker with Wrangler setup
- [ ] `GET /api/v1/sutta/:uid` endpoint (metadata + translations)
- [ ] `GET /api/v1/sutta/:uid/text/:lang/:author` endpoint (ordered segments)
- [ ] `GET /api/v1/search/index` endpoint (search index)
- [ ] GitHub raw content fetching with edge caching (Cache API)
- [ ] Segment ordering implementation with tests
- [ ] `_author.json` and `_publication.json` parsing
- [ ] `buildTextPath()` with all collection path patterns and tests
- [ ] `normalizeInput()` UID normalization with alias map and tests
- [ ] `SearchInput` component with autocomplete
- [ ] `TranslationChooser` modal
- [ ] `HomePage` with search
- [ ] `ReaderPage` that fetches real data and initializes RSVP
- [ ] React Router setup with routes: `/`, `/read/:uid`, `/read/:uid/:lang/:author`
- [ ] `scripts/build-search-index.ts` — builds index from bilara-data
- [ ] Error states: sutta not found, network error, no translations available
- [ ] Rate limiting on Worker (120 req/min/IP)

**Exit Criteria:** A user can search for "MN 1", choose Sujato English, and speed-read the full sutta with all controls working.

---

## Phase 2 — Reading Polish

**Goal:** Refine the reading experience for production quality.

**Deliverables:**
- [ ] Clickable/scrubbable progress bar (click to seek)
- [ ] "Last read" resume: save position to localStorage, prompt on return
- [ ] Font size selector (Normal / Large / XLarge) with persistence
- [ ] Mobile-responsive layout (controls stack vertically on small screens)
- [ ] Touch gestures: tap left half = skip back, tap right half = skip forward
- [ ] Loading skeleton while sutta text fetches
- [ ] Smooth transitions between chunks (CSS transition on opacity)
- [ ] Section `0.x` (title) segments displayed as a brief header before RSVP begins
- [ ] AN range UID resolution (e.g., `an1.3` → file `an1.1-10`)
- [ ] Long-word timing bonus implementation
- [ ] Performance: ensure no dropped frames at 800 WPM (use `requestAnimationFrame` for display, `setTimeout` for timing)

**Exit Criteria:** Reading experience feels smooth, professional, and works well on mobile.

---

## Phase 3 — Infrastructure Hardening

**Goal:** Production-ready CI/CD, testing, and monitoring.

**Deliverables:**
- [ ] GitHub Actions CI: lint + type-check + unit tests + E2E on every PR
- [ ] GitHub Actions deploy: auto-deploy to Cloudflare on merge to `main`
- [ ] GitHub Actions sync: daily cron checks `bilara-data` `published` branch for updates
  - Compare latest commit SHA against stored SHA (in KV or R2)
  - If changed: rebuild search index, purge edge cache, redeploy
- [ ] Cloudflare KV for storing: search index, last-synced commit SHA
- [ ] Dependabot config for monthly dependency updates
- [ ] Playwright E2E tests: full search → read → controls flow
- [ ] Test coverage ≥ 80% for `packages/shared` and `packages/web/src/lib`
- [ ] Error monitoring (Cloudflare Workers analytics or Sentry free tier)
- [ ] Performance budget: bundle < 150KB gzipped, FCP < 2s

**Exit Criteria:** Fully automated pipeline. No manual deploys. Data stays fresh.

---

## Phase 4 — PWA

**Goal:** Installable, works offline for previously loaded suttas.

**Deliverables:**
- [ ] Service worker with Workbox (precache app shell, runtime cache API responses)
- [ ] Web app manifest (`manifest.json`)
- [ ] Install prompt on supported browsers
- [ ] Cache strategy: NetworkFirst for API calls, CacheFirst for static assets
- [ ] Offline indicator when no network

**Exit Criteria:** User can install PaliSpeedRead, load a sutta online, then read it offline.

---

# 10. CI/CD Specification

## 10.1 GitHub Actions: CI (`ci.yml`)

**Trigger:** Every push and PR to `main`.

```yaml
jobs:
  lint-typecheck:
    - pnpm install
    - pnpm run lint          # ESLint
    - pnpm run typecheck     # tsc --noEmit

  test-unit:
    - pnpm install
    - pnpm run test          # Vitest
    - Upload coverage report

  test-e2e:
    - pnpm install
    - pnpm run build
    - pnpm run test:e2e      # Playwright

  coverage-gate:
    - Fail if coverage < 80%
```

## 10.2 GitHub Actions: Deploy (`deploy.yml`)

**Trigger:** Push to `main` (after CI passes).

```yaml
jobs:
  deploy-worker:
    - pnpm install
    - cd packages/worker && npx wrangler deploy
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}

  deploy-pages:
    - pnpm install
    - cd packages/web && pnpm run build
    - npx wrangler pages deploy dist --project-name=palispeedread
```

## 10.3 GitHub Actions: Sync bilara-data (`sync-bilara.yml`)

**Trigger:** Daily cron (`0 6 * * *` UTC).

```yaml
jobs:
  sync:
    steps:
      - Fetch latest commit SHA: gh api /repos/suttacentral/bilara-data/commits/published --jq .sha
      - Compare against stored SHA (Cloudflare KV: key "bilara-last-sha")
      - If different:
        - Run scripts/build-search-index.ts
        - Upload new index to KV (key "search-index")
        - Update stored SHA in KV
        - Purge Worker cache (Cloudflare API: POST /zones/{zone}/purge_cache)
        - Trigger deploy workflow
```

## 10.4 Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 10
```

---

# 11. Testing Strategy (TDD Required)

All logic modules must have tests written BEFORE implementation (red-green-refactor).

## 11.1 Unit Tests (Vitest)

| Module | Test Cases |
|---|---|
| `uid.ts` — `normalizeInput()` | `"MN 1"→mn1`, `"sn12.2"→sn12.2`, `"Majjhima 1"→mn1`, `"Majjhima Nikaya 1"→mn1`, `"majjhima nikāya 1"→mn1`, SC URL extraction, invalid input returns search query |
| `uid.ts` — `parseUid()` | Extract collection, number, subdir for all collections. Handle AN ranges. Handle KN sub-collections. |
| `uid.ts` — `buildTextPath()` | Correct paths for dn1, mn1, sn12.2, an4.159, dhp1-20, ud1.1, snp1.1, thag1.1 — both root and translation |
| `tokenizer.ts` | Whitespace splitting, punctuation attachment, diacritic preservation, Unicode NFC normalization, paragraph boundary detection, empty segments, segment ordering |
| `chunker.ts` | Chunk sizes 1–4, no cross-paragraph chunks, last partial chunk |
| `timing.ts` — `calculateChunkDelay()` | All punctuation multipliers, paragraph pauses, long-word bonus, various WPM values |
| `timing.ts` — `getOrpIndex()` | All word length brackets |
| `search.ts` | Exact UID match, prefix match, title substring match, Pāli title match, case insensitivity, diacritic-insensitive matching |
| `segments.ts` — `compareSegmentIds()` | Correct numeric ordering (not lexicographic), handles all segment ID formats |

## 11.2 Component Tests (React Testing Library)

| Component | Test Cases |
|---|---|
| `RSVPDisplay` | Renders word with correct ORP highlighting, displays chunks correctly, blank state when paused |
| `ReaderControls` | Play/pause toggles state, WPM slider updates, chunk selector updates, skip buttons adjust index |
| `SearchInput` | Renders input, shows results on type, navigates on selection, handles empty results |
| `TranslationChooser` | Renders all translation options, groups by language, default selection, navigates on confirm |
| `ProgressBar` | Shows correct percentage, shows time remaining, click-to-seek updates position |

## 11.3 Integration Tests

| Scenario | Assertions |
|---|---|
| Fetch MN 1 English (Sujato) | Segments returned in correct order, first segment is title, total segment count matches expected |
| Fetch SN 12.2 Pāli root | Pāli diacritics preserved, segment ordering correct |
| Translation discovery for MN 1 | Returns at least Sujato English and root Pāli |
| Full read flow | Search → select → choose translation → play → pause → verify position persists |

## 11.4 Edge Case Tests

| Scenario | Expected Behavior |
|---|---|
| Sutta with no English translation | Translation chooser shows available languages only |
| Sutta with multiple translators in same language | All shown, disambiguated by translator name |
| KN range UIDs (dhp1-20) | Treated as single sutta, all verse segments included |
| AN grouped suttas (an1.1-10) | Resolves to correct file, returns all segments in range |
| Very long sutta (DN 1, ~15000 words) | No memory issues, progress bar accurate, smooth at 800 WPM |
| Single-word sutta segment | Tokenizer handles correctly, no empty tokens |
| Unicode edge cases | Pāli: āīūṁṇṭñ preserved. Sinhala/Thai scripts if present. |

## 11.5 E2E Tests (Playwright)

| Flow | Steps |
|---|---|
| Search and read | Navigate to `/`, type "MN 1", select result, choose English Sujato, press play, verify words cycle, press pause, verify stopped |
| Keyboard controls | Open reader, press Space (play), press Space (pause), press → (skip forward), verify progress changed |
| Theme persistence | Toggle dark mode, reload page, verify dark mode persists |
| Direct URL | Navigate to `/read/mn1/en/sujato`, verify reader loads with correct sutta |

## 11.6 Performance Tests

| Test | Threshold |
|---|---|
| 15,000-token sutta (DN 1) at 800 WPM | No dropped frames, smooth display |
| Speed change mid-stream | Next word uses new timing immediately |
| Chunk size change mid-stream | Re-chunks without losing position |
| Search index load and query | < 500ms to load, < 50ms per query |

---

# 12. Performance Requirements

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 2.5s |
| Sutta text load (edge-cached) | < 500ms |
| Sutta text load (cache miss) | < 2s |
| No dropped frames | Up to 800 WPM |
| JS bundle size (gzipped) | < 150KB |
| Search index size (gzipped) | < 250KB |
| Lighthouse Performance score | ≥ 90 |

---

# 13. Accessibility

- High-contrast dark mode (WCAG AA minimum contrast ratios)
- Font size options: Normal (18px), Large (24px), XLarge (32px)
- Full keyboard navigation (all controls reachable via Tab + keyboard shortcuts)
- `aria-live="polite"` on RSVP display for screen readers (announces current word)
- `aria-label` on all icon-only buttons
- `prefers-color-scheme` media query for initial theme
- `prefers-reduced-motion` media query: if set, disable CSS transitions on word changes
- Focus ring visible on all interactive elements

---

# 14. Security

- No login, no authentication, no PII
- Worker rate limiting: 120 requests/minute/IP via `RateLimiter` binding
- CORS: Worker responds with `Access-Control-Allow-Origin` matching the Pages domain only
- Content Security Policy headers on Pages
- No user-generated content — all content sourced from SuttaCentral
- Dependencies: lockfile committed, Dependabot for updates, `pnpm audit` in CI

---

# 15. Error Handling

| Error | User-Facing Behavior |
|---|---|
| Sutta UID not found | "Sutta not found. Check the ID or try searching by title." with link to home |
| Network error fetching text | "Unable to load sutta. Check your connection and try again." with retry button |
| No translations available | "No translations available for this sutta." |
| Worker rate limited (429) | "Too many requests. Please wait a moment." |
| Search index load failure | Search input shows "Search unavailable — try entering a UID directly" |
| Invalid URL/route | 404 page with search input |

All errors are non-destructive. The app never crashes — it degrades gracefully.

---

# 16. Definition of Done (v1)

User can:

- Enter `MN 1` in search box and see autocomplete results
- Select MN 1 from results
- See translation chooser with Pāli root + all available translations
- Choose English — Bhikkhu Sujato
- Press play and see words displayed one at a time with ORP highlighting
- Adjust WPM from 100 to 800 using slider or ↑↓ keys
- Switch chunk size to 2 words with `2` key
- Pause/resume with Space
- Skip forward/backward with arrow keys
- See progress bar with percentage and estimated time remaining
- Click progress bar to seek to a position
- Switch to dark mode with `d` key
- Reload page and see settings (WPM, theme, chunk size) persisted
- Navigate directly to `/read/sn12.2/en/sujato` and read that sutta
- Search for "root of all things" and find MN 1
- Search for "dhammapada" and find the Dhammapada

All unit tests pass. Coverage ≥ 80%. E2E tests pass. Deployed and accessible on Cloudflare.

---

# 17. Future Extensions (Not v1)

- Parallel bilingual mode (root Pāli + translation side-by-side)
- Sentence-end pacing multipliers (configurable per-user)
- Reading statistics (WPM history, suttas completed)
- Bookmark sync (localStorage or optional account)
- Dictionary integration (hover/click for Pāli word definitions)
- AI-guided pacing based on text complexity
- PWA offline mode for full collections
- Phrase-aware chunking (keep articles with nouns, prepositions with objects)

---

# 18. Philosophical Constraint

The interface must remain:

- Sparse
- Non-distracting
- Fast
- Respectful of canonical integrity

No gamification.
No clutter.
No feature bloat.

Every UI element must justify its existence by directly supporting the reading experience.

---
