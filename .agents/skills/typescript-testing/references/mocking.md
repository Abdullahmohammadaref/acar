# Mocking

## `vi.fn()` — Mock Functions

### Creating Mocks

```typescript
// Basic mock
const mockFn = vi.fn();
mockFn("hello", 42);

// With return value
const mockGet = vi.fn().mockReturnValue("result");
const mockGetOnce = vi.fn().mockReturnValueOnce("first").mockReturnValueOnce("second");

// With async return value
const mockFetch = vi.fn().mockResolvedValue({ data: [] });
const mockFetchOnce = vi.fn().mockResolvedValueOnce({ data: [1] });

// With rejection
const mockFail = vi.fn().mockRejectedValue(new Error("Network error"));

// With implementation
const mockDouble = vi.fn((x: number) => x * 2);
```

### Mock Assertions

```typescript
const mockFn = vi.fn();
mockFn("a");
mockFn("b", 42);

// Call checks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith("a");
expect(mockFn).toHaveBeenCalledWith("b", 42);
expect(mockFn).toHaveBeenLastCalledWith("b", 42);
expect(mockFn).toHaveBeenNthCalledWith(1, "a");

// Access call details
expect(mockFn.mock.calls).toHaveLength(2);
expect(mockFn.mock.calls[0]).toEqual(["a"]);
expect(mockFn.mock.results[0]?.value).toBeUndefined();
```

### Typed Mocks

```typescript
// Create a typed mock function
const mockGetUser = vi.fn<(id: string) => Promise<User>>();
mockGetUser.mockResolvedValue({ id: "1", name: "Alice" });

// Type-safe assertions
expect(mockGetUser).toHaveBeenCalledWith("1");
```

## `vi.spyOn()` — Spy on Methods

### Spying Without Changing Behavior

```typescript
const spy = vi.spyOn(console, "log");

doSomething(); // internally calls console.log

expect(spy).toHaveBeenCalledWith("expected output");
spy.mockRestore(); // restore original console.log
```

### Spying and Replacing Implementation

```typescript
const spy = vi.spyOn(Date, "now").mockReturnValue(1700000000000);

const timestamp = Date.now(); // returns mocked value
expect(timestamp).toBe(1700000000000);

spy.mockRestore();
```

### Spying on Object Methods

```typescript
const service = new UserService(repository);
const spy = vi.spyOn(service, "validate").mockReturnValue(true);

const result = service.createUser({ name: "Alice" });

expect(spy).toHaveBeenCalledWith({ name: "Alice" });
spy.mockRestore();
```

## `vi.mock()` — Module Mocking

### Auto-Mock All Exports

```typescript
// All exports become vi.fn() that return undefined
vi.mock("./api");

import { getUser, createUser } from "./api";

it("calls getUser", () => {
  vi.mocked(getUser).mockResolvedValue({ id: "1", name: "Test" });

  // getUser is now a mock function
  await getUser("1");
  expect(getUser).toHaveBeenCalledWith("1");
});
```

### Manual Mock Factory

```typescript
vi.mock("./auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "1", name: "Test User", role: "patient" },
    isAuthenticated: true,
    signOut: vi.fn(),
  })),
}));
```

### Partial Mock — Keep Real, Override Specific

```typescript
vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return {
    ...actual,
    formatDate: vi.fn(() => "01/01/2024"), // override only this
    // all other exports remain real
  };
});
```

### `vi.mocked()` — Type-Safe Mock Access

```typescript
import { getUser } from "./api";

vi.mock("./api");

// vi.mocked adds mock type information
vi.mocked(getUser).mockResolvedValue({ id: "1", name: "Alice" });

// Now TypeScript knows getUser is a mock
expect(vi.mocked(getUser)).toHaveBeenCalledWith("1");
```

## Mocking External Modules

### React Router

```typescript
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useParams: vi.fn(() => ({ id: "123" })),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});
```

### Zustand Store

```typescript
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: "1", name: "Test" },
    isAuthenticated: true,
    setUser: vi.fn(),
    clearAuth: vi.fn(),
  })),
}));

// Override in specific tests
import { useAuthStore } from "@/stores/auth-store";

it("shows login when not authenticated", () => {
  vi.mocked(useAuthStore).mockReturnValue({
    user: null,
    isAuthenticated: false,
    setUser: vi.fn(),
    clearAuth: vi.fn(),
  });

  renderWithI18n(<AuthGuard><Protected /></AuthGuard>);
  expect(screen.queryByText("Protected")).not.toBeInTheDocument();
});
```

### urql (GraphQL Client)

