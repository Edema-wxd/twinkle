---
plan: "01-04"
status: complete
commit: 17e2777
---

## What was built

Four shared layout components wired into root layout — appears on every page.

## Tasks completed

1. Created `src/components/layout/MobileDrawer.tsx` — slide-in drawer with backdrop, Escape key, and body scroll lock
2. Created `src/components/layout/Header.tsx` — sticky header with desktop nav + hamburger trigger, owns drawer state
3. Created `src/components/layout/Footer.tsx` — cocoa background, 3-column grid (brand, navigation, connect)
4. Created `src/components/WhatsAppButton.tsx` — fixed bottom-right, links to wa.me with pre-filled message
5. Updated `src/app/layout.tsx` — Header + main + Footer + WhatsAppButton rendered on every page
6. Updated `src/app/page.tsx` — hero placeholder with Halimun heading and gold CTA

## Verification

- Visual check: APPROVED by user
- `npx tsc --noEmit`: PASSED
- `npm run build`: PASSED (4 static pages)
- Mobile drawer: open/close via hamburger, backdrop, X button, Escape key all confirmed
- WhatsApp button: visible bottom-right, opens wa.me in new tab
