# RSVP Chunking and ORP Implementation Spec v1

Date: 2026-03-06
Status: Draft for review
Scope: Reader UX only. No code in this document.

## 1. Problem Statement

The current RSVP reader uses fixed word-count chunking with paragraph-only boundaries. This creates avoidable flow breaks:

1. A sentence can end in the middle of a chunk, with one small word shown after a full stop.
2. ORP balancing is decent at the chunk level, but the highlighted character still comes from a per-word table, which can feel visually off-center for multi-word chunks.
3. Some chunks become too visually dense to recognize comfortably in one fixation.

## 2. Product Goal

Improve reading flow and recognition speed without making the system heavy or hard to reason about.

The implementation must remain lightweight, deterministic, and testable. Scale should come from the design itself, not from adding DOM measurement or per-device tuning in the first pass.

## 3. Non-Goals

1. No ML or adaptive personalization.
2. No per-user language-model phrase detection.
3. No DOM measurement for exact line wrap detection in this slice.
4. No split between "logical chunk" and "display chunk" in this slice.
5. No change to playback controls, resume model, or search behavior.

## 4. Design Principles

1. Sentence flow beats rigid word-count.
2. Visual density matters as much as word-count.
3. Chunking must stay deterministic from token data alone.
4. The user-facing chunk-size control remains, but it becomes a target ceiling, not an absolute command.
5. We should prefer simple rules that are easy to predict and test.

## 5. Current Behavior Summary

Current reader behavior:

1. Chunking stops only at paragraph boundaries.
2. Chunks otherwise fill strictly to selected word-count.
3. ORP anchor word is chosen by best overall chunk balance.
4. Highlighted letter inside the anchor word is chosen by per-word ORP index table.
5. Punctuation pause is applied only based on the last token in the chunk.

## 6. Proposed UX Changes

### 6.1 Sentence-Aware Chunking

Hard-stop a chunk when the current token ends with sentence-final punctuation:

1. `.`
2. `!`
3. `?`
4. `…`
5. `."`, `!'`, `?”`, and similar sentence-final punctuation followed by closing quotes/brackets

Effect:

1. No chunk may continue past a sentence-final token.
2. A sentence-final token can end a chunk early even if the configured chunk size is not yet reached.

### 6.2 Clause-Sensitive Early Stops

Allow early chunk termination at clause punctuation when the chunk is already substantial enough.

Clause punctuation:

1. `,`
2. `;`
3. `:`
4. `—`
5. `–`
6. closing bracket or quote after one of the above

Rule:

1. If the current token ends with clause punctuation, and the chunk already has at least 2 words or at least 12 visible characters, end the chunk there.

Reason:

1. This reduces weak trailing fragments and better matches natural phrasing.
2. It avoids aggressively fragmenting very short openings.

### 6.3 Character Budget Per Chunk

Apply a soft character cap in addition to word-count.

Visible character count means:

1. word characters
2. spaces between words
3. trailing punctuation

Initial budget in v1:

1. `normal` font size: 22 visible characters
2. `large` font size: 20 visible characters
3. `xlarge` font size: 18 visible characters

Rule:

1. While building a chunk, do not add the next token if it would push the chunk over the budget.
2. Exception: if the chunk is currently empty, always allow the first token even if it exceeds the budget.

Rationale:

1. This is the lightweight proxy for avoiding hard-to-recognize multi-word chunks.
2. It avoids DOM line-wrap checks in the first slice.

### 6.4 Word Count as Ceiling, Not Guarantee

The selected chunk-size control remains `1`, `2`, `3`, `4`, but is interpreted as the maximum number of tokens per chunk.

Chunk building must stop when any of these conditions is reached first:

1. paragraph boundary
2. sentence boundary
3. clause-sensitive early stop
4. character budget reached
5. selected max token count reached

### 6.5 Weak Trailing Word Avoidance

Avoid ending a chunk with a weak one-word tail when there is a better boundary one token earlier.

Weak trailing words list in v1:

1. `a`
2. `an`
3. `the`
4. `to`
5. `of`
6. `in`
7. `on`
8. `at`
9. `by`
10. `for`
11. `and`
12. `or`

Rule:

1. If adding the final token would create a chunk that ends with one of these words and the chunk already has at least 2 prior tokens, prefer ending the chunk before that weak word unless that word itself carries sentence-final punctuation.

Reason:

1. Weak trailing words often feel like "dangling debris" in RSVP.

### 6.6 Chunk-Level ORP Centering

Keep the current approach of selecting the best anchor word by balancing the chunk before/after lengths.

Change the highlighted character selection:

1. Build the full visible chunk string.
2. Compute the visual midpoint index of that full string.
3. Choose the anchor word character whose absolute chunk-level position is closest to that midpoint.
4. Highlight that character.

This replaces the current per-word ORP lookup table for multi-word chunks.

For single-word chunks:

1. Keep the existing per-word ORP table.

Reason:

1. Single-word RSVP still benefits from the traditional ORP heuristic.
2. Multi-word chunks need better visual centering than the per-word table provides.

### 6.7 Long Single Word Handling

If a single token exceeds the character budget:

1. Keep it as a one-token chunk.
2. Apply existing long-word timing bonus.
3. Do not split the token in this slice.

## 7. Proposed Chunking Algorithm

