# Vitest Configuration

## This Project's Patient App Config

The `patient/vitest.config.ts` is the canonical example. Other apps follow the same pattern:

```typescript
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["../components/web/src/test/setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@drzum/ui/locales": path.resolve(__dirname, "../components/web/src/locales"),
      "@drzum/ui/chad-cn": path.resolve(__dirname, "../components/web/chad-cn"),
      "@drzum/ui": path.resolve(__dirname, "../components/web/src"),
      "chad-cn/lib/utils": path.resolve(__dirname, "../components/web/chad-cn/lib/utils"),
      "@lingui/react": path.resolve(__dirname, "node_modules/@lingui/react"),
      "@lingui/core": path.resolve(__dirname, "node_modules/@lingui/core"),
    },
  },
});
```

## Configuration Options

### `globals: true`

Makes `describe`, `it`, `expect`, `vi`, `beforeEach`, etc. available globally without importing:

```typescript
// With globals: true (this project)
describe("MyComponent", () => {
  it("renders", () => {
    expect(true).toBe(true);
  });
});

// Without globals: true (explicit imports)
import { describe, it, expect } from "vitest";
```

### Environments

| Environment | Use For | DOM Available |
|---|---|---|
| `jsdom` | React component tests, DOM manipulation | Yes |
| `node` | Utility functions, API logic, pure TypeScript | No |
| `happy-dom` | Faster alternative to jsdom (not used in this project) | Yes |

This project uses `jsdom` globally. For files that don't need DOM, you can set per-file environment:

```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";

describe("formatCurrency", () => {
  it("formats MXN", () => {
    expect(formatCurrency(100, "MXN")).toBe("$100.00");
  });
});
```

### Setup Files

Setup files run before each test file. This project's shared setup:

```typescript
// components/web/src/test/setup.ts
import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

What the setup provides:
- **jest-dom matchers** — `toBeInTheDocument()`, `toHaveTextContent()`, `toBeVisible()`, etc.
- **ResizeObserver mock** — Required because jsdom doesn't implement ResizeObserver, which Radix UI components depend on.

### Include/Exclude Patterns

```typescript
test: {
  // Only run tests in __tests__/ directories
  include: ["src/**/__tests__/**/*.test.{ts,tsx}"],

  // Skip these directories
  exclude: ["node_modules", "dist"],
}
```

This pattern enforces the project convention: tests live in `__tests__/` sibling directories.

## Path Aliases

Path aliases in vitest must match tsconfig paths. Mismatches cause "Module not found" errors:

```typescript
// vitest.config.ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
    "@drzum/ui": path.resolve(__dirname, "../components/web/src"),
  },
},
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@drzum/ui": ["../components/web/src"],
      "@drzum/ui/*": ["../components/web/src/*"]
    }
  }
}
```

**Order matters** for aliases — more specific paths must come before less specific ones. For example, `@drzum/ui/chad-cn` must come before `@drzum/ui`.

## Coverage Configuration

```typescript
coverage: {
  provider: "v8",           // V8 code coverage (faster than istanbul)
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
  reporter: ["text", "html", "lcov"],  // Console output + HTML report
  include: ["src/**/*.{ts,tsx}"],
  exclude: [
    "src/**/__tests__/**",
    "src/**/*.d.ts",
    "src/**/index.ts",
    "src/locales/**",
    "src/generated/**",
  ],
},
```

### Coverage Commands

```bash
# Run tests with coverage
pnpm --filter patient test:coverage

# Open HTML report
open coverage/index.html
```

## CI Settings

### `passWithNoTests: true`

Prevents CI from failing when a package has no test files yet. Useful during early development.

### Reporter Options

```typescript
test: {
  // CI-friendly reporter
  reporters: process.env.CI ? ["default", "junit"] : ["default"],
  outputFile: process.env.CI ? "test-results/junit.xml" : undefined,
}
```

## Lingui Macro Support

The Babel plugin `@lingui/babel-plugin-lingui-macro` is required for tests that render components using `Trans`, `t`, or `Plural` macros:

```typescript
plugins: [
  react({
    babel: {
      plugins: ["@lingui/babel-plugin-lingui-macro"],
    },
  }),
],
```

Without this plugin, tests will fail with syntax errors when encountering Lingui macros.

## Common Configuration Issues

### "Module not found" for `@drzum/ui`

Ensure the alias order is correct — specific paths before general:

```typescript
alias: {
  "@drzum/ui/locales": "...",   // More specific — first
  "@drzum/ui/chad-cn": "...",   // More specific — first
  "@drzum/ui": "...",           // Less specific — last
},
```

### "ReferenceError: document is not defined"

The test file is running in `node` environment instead of `jsdom`. Check:
1. `environment: "jsdom"` in vitest config
2. No `@vitest-environment node` comment at the top of the file

### "ResizeObserver is not defined"

The setup file isn't loading. Check `setupFiles` path is correct relative to the app directory.

### "Cannot find module @testing-library/jest-dom/vitest"

Ensure `@testing-library/jest-dom` is installed as a dev dependency and the setup file imports it.
