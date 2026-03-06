# RSVP Chunking and ORP Spec Review Feedback

Date: 2026-03-06
Source document: `debug/RSVP_CHUNKING_ORP_IMPL_SPEC_V1.md`
Status: Review complete

## 1. Expert UX Lead Review

### Overall Assessment

The direction is strong. It addresses real RSVP pain instead of cosmetic issues. The spec is still slightly over-designed for a first slice, and a few rules risk making behavior feel unpredictable.

### Feedback

1. Sentence-final hard stops are the highest-value improvement and should be non-negotiable.
2. Clause-sensitive early stops are directionally good, but the current threshold rule is too subtle for users to mentally model.
3. The weak trailing word list adds linguistic judgment that may feel arbitrary and English-biased. It is a likely source of "why did this split here?" frustration.
4. Character budget is the right substitute for line-wrap detection in v1. This is preferable to DOM measurement.
5. The budget table by font size is good, but a font-family-specific budget would be too much for now.
6. Chunk-level midpoint ORP for multi-word chunks is a strong idea. Users care about visual stability more than purity to classic RSVP.
7. Keeping single-word ORP on the classic table is correct.
8. The examples are useful, but Example B shows an awkward isolated `monks,` chunk. That is acceptable as a sentence/clause artifact, but the spec should explicitly say isolated vocatives are acceptable.
9. The spec should define visible character counting precisely enough that engineering and design agree on what counts.
10. The spec should explicitly reject real-time wrap detection for this slice to preserve performance and predictability.

### UX Lead Recommended Changes

1. Remove weak trailing word avoidance from v1.
2. Keep hard sentence stops.
3. Keep character budget.
4. Keep chunk-level midpoint ORP for multi-word chunks.
5. Simplify clause rule so it only applies when at least 2 words are already in the chunk.
6. Add a small set of calibration examples and accept that some one-word clause chunks are okay.

## 2. Senior Product Manager Review

### Overall Assessment

The spec is aligned with the product goal, but it should be slimmer and easier to ship. The current draft contains multiple interacting heuristics, which raises regression risk and slows validation.

### Feedback

1. The spec correctly focuses on the flow problem users actually feel.
2. The highest-confidence slice is sentence-stop plus character budget plus multi-word ORP centering.
3. Clause-sensitive early stopping may be worth doing, but only if expressed in one simple rule.
4. Weak trailing word avoidance should not ship in the first slice. It is hard to explain, language-dependent, and not needed for initial value.
5. The implementation should not introduce a separate abstraction for logical chunk versus display chunk. Good call keeping that out.
6. The acceptance criteria should emphasize predictability and testability over linguistic sophistication.
7. The rollout recommendation should explicitly call for pre/post playtest comparison on a fixed set of suttas so tuning remains disciplined.
8. The spec should define a clear fallback if the tuned character budgets feel too aggressive: change budgets only, not algorithm shape.
9. The spec should keep out abbreviation and decimal handling for now, but mark them as known issues rather than edge cases to optimize.
10. The user setting semantics should be stated more clearly: `chunk size` means "up to N words" and may produce fewer because of punctuation or readability rules.

### PM Recommended Changes

1. Cut weak trailing word logic from v1.
2. Keep only one clause-stop rule.
3. Explicitly say no DOM measuring, no runtime layout inspection, no separate logical/display chunking.
4. Add a tuning policy section: only adjust character budget numbers during rollout unless a clear bug appears.
5. Tighten the test plan around observable outcomes rather than too many internal heuristics.

## 3. Consolidated Revision Direction

Both reviewers agree on the following changes for v2:

1. Keep sentence-final hard stops.
2. Keep character-budget-based chunk shortening.
3. Keep multi-word chunk ORP based on chunk midpoint.
4. Keep single-word classic ORP.
5. Remove weak trailing word avoidance from v1.
6. Simplify clause-sensitive early stop to one explicit rule.
7. Explicitly state that no wrap detection and no logical/display split will be implemented in this slice.
8. Clarify that `chunk size` is a maximum, not a promise.
