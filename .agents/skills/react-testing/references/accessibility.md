# Accessibility Testing

## axe-core Integration

### Setup with Vitest

```bash
pnpm add -D axe-core @axe-core/react
```

```typescript
// test/setup.ts — add axe matchers
import "vitest-axe/extend-expect";
```

### Component-Level Checks

```tsx
import { axe, toHaveNoViolations } from "vitest-axe";
import { renderWithI18n } from "@drzum/ui/test";

expect.extend(toHaveNoViolations);

it("has no accessibility violations", async () => {
  const { container } = renderWithI18n(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Checking Specific Rules

```tsx
it("has no color contrast violations", async () => {
  const { container } = renderWithI18n(<Badge variant="warning">Pendiente</Badge>);
  const results = await axe(container, {
    rules: {
      "color-contrast": { enabled: true },
    },
  });
  expect(results).toHaveNoViolations();
});
```

### Ignoring Known Issues

```tsx
it("has no violations (excluding known issue)", async () => {
  const { container } = renderWithI18n(<ThirdPartyWidget />);
  const results = await axe(container, {
    rules: {
      // Third-party widget has a known aria issue we can't fix
      "aria-required-attr": { enabled: false },
    },
  });
  expect(results).toHaveNoViolations();
});
```

## WCAG 2.1 Compliance

### Level AA Requirements (Target)

| Criterion | Description | Testing Approach |
|---|---|---|
| 1.1.1 Non-text Content | Images have alt text | `getByAltText`, axe |
| 1.3.1 Info and Relationships | Semantic HTML, labels | `getByRole`, `getByLabelText` |
| 1.4.3 Contrast (Minimum) | 4.5:1 for normal text, 3:1 for large | axe color-contrast rule |
| 2.1.1 Keyboard | All interactive elements keyboard-accessible | Keyboard tests |
| 2.4.3 Focus Order | Logical tab order | Tab navigation tests |
| 2.4.7 Focus Visible | Focus indicator visible | Visual inspection + CSS check |
| 3.3.1 Error Identification | Form errors clearly identified | `getByRole("alert")` |
| 3.3.2 Labels or Instructions | Form elements have labels | `getByLabelText` |
| 4.1.2 Name, Role, Value | ARIA attributes correct | axe, `getByRole` |

### Testing Labels and Roles

```tsx
it("has accessible form elements", () => {
  renderWithI18n(<RegistrationForm />);

  // All inputs have labels
  expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();

  // Submit button has accessible name
  expect(screen.getByRole("button", { name: /registrarse/i })).toBeInTheDocument();
});

it("marks required fields", () => {
  renderWithI18n(<RegistrationForm />);

  const emailInput = screen.getByLabelText(/correo/i);
  expect(emailInput).toBeRequired();
});
```

### Testing Error Messages

```tsx
it("associates error messages with inputs", async () => {
  const user = userEvent.setup();
  renderWithI18n(<LoginForm onSubmit={vi.fn()} />);

  // Submit empty form
  await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

  // Error should be associated via aria-describedby
  const emailInput = screen.getByLabelText(/correo/i);
  const errorId = emailInput.getAttribute("aria-describedby");
  expect(errorId).toBeTruthy();

  const errorElement = document.getElementById(errorId!);
  expect(errorElement).toHaveTextContent(/requerido/i);
});
```

## Keyboard Testing

### Tab Navigation

```tsx
it("follows logical tab order", async () => {
  const user = userEvent.setup();
  renderWithI18n(<LoginForm />);

  // Tab through form elements
  await user.tab();
  expect(screen.getByLabelText(/correo/i)).toHaveFocus();

  await user.tab();
  expect(screen.getByLabelText(/contraseña/i)).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("button", { name: /iniciar sesión/i })).toHaveFocus();
});
```

### Keyboard Interactions

```tsx
it("opens dropdown with Enter key", async () => {
  const user = userEvent.setup();
  renderWithI18n(<SpecialtyDropdown />);

  const trigger = screen.getByRole("combobox", { name: /especialidad/i });
  trigger.focus();

  await user.keyboard("{Enter}");
  expect(screen.getByRole("listbox")).toBeVisible();
});

