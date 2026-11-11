# Testing

## Test framework and setup

The suite runs on [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for components. It is already installed and configured:

- `vitest.config.ts`: the `@` alias, the React plugin, and `environment: 'node'` by default. Component tests opt into a browser-like DOM with a `// @vitest-environment jsdom` comment on their first line.
- `src/__tests__/setup.ts`: loads `@testing-library/jest-dom` matchers.
- Tests live in `src/__tests__/` (mirroring `src/`), plus a few next to their code in `src/lib/__tests__/`.

Tests never touch a real database or external service. Mock `@/db` with `vi.mock` before importing the code under test (see `src/__tests__/lib/payments/priceOrder.test.ts` for a fake `db.select()` chain), and stub `fetch` for components (see `src/__tests__/components/checkout/OrderReview.test.tsx`, which answers each API route separately).

**Install note:** with npm 10, adding Vitest can crash npm (`Cannot read properties of null (reading 'edgesOut')`) while it resolves Vitest's optional `jsdom` peer. Installing from the lockfile (`npm ci` / `npm install`) is unaffected. If you need to add or upgrade test packages, use `npx npm@11 install -D <package>`.

---

## Running tests

```bash
# Run the full suite once (what to run before pushing)
npm run test:run

# Watch mode: re-runs affected tests as you edit
npm test

# One file
npx vitest run src/__tests__/lib/payments/priceOrder.test.ts

# Coverage report (text in the terminal, HTML in coverage/)
npm run test:coverage
```

## What is covered

| Area | Tests |
|---|---|
| Payment verification | `lib/payments/priceOrder.test.ts`: server re-pricing ignores browser prices, fake pack sizes, removed products, bad quantities, every promo type, expired and used-up codes, malformed Paystack metadata |
| Stock | `lib/stock.test.ts`: sell-out threshold, manual "out of stock", stock shared across thread colours, "Only N left" labels |
| Shipping | `lib/checkout/shippingInfo.test.ts`, `shippingZones.test.ts`, `api/checkout/shipping-cost.test.ts`: zone pricing, admin overrides, defaults when the DB is down, never undercharging a Lagos order with no area |
| Checkout review | `components/checkout/OrderReview.test.tsx`: Pay stays disabled until delivery and stock check out, sold-out and low-stock lines, price changes, promo codes |
| Cart | `lib/cart/cartReducer.test.ts` |
| Promo codes | `api/admin/promo-codes.test.ts`, `api/checkout/validate-promo.test.ts` |
| Other | product descriptions, Paystack subscription forwarding |

Not covered by unit tests: `recordPaidOrder()` (needs a real Postgres for its atomic stock and duplicate-order guarantees), email sending, and the admin UI. Those were checked end to end against an in-memory Postgres while being built.

---

## Writing new tests

**File naming convention:**

Place test files alongside the source file they test, using the `.test.ts` or `.test.tsx` suffix:

```
src/lib/cart/cartReducer.ts         → src/lib/cart/cartReducer.test.ts
src/lib/checkout/shipping.ts        → src/lib/checkout/shipping.test.ts
src/components/ui/Button.tsx        → src/components/ui/Button.test.tsx
```

Alternatively, group all tests under a top-level `tests/` directory mirroring `src/`:

```
tests/
  lib/
    cart/
      cartReducer.test.ts
    checkout/
      shipping.test.ts
  components/
    ui/
      Button.test.tsx
  setup.ts
```

**High-value test targets (pure functions with no external dependencies):**

- `src/lib/cart/cartReducer.ts` — `cartReducer` and `lineKey` are pure functions that are straightforward to unit test. Example:

```ts
import { describe, it, expect } from 'vitest';
import { cartReducer, initialCartState, lineKey } from '@/lib/cart/cartReducer';

describe('cartReducer', () => {
  it('adds a new item to an empty cart', () => {
    const item = { productId: '1', variantId: 'v1', tierQty: 10, threadColour: 'black', quantity: 1, name: 'Bead', price: 500, image: '' };
    const state = cartReducer(initialCartState, { type: 'ADD_ITEM', payload: item });
    expect(state.items).toHaveLength(1);
    expect(state.isDrawerOpen).toBe(true);
  });

  it('increments quantity when the same item is added again', () => {
    const item = { productId: '1', variantId: 'v1', tierQty: 10, threadColour: 'black', quantity: 1, name: 'Bead', price: 500, image: '' };
    const afterFirst = cartReducer(initialCartState, { type: 'ADD_ITEM', payload: item });
    const afterSecond = cartReducer(afterFirst, { type: 'ADD_ITEM', payload: item });
    expect(afterSecond.items[0].quantity).toBe(2);
  });
});
```

- `src/lib/checkout/shippingInfo.ts` — `quoteShipping` is a pure function over a `ShippingInfo` object. Example:

```ts
import { quoteShipping, type ShippingInfo } from '@/lib/checkout/shippingInfo';
import { LAGOS_ZONES } from '@/lib/checkout/shippingZones';

const info: ShippingInfo = {
  zones: LAGOS_ZONES.map((z) => ({ ...z, fee: z.defaultFee })),
  lagosFrom: 3000, lagosTo: 13500, otherRate: 4500, otherDays: '3–5 business days',
  intlMessage: '', pageIntro: '',
};

describe('quoteShipping', () => {
  it('prices Lagos by area', () => {
    expect(quoteShipping(info, 'Lagos', 'Ikeja').cost).toBe(7900);
  });
  it('never undercharges Lagos without an area', () => {
    expect(quoteShipping(info, 'Lagos').cost).toBe(13500);
  });
  it('uses the flat rate elsewhere', () => {
    expect(quoteShipping(info, 'Kano')).toMatchObject({ cost: 4500, deliveryTime: '3–5 business days' });
  });
});
```

**Shared test helpers:**

No shared helpers exist yet. As the test suite grows, place reusable fixtures and factories in `tests/helpers/` (e.g., `tests/helpers/cartFixtures.ts`).

---

## Coverage requirements

`npm run test:coverage` reports coverage for `src/lib/**` and `src/app/api/**` (the v8 provider is installed and configured in `vitest.config.ts`). No minimum is enforced yet. To enforce one, add thresholds to the `coverage` block:

```ts
coverage: {
  provider: 'v8',
  thresholds: { lines: 70, branches: 70, functions: 70, statements: 70 },
}
```

---

## CI integration

No CI pipeline is currently configured (no `.github/workflows/` directory exists). When a GitHub Actions workflow is added, include a test step as follows:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run
```

Once this file exists, the `test` job will run on every push and pull request to `main`.
