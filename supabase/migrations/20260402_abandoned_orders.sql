-- Abandoned checkouts — saved when a customer fills in delivery details but hasn't paid yet.
-- Used for follow-up via SMS/email to recover the sale.
-- No RLS — all access via service-role API routes only.
CREATE TABLE abandoned_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Customer
  customer_name      TEXT NOT NULL,
  customer_email     TEXT NOT NULL,
  customer_phone     TEXT NOT NULL,

  -- Delivery
  delivery_address   TEXT NOT NULL,
  delivery_state     TEXT NOT NULL,

  -- Financials
  shipping_cost      NUMERIC(10,2) NOT NULL,
  subtotal           NUMERIC(10,2) NOT NULL,
  total              NUMERIC(10,2) NOT NULL,

  -- Cart snapshot (same shape as Paystack metadata cart_items)
  cart_items         JSONB NOT NULL,

  -- Recovery tracking
  recovered          BOOLEAN NOT NULL DEFAULT false,
  recovered_at       TIMESTAMPTZ
);

CREATE INDEX abandoned_orders_created_at_idx ON abandoned_orders (created_at DESC);
CREATE INDEX abandoned_orders_email_idx ON abandoned_orders (customer_email);
CREATE INDEX abandoned_orders_recovered_idx ON abandoned_orders (recovered) WHERE recovered = false;
