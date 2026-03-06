# RSVP Chunking and ORP Implementation Plan

Date: 2026-03-06
Status: Ready for execution
Primary spec: `debug/RSVP_CHUNKING_ORP_IMPL_SPEC_V2.md`

## 1. Goal

Implement the reviewed RSVP reading improvements without adding runtime layout measurement or new product surface area.

This implementation will:

1. stop chunks at sentence-final punctuation
2. add one simple clause-based early stop
3. shorten chunks using a font-size-aware character budget
4. change multi-word ORP placement to chunk-midpoint logic
5. preserve classic ORP for single-word chunks

## 2. Delivery Constraints

1. No DOM measurement or wrap detection.
2. No logical chunk versus display chunk split.
3. No weak trailing word heuristics.
4. No changes to user-facing controls or settings labels in this slice.
5. Keep algorithm deterministic from token data plus reader settings.
6. Preserve existing playback timing model unless directly required by new chunk boundaries.

## 3. Files Expected To Change

### Shared logic

1. `packages/shared/src/chunker.ts`
2. `packages/shared/src/types.ts` only if chunker needs new config types
3. `packages/shared/src/constants.ts` if new chunking constants are introduced
4. `packages/shared/src/__tests__/chunker.test.ts`
5. `packages/shared/src/timing.ts` only if shared helper extraction makes sense for punctuation classification

### Web display logic

1. `packages/web/src/components/orp-split.ts`
2. `packages/web/src/components/RSVPDisplay.tsx` only if render contract changes
3. `packages/web/src/components/RSVPDisplay.test.tsx`

### Reader integration

1. `packages/web/src/hooks/useRSVP.ts`
2. `packages/web/src/pages/ReaderPage.tsx`
3. `packages/web/src/hooks/useRSVP.test.tsx`

### End-to-end tests

1. `e2e/app.spec.ts`

### Documentation

1. `debug/RSVP_CHUNKING_ORP_IMPL_SPEC_V2.md` only if implementation reveals a small clarification gap
2. `debug/PROBLEMS_TO_FIX.md` only if this work closes or creates relevant reader items

## 4. Implementation Architecture

## 4.1 Chunking Inputs

Current chunker signature only accepts:

1. `tokens`
2. `chunkSize`

It must evolve to support:

1. `tokens`
2. `chunkSize`
3. `fontSize`

Recommended shape:

1. either extend `buildChunks(tokens, chunkSize, fontSize)`
2. or introduce `buildChunks(tokens, { chunkSize, fontSize })`

Preferred choice:

1. use an options object

Reason:

1. the algorithm already needs more than one tuning input
2. an options object prevents another breaking signature later

## 4.2 Punctuation Classification

Chunking now needs to identify:

1. sentence-final punctuation
2. clause punctuation
3. paragraph boundaries

Implementation recommendation:

1. create shared helpers close to `chunker.ts`
2. do not duplicate regex logic across chunker and timing if avoidable

Suggested helpers:

1. `isSentenceFinalPunctuation(punctuation: string): boolean`
2. `isClauseFinalPunctuation(punctuation: string): boolean`
3. `getChunkCharBudget(fontSize): number`
4. `getVisibleChunkLength(tokens: Token[]): number`

Decision note:

1. if these helpers are only used in `chunker.ts`, keep them private to that module
2. only promote to shared exports if tests or ORP logic genuinely need reuse

## 4.3 Character Budget

Character budget must be enforced during chunk construction, not after.

Budget table:

1. `normal -> 22`
2. `large -> 20`
3. `xlarge -> 18`

Visible length definition:

1. count token word characters
2. count trailing punctuation
3. count single spaces between rendered tokens

The implementation must use the same visible-string rules as the renderer where practical.

## 4.4 ORP Algorithm Split

Single-word chunk:

1. keep current `getOrpIndex()` behavior

Multi-word chunk:

1. compute the full visible chunk string
2. find all candidate word-character positions
3. select the candidate nearest to the midpoint of the visible string
4. tie-break to the earlier character

Implementation recommendation:

1. keep `splitChunkAtOrp(chunk)` public API stable if possible
2. rewrite internals to select highlight position by chunk midpoint for multi-word chunks

Reason:

1. this minimizes blast radius in `RSVPDisplay`

## 4.5 Reader Hook Integration

`useRSVP` currently builds chunks from:

1. tokens
2. chunk size

It must be updated to also re-chunk when font size changes.

Implications:

1. `ReaderPage` must pass `preferences.fontSize` into `useRSVP`
2. `useRSVP` memoization dependencies must include font size
3. chunk position preservation logic must continue to work when font size changes

Expected behavior:

1. changing font size may reduce or expand chunk density
2. current reading position should stay anchored to the same token index as closely as possible

## 5. Concrete Change List

## 5.1 `packages/shared/src/chunker.ts`

Tasks:

1. replace rigid paragraph-only chunking with multi-rule chunk builder
2. add sentence-final hard stop
3. add clause stop after 2 or more words
4. add font-size-based character budget
5. preserve long single-token chunks
6. preserve max word-count ceiling semantics

Implementation notes:

