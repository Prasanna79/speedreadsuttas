# Debug Findings To Fix

Date: 2026-03-05
Source: screenshots in `debug/`

## P1 - Reader resume banner overflows on narrower viewports

- Evidence:
  - `debug/Screenshot 2026-03-05 at 11.30.12.png`
- Symptom:
  - The resume callout row (`Resume from ... / Resume / Start over`) extends past viewport width and gets clipped.
- Likely cause:
  - `ReaderPage` resume callout uses a single-row `flex` layout with no wrapping/min-width constraints.
- Acceptance criteria:
  - Banner content wraps cleanly on small/medium widths without horizontal clipping.
  - Buttons remain visible and tappable at 320px width.

## P1 - RSVP text spacing/alignment quality regression

- Evidence:
  - `debug/Screenshot 2026-03-05 at 11.29.46.png`
- Symptom:
  - Word spacing appears uneven and the numeric token (`1`) visually drops compared to adjacent words.
- Likely cause:
  - `RSVPDisplay` word rendering uses `inline-flex items-center gap-*` for each token, causing baseline and spacing artifacts.
- Acceptance criteria:
  - Tokens align on a consistent text baseline.
  - Inter-word spacing appears natural for mixed word/number tokens.
  - ORP highlight remains accurate after layout fix.

## P2 - Dark background banding/striping artifact

- Evidence:
  - `debug/Screenshot 2026-03-05 at 11.30.12.png`
- Symptom:
  - Dark theme background shows visible vertical banding/striping in the content area.
- Likely cause:
  - Current gradient/background blend in dark mode can produce compression/banding artifacts.
- Acceptance criteria:
  - Dark background appears visually smooth on Chrome/Firefox/Safari.
  - No obvious vertical striping in reader and home pages.

## Verification Checklist

- [x] Add/extend automated coverage for responsive resume banner behavior.
- [ ] Add Playwright screenshot assertions for reader in dark mode (desktop + mobile viewport).
- [x] Re-check reader behavior in Chromium/Firefox/WebKit via CI E2E run (`22704898266`).

## Post-Fix Notes

- `ReaderPage` resume banner now wraps cleanly and uses stable copy (`Resume where you left off?`).
- `RSVPDisplay` baseline/spacing issue is fixed by rendering inline text flow (`whitespace-pre` + `align-baseline`).
- Dark-mode background was changed to layered gradients with explicit non-repeating backgrounds to reduce striping.
