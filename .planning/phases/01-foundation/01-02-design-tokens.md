---
phase: 01-foundation
plan: "02"
type: execute
wave: 2
depends_on: ["01-01"]
files_modified:
  - src/lib/fonts.ts
  - src/app/globals.css
  - src/app/layout.tsx
  - public/fonts/.gitkeep
autonomous: false

must_haves:
  truths:
    - "bg-gold, text-cocoa, bg-cream, text-forest, bg-terracotta Tailwind classes produce the correct hex colors in browser DevTools"
    - "font-display, font-heading, font-body Tailwind classes apply the correct font families"
    - "Raleway and Inter load without any network requests to Google Fonts (verified in DevTools Network tab)"
    - "Display font renders correctly — either Halimun (commercial) or Playfair Display (placeholder)"
    - "Root <html> element has the three font CSS variable class names applied"
  artifacts:
    - path: "src/lib/fonts.ts"
      provides: "All next/font instances exported from one file"
      exports: ["halimun (or playfairDisplay)", "raleway", "inter"]
    - path: "src/app/globals.css"
      provides: "Tailwind v4 @theme with brand tokens"
      contains: "--color-gold"
    - path: "src/app/layout.tsx"
      provides: "Fonts wired to <html> via variable classes"
      contains: "halimun.variable"
  key_links:
    - from: "src/lib/fonts.ts"
      to: "src/app/layout.tsx"
      via: "Import font objects, apply .variable to <html> className"
      pattern: "halimun\\.variable|playfairDisplay\\.variable"
    - from: "src/app/layout.tsx"
      to: "src/app/globals.css"
      via: "CSS variables from next/font are referenced by @theme --font-display etc"
      pattern: "var\\(--font-"
---

<objective>
Define the Afro-luxury design token system: brand color palette and typography. Fonts are self-hosted (zero Google Fonts requests at runtime). This plan includes a decision checkpoint for the Halimun font because it requires a commercial licence.

Purpose: Every UI component in future phases depends on these tokens. Getting colors and typography right here means no rework across all phases.
Output: globals.css with @theme tokens, src/lib/fonts.ts with three font exports, root layout updated with font variable classes.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mac/Documents/GitHub/twinkle/.planning/PROJECT.md
@/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-RESEARCH.md
@/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-01-SUMMARY.md
</context>

<tasks>

<task type="checkpoint:decision" gate="blocking">
  <decision>Halimun font: commercial licence purchased, or use Playfair Display placeholder?</decision>
  <context>
Halimun by Creatype Studio is the brand's display font for hero headings. It is free for personal use only — using it on a commercial e-commerce site without the commercial licence violates the terms. The commercial licence is available at creatypestudio.co/halimun.

If the licence has been purchased, the woff2 file should be placed at public/fonts/Halimun.woff2 before continuing. If not yet purchased, Playfair Display (Google Fonts, OFL licence, free for commercial use) is a near-equivalent serif display font that can be used as a placeholder until Halimun is procured. The placeholder can be swapped out in minutes once Halimun is purchased — only src/lib/fonts.ts and globals.css need updating.
  </context>
  <options>
    <option id="option-halimun">
      <name>Halimun (commercial — licence purchased)</name>
      <pros>The actual brand font. No further font change needed after this phase.</pros>
      <cons>Requires commercial licence purchase from creatypestudio.co/halimun and the woff2 file placed at public/fonts/Halimun.woff2 before continuing.</cons>
    </option>
    <option id="option-playfair">
      <name>Playfair Display (placeholder — free, no file needed)</name>
      <pros>Available immediately via next/font/google. No file download or licence purchase required now. Easy swap-out later.</pros>
      <cons>Not the brand font. Will need to be replaced when Halimun commercial licence is purchased.</cons>
    </option>
  </options>
  <resume-signal>
Type "halimun" (and confirm Halimun.woff2 is at public/fonts/Halimun.woff2) or "playfair" to continue with the placeholder.
  </resume-signal>
</task>

<task type="auto">
  <name>Task 2: Create src/lib/fonts.ts and configure globals.css @theme tokens</name>
  <files>
    src/lib/fonts.ts
    src/app/globals.css
  </files>
  <action>
**If the user chose "halimun"** (Halimun.woff2 is at public/fonts/Halimun.woff2):

Create `src/lib/fonts.ts`:

```typescript
import localFont from 'next/font/local'
import { Raleway, Inter } from 'next/font/google'

export const halimun = localFont({
  src: [
    {
      path: '../../public/fonts/Halimun.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-halimun',
  display: 'swap',
})

export const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
```

**If the user chose "playfair"** (placeholder):

Create `src/lib/fonts.ts`:

```typescript
import { Playfair_Display, Raleway, Inter } from 'next/font/google'

// Placeholder for Halimun — replace with localFont when commercial licence is purchased
// and Halimun.woff2 is placed at public/fonts/Halimun.woff2
export const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-halimun', // keeps same CSS variable name so swap is trivial
  display: 'swap',
})

export const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
```

Note: Using `--font-halimun` as the CSS variable name for Playfair Display means the @theme reference in globals.css is identical regardless of which font is loaded. The swap will require only changing fonts.ts and adding the woff2 file.

---

Update `src/app/globals.css` — replace its contents entirely:

