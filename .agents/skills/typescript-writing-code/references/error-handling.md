# Error Handling

## Result Type Pattern

Use a discriminated union to represent success/failure without exceptions:

```typescript
type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

### Factory Functions

```typescript
function createSuccess<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

function createError<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage
async function findUser(id: string): Promise<Result<User, "not_found" | "db_error">> {
  try {
    const user = await db.users.findUnique({ where: { id } });
    if (!user) {
      return createError("not_found");
    }
    return createSuccess(user);
  } catch {
    return createError("db_error");
  }
}

// Caller handles both cases explicitly
const result = await findUser("123");
if (!result.ok) {
  switch (result.error) {
    case "not_found":
      return notFound();
    case "db_error":
      return serverError();
  }
}
const user = result.data; // narrowed to User
```

### When to Use Result Types

- **API boundaries** — Functions that call external services, databases, or parse user input.
- **Expected failures** — Operations where failure is a normal outcome (not found, validation error).
- **Composable pipelines** — When you need to chain operations that may fail.

### When NOT to Use Result Types

- **Internal utility functions** — Simple functions where failure indicates a bug (use exceptions).
- **React components** — Error boundaries handle rendering errors. Don't return Results from components.

## Discriminated Union Errors

For errors that carry structured data, use discriminated unions instead of strings:

```typescript
type ApiError =
  | { kind: "not_found"; resource: string; id: string }
  | { kind: "validation"; fields: Record<string, string[]> }
  | { kind: "unauthorized"; reason: string }
  | { kind: "rate_limited"; retryAfter: number };

type ApiResult<T> = Result<T, ApiError>;

function handleApiError(error: ApiError): string {
  switch (error.kind) {
    case "not_found":
      return `${error.resource} with id ${error.id} was not found`;
    case "validation":
      return Object.entries(error.fields)
        .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
        .join("\n");
    case "unauthorized":
      return `Access denied: ${error.reason}`;
    case "rate_limited":
      return `Too many requests. Retry after ${error.retryAfter}s`;
  }
}
```

## Try-Catch Rules

### Always Type Catch as `unknown`

TypeScript's `useUnknownInCatchVariables` (enabled by `strict: true`) enforces this:

```typescript
try {
  await api.createUser(data);
} catch (error: unknown) {
  // Must narrow before accessing properties
  if (error instanceof Error) {
    console.error("Create user failed:", error.message);
    throw error;
  }
  // Handle non-Error throws (strings, objects, etc.)
  throw new Error(`Unexpected error: ${String(error)}`);
}
```

### Add Context When Re-Throwing

```typescript
// ❌ Wrong — re-throw without context
try {
  await sendEmail(user.email, template);
} catch (error: unknown) {
  throw error; // caller doesn't know what operation failed
}

// ✅ Correct — wrap with context
try {
  await sendEmail(user.email, template);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to send welcome email to ${user.email}: ${message}`);
}
```

### Never Catch and Ignore

```typescript
// ❌ Wrong — swallowing errors
try {
  await criticalOperation();
} catch {
  // silently ignored — bugs will be invisible
}

// ✅ Acceptable — intentional ignore with comment
try {
  await optionalCleanup();
} catch {
  // Cleanup failure is non-critical, operation already succeeded
}
```

## Async Error Patterns

### Promise Error Handling

```typescript
// ✅ Correct — async/await with try-catch
async function fetchUserProfile(id: string): Promise<UserProfile> {
  try {
    const user = await api.getUser(id);
    const preferences = await api.getPreferences(id);
    return { ...user, preferences };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      throw new UserNotFoundError(id);
    }
    throw error;
  }
}
```

### Parallel Async with Error Handling

```typescript
// Fail-fast — first rejection stops everything
async function loadDashboard(userId: string): Promise<Dashboard> {
  const [appointments, messages, stats] = await Promise.all([
    fetchAppointments(userId),
    fetchMessages(userId),
    fetchStats(userId),
  ]);
  return { appointments, messages, stats };
}

// Settle — collect all results, handle individually
async function sendNotifications(users: User[]): Promise<void> {
  const results = await Promise.allSettled(
    users.map((user) => sendNotification(user)),
  );

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );

  if (failures.length > 0) {
    console.error(`${failures.length} notifications failed`);
  }
}
```

### Retry with Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt === maxAttempts) {
        throw error;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // TypeScript needs this — the loop always returns or throws
  throw new Error("Unreachable");
}

// Usage
const user = await withRetry(() => api.getUser(id), 3, 500);
```

### Fallback Values

```typescript
async function getUserAvatar(userId: string): Promise<string> {
  try {
    const profile = await api.getProfile(userId);
    return profile.avatarUrl;
  } catch {
    return "/images/default-avatar.png";
  }
}
```

## Anti-Patterns

### `catch (e: any)`

```typescript
// ❌ Wrong — any in catch
try { /* ... */ } catch (e: any) {
  console.log(e.message); // unsafe — e might not have message
}

// ✅ Correct — unknown with narrowing
try { /* ... */ } catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error(message);
}
```

### Exceptions for Control Flow

```typescript
// ❌ Wrong — using exceptions for expected conditions
function findUser(users: User[], id: string): User {
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("Not found");
  return user;
}

// ✅ Correct — return undefined for expected "not found"
function findUser(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id);
}
```

### Inconsistent Error Types

```typescript
// ❌ Wrong — mixing error representations
function validate(data: unknown): string | Error | null | false {
  // ... which value means success? which means failure?
}

// ✅ Correct — single consistent pattern
function validate(data: unknown): Result<ValidData, ValidationError[]> {
  // clear: ok: true means valid, ok: false means invalid with errors
}
```

### Wrapping Every Function in Try-Catch

```typescript
// ❌ Wrong — try-catch everywhere adds noise
function add(a: number, b: number): number {
  try {
    return a + b;
  } catch (error: unknown) {
    throw new Error("Addition failed");
  }
}

// ✅ Correct — only catch at boundaries where you can handle it
// Pure functions don't need try-catch
function add(a: number, b: number): number {
  return a + b;
}
```
