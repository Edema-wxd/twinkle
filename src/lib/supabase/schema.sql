-- =============================================================================
-- Twinkle Locs — Supabase products table
-- Phase 3 Plan 04 migration
--
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table definition
-- -----------------------------------------------------------------------------

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text not null default '',
  image         text not null default '/images/products/placeholder-bead.svg',
  material      text not null,
  is_featured   boolean not null default false,
  price_min     integer not null,
  price_max     integer not null,
  variants      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.products enable row level security;

create policy "Products are publicly readable"
  on public.products
  for select
  using (true);

-- -----------------------------------------------------------------------------
-- Seed data — 6 products (newest created_at first for default sort)
-- -----------------------------------------------------------------------------

-- 1. 24K Gold Beads
insert into public.products
  (name, slug, description, image, material, is_featured, price_min, price_max, variants, created_at)
values (
  '24K Gold Beads',
  '24k-gold-beads',
  'Lustrous 24K gold-plated loc beads — the signature Twinkle Locs piece.',
  '/images/products/placeholder-bead.svg',
  'Gold',
  true,
  19500,
  19500,
  '[
    {"id": "var_001a", "name": "2mm", "price": 19500, "in_stock": true}
  ]'::jsonb,
  '2024-06-01T10:00:00.000Z'
);

-- 2. Gold Beads
insert into public.products
  (name, slug, description, image, material, is_featured, price_min, price_max, variants, created_at)
values (
  'Gold Beads',
  'gold-beads',
  'Classic gold-toned loc beads for everyday glamour.',
  '/images/products/placeholder-bead.svg',
  'Gold',
  true,
  13590,
  18435,
  '[
    {"id": "var_002a", "name": "2mm", "price": 18435, "in_stock": true},
    {"id": "var_002b", "name": "4mm", "price": 13590, "in_stock": true},
    {"id": "var_002c", "name": "6mm", "price": 15885, "in_stock": true}
  ]'::jsonb,
  '2024-05-15T10:00:00.000Z'
);

-- 3. Silver Beads
insert into public.products
  (name, slug, description, image, material, is_featured, price_min, price_max, variants, created_at)
values (
  'Silver Beads',
  'silver-beads',
  'Cool silver-toned loc beads — perfect for contemporary styles.',
  '/images/products/placeholder-bead.svg',
  'Silver',
  true,
  13590,
  18350,
  '[
    {"id": "var_003a", "name": "2mm", "price": 18350, "in_stock": true},
    {"id": "var_003b", "name": "4mm", "price": 13590, "in_stock": true},
    {"id": "var_003c", "name": "6mm", "price": 15885, "in_stock": true}
  ]'::jsonb,
  '2024-04-20T10:00:00.000Z'
);

-- 4. Onyx Beads
insert into public.products
  (name, slug, description, image, material, is_featured, price_min, price_max, variants, created_at)
values (
  'Onyx Beads',
  'onyx-beads',
  'Deep onyx loc beads for a bold, statement look.',
  '/images/products/placeholder-bead.svg',
  'Crystal',
  true,
  13590,
  16225,
  '[
    {"id": "var_004a", "name": "2mm", "price": 16225, "in_stock": true},
    {"id": "var_004b", "name": "4mm", "price": 13590, "in_stock": true},
    {"id": "var_004c", "name": "6mm", "price": 15885, "in_stock": true}
  ]'::jsonb,
  '2024-03-10T10:00:00.000Z'
);

-- 5. Crystal Clear Beads
insert into public.products
  (name, slug, description, image, material, is_featured, price_min, price_max, variants, created_at)
values (
  'Crystal Clear Beads',
  'crystal-clear-beads',
  'Transparent crystal loc beads — catches the light beautifully.',
  '/images/products/placeholder-bead.svg',
  'Crystal',
  false,
  13590,
  15885,
  '[
    {"id": "var_005a", "name": "2mm", "price": 14950, "in_stock": true},
    {"id": "var_005b", "name": "4mm", "price": 13590, "in_stock": true},
    {"id": "var_005c", "name": "6mm", "price": 15885, "in_stock": true}
  ]'::jsonb,
  '2024-02-14T10:00:00.000Z'
);

