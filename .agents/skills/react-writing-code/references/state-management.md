# State Management

## State Categories

Before choosing a tool, identify what kind of state you're managing:

| Category | Tool | Example |
|---|---|---|
| UI state (local) | `useState` / `useReducer` | Form inputs, toggle, modal open |
| UI state (shared) | Zustand | Auth, theme, sidebar collapsed |
| Server state | urql / TanStack Query | API data, cache, loading/error |
| URL state | React Router | Search params, pagination, filters |
| Form state | React Hook Form | Validation, touched/dirty, submission |

**Rule**: Don't put server data in Zustand. Use a server-state tool (urql, TanStack Query) for anything fetched from an API.

## Zustand

Zustand is used for client-side global state. It's minimal, performant, and requires no providers.

### Store Creation

```typescript
import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  user: { id: string; email: string } | null;
  setAuth: (token: string, user: AuthState["user"]) => void;
  clearAuth: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}));
```

### Selectors

Always use selectors to subscribe to specific state slices. This prevents unnecessary re-renders.

```typescript
// ✅ Correct — component only re-renders when user changes
function UserAvatar() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  return <Avatar name={user.email} />;
}

// ✅ Correct — component only re-renders when accessToken changes
function useAccessToken() {
  return useAuthStore((state) => state.accessToken);
}

// ❌ Wrong — subscribes to entire store, re-renders on any change
function UserAvatar() {
  const { user } = useAuthStore(); // Re-renders when accessToken changes too
  // ...
}
```

### Derived State

Compute derived values in selectors, not in state:

```typescript
// ✅ Correct — derived in selector
const isAuthenticated = useAuthStore((state) => state.accessToken !== null);

// ❌ Wrong — storing derived state
const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false, // Redundant — derived from accessToken
  setAuth: (token) => set({ accessToken: token, isAuthenticated: true }),
}));
```

### Middleware

#### Persist (localStorage)

```typescript
import { persist } from "zustand/middleware";

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "es",
      theme: "light",
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "settings-storage",
      partialize: (state) => ({ locale: state.locale, theme: state.theme }),
    }
  )
);
```

#### DevTools

```typescript
import { devtools } from "zustand/middleware";

const useStore = create<State>()(
  devtools(
    (set) => ({
      // ... store definition
    }),
    { name: "AuthStore" }
  )
);
```

### Slices Pattern

For large stores, split into slices:

```typescript
interface UserSlice {
  user: User | null;
  setUser: (user: User | null) => void;
}

interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const createUserSlice: StateCreator<UserSlice & UISlice, [], [], UserSlice> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
});

const createUISlice: StateCreator<UserSlice & UISlice, [], [], UISlice> = (set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
});

const useStore = create<UserSlice & UISlice>()((...args) => ({
  ...createUserSlice(...args),
  ...createUISlice(...args),
}));
```

### Actions Outside Components

Access store state and actions from non-React code:

```typescript
// In an API utility or middleware
const token = useAuthStore.getState().accessToken;

// Subscribe to changes
const unsubscribe = useAuthStore.subscribe(
  (state) => state.accessToken,
  (token) => {
    if (!token) redirectToLogin();
  }
);
```

### Testing Stores

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it("sets auth state", () => {
    const user = { id: "1", email: "test@example.com" };
    useAuthStore.getState().setAuth("token-123", user);

    expect(useAuthStore.getState().accessToken).toBe("token-123");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("clears auth state", () => {
    useAuthStore.getState().setAuth("token-123", { id: "1", email: "a@b.com" });
    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
```

## urql for GraphQL

This project uses urql as the GraphQL client with `authExchange` for automatic token management.

### Query Hook

```tsx
import { useQuery } from "urql";

const VIEWER_QUERY = `
  query Viewer {
    viewer {
      me {
        id
        email
        fullName
      }
    }
  }
`;

function ProfilePage() {
  const [result] = useQuery({ query: VIEWER_QUERY });

  if (result.fetching) return <ProfileSkeleton />;
  if (result.error) return <ErrorMessage error={result.error} />;

  const { me } = result.data.viewer;
  return <Profile user={me} />;
}
```

### Mutation Hook

```tsx
import { useMutation } from "urql";

const UPDATE_PROFILE = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      fullName
    }
  }
`;

function EditProfileForm() {
  const [result, updateProfile] = useMutation(UPDATE_PROFILE);

  async function handleSubmit(data: ProfileFormData) {
    const response = await updateProfile({ input: data });
    if (response.error) {
      // Handle error
    }
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Auth Exchange

The urql client uses `authExchange` to handle JWT tokens automatically:

```typescript
import { authExchange } from "@urql/exchange-auth";

const auth = authExchange(async (utils) => {
  const token = useAuthStore.getState().accessToken;

  return {
    addAuthToOperation(operation) {
      if (!token) return operation;
      return utils.appendHeaders(operation, {
        Authorization: `Bearer ${token}`,
      });
    },
    didAuthError(error) {
      return error.response?.status === 401;
    },
    async refreshAuth() {
      const newToken = await refreshAccessToken();
      if (newToken) {
        useAuthStore.getState().setAuth(newToken, useAuthStore.getState().user);
      } else {
        useAuthStore.getState().clearAuth();
      }
    },
  };
});
```

## When NOT to Use Global State

### Use Local State Instead

```tsx
// ❌ Wrong — modal open state doesn't need to be global
const useModalStore = create((set) => ({
  isOpen: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

// ✅ Correct — local state for local UI
function DeleteButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <>
      <button onClick={() => setShowConfirm(true)}>Delete</button>
      {showConfirm && <ConfirmDialog onClose={() => setShowConfirm(false)} />}
    </>
  );
}
```

### Use URL State Instead

```tsx
// ❌ Wrong — search/filter state in Zustand
const useSearchStore = create((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
}));

// ✅ Correct — URL state for shareable/bookmarkable filters
function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  return (
    <input
      value={query}
      onChange={(e) => setSearchParams({ q: e.target.value })}
    />
  );
}
```

## Anti-Patterns

### Don't Sync State Between Stores

```typescript
// ❌ Wrong — syncing state between two stores
useAuthStore.subscribe((state) => {
  useUIStore.getState().setIsLoggedIn(state.accessToken !== null);
});

// ✅ Correct — derive from a single source
const isLoggedIn = useAuthStore((state) => state.accessToken !== null);
```

### Don't Store API Response Data in Zustand

```typescript
// ❌ Wrong — duplicates urql's cache
const useDoctorStore = create((set) => ({
  doctors: [],
  fetchDoctors: async () => {
    const response = await api.getDoctors();
    set({ doctors: response.data });
  },
}));

// ✅ Correct — let urql manage server state
function DoctorList() {
  const [result] = useQuery({ query: GET_DOCTORS });
  // urql handles caching, refetching, loading, error
}
```

### Don't Create a Store Per Feature

```typescript
// ❌ Wrong — too many small stores
const useThemeStore = create(/* ... */);
const useLocaleStore = create(/* ... */);
const useSidebarStore = create(/* ... */);

// ✅ Better — group related UI state
const useUIStore = create<UIState>((set) => ({
  theme: "light",
  locale: "es",
  sidebarOpen: true,
  setTheme: (theme) => set({ theme }),
  setLocale: (locale) => set({ locale }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```