Inputs:

1. `tokens`
2. `maxChunkSize`
3. `fontSize`

Derived values:

1. `charBudget` from font size

Build loop:

1. Start a new empty chunk.
2. Add the next token if chunk is empty.
3. Otherwise evaluate the next token in this order:
4. If next token starts a new paragraph, stop current chunk.
5. If current chunk already ended with sentence-final punctuation, stop current chunk.
6. If current chunk already ended with clause punctuation and qualifies for clause stop, stop current chunk.
7. If current chunk already reached `maxChunkSize`, stop current chunk.
8. If adding the next token would exceed `charBudget`, stop current chunk.
9. If adding the next token would create a weak trailing ending under the rule above, stop current chunk.
10. Otherwise add the token and continue.
11. After each token is added, if that token is sentence-final, immediately close the chunk.
12. After each token is added, if that token is clause-final and clause-stop threshold is met, close the chunk.

## 8. Proposed ORP Algorithm

### 8.1 Single-Word Chunk

1. Use existing `getOrpIndex(wordLength)`.

### 8.2 Multi-Word Chunk

1. Construct the full visible string exactly as rendered.
2. Determine total visible length.
3. Compute midpoint using floor of half the visible length.
4. Enumerate all character positions within token words only.
5. Ignore spaces for highlight placement.
6. Ignore trailing punctuation for highlight placement.
7. Select the character whose absolute position is nearest to the chunk midpoint.
8. If tie, prefer the earlier character.

Reason:

1. The highlight should optimize visual balance of the displayed chunk, not just a single word inside it.

## 9. Timing Rules

Timing stays mostly unchanged.

Keep:

1. base WPM delay
2. punctuation pause from last token
3. paragraph pause
4. long-word bonus

Expected side-effect:

1. More sentence-final chunks means the existing punctuation timing will now align better with visible phrasing.

No new timing multipliers in this slice.

## 10. User-Visible Outcomes

After implementation:

1. Sentence-final words will never share a chunk with the next sentence fragment.
2. Fewer awkward chunk endings like `this. the`.
3. Large-font reading will produce shorter, more legible chunks.
4. ORP highlight should feel more centered for 2 to 4 word chunks.
5. Chunk-size `3` or `4` will feel more natural, not just denser.

## 11. Examples

### Example A

Input tokens:

1. `I`
2. `have`
3. `heard.`
4. `Thus`
5. `have`
6. `I`

Chunk size setting: `4`
Font size: `normal`

Expected chunks:

1. `I have heard.`
2. `Thus have I`

### Example B

Input tokens:

1. `This`
2. `is`
3. `the`
4. `teaching,`
5. `monks,`
6. `listen`
7. `carefully.`

Chunk size setting: `4`
Font size: `normal`

Expected chunks:

1. `This is the teaching,`
2. `monks,`
3. `listen carefully.`

### Example C

Input tokens:

1. `dependent`
2. `origination`
3. `is`
4. `deep`

Chunk size setting: `4`
Font size: `xlarge`

Expected chunks:

1. `dependent`
2. `origination is`
3. `deep`

Reason:

1. Character budget prevents a dense overlong chunk.

## 12. Edge Cases

1. Abbreviations like `e.g.` are ignored in v1. They will still act as sentence-final punctuation.
2. Decimal numbers like `2.5` are ignored in v1. They may prematurely end chunks.
3. Ellipsis should count as sentence-final.
4. Closing quote after sentence punctuation should stay attached to the sentence-final chunk.
5. Long Pali compounds remain single-token chunks.

## 13. Risks

1. Clause-sensitive early stops may create more one-word chunks than desired in dialogue-heavy passages.
2. Weak trailing word list may feel too English-specific.
3. Character budget by font size may need tuning after real-device playtesting.
4. Chunk-level ORP may feel unfamiliar to users accustomed to classic RSVP.

## 14. Acceptance Criteria

1. Sentence-final punctuation always terminates a chunk.
2. Paragraph boundaries still terminate chunks.
3. Chunk-size control remains visible and still limits maximum words.
4. Character budgets shorten chunks at larger font sizes.
5. Multi-word chunk ORP is chosen from chunk-level midpoint logic.
6. Single long words still render and play correctly.
7. Reader remains deterministic from token data alone.

## 15. Test Plan

### Unit

1. Sentence punctuation splits chunk.
2. Clause punctuation triggers early split only after threshold.
3. Character budget stops chunk growth.
4. Character budget varies by font size.
5. Weak trailing word avoidance works.
6. Long single word exceeds budget but remains valid single-token chunk.
7. Chunk midpoint ORP chooses correct character for 2-word, 3-word, and 4-word chunks.
8. Single-word chunk still uses existing ORP table.

### Component

1. RSVP display renders new ORP split correctly for multi-word chunks.
2. Large and xlarge settings visibly reduce chunk density in mocked reader routes.

### E2E

1. Sentence-final chunking on real reader route.
2. Multi-word chunk ORP stays visually centered in common examples.
3. Xlarge font on mobile yields shorter chunks than normal font for same source text.

## 16. Rollout Recommendation

1. Implement behind normal reader behavior without feature flag.
2. Playtest first on one long English sutta and one root-text Pali sutta.
3. Tune only the character budgets if needed before broader rollout.
