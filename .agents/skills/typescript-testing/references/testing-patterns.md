# Testing Patterns

## AAA Pattern (Arrange-Act-Assert)

Every test follows three distinct phases. Keep them visually separated:

### Synchronous Example

```typescript
it("calculates total price with tax", () => {
  // Arrange
  const items = [
    { name: "Consulta", price: 500 },
    { name: "Laboratorio", price: 300 },
  ];
  const taxRate = 0.16;

  // Act
  const total = calculateTotal(items, taxRate);

  // Assert
  expect(total).toBe(928);
});
```

### Async Example

```typescript
it("fetches and transforms user data", async () => {
  // Arrange
  const mockUser = { id: "1", name: "Dr. García", role: "doctor" };
  vi.mocked(api.getUser).mockResolvedValue(mockUser);

  // Act
  const result = await getUserProfile("1");

  // Assert
  expect(result).toEqual({
    displayName: "Dr. García",
    isDoctor: true,
  });
});
```

### React Component Example

```typescript
it("shows error message on invalid email", async () => {
  // Arrange
  const user = userEvent.setup();
  renderWithI18n(<SignUpForm />);

  // Act
  await user.type(screen.getByLabelText(/correo/i), "invalid-email");
  await user.click(screen.getByRole("button", { name: /registrarse/i }));

  // Assert
  expect(screen.getByText(/correo electrónico inválido/i)).toBeInTheDocument();
});
```

## Parameterized Tests

### `it.each` with Array of Objects

```typescript
it.each([
  { input: "alice@example.com", expected: true },
  { input: "bob@drzum.com", expected: true },
  { input: "not-an-email", expected: false },
  { input: "", expected: false },
  { input: "@missing-local.com", expected: false },
])("isValidEmail('$input') returns $expected", ({ input, expected }) => {
  expect(isValidEmail(input)).toBe(expected);
});
```

### `it.each` with Template Literals

```typescript
it.each`
  status        | label
  ${"active"}   | ${"Activo"}
  ${"inactive"} | ${"Inactivo"}
  ${"pending"}  | ${"Pendiente"}
`("displays '$label' for status '$status'", ({ status, label }) => {
  renderWithI18n(<StatusBadge status={status} />);
  expect(screen.getByText(label)).toBeInTheDocument();
});
```

### `describe.each` for Grouped Tests

```typescript
describe.each(["patient", "doctor", "admin"] as const)("role: %s", (role) => {
  it("renders the correct dashboard", () => {
    renderWithI18n(<Dashboard role={role} />);
    expect(screen.getByTestId(`${role}-dashboard`)).toBeInTheDocument();
  });

  it("shows the correct navigation", () => {
    renderWithI18n(<Navigation role={role} />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
```

## Async Testing

### async/await

```typescript
it("loads appointments", async () => {
  const appointments = await fetchAppointments("user-1");
  expect(appointments).toHaveLength(3);
});
```

### `waitFor` — Waiting for Async State Updates

```typescript
import { waitFor } from "@testing-library/react";

it("shows loading then data", async () => {
  renderWithI18n(<AppointmentList userId="1" />);

  // Initially shows loading
  expect(screen.getByText(/cargando/i)).toBeInTheDocument();

  // Wait for data to appear
  await waitFor(() => {
    expect(screen.getByText("Dr. García")).toBeInTheDocument();
  });
});
```

### `findBy*` Queries — Built-in Waiting

```typescript
it("displays fetched data", async () => {
  renderWithI18n(<UserProfile userId="1" />);

  // findBy* waits for the element to appear (default 1000ms timeout)
  const name = await screen.findByText("Alice García");
  expect(name).toBeInTheDocument();
});
```

### Testing Rejected Promises

```typescript
it("throws on network error", async () => {
  vi.mocked(api.getUser).mockRejectedValue(new Error("Network error"));

  await expect(fetchUser("1")).rejects.toThrow("Network error");
});
```

## Test Factories

Create factory functions to build test data with sensible defaults and overrides:

