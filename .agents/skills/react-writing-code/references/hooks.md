# Custom Hooks

## Extraction Patterns

### When to Extract a Custom Hook

1. **Shared stateful logic** — Two or more components need the same state + effect combination
2. **Complex state management** — A component has 3+ related state variables that change together
3. **Side effect encapsulation** — Subscription setup, event listeners, timers
4. **Testability** — Logic that needs to be tested independently of rendering

### Naming

- Always prefix with `use` — `useAuth`, `useDebounce`, `useLocalStorage`
- Name describes what the hook does, not how — `useWindowSize` not `useResizeEventListener`

### Basic Structure

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

## Dependency Management

### useEffect Dependencies

Every value from the component scope used inside the effect must be in the dependency array:

```tsx
// ✅ Correct — all dependencies listed
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [onClose]);

// ❌ Wrong — missing dependency
useEffect(() => {
  fetchUser(userId); // userId not in deps — stale closure
}, []);
```

### Stabilizing Callbacks

Use `useCallback` when passing callbacks to effects or memoized children:

```tsx
const handleSearch = useCallback((query: string) => {
  setResults(items.filter((item) => item.name.includes(query)));
}, [items]);

// Now safe to use in useEffect dependency array
useEffect(() => {
  handleSearch(debouncedQuery);
}, [handleSearch, debouncedQuery]);
```

### Refs for Latest Values

When you need the latest value in an effect without triggering re-runs:

```tsx
function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef(callback);

  // Update ref on every render
  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

## Cleanup Patterns

### Event Listeners

```tsx
function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (e: WindowEventMap[K]) => handlerRef.current(e);
    window.addEventListener(event, listener);
    return () => window.removeEventListener(event, listener);
  }, [event]);
}
```

### Subscriptions

```tsx
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Abort Controllers

```tsx
function useFetch<T>(url: string): { data: T | null; error: Error | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        setData(json);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [url]);

  return { data, error, loading };
}
```

## Common Custom Hooks

### useLocalStorage

```tsx
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        localStorage.setItem(key, JSON.stringify(nextValue));
        return nextValue;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
```

### useMediaQuery

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery("(max-width: 768px)");
const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
```

### useClickOutside

```tsx
function useClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, handler]);
}
```

## Anti-Patterns

### Don't Use useEffect for Derived State

```tsx
// ❌ Wrong — unnecessary state + effect
const [filteredItems, setFilteredItems] = useState(items);
useEffect(() => {
  setFilteredItems(items.filter((item) => item.name.includes(search)));
}, [items, search]);

// ✅ Correct — compute during render
const filteredItems = useMemo(
  () => items.filter((item) => item.name.includes(search)),
  [items, search]
);

// ✅ Even better if cheap — no memoization needed
const filteredItems = items.filter((item) => item.name.includes(search));
```

### Don't Ignore Cleanup

```tsx
// ❌ Wrong — memory leak, state update after unmount
useEffect(() => {
  fetchData().then(setData);
}, []);

// ✅ Correct — abort on cleanup
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal }).then(setData);
  return () => controller.abort();
}, []);
```

### Don't Put Too Much in One Hook

```tsx
// ❌ Wrong — hook does too many unrelated things
function useUserPage() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState([]);
  // ... 50 more lines of unrelated logic
}

// ✅ Correct — separate concerns
function useUser() { /* user fetching logic */ }
function useTheme() { /* theme logic */ }
function useNotifications() { /* notification logic */ }
```

### Don't Call Hooks Conditionally

```tsx
// ❌ Wrong — breaks Rules of Hooks
if (isLoggedIn) {
  const user = useUser(); // Can't call conditionally
}

// ✅ Correct — always call, handle the condition inside
const user = useUser(); // Always called
if (!isLoggedIn) return <LoginPage />;
```
