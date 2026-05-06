---
name: typescript-testing
description: >-
  This skill should be used when writing, reviewing, or debugging TypeScript
  tests. It covers Vitest configuration, test organization, assertion patterns,
  mocking strategies, coverage analysis, parameterized tests, and test quality
  standards.
---

# TypeScript Testing

Quick reference for writing effective TypeScript tests with Vitest. Each section summarizes the key rules — reference files provide full examples and edge cases.

## Vitest Configuration

This project uses Vitest 4 with `jsdom` for React component tests and `v8` for coverage.

### Key Settings

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,              // describe, it, expect available without import
    environment: "jsdom",       // DOM environment for React tests
    setupFiles: ["./setup.ts"], // Global setup (jest-dom matchers, mocks)
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    passWithNoTests: true,      // Don't fail when no tests found
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
});
```

### Setup Files

The shared test setup at `components/web/src/test/setup.ts` provides:
- `@testing-library/jest-dom/vitest` — DOM assertion matchers (`toBeInTheDocument`, `toHaveTextContent`, etc.)
- `ResizeObserver` mock — Required for Radix UI components

### Path Aliases

Vitest `resolve.alias` must match `tsconfig.json` paths:

```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
    "@drzum/ui": path.resolve(__dirname, "../components/web/src"),
  },
},
```

### Running Tests

```bash
# Run all tests
pnpm run test

# Run tests for a specific app
pnpm --filter patient test

# Run a specific test file
pnpm --filter patient test -- src/components/__tests__/Button.test.tsx

# Watch mode
pnpm --filter patient test:watch

# With coverage
pnpm --filter patient test:coverage
```

See [references/vitest-config.md](./references/vitest-config.md) for the full config, environment options, and CI settings.

## Test Organization

### File Structure

Place test files in a `__tests__/` sibling directory next to the file being tested:

```
src/components/AuthGuard/
├── AuthGuard.tsx
├── index.ts
└── __tests__/
    └── AuthGuard.test.tsx
```

**Do NOT** place tests alongside source files:

```
# ❌ Wrong
src/components/AuthGuard/
├── AuthGuard.tsx
├── AuthGuard.test.tsx  # ❌ Not in __tests__/ directory
└── index.ts
```

### Naming Conventions

- **Test files** — `*.test.ts` or `*.test.tsx`. Match the source file name.
- **Test suites** — `describe("ComponentName", ...)` or `describe("functionName", ...)`.
- **Test cases** — Start with a verb: `it("creates ...")`, `it("renders ...")`. No "should" — it's noise.

### `describe` / `it` Nesting

```typescript
describe("AuthGuard", () => {
  describe("when user is authenticated", () => {
    it("renders children", () => { /* ... */ });
    it("does not redirect", () => { /* ... */ });
  });

  describe("when user is not authenticated", () => {
    it("redirects to sign-in", () => { /* ... */ });
    it("does not render children", () => { /* ... */ });
  });
});
```

### Setup and Teardown

```typescript
describe("UserService", () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(mockRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a user", () => { /* ... */ });
});
```

- **`beforeEach`** — Reset state for every test. Prefer this over `beforeAll`.
- **`afterEach`** — Clean up mocks and side effects.
- **`beforeAll` / `afterAll`** — Only for expensive setup that's safe to share (database connections, server start).

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

Every test follows three phases:

```typescript
it("formats a date in Mexican locale", () => {
  // Arrange
  const date = new Date("2024-03-15");

  // Act
  const result = formatDate(date);

  // Assert
  expect(result).toBe("15/03/2024");
});
```

### Parameterized Tests (`it.each`)

Test multiple inputs with the same assertion logic:

```typescript
it.each([
  { input: "", expected: false },
  { input: "invalid", expected: false },
  { input: "user@example.com", expected: true },
  { input: "user@example.co.mx", expected: true },
])("validates email '$input' as $expected", ({ input, expected }) => {
  expect(isValidEmail(input)).toBe(expected);
});
```

### Async Testing

```typescript
// async/await
it("fetches user data", async () => {
  const user = await fetchUser("123");
  expect(user.name).toBe("Alice");
});

