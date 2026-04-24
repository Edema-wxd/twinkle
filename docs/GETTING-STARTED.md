<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide takes you from a fresh clone to a running local development server for Twinkle Locs.

---

## Prerequisites

You must have the following installed before proceeding:

| Tool | Version | Notes |
|---|---|---|
| Node.js | `>= 18.0.0` | Required by Next.js 15. Use [nvm](https://github.com/nvm-sh/nvm) to manage versions. |
| npm | `>= 9.0.0` | Bundled with Node.js >= 18. |
| Git | any recent version | |

Verify your Node version:

```bash
node --version
```

You will also need accounts and API keys for two external services before the app can run:

- **Supabase** — the database, auth, and file storage backend. Create a free project at [supabase.com](https://supabase.com).
- **Paystack** — the payment gateway. Create a free account at [paystack.com](https://paystack.com) and use your **test** keys during local development.

---

## Installation Steps

1. Clone the repository:

```bash
git clone https://github.com/YOUR_ORG/twinkle.git
cd twinkle
```

<!-- VERIFY: Replace YOUR_ORG with the actual GitHub organisation or username when the repo is public -->

2. Install dependencies:

```bash
npm install
```

3. Copy the environment variable template:

```bash
cp .env.local.example .env.local
```

4. Open `.env.local` and fill in your credentials:

```bash
# Supabase — get these from Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paystack — get these from Paystack Dashboard → Settings → API Keys
# Use test keys locally; swap for live keys in production
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx

# Optional — defaults to https://twinklelocs.com if not set
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

All five variables above are required. The application will throw a runtime error on first use of any variable that is missing. See [CONFIGURATION.md](./CONFIGURATION.md) for a full description of each variable.

---

## First Run

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the Twinkle Locs storefront homepage. The admin dashboard is at [http://localhost:3000/admin](http://localhost:3000/admin) — you will be redirected to `/admin/login` if you are not authenticated. Log in using the credentials of a Supabase Auth user created in your project's Authentication dashboard.

---

## Common Setup Issues

**Missing environment variables cause a blank page or server error**

If you see a runtime error referencing `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, or similar, your `.env.local` file is either missing or has placeholder values. Confirm the file exists at the project root (not inside `src/`) and that all five required variables are set to real values from your Supabase and Paystack dashboards.

**Cannot log in to `/admin`**

The admin login requires a valid Supabase Auth user. Create one in your Supabase project under Authentication → Users → Add user, then use those credentials on the login page. The middleware validates auth server-side on every admin route request.

**Paystack payment popup does not open**

Ensure `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is set to a valid test public key (starts with `pk_test_`). The Paystack inline popup initialises client-side using this key. If the key is missing or malformed the popup will silently fail.

**Port 3000 already in use**

Next.js will try port 3000 by default. If something else is already running there, stop the conflicting process or start the dev server on a different port:

```bash
npm run dev -- --port 3001
```

Then update `NEXT_PUBLIC_SITE_URL=http://localhost:3001` in `.env.local` to match.

**Supabase database tables do not exist**

The project includes SQL migration files in `supabase/migrations/`. Apply them to your Supabase project using the Supabase CLI or by running each migration file manually in the Supabase SQL Editor.

---

## Next Steps

Once the app is running:

- **Development workflow** — See [DEVELOPMENT.md](./DEVELOPMENT.md) for build commands, code style, and the PR process.
- **Configuration reference** — See [CONFIGURATION.md](./CONFIGURATION.md) for a full description of every environment variable and config file.
- **Architecture overview** — See [ARCHITECTURE.md](./ARCHITECTURE.md) to understand how the storefront, admin panel, and API routes are structured.
