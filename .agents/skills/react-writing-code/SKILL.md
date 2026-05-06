---
name: react-writing-code
description: >-
  This skill should be used when writing, reviewing, or refactoring React code.
  It covers React 19 patterns (server/client components, Actions, use() hook),
  component composition, custom hooks, state management with Zustand and urql,
  and performance optimization.
---

# React Writing Code

Quick reference for writing production-quality React code. Each section summarizes the key rules — reference files provide full examples and edge cases.

## React 19 Patterns

### Server-First Model

Components are server components by default in frameworks that support them. Use `"use client"` only when the component needs browser APIs, hooks, or event handlers.

```tsx
// Server Component — no directive needed
async function DoctorList() {
  const doctors = await getDoctors();
  return <ul>{doctors.map((d) => <DoctorCard key={d.id} doctor={d} />)}</ul>;
}

// Client Component — needs interactivity
"use client";
function BookButton({ doctorId }: { doctorId: string }) {
  const [isPending, setIsPending] = useState(false);
  return <button onClick={() => book(doctorId)}>Agendar</button>;
}
```

**Rules:**
- Keep client components small — push `"use client"` as far down the tree as possible
- Server components can render client components, but not vice versa
- Client components can accept server components as `children`
- Never mark a component as `"use client"` just because a child is a client component

### Form Actions

```tsx
"use client";
import { useActionState } from "react";

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, { error: null });

  return (
    <form action={formAction}>
      <input name="email" type="email" />
      {state.error && <p className="text-destructive">{state.error}</p>}
      <button disabled={isPending}>{isPending ? "..." : "Iniciar sesión"}</button>
    </form>
  );
}
```

### ref as a Prop (No forwardRef)

React 19 passes `ref` as a regular prop — `forwardRef` is no longer needed:

```tsx
function Input({ ref, className, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn("...", className)} {...props} />;
}
```

See [references/react-19.md](./references/react-19.md) for use() hook, Suspense, error boundaries, optimistic updates, and metadata hoisting.

## Component Composition

Prefer composition over configuration. Build components from smaller pieces rather than passing many props.

```tsx
// ❌ Configuration-heavy
<Card title="Dr. García" subtitle="Cardiología" badge="Disponible" footer={<BookButton />} />

// ✅ Composition
<Card>
  <Card.Header>
    <Card.Title>Dr. García</Card.Title>
    <Badge>Disponible</Badge>
  </Card.Header>
  <Card.Footer><BookButton /></Card.Footer>
</Card>
```

### Key Patterns

| Pattern | Use When |
|---|---|
| Compound components | Related components share implicit state (Tabs, Accordion, Dropdown) |
| Render props | Consumer controls rendering, component controls logic |
| Polymorphic `as` prop | Element type varies (Text as `<p>`, `<span>`, `<label>`) |
| Controlled + Uncontrolled | Support both modes via optional `value` prop |
| Children as ReactNode | Content is flexible (strings, elements, fragments) |

### Rules

- **Don't create components inside components** — Inner components are re-created every render, resetting state
- **Don't use index as key** — Causes bugs with reordering and deletion. Use stable unique IDs
- **Early returns over ternary chains** — `if (loading) return <Spinner />` is clearer than nested ternaries

See [references/component-patterns.md](./references/component-patterns.md) for compound components, render props, polymorphic components, and controlled/uncontrolled patterns.

## Custom Hooks

### Extraction Rules

1. **Two or more components** need the same stateful logic → extract a hook
2. **Three or more related state variables** → extract a hook
3. **Side effect needs cleanup** (subscriptions, event listeners, timers) → extract a hook
4. **Testability** — logic needs testing independent of rendering → extract a hook

### Key Principles

```tsx
// Always prefix with `use`
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

- **Complete dependency arrays** — Every value from component scope used in the effect must be listed
- **Always clean up** — Return cleanup functions from `useEffect` for listeners, timers, abort controllers
- **Use refs for latest values** — When you need current values in an effect without triggering re-runs
- **Don't call hooks conditionally** — Always call at the top level

### Common Anti-Pattern

```tsx
// ❌ Wrong — useEffect for derived state
const [filtered, setFiltered] = useState(items);
useEffect(() => {
  setFiltered(items.filter((i) => i.name.includes(search)));
}, [items, search]);