```css
@import "tailwindcss";

@theme {
  /* =============================================
     Afro-luxury colour palette
     ============================================= */
  --color-gold:       #C9A84C;   /* Deep gold — primary brand accent */
  --color-cocoa:      #3B1F0E;   /* Rich cocoa brown — dark text, backgrounds */
  --color-cream:      #FAF3E0;   /* Warm cream — light backgrounds */
  --color-forest:     #2D5016;   /* Forest green — secondary accent */
  --color-terracotta: #C1440E;   /* Terracotta — CTA / call-to-action */

  /* Neutral shades */
  --color-charcoal:   #1A1A1A;
  --color-stone:      #F5F0E8;

  /* =============================================
     Typography — next/font injects the actual
     font-family string via a CSS variable on <html>
     ============================================= */
  --font-display: var(--font-halimun), serif;
  --font-heading: var(--font-raleway), sans-serif;
  --font-body:    var(--font-inter), sans-serif;
}
```

This generates utility classes: `bg-gold`, `text-cocoa`, `bg-cream`, `text-forest`, `bg-terracotta`, `text-charcoal`, `bg-stone`, `font-display`, `font-heading`, `font-body`.
  </action>
  <verify>
Start dev server and open http://localhost:3000 in a browser.
Open DevTools > Elements. Select `<html>`. Confirm it has the font variable class names (e.g. `__variable_xxx` classes from next/font).

Check computed styles on `<body>`: font-family should NOT be a system font — it should show the correct family.

In DevTools > Network > filter "Font": confirm Raleway and Inter requests come from `/_next/static/` not from fonts.googleapis.com or fonts.gstatic.com.

Run TypeScript check:
```bash
npx tsc --noEmit
```
Should exit 0 with no errors.
  </verify>
  <done>
src/lib/fonts.ts exports the three font instances (halimun/playfairDisplay, raleway, inter) each with a `variable` prop. globals.css @theme contains all seven color tokens and three font-family tokens. TypeScript check passes.
  </done>
</task>

<task type="auto">
  <name>Task 3: Wire fonts to root layout and verify token classes render</name>
  <files>
    src/app/layout.tsx
  </files>
  <action>
Update `src/app/layout.tsx` to import font objects and apply their CSS variable class names to `<html>`. Also apply base body styling using the new Tailwind token classes:

**If Halimun (option-halimun):**

```typescript
import type { Metadata } from "next";
import { halimun, raleway, inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twinkle Locs",
  description: "Premium loc bead accessories for locs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${halimun.variable} ${raleway.variable} ${inter.variable}`}
    >
      <body className="font-body bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
```

**If Playfair Display (option-playfair):**

```typescript
import type { Metadata } from "next";
import { playfairDisplay, raleway, inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twinkle Locs",
  description: "Premium loc bead accessories for locs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${raleway.variable} ${inter.variable}`}
    >
      <body className="font-body bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
```

After updating layout.tsx, do a quick visual spot-check:

Update `src/app/page.tsx` temporarily to demonstrate token usage:

```typescript
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-cream p-8">
      <h1 className="font-display text-5xl text-cocoa">Twinkle Locs</h1>
      <p className="font-heading text-xl text-charcoal">Premium loc bead accessories</p>
      <button className="bg-gold text-cocoa px-6 py-3 rounded-lg font-heading font-semibold hover:bg-terracotta hover:text-cream transition-colors">
        Shop Now
      </button>
      <p className="font-body text-sm text-charcoal/60">
        Design tokens active — gold, cocoa, cream, forest, terracotta
      </p>
    </main>
  );
}
```

Commit the design token work:

```bash
git add src/lib/fonts.ts src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat(01): add design tokens (Tailwind v4 @theme) and self-hosted fonts"
```
  </action>
  <verify>
Visit http://localhost:3000. Verify:
1. Page background is warm cream (not white)
2. "Twinkle Locs" heading uses the display font (Halimun or Playfair Display)
3. "Premium loc bead accessories" uses Raleway (sans-serif, narrow)
4. "Shop Now" button background is gold (#C9A84C)
5. Run `npm run build` — exits 0

Open DevTools > Network > Fonts — no requests to fonts.googleapis.com or fonts.gstatic.com.
  </verify>
  <done>
Root layout applies three font CSS variable classes to <html>. Body uses font-body (Inter), warm cream background, charcoal text. Token classes render correctly in browser. All fonts served from /_next/static/ (self-hosted). Build passes.
  </done>
</task>

</tasks>

<verification>
Final verification checklist after all tasks complete:

1. Visit http://localhost:3000 — page renders with cream background, display font heading, gold button
2. DevTools > Network > Fonts — all fonts served from /_next/static/, zero requests to Google
3. DevTools > Elements > `<html>` — has three `__variable_*` class names
4. `npx tsc --noEmit` exits 0
5. `npm run build` exits 0
6. `cat src/app/globals.css` — shows @import "tailwindcss" and @theme block with --color-gold, --color-cocoa, etc.
</verification>

<success_criteria>
- Tailwind token classes bg-gold, text-cocoa, bg-cream, text-forest, bg-terracotta, font-display, font-heading, font-body all work
- All fonts self-hosted (zero Google Fonts runtime requests)
- Display font renders (Halimun commercial OR Playfair Display placeholder — clearly documented in SUMMARY)
- Root layout applies font variable classes to html element
- TypeScript clean, production build passes
</success_criteria>

<output>
After completion, create `/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-02-SUMMARY.md`

IMPORTANT: Record in the SUMMARY which font option was chosen (halimun or playfair) and note it as a key decision for future phases to reference.
</output>
