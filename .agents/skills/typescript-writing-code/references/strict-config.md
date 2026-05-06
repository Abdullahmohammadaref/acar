# Strict TypeScript Configuration

## This Project's tsconfig.base.json

All apps (`patient/`, `doctor/`, `console/`, `components/web/`) extend this base configuration:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true
  }
}
```

## Flag Reference

### `strict: true`

Enables all strict mode family options as a group:
- `strictNullChecks` — `null` and `undefined` are not assignable to other types
- `strictFunctionTypes` — Contravariant function parameter checking
- `strictBindCallApply` — Correct types for `bind`, `call`, `apply`
- `strictPropertyInitialization` — Class properties must be initialized
- `noImplicitThis` — Error on `this` with implicit `any` type
- `alwaysStrict` — Emit `"use strict"` in every file
- `useUnknownInCatchVariables` — Catch variables typed as `unknown`

### `noImplicitAny: true`

Every variable, parameter, and return type must have an explicit or inferable type. When TypeScript cannot infer a type, you must annotate it.

```typescript
// ❌ Error — parameter has implicit any
function greet(name) {
  return `Hello, ${name}`;
}

// ✅ Correct — explicit type
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

### `strictNullChecks: true`

`null` and `undefined` are distinct types that must be handled explicitly. Without this flag, `null` is assignable to any type — extremely dangerous.

```typescript
function getUser(id: string): User | null {
  // ...
}

const user = getUser("123");
// user.name — Error: Object is possibly 'null'
if (user) {
  user.name; // safe
}
```

### `noUncheckedIndexedAccess: true`

Array indexing and record access returns `T | undefined`, forcing you to handle the possibly-missing case.

```typescript
const items: string[] = ["a", "b"];
const first = items[0]; // string | undefined

// Must narrow before use
if (first !== undefined) {
  console.log(first.toUpperCase());
}

// Object indexing
const config: Record<string, string> = {};
const value = config["key"]; // string | undefined
```

### `noUnusedLocals: true` and `noUnusedParameters: true`

Dead code is a compile error. Remove unused variables and parameters.

```typescript
// ❌ Error — unused variable
const unused = 42;

// ✅ Prefix with underscore ONLY for intentionally unused parameters
function handler(_event: Event, data: string): void {
  console.log(data);
}
```

### `noImplicitReturns: true`

Every code path must explicitly return a value. Prevents accidentally falling through without returning.

```typescript
// ❌ Error — not all paths return
function getLabel(status: string): string {
  if (status === "active") {
    return "Active";
  }
  // missing return for other cases
}

// ✅ Correct
function getLabel(status: string): string {
  if (status === "active") {
    return "Active";
  }
  return "Unknown";
}
```

### `isolatedModules: true`

Required for Vite and esbuild, which transpile files individually. Prevents TypeScript features that require whole-program analysis:
- No `const enum` (use regular `enum` or union types)
- No re-exporting types without `export type`
- Every file must be a module (have at least one import or export)

### `moduleResolution: "bundler"`

Uses the modern bundler resolution algorithm. Supports `package.json` `exports` field, `import` conditions, and extensionless imports. This is the correct setting for Vite projects.

## Zero `any` Tolerance

### Replacing `any` with `unknown`

`unknown` is the type-safe counterpart to `any`. It accepts any value but requires narrowing before use.

```typescript
// ❌ Wrong — any bypasses all type checking
function processData(data: any): string {
  return data.name.toUpperCase(); // no error, but may crash at runtime
}

// ✅ Correct — unknown requires narrowing
function processData(data: unknown): string {
  if (typeof data === "object" && data !== null && "name" in data) {
    const { name } = data as { name: unknown };
    if (typeof name === "string") {
      return name.toUpperCase();
    }
  }
  throw new Error("Invalid data: missing name field");
}
```

### Common `any` Replacement Patterns

```typescript
// Event handlers — use the specific event type
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

// JSON parsing — parse into unknown, then validate
const parsed: unknown = JSON.parse(rawJson);

// Third-party libraries with poor types — create a typed wrapper
declare module "untyped-lib" {
  export function doThing(input: string): number;
}

// Generic containers — use generics instead of any
function first<T>(items: T[]): T | undefined {
  return items[0];
}
```

## Anti-Patterns

### `@ts-ignore`

Never use `@ts-ignore`. If you must suppress an error, use `@ts-expect-error` with a justification:

```typescript
// ❌ Wrong — silently ignores any error
// @ts-ignore
const value = something.broken;

// ✅ Acceptable (rare) — documents why suppression is needed
// @ts-expect-error — library types don't account for v2 API changes
const value = something.newMethod();
```

### Disabling Strict Flags

Never add `"strict": false` or override individual strict flags to `false` in app-level tsconfig files. The base config is the minimum.

### `any` to Silence Errors

If you're adding `any` to make an error go away, you're hiding a bug. Fix the underlying type issue instead.

```typescript
// ❌ Wrong — casting through any
const user = response as any as User;

// ✅ Correct — proper type guard or schema validation
const user = parseUser(response); // throws if invalid
```

### Overly Broad Types

```typescript
// ❌ Too broad
function process(data: object): void { /* ... */ }
function process(data: Record<string, unknown>): void { /* ... */ }

// ✅ Specific
function process(data: UserFormData): void { /* ... */ }
```