```typescript
vi.mock("urql", async (importOriginal) => {
  const actual = await importOriginal<typeof import("urql")>();
  return {
    ...actual,
    useQuery: vi.fn(() => [{
      data: { viewer: { me: { id: "1", name: "Test" } } },
      fetching: false,
      error: undefined,
    }]),
    useMutation: vi.fn(() => [{
      data: undefined,
      fetching: false,
      error: undefined,
    }, vi.fn()]),
  };
});
```

## Timer Mocks

### `vi.useFakeTimers()`

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("debounces search input", async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  renderWithI18n(<SearchInput onSearch={onSearch} debounceMs={300} />);

  await user.type(screen.getByRole("searchbox"), "doc");

  // Before debounce expires
  expect(onSearch).not.toHaveBeenCalled();

  // Advance past debounce
  vi.advanceTimersByTime(300);

  expect(onSearch).toHaveBeenCalledWith("doc");
});
```

### `vi.setSystemTime()`

```typescript
it("displays relative time", () => {
  vi.setSystemTime(new Date("2024-06-15T12:00:00"));

  const result = formatRelativeTime(new Date("2024-06-15T11:30:00"));
  expect(result).toBe("hace 30 minutos");
});
```

### Timer Methods

| Method | Effect |
|---|---|
| `vi.useFakeTimers()` | Replace `setTimeout`, `setInterval`, `Date.now`, etc. |
| `vi.useRealTimers()` | Restore real timers |
| `vi.advanceTimersByTime(ms)` | Fast-forward time by milliseconds |
| `vi.advanceTimersToNextTimer()` | Fast-forward to next scheduled timer |
| `vi.runAllTimers()` | Execute all pending timers |
| `vi.setSystemTime(date)` | Set the mocked system time |

## Reset / Restore Rules

### Differences

| Method | Clears Calls | Resets Returns | Restores Original |
|---|---|---|---|
| `vi.clearAllMocks()` | Yes | No | No |
| `vi.resetAllMocks()` | Yes | Yes | No |
| `vi.restoreAllMocks()` | Yes | Yes | Yes (for spies) |

### Best Practice

Use `vi.restoreAllMocks()` in `afterEach` to prevent test pollution:

```typescript
afterEach(() => {
  vi.restoreAllMocks();
});
```

### Per-Mock Methods

```typescript
const mockFn = vi.fn().mockReturnValue(42);

mockFn.mockClear();   // clear call history, keep implementation
mockFn.mockReset();   // clear + remove return value
mockFn.mockRestore(); // reset + restore original (for spies only)
```

## Anti-Patterns

### Over-Mocking

```typescript
// ❌ Wrong — mocking the module under test
vi.mock("./calculate-total");
import { calculateTotal } from "./calculate-total";

it("calculates total", () => {
  vi.mocked(calculateTotal).mockReturnValue(100);
  expect(calculateTotal(items)).toBe(100); // testing the mock, not the code
});

// ✅ Correct — only mock dependencies, test the actual module
import { calculateTotal } from "./calculate-total";

it("calculates total", () => {
  const items = [{ price: 50 }, { price: 50 }];
  expect(calculateTotal(items)).toBe(100);
});
```

### `as any` in Mock Setup

```typescript
// ❌ Wrong — type-unsafe mock
const mockService = {
  getUser: vi.fn(),
} as any as UserService;

// ✅ Correct — typed mock
const mockService: Pick<UserService, "getUser"> = {
  getUser: vi.fn(),
};

// or use a factory
function createMockUserService(): jest.Mocked<UserService> {
  return {
    getUser: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  };
}
```

### Not Restoring Mocks

```typescript
// ❌ Wrong — mock leaks between tests
vi.spyOn(console, "error").mockImplementation(() => {});
// no restore — next test's console.error is still mocked

// ✅ Correct — always restore
afterEach(() => {
  vi.restoreAllMocks();
});
```

### Mocking Implementation Details

```typescript
// ❌ Wrong — mocking internal state management
vi.spyOn(component, "setState");
expect(component.setState).toHaveBeenCalledWith({ count: 1 });

// ✅ Correct — test the visible result
await user.click(incrementButton);
expect(screen.getByText("1")).toBeInTheDocument();
```

### Deeply Nested Mock Setup

```typescript
// ❌ Wrong — fragile mock chain
vi.mock("./api", () => ({
  default: {
    users: {
      getById: vi.fn().mockResolvedValue({
        data: { user: { profile: { name: "Test" } } },
      }),
    },
  },
}));

// ✅ Correct — mock at the boundary your code uses
vi.mock("./api");
vi.mocked(api.getUser).mockResolvedValue({ id: "1", name: "Test" });
```