-- 6. Shears
insert into public.products
  (name, slug, description, image, material, is_featured, price_min, price_max, variants, created_at)
values (
  'Shears',
  'shears',
  'Professional loc shears — precision-crafted for clean, sharp cuts.',
  '/images/products/placeholder-bead.svg',
  'Tools',
  false,
  3500,
  3500,
  '[
    {"id": "var_006a", "name": "Standard", "price": 3500, "in_stock": true}
  ]'::jsonb,
  '2024-01-01T10:00:00.000Z'
);

-- =============================================================================
-- Phase 4 additions — Product Detail
-- Run AFTER the Phase 3 products table + seed already exists
-- =============================================================================

-- Add images column to products table
alter table public.products
  add column if not exists images text[] not null default '{}';

-- Reviews table
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  author_name text not null,
  body        text not null,
  rating      integer not null check (rating between 1 and 5),
  created_at  timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Reviews are publicly readable"
  on public.reviews
  for select
  using (true);

create policy "Service role can insert reviews"
  on public.reviews
  for insert
  with check (true);

-- Seed: 3 reviews for 24K Gold Beads
-- IMPORTANT: Run AFTER products table is seeded (slug '24k-gold-beads' must exist)
insert into public.reviews (product_id, author_name, body, rating)
select id, 'Adaeze O.', 'These are absolutely stunning — got so many compliments at my cousin''s wedding.', 5
from public.products where slug = '24k-gold-beads';

insert into public.reviews (product_id, author_name, body, rating)
select id, 'Funmi A.', 'Fast delivery and beautiful packaging. The 4mm size is perfect for thin locs.', 5
from public.products where slug = '24k-gold-beads';

insert into public.reviews (product_id, author_name, body, rating)
select id, 'Chiamaka B.', 'Good quality, love how delicate the 2mm size looks on my locs.', 4
from public.products where slug = '24k-gold-beads';

-- =============================================================================
-- Price update migration — run against existing seeded Supabase instance
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

update public.products set
  price_min = 19500, price_max = 19500,
  variants = '[{"id":"var_001a","name":"2mm","price":19500,"in_stock":true}]'::jsonb
where slug = '24k-gold-beads';

update public.products set
  price_min = 13590, price_max = 18435,
  variants = '[{"id":"var_002a","name":"2mm","price":18435,"in_stock":true},{"id":"var_002b","name":"4mm","price":13590,"in_stock":true},{"id":"var_002c","name":"6mm","price":15885,"in_stock":true}]'::jsonb
where slug = 'gold-beads';

update public.products set
  price_min = 13590, price_max = 18350,
  variants = '[{"id":"var_003a","name":"2mm","price":18350,"in_stock":true},{"id":"var_003b","name":"4mm","price":13590,"in_stock":true},{"id":"var_003c","name":"6mm","price":15885,"in_stock":true}]'::jsonb
where slug = 'silver-beads';

update public.products set
  price_min = 13590, price_max = 16225,
  variants = '[{"id":"var_004a","name":"2mm","price":16225,"in_stock":true},{"id":"var_004b","name":"4mm","price":13590,"in_stock":true},{"id":"var_004c","name":"6mm","price":15885,"in_stock":true}]'::jsonb
where slug = 'onyx-beads';

update public.products set
  price_min = 13590, price_max = 15885,
  variants = '[{"id":"var_005a","name":"2mm","price":14950,"in_stock":true},{"id":"var_005b","name":"4mm","price":13590,"in_stock":true},{"id":"var_005c","name":"6mm","price":15885,"in_stock":true}]'::jsonb
where slug = 'crystal-clear-beads';
