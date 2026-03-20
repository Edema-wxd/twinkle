---
plan: "01-02"
status: complete
commit: c529594
---

## What was built

Afro-luxury design token system: brand color palette via Tailwind v4 @theme, and self-hosted typography (Halimun + Raleway + Inter).

## Key decision: Halimun (commercial)

Chose **Halimun** (commercial licence, Creatype Studio). File: `public/fonts/Halimun.ttf`.
Using TTF format (next/font/local supports it natively).
CSS variable: `--font-halimun` → Tailwind class: `font-display`.

## Tasks completed

1. Created `src/lib/fonts.ts` — exports halimun (localFont, TTF), raleway (Google), inter (Google) each with `variable` prop
2. Updated `src/app/globals.css` — added @theme block with 7 color tokens (gold, cocoa, cream, forest, terracotta, charcoal, stone) and 3 font tokens (display, heading, body)
3. Updated `src/app/layout.tsx` — applies `halimun.variable raleway.variable inter.variable` to `<html>`, body uses `font-body bg-cream text-charcoal`
4. Updated `src/app/page.tsx` — token demo page showing all font/color classes

## Token reference

| Tailwind class | Value |
|---|---|
| `bg-gold` / `text-gold` | #C9A84C |
| `bg-cocoa` / `text-cocoa` | #3B1F0E |
| `bg-cream` / `text-cream` | #FAF3E0 |
| `text-forest` / `bg-forest` | #2D5016 |
| `bg-terracotta` / `text-terracotta` | #C1440E |
| `font-display` | Halimun (TTF, self-hosted) |
| `font-heading` | Raleway |
| `font-body` | Inter |

## Verification

- `npx tsc --noEmit`: PASSED (exit 0)
- `npm run build`: PASSED (4 static pages)
