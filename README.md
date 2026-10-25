<!-- generated-by: gsd-doc-writer -->
# Twinkle Locs

E-commerce storefront for Twinkle Locs — a Nigerian loc bead accessories brand selling handcrafted gold, silver, and crystal loc beads to modern loc wearers.

## Installation

Prerequisites: Node.js >= 18, npm

```bash
git clone https://github.com/YOUR_ORG/twinkle.git
cd twinkle
npm install
```

## Quick Start

1. Copy environment variables and fill in your credentials:

```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

2. Push the database schema:

```bash
npx drizzle-kit push
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

The admin dashboard is at `/admin` — first-run setup at `/admin/setup`, then log in at `/admin/login`.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon Postgres direct connection (used by drizzle-kit) |
| `BETTER_AUTH_SECRET` | Session secret — generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Full URL of the app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key (client-side checkout) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (webhook verification) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp number for international orders (format: `234XXXXXXXXXX`) |
| `UPLOADTHING_TOKEN` | UploadThing API token (image uploads) |
| `RESEND_API_KEY` | Resend API key (transactional email) |
| `RESEND_FROM` | Verified sender address (e.g. `Twinkle Locs <orders@twinklelocs.com>`) |

## Usage

**Shop** — customers browse the catalog at `/catalog`, add to cart, and check out via Paystack. International orders are routed to WhatsApp for a custom shipping quote.

**Admin** — authenticated admins manage products, orders, blog posts, FAQs, reviews, shipping rates, and site settings at `/admin`.

**Key routes:**

| Path | Description |
|---|---|
| `/` | Homepage — hero, featured products, brand story |
| `/catalog` | Full product catalog |
| `/cart` | Shopping cart |
| `/checkout` | Two-step checkout (details → review & pay) |
| `/orders/[reference]` | Order confirmation and tracking |
| `/blog` | Blog listing and posts |
| `/faq` | Frequently asked questions |
| `/about` | Brand story |
| `/shipping` | Shipping information |
| `/admin` | Admin dashboard (auth-protected) |
| `/admin/login` | Admin login |
| `/admin/setup` | First-run admin account creation |

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Neon Postgres (serverless) via Drizzle ORM
- **Auth:** better-auth
- **Payments:** Paystack (`@paystack/inline-js`)
- **File uploads:** UploadThing
- **Email:** Resend
- **Rich text:** Tiptap
- **Drag-and-drop:** dnd-kit (admin product sorting)
- **Testing:** Vitest + Testing Library

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at `localhost:3000` |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

## Database

Schema lives in `src/db/schema.ts`. Migrations are managed with Drizzle Kit:

```bash
npx drizzle-kit push          # push schema changes to dev DB
npx drizzle-kit generate      # generate migration SQL files
npx drizzle-kit migrate       # apply pending migrations
```

## License

Private — all rights reserved.