// ✅ Correct — compute during render
const filtered = items.filter((i) => i.name.includes(search));
```

See [references/hooks.md](./references/hooks.md) for cleanup patterns, useLocalStorage, useMediaQuery, useClickOutside, and anti-patterns.

## State Management

### Choose the Right Tool

| State Type | Tool | Don't Use |
|---|---|---|
| Local UI (toggle, form input) | `useState` | Zustand |
| Shared client state (auth, theme) | Zustand | Context for frequently changing values |
| Server data (API responses) | urql | Zustand — don't duplicate server state |
| URL-driven (search, pagination) | React Router `useSearchParams` | Zustand or useState |

### Zustand Essentials

```typescript
const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}));

// ✅ Always use selectors — prevents unnecessary re-renders
const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => state.accessToken !== null);

// ❌ Never destructure the entire store
const { user } = useAuthStore(); // Re-renders on ANY state change
```

### urql for GraphQL

```tsx
const [result] = useQuery({ query: VIEWER_QUERY });

if (result.fetching) return <Skeleton />;
if (result.error) return <ErrorMessage error={result.error} />;

return <Profile user={result.data.viewer.me} />;
```

See [references/state-management.md](./references/state-management.md) for Zustand middleware, slices, testing stores, urql auth exchange, and when NOT to use global state.

## Performance

### Measure First

Never optimize without profiling data. Use React DevTools Profiler to identify actual bottlenecks.

### Optimization Techniques (In Order of Impact)

1. **Code splitting** — `lazy()` + `Suspense` at route boundaries. Biggest impact, lowest effort.
2. **Avoid unnecessary renders** — Fix the cause (unstable references, missing selectors) before reaching for `memo`.
3. **React.memo** — Only when profiling shows a component re-renders unnecessarily with the same props.
4. **useMemo / useCallback** — Stabilize expensive computations and callback references.
5. **Virtualization** — `@tanstack/react-virtual` for lists with 100+ items.
6. **Debouncing** — Delay expensive operations on rapid user input (search, resize).

### Key Rules

```tsx
// ✅ Route-based code splitting
const Settings = lazy(() => import("./pages/Settings"));

// ✅ Stable callback reference (only when needed for memoized children)
const handleDelete = useCallback((id: string) => {
  setItems((prev) => prev.filter((item) => item.id !== id));
}, []);

// ❌ Don't memoize everything "just in case"
const MemoHeader = memo(Header); // Only if profiling proves it's needed
```

- **Don't create objects/arrays in render** — Breaks memoization. Hoist constants or use `useMemo`.
- **Use urql for data fetching** — Don't use `useEffect` + `fetch`. urql handles caching, races, and cleanup.
- **Debounce search input** — 300ms delay prevents excessive API calls.

See [references/performance.md](./references/performance.md) for React.memo, code splitting, virtualization, image optimization, and profiling techniques.

## Post-Change Verification

After every React code change, run the TypeScript verification protocol from the `typescript-writing-code` skill:

```bash
pnpm --filter <app> validate
# or: pnpm run type-check && pnpm run lint && pnpm run format && pnpm run test
```

All 4 steps must pass. See `typescript-writing-code` skill for details.

## Reference Files

| File | Description |
|---|---|
| [references/react-19.md](./references/react-19.md) | Server/client components, Actions, use() hook, Suspense, error boundaries |
| [references/hooks.md](./references/hooks.md) | Custom hooks, dependency management, cleanup patterns, common hooks |
| [references/component-patterns.md](./references/component-patterns.md) | Composition, compound components, render props, polymorphic, controlled/uncontrolled |
| [references/state-management.md](./references/state-management.md) | Zustand patterns, selectors, middleware, slices, urql, testing stores |
| [references/performance.md](./references/performance.md) | React.memo, code splitting, lazy loading, virtualization, profiling |