1. build chunk incrementally
2. after each token add, decide whether chunk must close
3. before adding next token, check paragraph, count, and character budget
4. keep algorithm linear in token count

## 5.2 `packages/shared/src/__tests__/chunker.test.ts`

Add or update tests for:

1. sentence punctuation closes chunk immediately
2. clause punctuation closes chunk only after 2 or more words
3. paragraph boundary still closes chunk
4. max chunk size remains a ceiling
5. character budget stops next token
6. character budgets vary by font size
7. long token over budget still yields single-token chunk
8. sentence punctuation with closing quote still closes chunk

Testing style:

1. keep token fixtures explicit
2. assert chunk word arrays, not just chunk counts

## 5.3 `packages/web/src/components/orp-split.ts`

Tasks:

1. preserve single-word ORP path
2. replace multi-word per-word-table logic with chunk-midpoint logic
3. ensure spaces and punctuation are ignored for candidate highlight positions
4. keep output shape `[before, orpChar, after]`

Implementation notes:

1. define the visible string exactly once
2. track absolute character positions for word characters only
3. map chosen absolute position back to token and character index

## 5.4 `packages/web/src/components/RSVPDisplay.test.tsx`

Add or update tests for:

1. multi-word highlight moves to midpoint-nearest character
2. punctuation is not selected as ORP character
3. spaces are not selected as ORP character
4. single-word chunks still use legacy ORP
5. representative 2-word and 3-word examples from the spec render correctly

## 5.5 `packages/web/src/hooks/useRSVP.ts`

Tasks:

1. add `fontSize` input to hook signature
2. rebuild chunks when font size changes
3. preserve current token anchoring when chunk size or font size changes

Implementation notes:

1. current position preservation already keys off active token index
2. extend the same logic to font-size-triggered rechunking
3. ensure this does not reset playback unexpectedly

## 5.6 `packages/web/src/hooks/useRSVP.test.tsx`

Add tests for:

1. changing font size re-chunks tokens
2. changing font size preserves approximate reading position
3. sentence-final boundaries produce expected total chunk sequence through hook output

## 5.7 `packages/web/src/pages/ReaderPage.tsx`

Tasks:

1. pass `preferences.fontSize` into `useRSVP`
2. verify no additional UI changes are needed

This should be a small integration diff.

## 5.8 `e2e/app.spec.ts`

Add self-contained route-mocked tests for:

1. sentence-final chunk boundary on representative sample text
2. multi-word ORP midpoint behavior on representative sample text
3. same source text produces shorter chunks at `xlarge` than `normal`

Implementation note:

1. keep these tests route-mocked instead of depending on live content
2. assert visible reader output step-by-step with `Skip forward`

## 6. Sequencing

Implement in this order:

1. update chunker algorithm and chunker unit tests
2. update ORP split logic and component tests
3. update `useRSVP` and its tests to include font size
4. wire `ReaderPage` integration
5. add route-mocked E2E coverage
6. run lint, typecheck, unit tests, and targeted E2E

Reason:

1. shared logic first reduces downstream churn
2. ORP and chunking can be validated independently before touching reader integration

## 7. Validation Plan

Required commands after implementation:

1. `pnpm --filter @palispeedread/shared test -- --run`
2. `pnpm --filter @palispeedread/web test -- --run`
3. `pnpm --filter @palispeedread/web lint`
4. `pnpm --filter @palispeedread/web typecheck`
5. targeted Playwright run against local dev server for new reader behavior

Recommended manual playtest after automated checks:

1. load one long English sutta
2. compare `normal` vs `xlarge`
3. test chunk-size `2`, `3`, `4`
4. verify sentence endings never leak one word into the next chunk
5. verify multi-word chunks feel visually centered

## 8. Acceptance Checklist

Implementation is complete only when all of the following are true:

1. sentence-final punctuation always terminates a chunk
2. clause punctuation can terminate after 2 or more words
3. chunk-size acts as maximum words, not exact words
4. font size changes chunk density
5. single-word ORP behavior is unchanged
6. multi-word ORP uses chunk midpoint logic
7. current reading position survives rechunking when chunk size or font size changes
8. automated coverage exists for the new chunking and ORP rules
9. no regression appears in existing reader controls or playback behavior

## 9. Risks and Watchpoints

1. Character counting may diverge from rendered perception if punctuation accounting is inconsistent.
2. ORP midpoint logic may initially feel unfamiliar on some chunk shapes even if technically centered.
3. Clause-stop behavior may create more one-word chunks in dialogue-heavy passages.
4. Rechunking on font-size change could accidentally shift the reader farther than expected if anchor logic is not preserved carefully.

## 10. Tuning Policy

If post-implementation playtesting reveals issues, tune in this order:

1. adjust character budget numbers only
2. if still poor, revisit clause-stop rule
3. do not add new heuristics in the first correction pass

## 11. Out of Scope

1. abbreviation-aware sentence parsing
2. decimal-aware punctuation parsing
3. Pali-specific phrase heuristics
4. DOM wrap measurement
5. dynamic chunking based on viewport width
6. user setting for phrase mode versus strict mode