// Testing rejections
it("throws on invalid ID", async () => {
  await expect(fetchUser("invalid")).rejects.toThrow("User not found");
});
```

### React Component Testing

```typescript
import { renderWithI18n, screen } from "@drzum/ui/test";
import userEvent from "@testing-library/user-event";

describe("LoginForm", () => {
  it("calls onSubmit with email and password", async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithI18n(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/correo/i), "test@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "password123");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });
});
```

See [references/testing-patterns.md](./references/testing-patterns.md) for factory functions, async patterns, and anti-patterns.

## Assertions

### Common Matchers

```typescript
// Equality
expect(value).toBe(42);                    // strict equality (===)
expect(obj).toEqual({ id: "1", name: "A" }); // deep equality
expect(obj).toMatchObject({ id: "1" });    // partial match

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(0.3, 5);

// Strings
expect(value).toContain("substring");
expect(value).toMatch(/pattern/);

// Arrays
expect(arr).toContain(item);
expect(arr).toHaveLength(3);
expect(arr).toEqual(expect.arrayContaining([1, 2]));

// Objects
expect(obj).toHaveProperty("name");
expect(obj).toHaveProperty("address.city", "CDMX");
```

### Async Assertions

```typescript
// Resolves
await expect(asyncFn()).resolves.toBe(42);

// Rejects
await expect(asyncFn()).rejects.toThrow("error message");
await expect(asyncFn()).rejects.toBeInstanceOf(NotFoundError);
```

### DOM Assertions (jest-dom)

Available via `@testing-library/jest-dom/vitest` setup:

```typescript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveTextContent("Hello");
expect(element).toHaveAttribute("aria-label", "Close");
expect(element).toHaveClass("active");
expect(input).toHaveValue("test@example.com");
```

### Error Assertions

```typescript
// Exact message
expect(() => parse("invalid")).toThrow("Invalid input");

// Regex match
expect(() => parse("invalid")).toThrow(/invalid/i);

// Error type
expect(() => parse("invalid")).toThrow(ValidationError);
```

## Mocking

### `vi.fn()` — Mock Functions

```typescript
const mockFn = vi.fn();
mockFn("hello");

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith("hello");
expect(mockFn).toHaveBeenCalledTimes(1);

// Return values
const mockGet = vi.fn().mockReturnValue(42);
const mockFetch = vi.fn().mockResolvedValue({ data: [] });
const mockSave = vi.fn().mockRejectedValue(new Error("fail"));

// Implementation
const mockFn = vi.fn((x: number) => x * 2);
```

### `vi.spyOn()` — Spy on Methods

```typescript
const spy = vi.spyOn(console, "error").mockImplementation(() => {});

doSomething();

expect(spy).toHaveBeenCalledWith("expected error message");
spy.mockRestore(); // restore original
```

### `vi.mock()` — Module Mocking

```typescript
// Auto-mock all exports
vi.mock("./api");

// Manual mock factory
vi.mock("./auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "1", name: "Test" },
    isAuthenticated: true,
  })),
}));

// Partial mock — keep real implementations, override specific exports
vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return {
    ...actual,
    formatDate: vi.fn(() => "01/01/2024"),
  };
});
```

### Reset / Restore Rules

- **`vi.clearAllMocks()`** — Clears call history and return values. Mock still exists.
- **`vi.resetAllMocks()`** — Clears + removes return values and implementations.
- **`vi.restoreAllMocks()`** — Resets + restores original implementations for spies.

**Best practice**: Use `vi.restoreAllMocks()` in `afterEach` to prevent test pollution:

```typescript
afterEach(() => {
  vi.restoreAllMocks();
});
```

See [references/mocking.md](./references/mocking.md) for timer mocks, external module mocking, mock assertions, and anti-patterns.

## Coverage Analysis

### Running Coverage

```bash
# Coverage for all apps
pnpm run test:coverage