```typescript
function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    role: "patient",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function createAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "apt-1",
    doctorId: "doc-1",
    patientId: "patient-1",
    date: new Date("2024-06-15T10:00:00"),
    status: "confirmed",
    ...overrides,
  };
}

// Usage
it("shows inactive user warning", () => {
  const user = createUser({ isActive: false });
  renderWithI18n(<UserBadge user={user} />);
  expect(screen.getByText(/inactivo/i)).toBeInTheDocument();
});
```

### Factory Rules

- **Sensible defaults** — Every field has a valid default. Tests only override what matters.
- **`Partial<T>` overrides** — Spread overrides last to allow targeted changes.
- **Unique identifiers** — Use predictable IDs (`"user-1"`) not random UUIDs in tests.
- **Stable dates** — Use fixed dates, not `new Date()` which changes between runs.

## Setup and Teardown

### `beforeEach` / `afterEach`

Use for per-test setup. This is the most common pattern:

```typescript
describe("NotificationService", () => {
  let service: NotificationService;
  let mockSender: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSender = vi.fn();
    service = new NotificationService(mockSender);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends notification", () => {
    service.notify("Hello");
    expect(mockSender).toHaveBeenCalledWith("Hello");
  });
});
```

### `beforeAll` / `afterAll`

Use for expensive one-time setup:

```typescript
describe("Database tests", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.beginTransaction();
  });

  afterEach(async () => {
    await db.rollbackTransaction();
  });
});
```

### Cleanup in Tests

For React components, `@testing-library/react` handles cleanup automatically after each test. No need to call `cleanup()` manually.

## Anti-Patterns

### Logic in Tests

```typescript
// ❌ Wrong — conditional logic in tests
it("handles users", () => {
  for (const user of users) {
    if (user.role === "admin") {
      expect(canAccess(user)).toBe(true);
    } else {
      expect(canAccess(user)).toBe(false);
    }
  }
});

// ✅ Correct — use parameterized tests
it.each([
  { role: "admin", expected: true },
  { role: "patient", expected: false },
])("canAccess for $role returns $expected", ({ role, expected }) => {
  const user = createUser({ role });
  expect(canAccess(user)).toBe(expected);
});
```

### Test Interdependence

```typescript
// ❌ Wrong — tests depend on order
let counter = 0;

it("increments", () => {
  counter++;
  expect(counter).toBe(1);
});

it("is at 1", () => {
  expect(counter).toBe(1); // fails if tests run in different order
});

// ✅ Correct — each test is independent
it("increments from 0", () => {
  const counter = new Counter(0);
  counter.increment();
  expect(counter.value).toBe(1);
});
```

### Testing Implementation Details

```typescript
// ❌ Wrong — testing internal method calls
it("calls fetchData", () => {
  const spy = vi.spyOn(service, "fetchData");
  service.loadDashboard();
  expect(spy).toHaveBeenCalled();
});

// ✅ Correct — testing observable outcome
it("displays dashboard data", async () => {
  renderWithI18n(<Dashboard />);
  await screen.findByText("3 citas pendientes");
});
```

### Excessive Setup

```typescript
// ❌ Wrong — 30 lines of setup for a 2-line test
// (indicates the code under test may need refactoring)

// ✅ Correct — use factories and helpers to keep setup concise
it("formats appointment summary", () => {
  const apt = createAppointment({ status: "confirmed" });
  expect(formatSummary(apt)).toBe("Cita confirmada - 15 jun 2024");
});
```

### Snapshot Overuse

```typescript
// ❌ Wrong — snapshots for everything
it("renders correctly", () => {
  const { container } = renderWithI18n(<Button>Click</Button>);
  expect(container).toMatchSnapshot();
});

// ✅ Correct — explicit assertions on what matters
it("renders with label", () => {
  renderWithI18n(<Button>Click</Button>);
  expect(screen.getByRole("button", { name: "Click" })).toBeInTheDocument();
});
```
