---
name: tailwind-css
description: >-
  This skill should be used when writing, reviewing, or modifying Tailwind CSS
  styles. It covers Tailwind v4 CSS-first configuration, utility-first patterns,
  the cn() utility with tailwind-merge, responsive design, dark mode, and common
  UI patterns for cards, buttons, forms, and layouts.
---

# Tailwind CSS

Quick reference for writing utility-first CSS with Tailwind v4. Each section summarizes the key rules — reference files provide full examples and edge cases.

## Utility-First Approach

Write styles directly in markup using utility classes. Extract components, not CSS.

### When to Inline

- **Always** — Utility classes go directly on elements. This is the default.
- Component reuse handles repetition — not CSS extraction.

### When to Extract

- **Base layer resets** — `body`, `h1`–`h6`, `a` defaults in `@layer base`.
- **Truly repeated patterns** — Only when the same utility combination appears 5+ times across unrelated components AND cannot be solved with a React component.

```tsx
// ✅ Correct — utilities in markup
<button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
  Save
</button>

// ✅ Correct — React component for reuse, not CSS
function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button className={cn("inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground", className)} {...props}>
      {children}
    </button>
  );
}
```

## Configuration (Tailwind v4)

Tailwind v4 uses CSS-first configuration. No `tailwind.config.js` — everything in CSS.

### Design Tokens with `@theme`

```css
@import "tailwindcss";

@theme {
  --color-primary: #16a34a;
  --color-primary-foreground: #ffffff;
  --color-background: #ffffff;
  --color-foreground: #09090b;
  --color-border: #e4e4e7;
  --color-muted-foreground: #71717a;
  --radius-md: 0.375rem;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

### Source Detection

```css
@source "../components/**/*.tsx";
```

### Vite Integration

```typescript
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
});
```

No PostCSS needed with the Vite plugin.

See [references/configuration.md](./references/configuration.md) for dark mode setup, custom utilities, custom variants, and plugin integration.

## Common Patterns

### Layout

```tsx
{/* Container */}
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>

{/* Center content */}
<div className="grid min-h-screen place-items-center">{children}</div>

{/* Sidebar layout */}
<div className="flex min-h-screen">
  <aside className="hidden w-64 shrink-0 border-r border-border lg:block">{nav}</aside>
  <main className="flex-1 p-6">{content}</main>
</div>
```

### Card

```tsx
<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
  <h3 className="text-lg font-semibold">{title}</h3>
  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
</div>
```

### Form Input

```tsx
<input
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
/>
```

Focus states: `border-primary` with `ring-primary/30` glow. Error states: `border-destructive` with `ring-destructive/30`.

See [references/patterns.md](./references/patterns.md) for buttons, grids, badges, typography, animations, and loading states.

## cn() Utility

Combine `clsx` (conditional classes) + `tailwind-merge` (conflict resolution):

```typescript
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### Key Rules

1. **`className` always last** — So consumer overrides win: `cn("bg-primary", className)`
2. **Use for dynamic classes only** — Static strings don't need `cn()`
3. **Pair with cva** — Use `class-variance-authority` for multi-variant components

```tsx
// Conditional classes
<div className={cn(
  "rounded-lg border p-4",
  isSelected ? "border-primary bg-primary/5" : "border-border",
  isDisabled && "pointer-events-none opacity-50"
)} />

// Component with className prop
function Card({ className, ...props }: CardProps) {
  return <div className={cn("rounded-lg border border-border p-6", className)} {...props} />;
}
```

### cva for Variants

```typescript
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-secondary",
        ghost: "hover:bg-secondary",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

See [references/cn-utility.md](./references/cn-utility.md) for compound variants, anti-patterns, and advanced cva usage.

## Responsive Design

Mobile-first breakpoints — base styles apply to all screens, breakpoints add larger-screen overrides.

### Breakpoints

| Prefix | Min Width | Target |
|---|---|---|
| (none) | 0px | Mobile (base) |
| `sm:` | 640px | Large phones / small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

### Pattern

```tsx
{/* 1 column mobile → 2 columns tablet → 3 columns desktop */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id} />)}
</div>

{/* Hide on mobile, show on desktop */}
<nav className="hidden lg:block">{desktopNav}</nav>

{/* Different padding per breakpoint */}
<div className="p-4 sm:p-6 lg:p-8">{content}</div>
```

### Rules

- **Start mobile** — Write base styles for the smallest screen first
- **Add up** — Use `sm:`, `md:`, `lg:` to progressively enhance
- **Never use `max-*` breakpoints** — Mobile-first means min-width only
- **Test on real devices** — Responsive classes don't account for touch targets, font rendering, or viewport quirks

## Dark Mode

Class-based toggle using the `dark` variant.

### Setup

```css
@variant dark (&:where(.dark, .dark *));

@theme {
  --color-background: #ffffff;
  --color-foreground: #09090b;
}

.dark {
  --color-background: #09090b;
  --color-foreground: #fafafa;
}
```

### Usage

```tsx
{/* Automatic via CSS variables */}
<div className="bg-background text-foreground">
  Uses token colors — automatically adapts to dark mode
</div>

{/* Manual dark: override when needed */}
<div className="bg-white dark:bg-zinc-900">
  Explicit dark mode override
</div>
```

**Prefer CSS variable tokens** (`bg-background`, `text-foreground`) over manual `dark:` overrides. If your design tokens are set up correctly, most components need zero dark mode classes.

## Reference Files

| File | Description |
|---|---|
| [references/configuration.md](./references/configuration.md) | Tailwind v4 setup, @theme tokens, dark mode, plugins, Vite integration |
| [references/patterns.md](./references/patterns.md) | Container, grid, flex, card, button, form, badge, animation patterns |
| [references/cn-utility.md](./references/cn-utility.md) | clsx + tailwind-merge, cn() setup, cva variants, conditional classes |
