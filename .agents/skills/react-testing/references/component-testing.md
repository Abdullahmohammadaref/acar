# Component Testing

## Testing Library Fundamentals

Testing Library encourages testing components the way users interact with them — through visible text, roles, and labels, not implementation details.

### Query Priority

Always prefer queries that reflect user experience. In order of priority:

| Priority | Query | Use When |
|---|---|---|
| 1 | `getByRole` | Always — most accessible, matches what screen readers see |
| 2 | `getByLabelText` | Form elements with labels |
| 3 | `getByPlaceholderText` | Inputs without visible labels (rare) |
| 4 | `getByText` | Non-interactive text content |
| 5 | `getByDisplayValue` | Filled form elements |
| 6 | `getByAltText` | Images |
| 7 | `getByTitle` | Elements with title attributes |
| 8 | `getByTestId` | Last resort — when no accessible query works |

```tsx
// ✅ Best — queries by role and accessible name
screen.getByRole("button", { name: /guardar/i });
screen.getByRole("textbox", { name: /correo/i });
screen.getByRole("heading", { name: /bienvenido/i });
screen.getByRole("link", { name: /iniciar sesión/i });

// ✅ Good — queries by label
screen.getByLabelText(/contraseña/i);

// ❌ Avoid — queries by test ID (implementation detail)
screen.getByTestId("submit-button");
```

### Query Variants

| Variant | Returns | Throws? | Use For |
|---|---|---|---|
| `getBy*` | Element | Yes, if not found | Elements that must exist |
| `queryBy*` | Element or null | No | Asserting absence |
| `findBy*` | Promise<Element> | Yes, if not found | Async content |
| `getAllBy*` | Element[] | Yes, if none found | Multiple elements |

```tsx
// Assert element exists
expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();

// Assert element does NOT exist
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

// Wait for async content
const message = await screen.findByText(/éxito/i);
expect(message).toBeInTheDocument();
```

### User Events

Use `@testing-library/user-event` for realistic user interactions:

```tsx
import userEvent from "@testing-library/user-event";

it("submits the form with valid data", async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  renderWithI18n(<ContactForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/nombre/i), "Juan García");
  await user.type(screen.getByLabelText(/correo/i), "juan@example.com");
  await user.type(screen.getByLabelText(/mensaje/i), "Hola doctor");

  await user.click(screen.getByRole("button", { name: /enviar/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    name: "Juan García",
    email: "juan@example.com",
    message: "Hola doctor",
  });
});
```

