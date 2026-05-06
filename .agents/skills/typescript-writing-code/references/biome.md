# Biome (Linter & Formatter)

## This Project's biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.11/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "includes": [
      "**/*.ts",
      "**/*.tsx",
      "*.config.ts",
      "*.config.mts",
      "!**/chad-cn/**"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useParseIntRadix": "error"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "useExportType": "error",
        "useImportType": "error"
      },
      "suspicious": {
        "noExplicitAny": "error"
      },
      "a11y": {
        "recommended": true
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  }
}
```

## Key Rules Reference

### `noExplicitAny: "error"` (suspicious)

Cannot use `any` type anywhere. Use `unknown` with narrowing instead.

```typescript
// ❌ Biome error
function parse(data: any): User { /* ... */ }

// ✅ Correct
function parse(data: unknown): User { /* ... */ }
```

### `noUnusedVariables: "error"` (correctness)

All declared variables must be used. Remove unused ones.

```typescript
// ❌ Biome error
const unused = 42;

// ✅ Prefix unused parameters with underscore
function handler(_event: Event, data: string): void {
  console.log(data);
}
```

### `noUnusedImports: "error"` (correctness)

All imports must be referenced. Biome auto-removes unused imports with `--write`.

### `useConst: "error"` (style)

Use `const` for variables that are never reassigned:

```typescript
// ❌ Biome error
let name = "Alice"; // never reassigned

// ✅ Correct
const name = "Alice";
```

### `useImportType: "error"` (style)

Use `import type` for type-only imports:

```typescript
// ❌ Biome error
import { User } from "./types"; // User is only used as a type

// ✅ Correct
import type { User } from "./types";

// ✅ Mixed — inline type keyword
import { fetchUser, type User } from "./api";
```

### `useExportType: "error"` (style)

Use `export type` for type-only exports:

```typescript
// ❌ Biome error
export { UserProps }; // UserProps is a type

// ✅ Correct
export type { UserProps };
```

### `noNonNullAssertion: "warn"` (style)

Avoid the `!` postfix operator. Use proper null checks instead:

```typescript
// ⚠️ Warning
const name = user!.name;

// ✅ Correct
if (user) {
  const name = user.name;
}
```

### `useParseIntRadix: "error"` (correctness)

Always provide the radix to `parseInt`:

```typescript
// ❌ Biome error
const num = parseInt(value);

// ✅ Correct
const num = parseInt(value, 10);
// Better: use Number() when you don't need parseInt specifically
const num = Number(value);
```

### `a11y: recommended` (accessibility)

Enforces accessibility best practices in JSX:
- `useButtonType` — `<button>` must have an explicit `type` attribute
- `useAltText` — `<img>` must have `alt` text
- `noBlankTarget` — `target="_blank"` must have `rel="noopener noreferrer"`
- And many more from the recommended set

## Formatter Settings

| Setting | Value | Notes |
|---|---|---|
| `indentStyle` | `"space"` | Spaces, not tabs |
| `indentWidth` | `2` | 2 spaces per indent level |
| `lineWidth` | `100` | Max 100 characters per line |
| `quoteStyle` | `"double"` | Double quotes for strings |
| `semicolons` | `"always"` | Semicolons at end of statements |
| `trailingCommas` | `"all"` | Trailing commas in arrays, objects, parameters |

### Import Organization

Biome automatically organizes imports (`organizeImports: "on"`):
1. Built-in Node.js modules (`node:path`)
2. External packages (`react`, `zustand`)
3. Internal packages (`@drzum/ui`)
4. Relative imports (`./components`)

## CLI Commands

### Check (Lint + Format Check)

```bash
# Check all files
biome check .

# Check specific directory
biome check src/

# Check a single file
biome check src/components/Button.tsx
```

### Fix (Lint Fix + Format)

```bash
# Auto-fix all fixable issues and format
biome check --write .

# Per-app via pnpm
pnpm --filter patient lint:fix
```

### CI Mode

```bash
# Strict check — exits with non-zero on any issue
biome ci .
```

### Format Only

```bash
# Format all files
biome format --write .

# Per-app via pnpm
pnpm --filter patient format
```

## VS Code Integration

Install the [Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome). It provides:
- Format on save
- Inline lint diagnostics
- Quick-fix suggestions
- Import organization on save

Recommended VS Code settings:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

## Critical Rule: No `biome-ignore` Comments

**Never add `biome-ignore` comments.** This is a hard project rule. Instead of suppressing a warning or error, fix the underlying code issue.

```typescript
// ❌ NEVER do this
// biome-ignore lint/suspicious/noExplicitAny: needed for external API
function handle(data: any) { /* ... */ }

// ✅ Fix the actual issue
function handle(data: unknown) { /* ... */ }
```

If Biome flags something and you believe it's a false positive, investigate the rule's documentation. In every case we've encountered, the rule is correct and the code should change.

## Common Fix Patterns

### Fix: `noExplicitAny`

Replace `any` with `unknown` and add type narrowing, or use a specific type.

### Fix: `useImportType`

Change `import { Foo }` to `import type { Foo }` when `Foo` is only used in type positions.

### Fix: `useConst`

Change `let` to `const` when the variable is never reassigned.

### Fix: `noUnusedImports`

Remove the import, or use it. Biome `--write` handles this automatically.

### Fix: `noNonNullAssertion`

Replace `foo!.bar` with a null check: `if (foo) { foo.bar }` or use optional chaining `foo?.bar`.