it("navigates dropdown options with arrow keys", async () => {
  const user = userEvent.setup();
  renderWithI18n(<SpecialtyDropdown />);

  const trigger = screen.getByRole("combobox", { name: /especialidad/i });
  trigger.focus();

  await user.keyboard("{Enter}");
  await user.keyboard("{ArrowDown}");
  await user.keyboard("{ArrowDown}");
  await user.keyboard("{Enter}");

  expect(trigger).toHaveTextContent("Dermatología");
});

it("closes dialog with Escape", async () => {
  const user = userEvent.setup();
  renderWithI18n(<ConfirmDialog />);

  await user.click(screen.getByRole("button", { name: /eliminar/i }));
  expect(screen.getByRole("dialog")).toBeVisible();

  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

### Focus Trapping (Modals)

```tsx
it("traps focus inside dialog", async () => {
  const user = userEvent.setup();
  renderWithI18n(<ConfirmDeleteDialog />);

  await user.click(screen.getByRole("button", { name: /eliminar/i }));

  // Tab should cycle within the dialog
  const cancelButton = screen.getByRole("button", { name: /cancelar/i });
  const confirmButton = screen.getByRole("button", { name: /confirmar/i });
  const closeButton = screen.getByRole("button", { name: /cerrar/i });

  await user.tab();
  expect(cancelButton).toHaveFocus();

  await user.tab();
  expect(confirmButton).toHaveFocus();

  await user.tab();
  expect(closeButton).toHaveFocus();

  // Should wrap around
  await user.tab();
  expect(cancelButton).toHaveFocus();
});
```

## Screen Reader Testing

### aria-live Regions

```tsx
it("announces loading status to screen readers", async () => {
  renderWithI18n(<SearchResults query="cardiología" />);

  // Should have a live region for status updates
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent(/buscando/i);

  // After loading
  await waitFor(() => {
    expect(status).toHaveTextContent(/resultados encontrados/i);
  });
});
```

### Hidden Content

```tsx
it("hides decorative elements from screen readers", () => {
  renderWithI18n(<DoctorCard doctor={mockDoctor} />);

  // Decorative icon should be hidden
  const decorativeIcon = screen.getByTestId("specialty-icon");
  expect(decorativeIcon).toHaveAttribute("aria-hidden", "true");
});
```

## Playwright Accessibility Testing

### Full Page axe Scan

```typescript
import AxeBuilder from "@axe-core/playwright";

test("home page has no accessibility violations", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Scoped Scan

```typescript
test("login form is accessible", async ({ page }) => {
  await page.goto("/signin");

  const results = await new AxeBuilder({ page })
    .include("form")
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Keyboard E2E Testing

```typescript
test("can complete login with keyboard only", async ({ page }) => {
  await page.goto("/signin");

  // Tab to email field
  await page.keyboard.press("Tab");
  await page.keyboard.type("test@example.com");

  // Tab to password
  await page.keyboard.press("Tab");
  await page.keyboard.type("password123");

  // Tab to submit and press Enter
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL("/dashboard");
});
```

## Accessibility Testing Checklist

For every new component, verify:

1. **Keyboard navigable** — Can reach and interact with all controls via keyboard
2. **Screen reader labels** — All interactive elements have accessible names
3. **Form labels** — All inputs have associated `<label>` elements
4. **Error identification** — Form errors are clearly associated with their fields
5. **Focus management** — Focus moves logically; modals trap focus
6. **Color contrast** — Meets WCAG AA (4.5:1 for text, 3:1 for large text)
7. **No color-only indicators** — Information conveyed by color also uses text/icons
8. **Alt text** — Meaningful images have alt text; decorative images have `aria-hidden`
9. **Heading hierarchy** — Logical `h1` → `h2` → `h3` order, no skipped levels
10. **Live regions** — Dynamic content changes announced via `aria-live`
