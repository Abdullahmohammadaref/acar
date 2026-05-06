# Coverage Analysis

## Running Coverage

### Commands

```bash
# Coverage for all apps in the monorepo
pnpm run test:coverage

# Coverage for a specific app
pnpm --filter patient test:coverage
pnpm --filter @drzum/ui test:coverage

# Direct vitest command
vitest run --coverage

# Coverage for a specific test file
pnpm --filter patient test:coverage -- src/components/__tests__/Button.test.tsx
```

### Coverage Output

By default, coverage generates:
- **Console output** — Summary table with percentages per file
- **HTML report** — Interactive report in `coverage/` directory
- **LCOV data** — For CI integration

```bash
# Open HTML report in browser
open coverage/index.html
```

## Thresholds

This project enforces 80% minimums across all metrics:

```typescript
// vitest.config.ts
coverage: {
  provider: "v8",
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
},
```

### What the Metrics Mean

| Metric | What It Measures |
|---|---|
| **Lines** | Percentage of executable lines that were run |
| **Functions** | Percentage of functions/methods that were called |
| **Branches** | Percentage of branch conditions (`if`/`else`, ternary, `switch`) that were evaluated |
| **Statements** | Percentage of statements that were executed (similar to lines, but handles multi-statement lines) |

### Threshold Behavior

When thresholds are set, `vitest --coverage` fails if any metric falls below the minimum. This prevents coverage regression.

## Coverage Configuration

### Full Config Example

```typescript
// vitest.config.ts
coverage: {
  provider: "v8",
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
  reporter: ["text", "html", "lcov"],
  include: ["src/**/*.{ts,tsx}"],
  exclude: [
    "src/**/__tests__/**",
    "src/**/*.test.{ts,tsx}",
    "src/**/*.d.ts",
    "src/**/index.ts",
    "src/locales/**",
    "src/generated/**",
    "src/main.tsx",
    "src/App.tsx",
    "src/routeTree.gen.ts",
  ],
},
```

### Include/Exclude Rules

**Include**: Only source files that should be measured.

**Exclude**: Files that inflate or deflate coverage unfairly:
- Test files themselves
- Type definition files (`.d.ts`)
- Barrel files (`index.ts`) — only re-exports
- Generated code (GraphQL types, Lingui catalogs, route trees)
- Entry points (`main.tsx`, `App.tsx`) — mostly wiring
- Config files

## What NOT to Test (for Coverage)

### Generated Code

Don't write tests for generated files — they're machine-produced and will be regenerated:

```
src/generated/graphql.ts    # GraphQL types from codegen
src/locales/*/messages.ts   # Lingui compiled message catalogs
src/routeTree.gen.ts        # TanStack Router generated routes
```

### Type Definitions

`.d.ts` files have no runtime code. They cannot be "covered":

```
src/types/env.d.ts
src/types/vite-env.d.ts
```

### Barrel Files

`index.ts` files that only re-export have no logic to test:

```typescript
// src/components/index.ts — nothing to test
export { Button } from "./Button";
export { Input } from "./Input";
```

### Config Files

Build and tool configuration:

```
vite.config.ts
vitest.config.ts
tailwind.config.ts
lingui.config.ts
```

### Trivial Wiring

Entry points that just wire things together:

```typescript
// src/main.tsx — just mounts the app
ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);
```

## CI Integration

### Threshold Enforcement

Vitest fails with a non-zero exit code when coverage thresholds aren't met:

```bash
# CI command — fails if below 80%
pnpm run test:coverage
```

### Coverage Reports in CI

```typescript
// vitest.config.ts
coverage: {
  reporter: process.env.CI
    ? ["text", "lcov"]      // CI: text summary + lcov for upload
    : ["text", "html"],     // Local: text summary + HTML report
},
```

### Uploading Coverage

LCOV reports can be uploaded to coverage services:

```yaml
# Example CI step
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Anti-Patterns

### Chasing 100% Coverage

100% coverage is not a goal. The last 20% often requires testing trivial code, generated wiring, or error paths that can't realistically occur. Focus on:
- Critical business logic (100%)
- Error handling paths (high coverage)
- UI interactions (key flows)
- Skip: trivial getters, framework boilerplate, generated code

### Coverage Without Assertions

```typescript
// ❌ Wrong — covers the code but tests nothing
it("renders", () => {
  renderWithI18n(<UserProfile user={mockUser} />);
  // No assertions! This "test" just checks it doesn't crash
});

// ✅ Correct — meaningful assertions
it("displays user name and email", () => {
  renderWithI18n(<UserProfile user={mockUser} />);
  expect(screen.getByText("Dr. García")).toBeInTheDocument();
  expect(screen.getByText("garcia@example.com")).toBeInTheDocument();
});
```

### Testing Implementation for Coverage

```typescript
// ❌ Wrong — testing private methods just to hit coverage
it("calls internal helper", () => {
  const spy = vi.spyOn(service as any, "privateHelper");
  service.publicMethod();
  expect(spy).toHaveBeenCalled();
});

// ✅ Correct — test through the public API
it("returns formatted result", () => {
  const result = service.publicMethod();
  expect(result).toBe("expected output");
});
```

### Ignoring Uncovered Branches

When coverage shows uncovered branches, investigate before ignoring:

```typescript
// Coverage shows branch not covered:
function getStatus(user: User): string {
  if (user.isActive) {
    return "active";
  }
  return "inactive"; // ← not covered
}

// Add the missing test case:
it("returns inactive for inactive users", () => {
  const user = createUser({ isActive: false });
  expect(getStatus(user)).toBe("inactive");
});
```
