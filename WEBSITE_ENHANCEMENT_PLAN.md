# Website Enhancement Plan (Reader Navigation, Translation Switching, Attribution, About/Donate, Fonts)

Date: 2026-03-05  
Scope: Web app UX/product improvements only (`packages/web`) plus minimal shared type updates where required.

## 1. Goals

1. Improve in-reader navigation so users can quickly return to search or jump to another sutta.
2. Allow changing language/translation from the current reader page without going back.
3. Add consistent SuttaCentral linking and license attribution in the right places.
4. Add `/donate` page that directs support to SuttaCentral.
5. Add `/about` page with current capabilities and availability details.
6. Add font-family choice in settings, including monospaced and OpenDyslexic.

## 2. Constraints and Product Principles

1. Keep implementation lightweight and incremental.
2. Preserve existing reader performance and keyboard-first flow.
3. Do not break existing `/read/:uid/:lang/:author` deep links.
4. Keep visual language consistent with current site styling.
5. Keep all changes CI-safe: lint, typecheck, unit tests, E2E.

## 3. User-Facing Outcomes

After this work, a user should be able to:

1. From any reader page, go back home/search in one click.
2. Search for another sutta directly from the reader page.
3. Change translation/language for the same UID from within reader.
4. Open the same sutta on SuttaCentral.
5. See clear attribution and license statements.
6. Visit `/about` and `/donate` from global navigation.
7. Switch reader font family between Serif, Monospace, and OpenDyslexic.

## 4. Information Architecture and Routing

## 4.1 Global Navigation

Add a reusable top navigation component rendered on all pages:

1. Brand link: `SuttaSpeed` -> `/`
2. Nav links:
   1. `About` -> `/about`
   2. `Donate` -> `/donate`

## 4.2 New Routes

1. `/about` -> `AboutPage`
2. `/donate` -> `DonatePage`

Current routes remain:

1. `/`
2. `/read/:uid`
3. `/read/:uid/:lang/:author`
4. `*`

## 4.3 Global Footer

Use a consistent footer on Home, Reader, About, Donate:

1. Content source: SuttaCentral
2. Content license: CC0
3. App/code license: MIT
4. External links open in a new tab with safe `rel` attributes

## 5. Reader Page Enhancements

## 5.1 Reader Header Actions

Add actions near the title/meta block:

1. `Back to search` (route to `/`)
2. `Open on SuttaCentral` for current `uid/lang/author`
3. Translation switch control (see section 6)

## 5.2 Inline Search on Reader

Add a compact search input on reader page, reusing existing search logic:

1. Same parsing behavior as home search (`UID`, title, SC URL)
2. Selecting another UID routes to `/read/:uid` (then translation chooser or default route flow)

## 5.3 Resume/State Behavior

When switching translation:

1. Keep user preferences (`wpm`, chunk size, theme, font family, font size).
2. Start target translation at beginning (index `0`) to avoid segment mismatch.
3. Existing last-read storage remains key-scoped by `(uid, lang, author)`.

## 6. Translation Switching (In-Reader)

## 6.1 Control Behavior

1. Fetch translation options from existing sutta metadata endpoint.
2. Show current selection clearly.
3. On change:
   1. Route to `/read/:uid/:newLang/:newAuthor`
   2. Trigger normal text/meta reload
4. Handle missing or failed metadata gracefully:
   1. Show disabled selector or fallback message
   2. Reader remains usable

## 6.2 UX Placement

1. Place in reader header area to avoid scrolling to access it.
2. Use compact control style to avoid crowding reader controls panel.

## 7. Typography Settings Expansion

## 7.1 New Preference

Extend persisted preferences with `fontFamily`:

1. `serif` (default)
2. `mono`
3. `openDyslexic`

## 7.2 Rendering Rules

1. RSVP display uses selected family.
2. Reader body text can inherit selection where readability improves.
3. Keep fallback stacks:
   1. Serif -> current serif stack
   2. Mono -> current monospace stack
   3. OpenDyslexic -> `OpenDyslexic, serif` fallback

## 7.3 Font Asset Strategy

1. Bundle OpenDyslexic font files in web assets (self-host).
2. Define `@font-face` in CSS with `font-display: swap`.
3. Document font source/license in repo docs if required by font terms.

## 8. About and Donate Pages

## 8.1 About Page Content

1. What SuttaSpeed is:
   1. RSVP speed-reading for suttas
   2. Adjustable WPM/chunk/theme/font
2. What is available:
   1. Collections supported: DN, MN, SN, AN, KN
   2. Translation availability varies by UID/language/author
3. Keyboard shortcuts summary
4. Attribution/licensing summary

## 8.2 Donate Page Content

1. Explain that source texts/translations come from SuttaCentral.
2. Encourage support for SuttaCentral operations.
3. Primary CTA button: official SuttaCentral donate URL.
4. Include secondary nav back to search/reader.

## 9. External Linking and Legal Placement

