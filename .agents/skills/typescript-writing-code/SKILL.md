---
name: typescript-writing-code
description: >-
  This skill should be used when writing, reviewing, or refactoring TypeScript
  code. It covers strict type configuration, type safety patterns, ESM module
  conventions, error handling, Biome linting/formatting, naming conventions,
  and mandatory post-change verification.
---

# TypeScript Writing Code

Quick reference for writing production-quality TypeScript code. Each section summarizes the key rules — reference files provide full examples and edge cases.

## Strict TypeScript Configuration

This project enforces maximum type safety through `tsconfig.base.json`. Zero `any` tolerance — no exceptions.

### Key Flags

- **`strict: true`** — Enables all strict type-checking options as a group.
- **`noImplicitAny: true`** — Every value must have an explicit or inferable type. No implicit `any`.
- **`strictNullChecks: true`** — `null` and `undefined` are distinct types. Must be handled explicitly.
- **`noUncheckedIndexedAccess: true`** — Array/object index access returns `T | undefined`. Always check before using.
- **`noUnusedLocals: true`** — Unused variables are compile errors, not warnings.
- **`noUnusedParameters: true`** — Unused function parameters are compile errors.
- **`noImplicitReturns: true`** — Every code path in a function must return a value.
- **`isolatedModules: true`** — Required for Vite/esbuild compatibility. Prevents features that need full-program analysis.

### Zero `any` Policy

```typescript
// ❌ Wrong — using `any`
function parse(data: any): User {
  return data as User;
}

// ✅ Correct — using `unknown` with narrowing
function parse(data: unknown): User {
  if (!isUser(data)) {
    throw new Error("Invalid user data");
  }
  return data;
}
```

### Safe Indexed Access

With `noUncheckedIndexedAccess`, array and record access returns `T | undefined`:

```typescript
const items = ["a", "b", "c"];
const first = items[0]; // string | undefined — must check

if (first !== undefined) {
  console.log(first.toUpperCase()); // safe
}

const map: Record<string, number> = { a: 1 };
const value = map["b"]; // number | undefined — must check
```

### Catch Blocks

Always type catch variables as `unknown`:

```typescript
try {
  await fetchData();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
  throw error;
}
```

See [references/strict-config.md](./references/strict-config.md) for the full tsconfig.base.json, flag explanations, and anti-patterns.

## Type Safety Patterns

Use TypeScript's type system to catch bugs at compile time, not runtime.

### Type Guards

```typescript
// typeof guard
function formatValue(value: string | number): string {
  if (typeof value === "string") {
    return value.toUpperCase();
  }
  return value.toFixed(2);
}

// Custom type guard with `is` predicate
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value
  );
}
```

### Discriminated Unions

Tag union members with a literal type field. Use exhaustive switch for safety:

```typescript
type Result<T> =
  | { kind: "success"; data: T }
  | { kind: "error"; error: string };

function handle<T>(result: Result<T>): void {
  switch (result.kind) {
    case "success":
      console.log(result.data);
      break;
    case "error":
      console.error(result.error);
      break;
    default: {
      const _exhaustive: never = result;
      throw new Error(`Unhandled case: ${_exhaustive}`);
    }
  }
}
```

### Branded Types

Use branded types for nominal typing when primitive types are too loose:

```typescript
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };

function createUserId(id: string): UserId {
  return id as UserId;
}

function getUser(id: UserId): User { /* ... */ }

// getUser(orderId) — compile error, even though both are strings
```

See [references/type-safety.md](./references/type-safety.md) for generics, utility types, assertion functions, and anti-patterns.

## ESM Module Patterns

This project uses ESM (`"type": "module"`) throughout. All packages set `"type": "module"` in `package.json`.

### Import Rules

- **Named exports preferred** — Default exports make refactoring harder and tree-shaking less predictable.
- **`import type` for types** — Biome enforces `useImportType` and `useExportType`. Type-only imports are erased at runtime.
- **`node:` prefix for built-ins** — Always use `node:path`, `node:fs`, `node:crypto`.

```typescript
// ✅ Correct
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import path from "node:path";

// ❌ Wrong — missing type keyword
import { ReactNode } from "react"; // Biome error: useImportType
```

### Barrel Files

Use barrel files (`index.ts`) for clean public APIs, but keep them thin:

```typescript
// components/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
export type { ButtonProps, InputProps } from "./types";
```

### Dynamic Imports

Use dynamic `import()` for code splitting in routes and heavy modules:

```typescript
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
```

See [references/esm-modules.md](./references/esm-modules.md) for build output, circular dependency detection, and package.json exports.

## Error Handling

Handle errors explicitly. Use result types for expected failures, exceptions for unexpected ones.

### Result Type Pattern

```typescript
type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

function createSuccess<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

function createError<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

### Discriminated Union Errors

```typescript
type ApiError =
  | { kind: "not_found"; resource: string }
  | { kind: "validation"; fields: Record<string, string> }
  | { kind: "unauthorized" };