# Coverage for specific app
pnpm --filter patient test:coverage
```

### Thresholds

This project enforces 80% minimums:

| Metric | Threshold |
|---|---|
| Lines | 80% |
| Functions | 80% |
| Branches | 80% |
| Statements | 80% |

### What NOT to Test

- Generated code (GraphQL types, lingui catalogs)
- Type definitions (`.d.ts` files)
- Barrel files (`index.ts` re-exports)
- Config files (`vite.config.ts`, `vitest.config.ts`)
- Third-party library internals

See [references/coverage.md](./references/coverage.md) for coverage config, CI integration, and what to exclude.

## Test Quality

### FIRST Principles

- **Fast** — Unit tests run in milliseconds. Full suite in under 30 seconds.
- **Independent** — Tests don't depend on execution order or shared mutable state.
- **Repeatable** — Same result every time. No randomness, no external API calls in unit tests.
- **Self-validating** — Clear pass/fail. No manual checking of output.
- **Timely** — Write tests alongside code, not as an afterthought.

### Test Behavior, Not Implementation

```typescript
// ❌ Wrong — testing implementation details
it("calls setState with the new value", () => {
  const setState = vi.spyOn(React, "useState");
  // ...
  expect(setState).toHaveBeenCalledWith("new value");
});

// ✅ Correct — testing observable behavior
it("displays the updated value", async () => {
  const user = userEvent.setup();
  renderWithI18n(<Counter />);

  await user.click(screen.getByRole("button", { name: /incrementar/i }));

  expect(screen.getByText("1")).toBeInTheDocument();
});
```

### One Assertion Focus per Test

Each test should verify one logical concept. Multiple `expect` calls are fine when they assert on the same outcome:

```typescript
// ✅ Good — multiple expects for one concept
it("creates a user with correct defaults", () => {
  const user = createUser({ name: "Alice" });

  expect(user.name).toBe("Alice");
  expect(user.role).toBe("patient");
  expect(user.isActive).toBe(true);
});

// ❌ Bad — unrelated assertions mixed together
it("works correctly", () => {
  expect(createUser({ name: "A" }).name).toBe("A");
  expect(deleteUser("123")).toBe(true);
  expect(listUsers()).toHaveLength(0);
});
```

### Anti-Patterns

- **Logic in tests** — No `if`, `for`, or `switch` in test code. Tests should be linear.
- **Test interdependence** — Tests that fail when run in isolation or in a different order.
- **Testing implementation** — Asserting on internal state, private methods, or mock call counts for implementation details.
- **Excessive setup** — If setup is longer than the test, the code under test may need refactoring.
- **Snapshot overuse** — Snapshots are brittle and give false confidence. Prefer explicit assertions.
- **No error path tests** — Only testing the happy path. Error handling is where bugs hide.
- **Flaky tests** — Tests that pass/fail randomly. Fix immediately — they erode trust.

### Post-Change Verification

After writing or modifying tests, always run the full verification protocol from the `typescript-writing-code` skill:

```bash
pnpm --filter <app> validate
# or: pnpm run type-check && pnpm run lint && pnpm run format && pnpm run test
```

All 4 steps must pass. See `typescript-writing-code` skill for details.

## Reference Files

| File | Description |
|---|---|
| [references/vitest-config.md](./references/vitest-config.md) | Full vitest config, environments, setup files, path aliases, CI settings |
| [references/testing-patterns.md](./references/testing-patterns.md) | AAA pattern, parameterized tests, async testing, factory functions, anti-patterns |
| [references/mocking.md](./references/mocking.md) | vi.fn, vi.spyOn, vi.mock, timer mocks, module mocking, reset/restore |
| [references/coverage.md](./references/coverage.md) | Coverage commands, thresholds, exclusions, CI integration |