**Rules:**
- Always call `userEvent.setup()` before the render
- Use `await` on all `user.*` methods (they're async)
- Prefer `user.type` over `fireEvent.change` — it triggers all keyboard events
- Prefer `user.click` over `fireEvent.click` — it triggers focus, pointer, click events
- Use `user.clear` before `user.type` when replacing input content

## Form Testing

### Validation Errors

```tsx
it("shows validation errors for empty required fields", async () => {
  const user = userEvent.setup();
  renderWithI18n(<LoginForm onSubmit={vi.fn()} />);

  // Submit without filling fields
  await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

  expect(await screen.findByText(/correo.*requerido/i)).toBeInTheDocument();
  expect(await screen.findByText(/contraseña.*requerida/i)).toBeInTheDocument();
});
```

### Async Form Submission

```tsx
it("shows loading state during submission", async () => {
  const user = userEvent.setup();
  const submitPromise = new Promise((resolve) => setTimeout(resolve, 100));
  const handleSubmit = vi.fn(() => submitPromise);

  renderWithI18n(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/correo/i), "test@example.com");
  await user.type(screen.getByLabelText(/contraseña/i), "password123");
  await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

  // Button should be disabled during submission
  expect(screen.getByRole("button", { name: /cargando/i })).toBeDisabled();

  // Wait for submission to complete
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeEnabled();
  });
});
```

### Select and Dropdown

```tsx
it("selects a specialty from the dropdown", async () => {
  const user = userEvent.setup();
  renderWithI18n(<DoctorFilter onChange={vi.fn()} />);

  await user.click(screen.getByRole("combobox", { name: /especialidad/i }));
  await user.click(screen.getByRole("option", { name: /cardiología/i }));

  expect(screen.getByRole("combobox")).toHaveTextContent("Cardiología");
});
```

## Custom Hook Testing

### renderHook

```tsx
import { renderHook, act } from "@testing-library/react";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces the value", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 300 } }
    );

    expect(result.current).toBe("hello");

    // Update value
    rerender({ value: "world", delay: 300 });

    // Value should not have changed yet
    expect(result.current).toBe("hello");

    // Advance time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("world");
  });
});
```

### Hooks with State Updates

```tsx
describe("useToggle", () => {
  it("toggles between true and false", () => {
    const { result } = renderHook(() => useToggle(false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](); // toggle
    });

    expect(result.current[0]).toBe(true);
  });
});
```

## Context and Provider Testing

### renderWithI18n

This project provides `renderWithI18n` from `@drzum/ui/test` for testing components with i18n context:

```tsx
import { renderWithI18n, screen } from "@drzum/ui/test";

describe("WelcomeMessage", () => {
  it("renders in Spanish (default)", () => {
    renderWithI18n(<WelcomeMessage />, { locale: "es" });
    expect(screen.getByText("Bienvenido")).toBeInTheDocument();
  });

  it("renders in English", () => {
    renderWithI18n(<WelcomeMessage />, { locale: "en" });
    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });
});
```

### Custom Wrapper for Multiple Providers

```tsx
import { renderWithI18n } from "@drzum/ui/test";
import type { RenderOptions } from "@testing-library/react";

function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & { locale?: string },
) {
  return renderWithI18n(ui, {
    locale: options?.locale ?? "es",
    withRouter: true,
    ...options,
  });
}
```

### Testing with Router

```tsx
import { renderWithI18n, screen } from "@drzum/ui/test";

it("renders with router context", () => {
  renderWithI18n(<Navigation />, { withRouter: true });
  expect(screen.getByRole("link", { name: /inicio/i })).toHaveAttribute("href", "/");
});
```

## Testing Async Components

### waitFor

```tsx
it("loads and displays doctor profile", async () => {
  renderWithI18n(<DoctorProfile doctorId="123" />);

  // Wait for loading to finish
  expect(screen.getByText(/cargando/i)).toBeInTheDocument();

  // Wait for data to appear
  const name = await screen.findByText("Dr. García");
  expect(name).toBeInTheDocument();
  expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument();
});
```

### waitForElementToBeRemoved

```tsx
it("removes loading spinner after data loads", async () => {
  renderWithI18n(<AppointmentList />);

  await waitForElementToBeRemoved(() => screen.queryByText(/cargando/i));

  expect(screen.getByRole("list")).toBeInTheDocument();
});
```

## Mocking GraphQL (urql)

```tsx
import { Provider } from "urql";
import { fromValue } from "wonka";

function createMockClient(data: Record<string, unknown>) {
  return {
    executeQuery: () => fromValue({ data }),
    executeMutation: () => fromValue({ data }),
    executeSubscription: () => fromValue({ data }),
  };
}

it("renders viewer profile", () => {
  const mockClient = createMockClient({
    viewer: {
      me: { id: "1", email: "test@example.com", fullName: "Test User" },
    },
  });

  renderWithI18n(
    <Provider value={mockClient as never}>
      <ProfilePage />
    </Provider>
  );

  expect(screen.getByText("Test User")).toBeInTheDocument();
});
```

## Anti-Patterns

### Don't Test Implementation Details

```tsx
// ❌ Wrong — testing internal state
it("sets count to 1", () => {
  const { result } = renderHook(() => useState(0));
  act(() => result.current[1](1));
  expect(result.current[0]).toBe(1);
});

// ✅ Correct — test what the user sees
it("increments the counter", async () => {
  const user = userEvent.setup();
  renderWithI18n(<Counter />);

  await user.click(screen.getByRole("button", { name: /incrementar/i }));
  expect(screen.getByText("1")).toBeInTheDocument();
});
```

### Don't Use Container Queries

```tsx
// ❌ Wrong — container.querySelector is an implementation detail
const { container } = render(<Component />);
const button = container.querySelector(".submit-btn");

// ✅ Correct — use accessible queries
const button = screen.getByRole("button", { name: /enviar/i });
```

### Don't Wrap Every Assertion in waitFor

```tsx
// ❌ Wrong — unnecessary waitFor for synchronous assertions
await waitFor(() => {
  expect(screen.getByText("Hello")).toBeInTheDocument();
});

// ✅ Correct — use waitFor only for async operations
expect(screen.getByText("Hello")).toBeInTheDocument();

// ✅ Correct use of waitFor — waiting for async state update
await waitFor(() => {
  expect(screen.getByText("Success")).toBeInTheDocument();
});
```