function handleApiError(error: ApiError): string {
  switch (error.kind) {
    case "not_found":
      return `${error.resource} not found`;
    case "validation":
      return Object.values(error.fields).join(", ");
    case "unauthorized":
      return "Please sign in";
  }
}
```

### Try-Catch Rules

```typescript
// ✅ Correct — catch unknown, narrow, add context
try {
  await api.createUser(data);
} catch (error: unknown) {
  if (error instanceof ApiError) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
  throw error; // Re-throw unexpected errors
}

// ❌ Wrong — catch any, swallow error
try {
  await api.createUser(data);
} catch (e: any) {
  console.log(e.message); // unsafe access
}
```

See [references/error-handling.md](./references/error-handling.md) for async patterns, retry logic, and when to throw vs return errors.

## Biome (Linter & Formatter)

This project uses Biome (v2.3.11) for both linting and formatting. It replaces ESLint and Prettier entirely.

### Key Rules

| Rule | Level | Effect |
|---|---|---|
| `noExplicitAny` | error | Cannot use `any` type anywhere |
| `noUnusedVariables` | error | All variables must be used |
| `noUnusedImports` | error | All imports must be used |
| `useConst` | error | Use `const` when variable is never reassigned |
| `useImportType` | error | Use `import type` for type-only imports |
| `useExportType` | error | Use `export type` for type-only exports |
| `noNonNullAssertion` | warn | Avoid `!` postfix operator |
| `a11y` recommended | on | Accessibility rules for JSX |

### Formatter Settings

- Double quotes, semicolons always, trailing commas
- 2-space indent, 100-character line width
- Organize imports automatically

### Commands

```bash
# Check (lint + format check)
biome check .

# Fix (lint fix + format)
biome check --write .

# CI mode (fails on any issue)
biome ci .
```

### Critical Rule

**Never add `biome-ignore` comments.** Fix the underlying issue instead of suppressing it. This is a hard project rule — no exceptions.

See [references/biome.md](./references/biome.md) for the full `biome.json` config, VS Code integration, and common fix patterns.

## Naming Conventions & Code Quality

### Naming Rules

| Context | Convention | Example |
|---|---|---|
| Variables, functions | camelCase | `userName`, `fetchUser()` |
| Types, interfaces, classes | PascalCase | `UserProfile`, `AuthService` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Files | kebab-case | `user-profile.tsx`, `auth-service.ts` |
| Component files | PascalCase | `UserProfile.tsx`, `AuthGuard.tsx` |
| Test files | Match source | `UserProfile.test.tsx` |
| Enum members | PascalCase | `UserRole.Admin` |

### Code Quality Rules

- **Zero warnings policy** — Treat warnings as errors. Fix them, don't ignore them.
- **No `@ts-ignore`** — Use `@ts-expect-error` with a comment explaining why, only as a last resort.
- **No type assertions as escape hatches** — `as unknown as T` is a code smell. Refactor instead.
- **Prefer `const` assertions** — Use `as const` for literal types instead of explicit type annotations.
- **JSDoc for exports** — Document exported functions and types with JSDoc. Focus on the "why", not the "what".

```typescript
/**
 * Encrypts PII fields before database storage.
 * Uses AES-256-GCM with a per-record IV for uniqueness.
 */
export function encryptField(plaintext: string, key: Buffer): EncryptedField {
  // ...
}
```

## Post-Change Verification (MANDATORY)

After every TypeScript code change, run this 4-step verification. No exceptions.

### The 4 Steps

```bash
# 1. Type-check
pnpm run type-check
# or per-app: pnpm --filter patient type-check

# 2. Lint
pnpm run lint
# or per-app: pnpm --filter patient lint

# 3. Format
pnpm run format
# or per-app: pnpm --filter patient format

# 4. Test
pnpm run test
# or per-app: pnpm --filter patient test
```

### One-Command Verification

```bash
# Run all checks for a specific app
pnpm --filter patient validate
```

### Rules

- **All 4 steps must pass** before considering a change complete.
- **Fix issues immediately** — Don't defer lint warnings or type errors.
- **Never suppress to pass** — No `@ts-ignore`, no `biome-ignore`, no `any` casts.

See [references/post-change-protocol.md](./references/post-change-protocol.md) for the full verification workflow, common failures, and troubleshooting.

## Reference Files

| File | Description |
|---|---|
| [references/strict-config.md](./references/strict-config.md) | Full tsconfig.base.json, strict flags, zero-any patterns, anti-patterns |
| [references/type-safety.md](./references/type-safety.md) | Type guards, discriminated unions, branded types, generics, utility types |
| [references/esm-modules.md](./references/esm-modules.md) | ESM fundamentals, import/export rules, barrel files, build output |
| [references/error-handling.md](./references/error-handling.md) | Result types, discriminated union errors, async patterns, retry logic |
| [references/biome.md](./references/biome.md) | Full biome.json config, rules reference, VS Code integration |
| [references/post-change-protocol.md](./references/post-change-protocol.md) | 4-step verification workflow, troubleshooting, common failures |
