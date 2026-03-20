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
  2500,
  4000,
  '[
    {"id": "var_001a", "name": "Small (4mm)", "price": 2500, "in_stock": true},
    {"id": "var_001b", "name": "Medium (6mm)", "price": 3200, "in_stock": true},
    {"id": "var_001c", "name": "Large (8mm)", "price": 4000, "in_stock": false}
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
  1800,
  3000,
  '[
    {"id": "var_002a", "name": "Small (4mm)", "price": 1800, "in_stock": true},
    {"id": "var_002b", "name": "Medium (6mm)", "price": 2400, "in_stock": true},
    {"id": "var_002c", "name": "Large (8mm)", "price": 3000, "in_stock": false}
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
  1800,
  3000,
  '[
    {"id": "var_003a", "name": "Small (4mm)", "price": 1800, "in_stock": true},
    {"id": "var_003b", "name": "Medium (6mm)", "price": 2400, "in_stock": true},
    {"id": "var_003c", "name": "Large (8mm)", "price": 3000, "in_stock": false}
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
  2000,
  3200,
  '[
    {"id": "var_004a", "name": "Small (4mm)", "price": 2000, "in_stock": true},
    {"id": "var_004b", "name": "Medium (6mm)", "price": 2600, "in_stock": true},
    {"id": "var_004c", "name": "Large (8mm)", "price": 3200, "in_stock": false}
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
  1600,
  2800,
  '[
    {"id": "var_005a", "name": "Small (4mm)", "price": 1600, "in_stock": true},
    {"id": "var_005b", "name": "Medium (6mm)", "price": 2200, "in_stock": true},
    {"id": "var_005c", "name": "Large (8mm)", "price": 2800, "in_stock": true}
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
