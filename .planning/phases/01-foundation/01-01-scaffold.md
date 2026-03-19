---
phase: 01-foundation
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - next.config.ts
  - postcss.config.mjs
  - .env.local
  - .env.local.example
  - .gitignore
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/app/not-found.tsx
  - src/app/(marketing)/.gitkeep
  - src/app/(shop)/.gitkeep
  - src/app/(admin)/.gitkeep
  - src/app/api/.gitkeep
  - src/components/layout/.gitkeep
  - src/components/ui/.gitkeep
  - src/lib/supabase/.gitkeep
  - src/types/.gitkeep
autonomous: true

must_haves:
  truths:
    - "npm run dev starts without TypeScript or module errors"
    - "npm run build completes with zero errors"
    - "Project folder structure matches the architecture in RESEARCH.md"
    - "Tailwind v4 is configured with @import tailwindcss in globals.css — no tailwind.config.js file exists"
    - "Supabase packages are installed and importable"
  artifacts:
    - path: "package.json"
      provides: "All required dependencies declared"
      contains: "@supabase/supabase-js"
    - path: "postcss.config.mjs"
      provides: "Tailwind v4 PostCSS plugin"
      contains: "@tailwindcss/postcss"
    - path: "src/app/globals.css"
      provides: "Tailwind v4 import"
      contains: "@import \"tailwindcss\""
    - path: ".env.local.example"
      provides: "Required env var documentation"
      contains: "NEXT_PUBLIC_SUPABASE_URL"
  key_links:
    - from: "postcss.config.mjs"
      to: "src/app/globals.css"
      via: "@tailwindcss/postcss plugin processes @import tailwindcss"
      pattern: "@tailwindcss/postcss"
    - from: "src/app/layout.tsx"
      to: "src/app/globals.css"
      via: "import './globals.css'"
      pattern: "import.*globals.css"
---

<objective>
Bootstrap the Next.js 15 project with the correct folder structure, Tailwind v4, TypeScript, and Supabase packages installed. This plan produces a working skeleton that all subsequent plans build on.

Purpose: Every other plan in Phase 1 (and all future phases) depends on this scaffold existing first. Getting the structure right here means never restructuring later.
Output: A runnable Next.js 15 app with Tailwind v4, correct folder layout, Supabase packages installed, and env var template committed.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mac/Documents/GitHub/twinkle/.planning/PROJECT.md
@/Users/mac/Documents/GitHub/twinkle/.planning/ROADMAP.md
@/Users/mac/Documents/GitHub/twinkle/.planning/STATE.md
@/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bootstrap Next.js 15 project and install Supabase packages</name>
  <files>
    package.json
    tsconfig.json
    next.config.ts
    postcss.config.mjs
    src/app/globals.css
    src/app/layout.tsx
    src/app/page.tsx
  </files>
  <action>
Run create-next-app from the project root (/Users/mac/Documents/GitHub/twinkle), using the existing directory:

```bash
npx create-next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*" --tailwind
```

If the directory already has files (package.json etc), it will ask — confirm overwrite.

After scaffolding, install Supabase packages:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install supabase --save-dev
```

IMPORTANT — Tailwind v4 verification:
- Confirm `postcss.config.mjs` uses `"@tailwindcss/postcss": {}` (NOT the old `tailwindcss: {}`)
- Confirm `src/app/globals.css` starts with `@import "tailwindcss";` (NOT the old @tailwind directives)
- If `create-next-app` generated a `tailwind.config.js` or `tailwind.config.ts`, DELETE it — v4 does not use a JS config file

Update `next.config.ts` to be minimal (no legacy options needed):

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
```

Replace the generated `src/app/page.tsx` with a minimal placeholder:

```typescript
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-lg">Twinkle Locs — coming soon</p>
    </main>
  );
}
```

Replace the generated `src/app/layout.tsx` with a minimal root layout (fonts will be wired in Plan 02):

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twinkle Locs",
  description: "Premium loc bead accessories",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Replace `src/app/not-found.tsx` if it doesn't exist, or create it:

```typescript
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg mb-6">Page not found</p>
        <a href="/" className="underline">Go home</a>
      </div>
    </main>
  );
}
```
  </action>
  <verify>
```bash
cd /Users/mac/Documents/GitHub/twinkle
npm run dev
```
Server should start on http://localhost:3000 with no TypeScript errors in terminal output.

Also verify:
- `ls tailwind.config.*` returns nothing (no config file)
- `grep "@import" src/app/globals.css` returns `@import "tailwindcss";`
- `grep "@tailwindcss/postcss" postcss.config.mjs` returns a match
- `node -e "require('@supabase/supabase-js')"` exits without error
  </verify>
  <done>
