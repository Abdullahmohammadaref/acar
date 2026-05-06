# React Performance

## Measure First

Never optimize without profiling data. Use React DevTools Profiler and browser performance tools to identify actual bottlenecks before applying any optimization technique.

### React DevTools Profiler

1. Open React DevTools → Profiler tab
2. Click Record → interact with the app → Stop
3. Look for components that re-render unnecessarily or take >16ms
4. Focus on the "flame chart" — wide bars = slow renders

### Chrome Performance Tab

1. Record a performance trace during the problematic interaction
2. Look for long tasks (>50ms) in the main thread
3. Check for layout thrashing, excessive paint, or forced reflows

## React.memo

Prevents re-renders when props haven't changed. Only use it when profiling shows a component re-renders unnecessarily with the same props.

```tsx
// Only memoize when:
// 1. The component renders often with the same props
// 2. The render is expensive (large tree, complex calculations)
// 3. Profiling confirms unnecessary re-renders

const DoctorCard = memo(function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="rounded-lg border p-4">
      <h3>{doctor.fullName}</h3>
      <p>{doctor.specialty}</p>
    </div>
  );
});
```

### When NOT to Memo

```tsx
// ❌ Unnecessary — simple component, rarely re-renders
const Label = memo(({ text }: { text: string }) => <span>{text}</span>);

// ❌ Unnecessary — new object prop every render breaks memo anyway
<MemoizedComponent config={{ theme: "dark" }} /> // New object each render
```

### Fix the Source Instead

```tsx
// ❌ Band-aid — memo hides the real problem
const ExpensiveList = memo(({ items, onSelect }: Props) => {
  // ...
});

// Parent creates new onSelect every render, breaking memo
function Parent() {
  return <ExpensiveList items={items} onSelect={(id) => setSelected(id)} />;
}

// ✅ Fix the source — stabilize the callback
function Parent() {
  const onSelect = useCallback((id: string) => setSelected(id), []);
  return <ExpensiveList items={items} onSelect={onSelect} />;
}
```

## useMemo and useCallback

### useMemo for Expensive Computations

```tsx
function SearchResults({ items, query }: { items: Item[]; query: string }) {
  // Only recompute when items or query change
  const filtered = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  return <List items={filtered} />;
}
```

### useCallback for Stable References

```tsx
function ParentComponent() {
  const [items, setItems] = useState<Item[]>([]);

  // Stable reference — won't cause child re-renders
  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return <ItemList items={items} onDelete={handleDelete} />;
}
```

### When NOT to Memoize

```tsx
// ❌ Unnecessary — simple computation
const fullName = useMemo(() => `${first} ${last}`, [first, last]);
// ✅ Just compute it
const fullName = `${first} ${last}`;

// ❌ Unnecessary — inline handler on a non-memoized child
<button onClick={useCallback(() => setOpen(true), [])}>Open</button>
// ✅ Just use inline
<button onClick={() => setOpen(true)}>Open</button>
```

## Code Splitting

### Route-Based Splitting

Split at route boundaries for the biggest impact:

```tsx
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const DoctorProfile = lazy(() => import("./pages/DoctorProfile"));

function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/doctor/:id" element={<DoctorProfile />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-Based Splitting

Split heavy components that aren't needed on initial load:

```tsx
// Heavy chart library — only load when tab is visible
const AppointmentChart = lazy(() => import("./AppointmentChart"));

function DashboardTabs() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <TabBar active={activeTab} onChange={setActiveTab} />
      {activeTab === "overview" && <OverviewPanel />}
      {activeTab === "analytics" && (
        <Suspense fallback={<ChartSkeleton />}>
          <AppointmentChart />
        </Suspense>
      )}
    </>
  );
}
```

### Named Exports with Lazy

```tsx
// If the module uses named exports, wrap in a default export adapter
const DoctorSearch = lazy(() =>
  import("./DoctorSearch").then((module) => ({ default: module.DoctorSearch }))
);
```

## Virtualization

For lists with 100+ items, use virtualization to only render visible items.

### @tanstack/react-virtual

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualizedDoctorList({ doctors }: { doctors: Doctor[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: doctors.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height in px
    overscan: 5, // Extra items to render above/below viewport
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const doctor = doctors[virtualRow.index];
          return (
            <div
              key={doctor.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <DoctorCard doctor={doctor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### When to Virtualize

- **100+ items** in a scrollable list
- **Large tables** with many rows
- **Infinite scroll** feeds

### When NOT to Virtualize

- Lists with <50 items — the overhead isn't worth it
- Non-scrollable layouts
- Server-rendered lists where items render once

## Image Optimization

### Lazy Loading

```tsx
<img
  src={doctor.avatar}
  alt={doctor.fullName}
  loading="lazy"
  decoding="async"
  className="size-12 rounded-full object-cover"
/>
```

### Responsive Images

```tsx
<picture>
  <source media="(min-width: 1024px)" srcSet="/hero-large.webp" />
  <source media="(min-width: 640px)" srcSet="/hero-medium.webp" />
  <img src="/hero-small.webp" alt="Hero" className="w-full" />
</picture>
```

## Debouncing User Input

```tsx
function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [value, setValue] = useState("");
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

## Anti-Patterns

### Don't Optimize Prematurely

```tsx
// ❌ Wrong — memoizing everything "just in case"
const MemoHeader = memo(Header);
const MemoFooter = memo(Footer);
const MemoSidebar = memo(Sidebar);

// ✅ Correct — only memoize what profiling proves is slow
// Most components re-render fast enough without memo
```

### Don't Create Objects/Arrays in Render

```tsx
// ❌ Wrong — new object every render, breaks memoization
<MemoizedComponent style={{ color: "red" }} options={[1, 2, 3]} />

// ✅ Correct — stable references
const style = useMemo(() => ({ color: "red" }), []);
const options = useMemo(() => [1, 2, 3], []);
<MemoizedComponent style={style} options={options} />

// ✅ Even better — hoist constants out of the component
const STYLE = { color: "red" } as const;
const OPTIONS = [1, 2, 3] as const;
```

### Don't Fetch in useEffect Without Cleanup

```tsx
// ❌ Wrong — race condition, state update after unmount
useEffect(() => {
  fetch(`/api/doctor/${id}`).then((r) => r.json()).then(setDoctor);
}, [id]);

// ✅ Correct — use abort controller
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/doctor/${id}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setDoctor)
    .catch(() => {}); // AbortError is expected
  return () => controller.abort();
}, [id]);

// ✅ Even better — use urql/TanStack Query instead of manual fetch
const [result] = useQuery({ query: GET_DOCTOR, variables: { id } });
```
