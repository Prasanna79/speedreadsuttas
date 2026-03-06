# RSVP Chunking and ORP Implementation Spec v2

Date: 2026-03-06
Status: Revised after UX Lead and PM review
Supersedes: `debug/RSVP_CHUNKING_ORP_IMPL_SPEC_V1.md`
Source feedback: `debug/RSVP_CHUNKING_ORP_SPEC_REVIEW_FEEDBACK.md`

## 1. Objective

Improve RSVP reading flow with three lightweight changes:

1. stop chunks at sentence endings
2. shorten overly dense chunks using a character budget
3. center multi-word ORP using the whole chunk, not just a single word table

This slice must stay deterministic, lightweight, and easy to tune.

## 2. Scope

This spec covers:

1. chunk-building rules
2. multi-word ORP placement
3. acceptance criteria and tests

This spec does not include:

1. DOM measurement or line-wrap inspection
2. logical chunk versus display chunk separation
3. linguistic heuristics such as weak trailing word handling
4. abbreviation or decimal-aware punctuation parsing

## 3. Product Rules

### 3.1 Chunk Size Semantics

The user’s chunk-size setting means:

1. up to `N` words per chunk

It does not guarantee exactly `N` words. Chunks may be smaller because of:

1. paragraph boundaries
2. sentence boundaries
3. clause boundaries
4. character budget

### 3.2 Hard Chunk Boundaries

A chunk must always end at:

1. paragraph start before the next token
2. sentence-final punctuation on the current token

Sentence-final punctuation for v2:

1. `.`
2. `!`
3. `?`
4. `…`
5. sentence-final punctuation followed by closing quote or bracket

### 3.3 Clause Early Stop

A chunk may end early at clause punctuation when the chunk already contains at least 2 words.

Clause punctuation for v2:

1. `,`
2. `;`
3. `:`
4. `—`
5. `–`

Rule:

1. If the current token ends with clause punctuation and the chunk already has 2 or more words, end the chunk there.

This is the only clause rule in v2.

### 3.4 Character Budget

Chunk density is controlled by a visible-character budget.

Visible characters include:

1. token text
2. trailing punctuation
3. single spaces between rendered tokens

Initial budgets:

1. `normal`: 22
2. `large`: 20
3. `xlarge`: 18

Rule:

1. Do not add a token if doing so would exceed the character budget.
2. Exception: if the chunk is empty, always allow the first token.

### 3.5 Long Token Rule

If a single token exceeds the character budget:

1. it remains a valid single-token chunk
2. no intra-word splitting is introduced in this slice

## 4. Chunk-Building Algorithm

Inputs:

1. token stream
2. max chunk size
3. font size

Derived:

1. character budget from font size

Algorithm:

1. Start an empty chunk.
2. Add the first available token.
3. After adding each token, check whether the chunk must close:
4. Close if the token is sentence-final.
5. Close if the token is clause-final and chunk word count is at least 2.
6. Otherwise consider the next token.
7. Close before the next token if the next token starts a paragraph.
8. Close before the next token if current chunk word count already equals max chunk size.
9. Close before the next token if adding it would exceed character budget.
10. Otherwise add the next token and continue.

Result:

1. every chunk is valid under punctuation, paragraph, count, and density rules

## 5. ORP Placement

### 5.1 Single-Word Chunk

Keep current classic ORP behavior:

1. use the existing per-word ORP table

### 5.2 Multi-Word Chunk

For chunks with 2 or more words:

1. build the exact visible chunk string as rendered
2. compute the midpoint of that visible string
3. enumerate candidate highlight positions from word characters only
4. ignore spaces for highlight placement
5. ignore punctuation for highlight placement
6. choose the candidate character nearest to the visible midpoint
7. break ties toward the earlier character

This replaces the current behavior of selecting the highlighted letter from a per-word ORP table inside the anchor word.

## 6. Timing

No new timing model changes in this slice.

Keep:

1. WPM base delay
2. punctuation pause from last token
3. paragraph pause
4. long-word bonus

Expected benefit:

1. punctuation pauses will now align better with visible sentence and clause boundaries because chunk boundaries improve

## 7. Known Limitations

These are accepted for v2:

1. abbreviations like `e.g.` may split as if sentence-final
2. decimal numbers like `2.5` may split at the period
3. some one-word clause chunks will still appear

These are acceptable in exchange for keeping the slice lightweight and predictable.

## 8. Examples

### Example A

Tokens:

1. `I`
2. `have`
3. `heard.`
4. `Thus`
5. `have`
6. `I`

Setting:

1. chunk size `4`
2. font `normal`

Expected chunks:

1. `I have heard.`
2. `Thus have I`

### Example B

Tokens:

1. `This`
2. `is`
3. `the`
4. `teaching,`
5. `monks,`
6. `listen`
7. `carefully.`

Setting:

1. chunk size `4`
2. font `normal`

Expected chunks:

1. `This is the teaching,`
2. `monks,`
3. `listen carefully.`

### Example C

Tokens:

1. `dependent`
2. `origination`
3. `is`
4. `deep`

Setting:

1. chunk size `4`
2. font `xlarge`

Expected chunks:

1. `dependent`
2. `origination is`
3. `deep`

## 9. Acceptance Criteria

1. Sentence-final punctuation always ends the chunk.
2. Paragraph boundaries still end the chunk.
3. Clause punctuation can end the chunk early after 2 or more words.
4. Character budget shortens chunks at larger font sizes.
5. Chunk-size setting acts as a maximum word count, not a guarantee.
6. Multi-word ORP uses chunk midpoint logic.
7. Single-word ORP remains unchanged.
8. Long tokens still render as single-token chunks.
9. Behavior is deterministic from token data and reader settings alone.

## 10. Test Plan

### Unit

1. sentence-final punctuation forces chunk close
2. paragraph boundary forces chunk close
3. clause punctuation closes chunk only after 2 or more words
4. character budget blocks additional token
5. character budget differs by font size
6. long token over budget still forms a single-token chunk
7. single-word ORP still uses legacy table
8. multi-word ORP chooses midpoint-nearest character

### Component

1. reader display renders centered multi-word highlight correctly
2. same source text produces shorter chunks at `xlarge` than `normal`

### E2E

1. sentence-ending chunk boundary is visible on real reader content
2. multi-word ORP appears centered on representative 2-word and 3-word chunks
3. mobile `xlarge` produces shorter chunks than mobile `normal`

## 11. Rollout and Tuning Policy

1. Playtest on a fixed set of long English and Pali suttas before rollout.
2. If tuning is needed, change only the character budget numbers first.
3. Do not add new heuristics in the first tuning pass unless a clear bug is found.
4. If the algorithm still feels wrong after budget tuning, revisit clause-stop behavior before introducing any more linguistic rules.