`npm run dev` starts cleanly on port 3000. No tailwind.config.js exists. globals.css uses @import "tailwindcss". @supabase/supabase-js and @supabase/ssr are in package.json dependencies.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create folder structure and environment template</name>
  <files>
    src/app/(marketing)/.gitkeep
    src/app/(shop)/.gitkeep
    src/app/(admin)/.gitkeep
    src/app/api/.gitkeep
    src/components/layout/.gitkeep
    src/components/ui/.gitkeep
    src/lib/supabase/.gitkeep
    src/types/.gitkeep
    .env.local
    .env.local.example
    .gitignore
  </files>
  <action>
Create the route group directories and placeholder files so the folder structure matches the architecture defined in RESEARCH.md:

```bash
mkdir -p src/app/\(marketing\)
mkdir -p src/app/\(shop\)
mkdir -p src/app/\(admin\)
mkdir -p src/app/api
mkdir -p src/components/layout
mkdir -p src/components/ui
mkdir -p src/lib/supabase
mkdir -p src/types
mkdir -p public/fonts

# Create .gitkeep files to commit empty dirs
touch src/app/\(marketing\)/.gitkeep
touch src/app/\(shop\)/.gitkeep
touch src/app/\(admin\)/.gitkeep
touch src/app/api/.gitkeep
touch src/components/layout/.gitkeep
touch src/components/ui/.gitkeep
touch src/lib/supabase/.gitkeep
touch src/types/.gitkeep
```

Create `.env.local.example` (safe to commit):

```bash
# Supabase — get these from your Supabase project dashboard under Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key

# WhatsApp — international format without + or spaces (Nigeria: 234XXXXXXXXXX)
NEXT_PUBLIC_WHATSAPP_NUMBER=2348012345678
```

Create `.env.local` by copying the example (the user will fill in real values):

```bash
cp .env.local.example .env.local
```

Verify `.gitignore` already excludes `.env.local` (create-next-app adds this by default). If not, add it:

```
.env.local
```

Make sure `public/fonts/` directory exists (Halimun woff2 file will be placed here in Plan 02):

```bash
touch public/fonts/.gitkeep
```
  </action>
  <verify>
```bash
ls -la src/app/ | grep -E "\(marketing\)|\(shop\)|\(admin\)"
ls -la src/components/layout src/components/ui src/lib/supabase src/types
cat .env.local.example
grep "\.env\.local" .gitignore
```
All directories exist. `.env.local.example` contains the three required env var stubs. `.gitignore` contains `.env.local`.
  </verify>
  <done>
All eight directory groups exist. `.env.local.example` is committed. `.env.local` exists locally but is gitignored. `public/fonts/` directory exists for the Halimun font file.
  </done>
</task>

<task type="auto">
  <name>Task 3: Verify build passes cleanly</name>
  <files></files>
  <action>
Run a production build to confirm zero TypeScript errors, no missing module errors, and Tailwind v4 compiles correctly:

```bash
cd /Users/mac/Documents/GitHub/twinkle
npm run build
```

If the build fails:
- TypeScript errors in layout.tsx or page.tsx: Fix the type annotations
- "Cannot find module 'tailwindcss'" error: Confirm `@tailwindcss/postcss` is in devDependencies and postcss.config.mjs uses the correct key
- Module resolution errors for @supabase/*: Run `npm install` again

After build passes, commit everything:

```bash
git add -A
git commit -m "feat(01): scaffold Next.js 15 project with Tailwind v4 and Supabase packages"
```
  </action>
  <verify>
`npm run build` exits with code 0. Terminal shows "Compiled successfully" or equivalent success output. `.next/` directory is created.
  </verify>
  <done>
`npm run build` completes with zero errors. The project is committed to git. The scaffold is ready for Plans 02, 03, and 04 to execute in parallel.
  </done>
</task>

</tasks>

<verification>
Run all three checks after plan execution:

1. `npm run dev` — server starts, http://localhost:3000 shows "Twinkle Locs — coming soon"
2. `npm run build` — exits 0, no errors
3. `cat postcss.config.mjs` — shows `"@tailwindcss/postcss": {}`
4. `cat src/app/globals.css` — first line is `@import "tailwindcss";`
5. `ls tailwind.config.*` — no output (file must not exist)
6. `cat .env.local.example` — shows all three env var stubs
7. `grep "\.env\.local" .gitignore` — returns a match
</verification>

<success_criteria>
- Next.js 15 app runs locally without errors
- Tailwind v4 configured via CSS @import, no tailwind.config.js present
- @supabase/supabase-js and @supabase/ssr installed
- Folder structure matches RESEARCH.md architecture (route groups, components, lib/supabase, types, public/fonts)
- Environment variable template committed as .env.local.example
- Production build passes with zero errors
</success_criteria>

<output>
After completion, create `/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-01-SUMMARY.md`
</output>
