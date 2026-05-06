# ESM Module Patterns

## ESM Fundamentals

### `"type": "module"` in package.json

All packages in this monorepo set `"type": "module"`, meaning:
- `.js` and `.ts` files are treated as ES modules by default
- `import`/`export` syntax is required (no `require()`)
- `__dirname` and `__filename` are not available (use `import.meta.url`)
- Top-level `await` is supported

```json
{
  "name": "patient",
  "type": "module"
}
```

### Module Resolution

The project uses `"moduleResolution": "bundler"` in tsconfig, which:
- Supports `package.json` `exports` field
- Allows extensionless imports (Vite resolves `.ts`, `.tsx` automatically)
- Supports `import` conditions for conditional exports
- Matches Vite's resolution behavior

## Import/Export Rules

### Named Exports (Preferred)

Named exports are the default. They enable tree-shaking and make refactoring safer:

```typescript
// ✅ Named export
export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-MX");
}

export const MAX_RETRIES = 3;

// ✅ Named import
import { formatDate, MAX_RETRIES } from "./utils";
```

### Default Exports (Avoid in Library Code)

Default exports are acceptable for React component files and route modules (required by React Router). Avoid them in library/utility code:

```typescript
// ✅ Acceptable — React component as default export
export default function SignInPage() {
  return <div>Sign In</div>;
}

// ❌ Avoid — default export in utility code
export default function formatDate(date: Date): string { /* ... */ }
```

### `import type` (Required by Biome)

Use `import type` for type-only imports. Biome enforces `useImportType` and `useExportType`:

```typescript
// ✅ Correct — type-only import
import type { User, UserRole } from "@/types";
import type { ReactNode, FC } from "react";

// ✅ Mixed import — inline type keyword
import { useState, type Dispatch, type SetStateAction } from "react";

// ❌ Wrong — Biome error
import { User, UserRole } from "@/types"; // types imported as values
```

### `export type` (Required by Biome)

```typescript
// ✅ Correct
export type { UserFormData, LoginCredentials };
export type UserRole = "admin" | "doctor" | "patient";

// ❌ Wrong — Biome error
export { UserFormData, LoginCredentials }; // types exported as values
```

### Re-exports

```typescript
// ✅ Named re-export
export { Button } from "./Button";
export type { ButtonProps } from "./Button";

// ✅ Namespace re-export (use sparingly)
export * as validators from "./validators";

// ❌ Avoid — wildcard re-export (breaks tree-shaking, hides the API)
export * from "./Button";
```

## `node:` Prefix for Built-ins

Always use the `node:` prefix for Node.js built-in modules. It makes imports unambiguous and prevents conflicts with npm packages:

```typescript
// ✅ Correct
import path from "node:path";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// ❌ Wrong — could conflict with npm packages
import path from "path";
import { readFile } from "fs/promises";
```

## Barrel Files

### When to Use

Use barrel files (`index.ts`) to create clean public APIs for packages and feature directories:

```typescript
// components/atoms/index.ts — good, clean public API
export { Button } from "./Button";
export { Input } from "./Input";
export { Label } from "./Label";
export type { ButtonProps, InputProps, LabelProps } from "./types";
```

### Rules

- **Keep barrel files thin** — Only re-exports, no logic.
- **One level deep** — Don't create barrels that re-export from other barrels (barrel chains).
- **Don't barrel everything** — Internal modules used within a feature don't need a barrel.

### Tree-Shaking Implications

Barrel files can inhibit tree-shaking if they import modules with side effects. Keep exports pure:

```typescript
// ❌ Bad — side-effect import in barrel
import "./global-styles.css";
export { Button } from "./Button";

// ✅ Good — only pure re-exports
export { Button } from "./Button";
```

## Dynamic Imports

### Code Splitting with React.lazy

```typescript
import { lazy, Suspense } from "react";

// Route-level code splitting
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/dashboard" element={<DoctorDashboard />} />
      </Routes>
    </Suspense>
  );
}
```

### Heavy Module Loading

```typescript
// Load heavy library only when needed
async function generatePDF(data: ReportData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  // ...
  return doc.output("blob");
}
```

## Build Output

### Vite for Apps

The patient, doctor, and console apps use Vite for development and production builds:

```bash
# Development
pnpm --filter patient dev      # Vite dev server with HMR

# Production build
pnpm --filter patient build    # tsc && vite build
```

Vite output goes to `dist/` with:
- Code splitting by route (dynamic imports)
- CSS extraction and minification
- Asset hashing for cache busting

### Path Aliases

All apps use `@/` as a path alias to `./src/`:

```typescript
// ✅ Using path alias
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types";

// Must be configured in both tsconfig.json and vitest.config.ts
```

## Anti-Patterns

### CommonJS in ESM

```typescript
// ❌ Wrong — CommonJS syntax in ESM project
const path = require("path");
module.exports = { formatDate };

// ✅ Correct — ESM syntax
import path from "node:path";
export { formatDate };
```

### Circular Dependencies

Circular imports cause `undefined` at runtime and are hard to debug:

```typescript
// ❌ Circular — a.ts imports b.ts, b.ts imports a.ts
// a.ts
import { B } from "./b"; // B may be undefined!
export class A { b = new B(); }

// b.ts
import { A } from "./a"; // A may be undefined!
export class B { a = new A(); }
```

Fix by extracting shared types to a third module, or restructuring the dependency graph.

### Wildcard Re-exports from Barrels

```typescript
// ❌ Wrong — hides the public API, can export unintended symbols
export * from "./internal-module";

// ✅ Correct — explicit public API
export { PublicThing } from "./internal-module";
export type { PublicType } from "./internal-module";
```

### `import.meta.url` Misuse

```typescript
// ❌ Wrong — __dirname is not available in ESM
const dir = __dirname;

// ✅ Correct — use import.meta
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```
