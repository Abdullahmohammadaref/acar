# React 19 Patterns

## Server and Client Components

React 19 introduces a server-first mental model. Components are server components by default in frameworks that support them.

### Server Components

Server components run on the server and send HTML to the client. They can:
- Access databases, file systems, and environment variables directly
- Import server-only dependencies without increasing bundle size
- Render async content with `await`

```tsx
// This is a Server Component by default (no directive)
async function DoctorList() {
  const doctors = await db.query("SELECT * FROM doctors WHERE active = true");

  return (
    <ul>
      {doctors.map((doctor) => (
        <li key={doctor.id}>
          <DoctorCard doctor={doctor} />
        </li>
      ))}
    </ul>
  );
}
```

### Client Components

Mark a component as a client component with `"use client"` at the top of the file. Client components:
- Run in the browser
- Can use hooks (`useState`, `useEffect`, etc.)
- Can handle user interactions
- Can access browser APIs

```tsx
"use client";

import { useState } from "react";

function AppointmentBookingForm() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <form>
      <DatePicker value={date} onChange={setDate} />
      <button type="submit">Agendar cita</button>
    </form>
  );
}
```

### When to Use Each

| Use Server Component | Use Client Component |
|---|---|
| Fetching data | Interactive forms |
| Accessing backend resources | Using React hooks |
| Rendering static or semi-static content | Browser APIs (localStorage, etc.) |
| Heavy dependencies (markdown parser, etc.) | Event handlers (onClick, onChange) |
| Sensitive logic (API keys, tokens) | Animations and transitions |

### Composition Pattern

Server components can render client components. Client components cannot import server components but can accept them as `children`:

```tsx
// ServerLayout.tsx — Server Component
import { ClientSidebar } from "./ClientSidebar";

async function ServerLayout() {
  const user = await getUser();

  return (
    <div className="flex">
      <ClientSidebar user={user}>
        <ServerNavItems /> {/* Server Component passed as children */}
      </ClientSidebar>
      <main>{/* ... */}</main>
    </div>
  );
}

// ClientSidebar.tsx — Client Component
"use client";

import type { ReactNode } from "react";

function ClientSidebar({ user, children }: { user: User; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={collapsed ? "w-16" : "w-64"}>
      <button onClick={() => setCollapsed(!collapsed)}>Toggle</button>
      {!collapsed && children}
    </aside>
  );
}
```

## Actions

Actions replace manual form submission handling. They work with both server and client components.

### Form Actions

```tsx
"use client";

import { useActionState } from "react";

function LoginForm() {
  async function loginAction(_prevState: LoginState, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await login(email, password);
    if (!result.ok) {
      return { error: result.error };
    }
    return { error: null };
  }

  const [state, formAction, isPending] = useActionState(loginAction, { error: null });

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state.error && <p className="text-destructive">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
```

### useFormStatus

Access form submission state from child components:

```tsx
"use client";

import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Guardando..." : "Guardar"}
    </button>
  );
}
```

**Rule**: `useFormStatus` must be called from a component rendered inside a `<form>`, not from the form component itself.

### useOptimisticAction

Show optimistic UI updates while an action is pending:

```tsx
"use client";

import { useOptimistic } from "react";

function MessageList({ messages }: { messages: Message[] }) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: string) => [
      ...state,
      { id: "temp", text: newMessage, sending: true },
    ]
  );

  async function sendAction(formData: FormData) {
    const text = formData.get("text") as string;
    addOptimisticMessage(text);
    await sendMessage(text);
  }

  return (
    <>
      <ul>
        {optimisticMessages.map((msg) => (
          <li key={msg.id} className={msg.sending ? "opacity-50" : ""}>
            {msg.text}
          </li>
        ))}
      </ul>
      <form action={sendAction}>
        <input name="text" />
        <SubmitButton />
      </form>
    </>
  );
}
```

## use() Hook

The `use()` hook reads resources (promises and contexts) during render.

### Reading Promises

```tsx
import { use, Suspense } from "react";

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);

  return (
    <div>
      <h2>{user.fullName}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// Parent wraps with Suspense
function ProfilePage({ userId }: { userId: string }) {
  const userPromise = fetchUser(userId); // Returns a promise, doesn't await

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### Conditional Context

Unlike `useContext`, `use()` can be called conditionally:

```tsx
function ThemeIcon({ showTheme }: { showTheme: boolean }) {
  if (!showTheme) return null;

  const theme = use(ThemeContext);
  return <Icon name={theme === "dark" ? "moon" : "sun"} />;
}
```

## Suspense and Error Boundaries

### Suspense for Loading States

```tsx
<Suspense fallback={<AppointmentsSkeleton />}>
  <AppointmentList />
</Suspense>

{/* Nested Suspense for progressive loading */}
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<ContentSkeleton />}>
    <MainContent />
    <Suspense fallback={<SidebarSkeleton />}>
      <Sidebar />
    </Suspense>
  </Suspense>
</Suspense>
```

### Error Boundaries

```tsx
import { Component } from "react";
import type { ReactNode } from "react";

interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error) => ReactNode);
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      return typeof fallback === "function"
        ? fallback(this.state.error)
        : fallback;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Loading />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>
```

## ref as Prop

React 19 passes `ref` as a regular prop — no need for `forwardRef`:

```tsx
// React 19 — ref is a regular prop
function Input({ ref, className, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn("...", className)} {...props} />;
}

// Usage — works directly
<Input ref={inputRef} placeholder="Search" />
```

The `forwardRef` wrapper is no longer needed but still works for backward compatibility.

## Metadata and Document Head

React 19 hoists `<title>`, `<meta>`, and `<link>` to `<head>` automatically:

```tsx
function DoctorProfilePage({ doctor }: { doctor: Doctor }) {
  return (
    <>
      <title>{`Dr. ${doctor.fullName} | DrZum`}</title>
      <meta name="description" content={`Perfil del ${doctor.specialty}`} />
      <div>{/* Page content */}</div>
    </>
  );
}
```

## Anti-Patterns

### Don't Mix Server and Client Logic

```tsx
// ❌ Wrong — can't use hooks in a server component
async function UserList() {
  const [search, setSearch] = useState(""); // Error!
  const users = await db.query("...");
  return <div>{/* ... */}</div>;
}

// ✅ Correct — split into server (data) and client (interaction)
async function UserList() {
  const users = await getUsers();
  return <UserListClient initialUsers={users} />;
}

// UserListClient.tsx
"use client";
function UserListClient({ initialUsers }: { initialUsers: User[] }) {
  const [search, setSearch] = useState("");
  // ...
}
```

### Don't Overuse Client Components

```tsx
// ❌ Wrong — making everything client when only the button is interactive
"use client";
function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div>
      <h3>{doctor.name}</h3>
      <p>{doctor.specialty}</p>
      <p>{doctor.bio}</p> {/* Static content doesn't need client */}
      <BookButton doctorId={doctor.id} />
    </div>
  );
}

// ✅ Correct — only the interactive part is a client component
function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div>
      <h3>{doctor.name}</h3>
      <p>{doctor.specialty}</p>
      <p>{doctor.bio}</p>
      <BookButton doctorId={doctor.id} /> {/* Only this is "use client" */}
    </div>
  );
}
```

### Don't Await in Client Components

```tsx
// ❌ Wrong — client components can't be async
"use client";
async function Profile() {
  const user = await fetchUser(); // Not allowed
  return <div>{user.name}</div>;
}

// ✅ Correct — use Suspense + use()
"use client";
function Profile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}
```
