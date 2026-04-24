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

1. Copy environment variables and fill in your Supabase and Paystack credentials:

```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

The admin dashboard is available at `/admin` (requires Supabase auth — log in at `/admin/login`).

<!-- VERIFY: Supabase project URL and Paystack public key names used in production -->

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key (client-side checkout initialisation) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (server-side webhook verification) |

## Usage

**Shop** — customers browse the catalog at `/catalog`, view products, add to cart, and check out via Paystack. International orders are routed to WhatsApp for a custom shipping quote.

**Admin** — authenticated admins manage products, orders, blog posts, FAQs, reviews, shipping rates, and site settings at `/admin`.

**Key routes:**

| Path | Description |
|---|---|
| `/` | Homepage with hero, featured products, brand story |
| `/catalog` | Full product catalog |
| `/cart` | Shopping cart |
| `/checkout` | Two-step checkout (details → review & pay) |
| `/orders/[reference]` | Order confirmation page |
| `/blog` | Blog listing and posts |
| `/admin` | Admin dashboard (auth-protected) |

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database & Auth:** Supabase (Postgres + SSR auth)
- **Payments:** Paystack (`@paystack/inline-js`)
- **Rich text:** Tiptap
- **Drag-and-drop:** dnd-kit (admin product sorting)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at `localhost:3000` |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## License

Private — all rights reserved.
