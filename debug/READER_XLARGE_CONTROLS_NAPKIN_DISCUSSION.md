# Reader XLarge Controls Napkin Discussion

Date: 2026-03-05  
Context: Mobile screenshot shows reader controls falling outside viewport when `xlarge` font size is selected on `/read/mn1/en/sujato`.

## Problem Statement

When users increase text size for readability, primary controls (play/pause/skip) can move out of view on shorter mobile heights. This breaks core task flow and creates a "stuck" feeling.

## Success Criteria

1. Primary controls remain reachable at all font sizes on small mobile heights.
2. Reading focus stays high (large text remains usable and legible).
3. Layout behavior is predictable across mobile, desktop, and installed PWA.
4. Offline behavior is unchanged (no dependency on network for control visibility).
5. Implementation remains lightweight now, with room to scale later.

## Round 1 Discussion: Users and Jobs-To-Be-Done

### User Types We Need to Serve

1. Mobile commuter: one-handed use, short sessions, variable light, unstable network.
2. Accessibility-focused reader: prefers larger text and persistent controls.
3. Desktop deep reader: long sessions, keyboard usage, split-window multitasking.
4. PWA/offline user: expects app-shell reliability and consistent layout when offline.

### What They Need Most

1. Controls must always be present and tappable/clickable.
2. Text scaling should never punish navigation.
3. Minimal cognitive load: no "where did play go?" moments.

### Key Product Insight

Control reachability is a reliability requirement, not a styling preference.

## Round 2 Discussion: Option Pressure Test

We evaluated three design directions against mobile/desktop/PWA constraints.

### Option A: Sticky Bottom Control Dock

Summary: Keep play/pause/skip in a fixed or sticky dock above device safe area.

Pros:
1. Strong guarantee that controls stay visible at all sizes.
2. Best one-handed mobile ergonomics.
3. Very stable in PWA and offline app-shell scenarios.

Risks:
1. Reduces available vertical space for text on small heights.
2. Needs careful spacing to avoid overlap with browser/PWA UI chrome.

### Option B: Adaptive Compression Layout

Summary: Dynamically shrink paddings/margins/chrome as font size grows so controls remain in normal flow.

Pros:
1. Preserves existing page structure and visual style.
2. No persistent overlay; full content can feel cleaner on desktop.

Risks:
1. More edge-case complexity; high chance of regressions on odd viewport heights.
2. Harder to guarantee control visibility in all device states (address bar expanded/collapsed).

### Option C: Focus Reading Mode with Gesture Controls

Summary: Small-screen mode hides most chrome; tap/gesture controls replace always-visible button cluster.

Pros:
1. Maximizes reading area.
2. Potentially excellent immersive experience for advanced users.

Risks:
1. Discoverability burden for first-time users.
2. Accessibility and consistency risks for users who need explicit visible controls.
3. Higher QA and training overhead across platforms.

## Round 3 Discussion: Delivery Strategy and Scale

### Short-Term Priority (Quick, Safe)

Pick the option with highest reliability and lowest ambiguity for immediate bug elimination.

### Long-Term Platform Direction

Design should scale to:
1. Richer reader modes.
2. Desktop shortcuts and compact/expanded control variants.
3. PWA install patterns with safe-area awareness.

### Tradeoff Decision

Reliability and accessibility outweigh aesthetic purity for this issue class. We should solve control reachability first, then tune layout polish.

## Three Recommendations

1. Implement a sticky bottom control dock for mobile breakpoints first.
2. Add adaptive spacing rules as a secondary layer (only for non-critical chrome), not as primary safety mechanism.
3. Introduce optional Focus Mode later as an enhancement, not as default behavior.

## Top Pick

Top pick: Recommendation 1 (Sticky Bottom Control Dock on mobile).

Why this wins:
1. Guarantees control reachability at `xlarge` and above.
2. Best fit for accessibility-heavy usage without requiring new user learning.
3. Most robust across mobile browser, desktop resize, and PWA/offline contexts.
4. Fastest path to reducing production risk from the current bug.

## Implementation Guardrails (for future execution)

1. Keep dock visible for `sm/md` viewports; desktop can stay in-flow.
2. Respect `env(safe-area-inset-bottom)` to avoid clipped controls on phones.
3. Reserve bottom padding in reader content so dock never overlaps active text.
4. Ensure keyboard and screen-reader semantics remain first-class.
5. Add E2E viewport tests for `xlarge` and `xxlarge` with controls-in-view assertions.

