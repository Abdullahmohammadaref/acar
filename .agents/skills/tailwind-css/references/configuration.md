# Tailwind CSS Configuration

## Tailwind v4 Setup

Tailwind CSS v4 uses a CSS-first configuration approach. No more `tailwind.config.js` — everything goes in CSS.

### Entry Point

```css
/* app.css */
@import "tailwindcss";
```

That single import brings in all of Tailwind's layers: base, components, and utilities.

### Source Detection

Tailwind v4 auto-detects source files from your project. To customize:

```css
@import "tailwindcss";
@source "../components/**/*.tsx";
@source "../shared/**/*.tsx";
```

### CSS Variables as Design Tokens

Define your design system with CSS custom properties using `@theme`:

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary: #16a34a;
  --color-primary-foreground: #ffffff;
  --color-secondary: #f4f4f5;
  --color-secondary-foreground: #18181b;
  --color-destructive: #dc2626;
  --color-muted: #f4f4f5;
  --color-muted-foreground: #71717a;
  --color-border: #e4e4e7;
  --color-input: #e4e4e7;
  --color-ring: #16a34a;
  --color-background: #ffffff;
  --color-foreground: #09090b;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Font Family */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);

  /* Animations */
  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;
}

@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}
```

### Removing Default Theme Values

Use `--color-*: initial` or the `@theme` `inline` option to strip defaults you don't need:

```css
@theme inline {
  --color-*: initial; /* Remove all default colors */
  --color-primary: #16a34a;
  --color-background: #ffffff;
  /* ... only your colors */
}
```

## Dark Mode

### Class-Based Toggle

Tailwind v4 supports dark mode via the `dark` variant. Configure it with `@variant`:

```css
@variant dark (&:where(.dark, .dark *));
```

This activates dark mode when the `dark` class is on a parent element (usually `<html>`).

### Dark Mode Color Tokens

Define light and dark colors using CSS variables:

```css
@theme {
  --color-background: #ffffff;
  --color-foreground: #09090b;
}

.dark {
  --color-background: #09090b;
  --color-foreground: #fafafa;
}
```

### Toggle Implementation

```tsx
function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
```

### Persistence with System Preference Fallback

```html
<script>
  const theme = localStorage.getItem("theme");
  if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
</script>
```

Place this in `<head>` before any styles to prevent flash of unstyled content (FOUC).

## Plugins and Extensions

### Custom Utilities

Add custom utilities with `@utility`:

```css
@utility content-auto {
  content-visibility: auto;
}

@utility scrollbar-hidden {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### Custom Variants

```css
@variant pointer-coarse (@media (pointer: coarse));
@variant pointer-fine (@media (pointer: fine));
```

Usage: `pointer-coarse:p-4 pointer-fine:p-2` — larger padding on touch devices.

### Third-Party Plugin Integration

```css
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/container-queries";
```

## Vite Integration

```typescript
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
});
```

No PostCSS configuration needed with the Vite plugin — Tailwind processes CSS directly.

## Anti-Patterns

### Don't Use `@apply` for Simple Utilities

```css
/* ❌ Wrong — defeats the purpose of utility-first */
.btn {
  @apply px-4 py-2 bg-primary text-primary-foreground rounded-md;
}

/* ✅ Correct — use @apply only for truly repeated patterns like base resets */
@layer base {
  body {
    @apply bg-background text-foreground;
  }
}
```

### Don't Override Theme Values Inline

```css
/* ❌ Wrong — use @theme instead */
.custom {
  color: #16a34a;
}

/* ✅ Correct — reference the token */
.custom {
  color: var(--color-primary);
}
```

### Don't Create CSS Files for Components

In React projects, keep styles inline with utility classes. Don't create separate `.css` files per component — that's the CSS Modules pattern, not utility-first.
