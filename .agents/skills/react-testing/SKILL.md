---
name: react-testing
description: >-
  This skill should be used when writing, reviewing, or debugging React
  component tests. It covers Testing Library query priority, user event
  simulation, form testing, custom hook testing, Playwright E2E testing,
  accessibility testing with axe-core, and keyboard navigation testing.
---

# React Testing

Quick reference for testing React components. Builds on the `typescript-testing` skill (Vitest config, mocking, coverage) — this skill covers React-specific patterns. Reference files provide full examples and edge cases.

## Component Testing

### Query Priority

Always prefer queries that reflect how users see the page:

| Priority | Query | Example |
|---|---|---|
| 1 (best) | `getByRole` | `screen.getByRole("button", { name: /guardar/i })` |
| 2 | `getByLabelText` | `screen.getByLabelText(/correo/i)` |
| 3 | `getByText` | `screen.getByText(/bienvenido/i)` |
| 4 | `getByAltText` | `screen.getByAltText("Doctor photo")` |
| Last resort | `getByTestId` | `screen.getByTestId("complex-widget")` |

### User Events

```tsx
import { renderWithI18n, screen } from "@drzum/ui/test";
import userEvent from "@testing-library/user-event";

it("submits login form", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  renderWithI18n(<LoginForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/correo/i), "test@example.com");
  await user.type(screen.getByLabelText(/contraseña/i), "password123");
  await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "password123",
  });
});
```

**Rules:**
- Call `userEvent.setup()` before `render`
- `await` all `user.*` methods
- Use `user.type` not `fireEvent.change`
- Use `user.click` not `fireEvent.click`

### Asserting Absence

```tsx
// Element should NOT exist
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

// Element should exist
expect(screen.getByRole("button")).toBeInTheDocument();

// Wait for async element
const msg = await screen.findByText(/éxito/i);
```

See [references/component-testing.md](./references/component-testing.md) for form testing, async patterns, hook testing, GraphQL mocking, and anti-patterns.

## Form Testing

### Validation Errors

```tsx
it("shows validation errors", async () => {
  const user = userEvent.setup();
  renderWithI18n(<LoginForm onSubmit={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

  expect(await screen.findByText(/correo.*requerido/i)).toBeInTheDocument();
});
```

### Loading State

```tsx
it("disables button during submission", async () => {
  const user = userEvent.setup();
  renderWithI18n(<LoginForm onSubmit={() => new Promise((r) => setTimeout(r, 100))} />);

  await user.type(screen.getByLabelText(/correo/i), "test@example.com");
  await user.type(screen.getByLabelText(/contraseña/i), "pass");
  await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

  expect(screen.getByRole("button")).toBeDisabled();
});
```

## Custom Hook Testing

```tsx
import { renderHook, act } from "@testing-library/react";

it("debounces the value", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 300),
    { initialProps: { value: "hello" } }
  );

  rerender({ value: "world" });
  expect(result.current).toBe("hello"); // Not yet debounced

  act(() => vi.advanceTimersByTime(300));
  expect(result.current).toBe("world"); // Debounced

  vi.useRealTimers();
});
```

## Context and Provider Testing

### renderWithI18n

Use the project's `renderWithI18n` from `@drzum/ui/test` for all component tests:

```tsx
import { renderWithI18n, screen } from "@drzum/ui/test";

it("renders in Spanish", () => {
  renderWithI18n(<Welcome />, { locale: "es" });
  expect(screen.getByText("Bienvenido")).toBeInTheDocument();
});

it("renders in English", () => {
  renderWithI18n(<Welcome />, { locale: "en" });
  expect(screen.getByText("Welcome")).toBeInTheDocument();
});

it("renders with router context", () => {
  renderWithI18n(<Navigation />, { withRouter: true });
  expect(screen.getByRole("link", { name: /inicio/i })).toHaveAttribute("href", "/");
});
```

## E2E Testing with Playwright

### Page Object Model

```typescript
// e2e/pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  readonly emailInput = this.page.getByLabel(/correo/i);
  readonly submitButton = this.page.getByRole("button", { name: /iniciar sesión/i });

  async goto() { await this.page.goto("/signin"); }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.page.getByLabel(/contraseña/i).fill(password);
    await this.submitButton.click();
  }
}
```

### Authentication State

Save auth state after setup, reuse in test projects:

```typescript
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "authenticated",
    dependencies: ["setup"],
    use: { storageState: "e2e/.auth/patient.json" },
  },
]
```

### API Mocking

```typescript
test("shows empty state", async ({ page }) => {
  await page.route("**/patient/graphql", async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ data: { viewer: { appointments: [] } } }),
    });
  });
  await page.goto("/appointments");
  await expect(page.getByText(/no tienes citas/i)).toBeVisible();
});
```

### Key Rules

- **No hard-coded waits** — Use `await expect(...).toBeVisible()` not `waitForTimeout`
- **Independent tests** — Each test sets up its own state
- **Use Page Objects** — Encapsulate selectors and common actions
- **Test on mobile** — Add `devices["Pixel 5"]` project

See [references/playwright.md](./references/playwright.md) for config, fixtures, auth setup, visual assertions, and multi-step flows.

## Accessibility Testing

### axe-core in Unit Tests

```tsx
import { axe, toHaveNoViolations } from "vitest-axe";

expect.extend(toHaveNoViolations);

it("has no accessibility violations", async () => {
  const { container } = renderWithI18n(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Keyboard Navigation

```tsx
it("follows logical tab order", async () => {
  const user = userEvent.setup();
  renderWithI18n(<LoginForm />);

  await user.tab();
  expect(screen.getByLabelText(/correo/i)).toHaveFocus();

  await user.tab();
  expect(screen.getByLabelText(/contraseña/i)).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("button", { name: /iniciar sesión/i })).toHaveFocus();
});
```

### Playwright axe Scan

```typescript
import AxeBuilder from "@axe-core/playwright";

test("page has no a11y violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});
```

### Every Component Checklist

1. Keyboard navigable — all controls reachable via Tab/Enter/Space
2. Screen reader labels — all interactive elements have accessible names
3. Form labels — all inputs have `<label>` associations
4. Error association — errors linked via `aria-describedby`
5. Focus management — modals trap focus, focus returns on close
6. Color contrast — WCAG AA (4.5:1 text, 3:1 large)

See [references/accessibility.md](./references/accessibility.md) for WCAG criteria, keyboard testing patterns, screen reader testing, and the full checklist.

## Post-Change Verification

After writing or modifying tests, run the full verification protocol:

```bash
pnpm --filter <app> validate
```

All 4 steps must pass. See `typescript-writing-code` skill for details.

## Reference Files

| File | Description |
|---|---|
| [references/component-testing.md](./references/component-testing.md) | Testing Library queries, user events, form testing, hooks, async, GraphQL mocking |
| [references/playwright.md](./references/playwright.md) | Config, Page Object Model, fixtures, auth state, API mocking, visual assertions |
| [references/accessibility.md](./references/accessibility.md) | axe-core, WCAG 2.1, keyboard testing, screen reader testing, focus management |
