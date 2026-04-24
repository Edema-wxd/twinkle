<!-- generated-by: gsd-doc-writer -->
# Testing

## Test framework and setup

No test framework is currently installed in this project. The `package.json` contains no testing dependencies and no `test` script. The sections below document what is recommended for this Next.js 15 / TypeScript codebase and how to add it.

**Recommended stack:**

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit / integration | [Vitest](https://vitest.dev/) | Fast, TypeScript-native, compatible with Next.js |
| Component | [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) | User-centric React component tests |
| End-to-end | [Playwright](https://playwright.dev/) | Full browser tests of storefront flows |

**Install Vitest and React Testing Library:**

```bash
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

**Add a `vitest.config.ts` at the project root:**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
```

**Add a setup file at `tests/setup.ts`:**

```ts
import '@testing-library/jest-dom';
```

**Add test scripts to `package.json`:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Running tests

Once the framework is installed, use the following commands:

```bash
# Run the full test suite once
npm test

# Run in watch mode (re-runs on file change)
npm run test:watch

# Run a single test file
npx vitest run src/lib/cart/cartReducer.test.ts

# Run with coverage report
npm run test:coverage
```

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

- `src/lib/checkout/shipping.ts` — `getShippingCost` is a pure function. Example:

```ts
import { describe, it, expect } from 'vitest';
import { getShippingCost } from '@/lib/checkout/shipping';

describe('getShippingCost', () => {
  it('returns 3000 for Lagos', () => {
    expect(getShippingCost('Lagos')).toBe(3000);
  });

  it('returns 4500 for all other states', () => {
    expect(getShippingCost('Kano')).toBe(4500);
    expect(getShippingCost('Rivers')).toBe(4500);
  });
});
```

**Shared test helpers:**

No shared helpers exist yet. As the test suite grows, place reusable fixtures and factories in `tests/helpers/` (e.g., `tests/helpers/cartFixtures.ts`).

---

## Coverage requirements

No coverage threshold is currently configured. When adding Vitest coverage, install the provider and set thresholds in `vitest.config.ts`:

```bash
npm install --save-dev @vitest/coverage-v8
```

```ts
// vitest.config.ts
test: {
  coverage: {
    provider: 'v8',
    thresholds: {
      lines: 70,
      branches: 70,
      functions: 70,
      statements: 70,
    },
  },
}
```

No coverage threshold is enforced at present.

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
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

Once this file exists, the `test` job will run on every push and pull request to `main`.