1. Reader page SuttaCentral deep link for current sutta.
2. Footer attribution on all top-level pages.
3. About page includes fuller attribution text and license context.
4. Donate page includes clear “donate to SuttaCentral, not this app” wording.

## 10. Accessibility and UX Requirements

1. All new controls keyboard accessible and labeled.
2. Translation selector and nav pass basic screen-reader semantics.
3. Mobile-first layout checks for:
   1. header action wrapping
   2. search control width
   3. footer readability
4. Preserve contrast in light and dark modes.

## 11. Technical Touchpoints (Expected Files)

Primary files likely touched:

1. `packages/web/src/App.tsx` (new routes)
2. `packages/web/src/pages/ReaderPage.tsx` (header actions, in-reader search, translation switch)
3. `packages/web/src/pages/HomePage.tsx` (shared nav/footer integration)
4. `packages/web/src/pages/AboutPage.tsx` (new)
5. `packages/web/src/pages/DonatePage.tsx` (new)
6. `packages/web/src/components/ReaderHeader.tsx` (action region)
7. `packages/web/src/components/SearchInput.tsx` (reuse in reader context)
8. `packages/web/src/components/SettingsPanel.tsx` (font family control)
9. `packages/web/src/hooks/usePreferences.ts` (persist/load new field)
10. `packages/web/src/lib/constants.ts` (default `fontFamily`)
11. `packages/web/src/index.css` (`@font-face` + family classes/tokens)
12. `packages/shared/src/types.ts` (if `StoredPreferences` type lives in shared package)

Test files likely touched/added:

1. `packages/web/src/components/SearchInput.test.tsx`
2. `packages/web/src/hooks/usePreferences.test.tsx`
3. `packages/web/src/components/TranslationChooser.test.tsx` (or new reader translation switch test)
4. `e2e/app.spec.ts` (reader nav, translation switch, about/donate routes, font persistence)

## 12. Phased Execution Plan

## Phase 1: Navigation and Routes

1. Add shared top nav + footer.
2. Add `/about` and `/donate` routes and pages.
3. Ensure links render correctly on home and reader.

Exit criteria:

1. Pages reachable from nav.
2. Footer attribution visible on all target pages.

## Phase 2: Reader Navigation + Translation Switch

1. Add `Back to search`.
2. Add in-reader compact search input.
3. Add translation selector for current UID.
4. Add SuttaCentral deep link.

Exit criteria:

1. User can switch translation without leaving reader.
2. URL updates correctly and content reloads.

## Phase 3: Font Family Settings

1. Extend preferences model for `fontFamily`.
2. Add settings controls and CSS wiring.
3. Integrate OpenDyslexic asset + fallback behavior.

Exit criteria:

1. Font family persists across reloads.
2. Reader text visibly updates for each option.

## Phase 4: Tests + CI Hardening

1. Update/extend unit and component tests.
2. Extend Playwright coverage for new routes and reader flows.
3. Run lint, typecheck, test, and E2E in CI.

Exit criteria:

1. All gates green.
2. No regressions in existing reader controls.

## 13. Detailed Test Plan

## 13.1 Unit/Component

1. Preferences:
   1. default `fontFamily` set correctly
   2. persisted `fontFamily` restored
2. Reader header:
   1. back/search/sc-link present
3. Translation switch:
   1. options loaded
   2. selection triggers route change
4. About/Donate page render checks

## 13.2 E2E

1. Home -> Reader -> Back to search roundtrip.
2. Reader inline search navigation to new UID.
3. Reader translation switch updates URL + author/lang labels.
4. About and Donate routes accessible from nav.
5. Donate page external CTA link correctness.
6. Font family selection persists after reload.

## 14. Risks and Mitigations

1. Header overcrowding on mobile:
   1. Use wrapping rows and compact controls.
2. Translation switch edge cases (missing content):
   1. Graceful disable/fallback and error messaging.
3. OpenDyslexic asset loading:
   1. `font-display: swap` + fallback stack.
4. Regression risk in reader flow:
   1. prioritize E2E around core reading actions.

## 15. Acceptance Checklist

1. Reader has back + search + translation switch + SuttaCentral link.
2. About and Donate pages live and linked from global nav.
3. Attribution/license appears in all required locations.
4. Settings include Serif/Mono/OpenDyslexic; persistence works.
5. All tests/CI pass with new functionality.

## 16. Out of Scope for This Slice

1. Auth/accounts/user profiles.
2. Donation processing in-app.
3. Advanced analytics dashboard.
4. Full content management or editorial tooling.

## 17. UI Notes Status (Updated 2026-03-06)

1. Done: fullscreen icon now has hover tooltip text (`Enter focus mode` / `Exit focus mode`).
2. Done: chunk-size controls are now available in compact floating controls (mobile + focus mode).
3. Done: settings label renamed from `Font size` to `Size`.
4. Done: settings label renamed from `Font family` to `Font`.
5. Done: settings are now always visible compact controls (no dropdown block).
