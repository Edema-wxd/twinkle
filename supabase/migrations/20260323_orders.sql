-- Orders table
-- No RLS — all access via service-role API routes only
CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Payment
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_payload   JSONB NOT NULL,
  status             TEXT NOT NULL DEFAULT 'paid',
  -- status values: 'paid' | 'processing' | 'shipped' | 'delivered'

  -- Customer
  customer_name      TEXT NOT NULL,
  customer_email     TEXT NOT NULL,
  customer_phone     TEXT NOT NULL,
  customer_ip        TEXT,

  -- Delivery
  delivery_address   TEXT NOT NULL,
  delivery_state     TEXT NOT NULL,
  shipping_cost      NUMERIC(10,2) NOT NULL,

  -- Financials
  subtotal           NUMERIC(10,2) NOT NULL,
  total              NUMERIC(10,2) NOT NULL
);

CREATE INDEX orders_paystack_reference_idx ON orders (paystack_reference);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX orders_status_idx ON orders (status);

-- Order items table
-- Denormalized product snapshot — order history is immutable even if products change
CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  product_id     TEXT NOT NULL,
  product_name   TEXT NOT NULL,
  variant_id     TEXT NOT NULL,
  variant_name   TEXT NOT NULL,
  tier_qty       INTEGER NOT NULL,
  thread_colour  TEXT,           -- NULL for Tools products (Shears)
  unit_price     NUMERIC(10,2) NOT NULL,
  quantity       INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 10),
  line_total     NUMERIC(10,2) NOT NULL
);

CREATE INDEX order_items_order_id_idx ON order_items (order_id);
