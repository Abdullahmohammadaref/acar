# Post-Change Verification Protocol

## The 4 Steps (MANDATORY)

Every TypeScript code change must pass all 4 steps before it is considered complete. No exceptions.

```bash
# Step 1: Type-check
pnpm run type-check
# or per-app: pnpm --filter patient type-check

# Step 2: Lint
pnpm run lint
# or per-app: pnpm --filter patient lint

# Step 3: Format
pnpm run format
# or per-app: pnpm --filter patient format

# Step 4: Test
pnpm run test
# or per-app: pnpm --filter patient test
```

## Why This Order

1. **Type-check first** — Catches type errors before linting. No point linting code that won't compile.
2. **Lint second** — Catches code quality issues (unused vars, missing type imports, `any` usage).
3. **Format third** — Ensures consistent style. Formatting changes shouldn't cause test diffs.
4. **Test last** — Validates behavior after all code quality checks pass.

## One-Command Verification

Each app has a `validate` script that runs type-check, lint, and test in sequence:

```bash
# Run all checks for a specific app
pnpm --filter patient validate

# Run all checks across the monorepo
pnpm run validate
```

The `validate` script runs: `pnpm run type-check && pnpm run lint && pnpm run test`

Note: `validate` doesn't include `format` separately because `lint` (via `biome check`) covers formatting issues. Run `format` if you need to auto-fix formatting.

## Zero Tolerance Policy

- **All steps must pass** — A type error is a failure. A lint error is a failure. A test failure is a failure.
- **Fix immediately** — Don't defer issues to "clean up later." Fix them now.
- **Never suppress to pass** — No `@ts-ignore`, no `biome-ignore`, no `any` casts to silence errors.
- **No skipped tests** — `it.skip()` and `describe.skip()` are acceptable only temporarily during development. Never commit skipped tests.

## Troubleshooting

### Type-Check Failures

```bash
# Run type-check with verbose output
pnpm --filter patient type-check

# Check a specific file
npx tsc --noEmit --pretty src/components/Button.tsx
```

Common type errors:
- **TS2345: Argument not assignable** — Check the expected type vs what you're passing.
- **TS2532: Object possibly undefined** — Add a null check or use optional chaining.
- **TS7006: Parameter implicitly has 'any'** — Add a type annotation.
- **TS2307: Cannot find module** — Check path alias config in tsconfig and vitest.config.

### Lint Failures

```bash
# See all lint issues
pnpm --filter patient lint

# Auto-fix what's fixable
pnpm --filter patient lint:fix
```

Common lint fixes:
- **noUnusedImports** — Remove the import or use it. `biome check --write .` auto-removes.
- **useImportType** — Change `import { Foo }` to `import type { Foo }`.
- **useConst** — Change `let` to `const`.
- **noExplicitAny** — Replace `any` with a proper type.

### Format Failures

```bash
# Auto-format all files
pnpm --filter patient format

# Check without modifying
biome format --check .
```

### Test Failures

```bash
# Run a specific test file
pnpm --filter patient test -- src/components/__tests__/Button.test.tsx

# Run tests matching a pattern
pnpm --filter patient test -- --reporter=verbose -t "renders"

# Run with watch mode for iterating
pnpm --filter patient test:watch
```

Common test failures:
- **Module not found** — Check path aliases in vitest.config.ts match tsconfig paths.
- **ReferenceError: document is not defined** — Ensure `environment: "jsdom"` in vitest config.
- **Act warnings** — Wrap state updates in `act()` or use `findBy*` queries that wait.
