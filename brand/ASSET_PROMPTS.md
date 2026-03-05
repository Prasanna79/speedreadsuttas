# SuttaSpeed — Brand Asset Prompts

## Brand Identity

**App Name:** SuttaSpeed
**Domain:** suttaspeed.com
**Tagline:** Speed-read the Pali Canon
**Tone:** Fast, energizing, empowering. Speed is the superpower — absorb ancient wisdom at modern pace. Confident and forward-leaning, not contemplative or sleepy. Think "Kindle Spritz meets the Pali Canon."
**Core message:** Reading the Pali Canon doesn't have to be slow. SuttaSpeed lets you consume suttas efficiently, retain more, and cover more ground.
**Color Palette:**
- Primary accent: #2563EB (blue-600) — focus, velocity, precision
- Dark mode accent: #EF4444 (red-500) — energy, urgency
- Background light: #FAFAF9 (warm white)
- Background dark: #1C1917 (warm black)
- Text: #1C1917 / #FAFAF9

**Visual Motifs:** Forward motion, velocity lines, fast-forward arrows, streaking text, tachometer/gauge imagery, lightning, the "locked-in focus" of a single highlighted word. Dharma wheel reinterpreted as spinning/in-motion (not static). Clean, aerodynamic shapes.

---

## 1. Favicon (16x16, 32x32, 48x48)

**Filename:** `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `favicon-48.png`

**Prompt:**
> Minimalist favicon for "SuttaSpeed", a high-speed reading app for the Pali Canon at suttaspeed.com. A single stylized letter "S" with a forward-leaning italic slant suggesting velocity and momentum — like a speed streak or fast-forward symbol built into the letterform. The tail of the S trails off into motion lines. Clean geometric construction, works at 16x16 pixels. Two versions: blue (#2563EB) on white background, and red (#EF4444) on dark (#1C1917) background. No gradients, no fine detail — must be instantly recognizable at tiny sizes. Flat design, SVG-compatible. The S should feel fast, not ornate.

---

## 2. App Icon (192x192, 512x512 — PWA manifest)

**Filename:** `icon-192.png`, `icon-512.png`

**Prompt:**
> App icon for "SuttaSpeed", a high-speed Pali Canon reader. Square icon with rounded corners (PWA standard). Center element: the stylized "S" favicon mark placed inside a circular speedometer/tachometer outline — the needle pointing to the fast zone. Alternatively: the "S" with two horizontal speed lines streaking behind it, conveying rapid forward motion. Blue (#2563EB) accent. Background: warm white (#FAFAF9). Clean, flat, bold shapes that read clearly at 192px. No text in the icon. Should feel dynamic and fast.

**Prompt (dark variant):**
> Same composition as above but for dark theme. Background: #1C1917. Accent in red (#EF4444). Speed lines / gauge in light gray (#E7E5E4).

---

## 3. Logo / Wordmark (horizontal, for header and OG image)

**Filename:** `logo-light.svg`, `logo-dark.svg`

**Prompt:**
> Horizontal wordmark logo for "SuttaSpeed" (suttaspeed.com). Clean sans-serif typeface (similar to Inter or DM Sans), slightly italic or forward-leaning to convey speed and momentum. "Sutta" in regular weight, "Speed" in bold — the word "Speed" visually dominates. The "ee" in "Speed" has a single letter highlighted in blue (#2563EB) — the ORP focal point. Two subtle horizontal motion lines extend from the right edge of the "d", like a word zooming past. Minimal, modern, the typography IS the logo. Kerning tight. Two versions: dark text (#1C1917) on transparent for light backgrounds, light text (#FAFAF9) on transparent for dark backgrounds.

---

## 4. Open Graph / Social Share Image (1200x630)

**Filename:** `og-image.png`

**Prompt:**
> Social media preview image (1200x630) for "SuttaSpeed" (suttaspeed.com). Top half: the app name "SuttaSpeed" in large bold sans-serif with motion lines, one letter highlighted in blue (#2563EB). Below: "Read the Pali Canon at your speed" in clean text. Bottom portion: a minimal mockup of the RSVP reader — a single Pali word "Evaṁ" centered large with the 'v' highlighted in blue, triangular notches above and below, progress bar at 42% showing "350 WPM". Subtle "suttaspeed.com" at bottom. Background: warm white (#FAFAF9). Overall feel: fast, focused, modern — like a productivity tool, not a meditation app. Clean and energizing.

**Prompt (dark variant):**
> Same layout but dark background (#1C1917), light text (#FAFAF9), red (#EF4444) accent. Speed lines more prominent. Even more energetic feel.

---

## 5. Hero / Landing Page Illustration (optional, 800x600)

**Filename:** `hero-illustration.svg`

**Prompt:**
> Hero illustration for the landing page of SuttaSpeed (suttaspeed.com). Center: a stream of Pali words flowing rapidly left to right with motion blur on the edges — one word in the center is sharp, enlarged, and highlighted in blue (#2563EB), locked in focus while everything else streaks past. Visual metaphor: the world moves fast, your focus is precise. Subtle speed lines radiate from the focal word. Below the stream, a minimal WPM gauge reads "400 WPM". No meditating figures — this is a speed tool, not a zen garden. Style: flat vector, limited palette (blue accent, warm grays, white background), no shading, clean aerodynamic lines. SVG format.

---

## 6. Apple Touch Icon (180x180)

**Filename:** `apple-touch-icon.png`

**Prompt:**
> Apple touch icon (180x180) for a Buddhist sutta speed-reading app. Same design language as the app icon (prompt #2) but optimized for iOS home screen. Slightly more padding around the central element since iOS adds its own rounded corners. Central motif: stylized book/scroll with highlighted word. Blue (#2563EB) accent on warm white (#FAFAF9) background. No transparency — must have solid background.

---

## 7. Loading / Splash Screen Graphic (centered, scalable)

**Filename:** `splash-graphic.svg`

**Prompt:**
> Centered graphic for a loading/splash screen. The SuttaSpeed "S" mark with a circular speed-gauge arc around it — the arc fills up as loading progresses. Alternatively: three horizontal speed lines that animate left-to-right in sequence, conveying rapid forward motion. Monoline weight, geometric, 200x200 viewport. Colors: #78716C (stone-500) for the base, #2563EB for the active/filling element. SVG, animatable. Should feel like something is powering up, not winding down.

---

## Asset Checklist

| Asset | Sizes | Format | Light | Dark |
|---|---|---|---|---|
| Favicon | 16, 32, 48 | SVG + PNG | Yes | Yes |
| App Icon | 192, 512 | PNG | Yes | Yes |
| Logo/Wordmark | scalable | SVG | Yes | Yes |
| OG Image | 1200x630 | PNG | Yes | Yes |
| Hero Illustration | 800x600 | SVG | Yes | — |
| Apple Touch Icon | 180 | PNG | Yes | — |
| Splash Graphic | scalable | SVG | Yes | — |

---

## Notes

- All assets should be generated at 2x resolution minimum for Retina displays
- SVG preferred where possible for scalability
- PNG exports should be optimized (pngquant or similar)
- Favicon should also be exported as `favicon.ico` (multi-size ICO) for legacy browser support
- Color values must match Tailwind config exactly
- Two unifying visual threads: (1) the ORP highlight — one element in sharp focus while the rest blurs/streaks, and (2) forward motion — speed lines, italic lean, gauge imagery. Speed is the feature, not a side effect.
