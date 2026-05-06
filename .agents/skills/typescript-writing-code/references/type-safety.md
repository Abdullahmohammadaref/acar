# Type Safety Patterns

## Type Guards

### `typeof` Guards

Built-in narrowing for primitive types:

```typescript
function format(value: string | number | boolean): string {
  if (typeof value === "string") return value.toUpperCase();
  if (typeof value === "number") return value.toFixed(2);
  return value ? "yes" : "no";
}
```

### `instanceof` Guards

Narrowing for class instances:

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}
```

### Custom Type Guards (`is` Predicates)

Define reusable type guards that return `value is Type`:

```typescript
interface User {
  id: string;
  email: string;
  name: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as Record<string, unknown>).id === "string" &&
    "email" in value &&
    typeof (value as Record<string, unknown>).email === "string" &&
    "name" in value &&
    typeof (value as Record<string, unknown>).name === "string"
  );
}

// Usage
function processResponse(data: unknown): User {
  if (!isUser(data)) {
    throw new Error("Invalid user data");
  }
  return data; // narrowed to User
}
```

### Assertion Functions

Functions that throw on invalid input and narrow the type:

```typescript
function assertDefined<T>(
  value: T | null | undefined,
  name: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${name} to be defined`);
  }
}

// Usage
const user = getUser(id); // User | null
assertDefined(user, "user");
user.name; // narrowed to User
```

## Discriminated Unions

### Tagged Unions

Every member has a common literal-type field (the "discriminant"):

```typescript
type LoadingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User[] }
  | { status: "error"; error: string };

function renderState(state: LoadingState): string {
  switch (state.status) {
    case "idle":
      return "Ready";
    case "loading":
      return "Loading...";
    case "success":
      return `${state.data.length} users`; // data is available
    case "error":
      return `Error: ${state.error}`; // error is available
  }
}
```

### Exhaustive Switch with `never`

Ensure all union members are handled at compile time:

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default: {
      // If a new shape is added but not handled here,
      // this line will cause a compile error
      const _exhaustive: never = shape;
      throw new Error(`Unhandled shape: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
```

### Helper for Exhaustive Checks

```typescript
function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}

// Usage in switch
default:
  return assertNever(shape, `Unhandled shape kind`);
```

## Branded Types

### Nominal Typing with Brands

TypeScript uses structural typing, but sometimes you need nominal distinctions:

```typescript
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };
type Email = string & { readonly __brand: "Email" };

// Constructor functions that validate
function createUserId(id: string): UserId {
  if (!id.startsWith("usr_")) {
    throw new Error("User ID must start with usr_");
  }
  return id as UserId;
}

function createEmail(email: string): Email {
  if (!email.includes("@")) {
    throw new Error("Invalid email format");
  }
  return email as Email;
}

// Functions accept only the correct branded type
function getUser(id: UserId): Promise<User> { /* ... */ }
function sendEmail(to: Email, subject: string): Promise<void> { /* ... */ }

// Compile-time safety
const userId = createUserId("usr_123");
const orderId = "ord_456" as OrderId;

getUser(userId);   // OK
getUser(orderId);  // Compile error — OrderId is not assignable to UserId
```

## Generics

### Basic Constraints

```typescript
// Constrain generic to types with an id property
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

// Multiple constraints using intersection
function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}
```

### Generic Defaults

```typescript
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  timestamp: string;
}

// Can use with or without explicit type
const response: ApiResponse<User[]> = fetchUsers();
const genericResponse: ApiResponse = fetchUnknown(); // T defaults to unknown
```

### Conditional Types

```typescript
// Extract the resolved type from a Promise
type Awaited<T> = T extends Promise<infer U> ? U : T;

// Make certain keys optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Usage
type CreateUserInput = PartialBy<User, "id" | "createdAt">;
```

## Utility Types

### Standard Library Utilities

```typescript
// Partial — all properties optional
type UpdateUserInput = Partial<User>;

// Required — all properties required
type CompleteProfile = Required<UserProfile>;

// Pick — select specific properties
type UserPreview = Pick<User, "id" | "name" | "avatar">;

// Omit — exclude specific properties
type CreateUserInput = Omit<User, "id" | "createdAt">;

// Record — typed key-value map
type RolePermissions = Record<UserRole, Permission[]>;

// Extract/Exclude — filter union members
type SuccessStates = Extract<LoadingState, { status: "success" | "idle" }>;
type ErrorStates = Exclude<LoadingState, { status: "success" }>;

// NonNullable — remove null and undefined
type DefiniteUser = NonNullable<User | null | undefined>; // User

// ReturnType — extract function return type
type FetchResult = ReturnType<typeof fetchUser>; // Promise<User>

// Parameters — extract function parameter types
type FetchParams = Parameters<typeof fetchUser>; // [id: string]
```

### Custom Utility Types

```typescript
// Make specific keys required, rest unchanged
type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Nullable
type Nullable<T> = T | null;
```

## Anti-Patterns

### Type Assertions as Escape Hatches

```typescript
// ❌ Wrong — double assertion to force incompatible types
const user = response as unknown as User;

// ❌ Wrong — non-null assertion without checking
const name = user!.name;

// ✅ Correct — validate and narrow
if (!isUser(response)) {
  throw new Error("Invalid response");
}
const user = response; // properly narrowed
```

### Over-Generic Code

```typescript
// ❌ Wrong — unnecessary generic, just use the concrete type
function getName<T extends { name: string }>(obj: T): string {
  return obj.name;
}

// ✅ Correct — simple interface parameter
function getName(obj: { name: string }): string {
  return obj.name;
}
```

### Misusing `as const` with Mutable Operations

```typescript
// ❌ Wrong — as const makes it readonly, then you try to mutate
const items = ["a", "b", "c"] as const;
items.push("d"); // Error: Property 'push' does not exist on type 'readonly ["a", "b", "c"]'

// ✅ Correct — use as const for truly immutable data
const ROLES = ["admin", "doctor", "patient"] as const;
type Role = (typeof ROLES)[number]; // "admin" | "doctor" | "patient"
```

### Index Signatures Instead of Explicit Keys

```typescript
// ❌ Wrong — too loose, allows any string key
interface Config {
  [key: string]: string;
}

// ✅ Correct — explicit keys
interface Config {
  apiUrl: string;
  appName: string;
  environment: "development" | "staging" | "production";
}
```
