# cn() Utility

The `cn()` function combines `clsx` (conditional class building) with `tailwind-merge` (deduplication of Tailwind classes). It's the standard way to handle dynamic class names in Tailwind-based React projects.

## Setup

```bash
pnpm add clsx tailwind-merge
```

```typescript
// lib/utils.ts
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

## Why Both Libraries?

### `clsx` Handles Conditional Logic

```typescript
clsx("px-4 py-2", isActive && "bg-primary", disabled && "opacity-50");
// → "px-4 py-2 bg-primary" (when isActive=true, disabled=false)
```

### `tailwind-merge` Handles Conflicts

```typescript
twMerge("px-4 px-6");     // → "px-6" (last wins)
twMerge("p-4 px-6");      // → "p-4 px-6" (px-6 overrides only horizontal)
twMerge("text-red-500 text-blue-500"); // → "text-blue-500"
```

### `cn()` = Both Together

```typescript
cn("px-4 py-2 bg-primary", className);
// If className="bg-secondary px-6", result is "py-2 bg-secondary px-6"
// tailwind-merge resolves bg-primary vs bg-secondary (last wins)
```

## Usage Patterns

### Component Props

The most common pattern — accepting a `className` prop to allow overrides:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "ghost" && "hover:bg-secondary hover:text-secondary-foreground",
        className
      )}
      {...props}
    />
  );
}
```

**Key rule**: Always place `className` last in `cn()` so consumer overrides win.

### Conditional Classes

```tsx
<div
  className={cn(
    "rounded-lg border p-4 transition-colors",
    isSelected ? "border-primary bg-primary/5" : "border-border",
    isDisabled && "pointer-events-none opacity-50"
  )}
>
  {children}
</div>
```

### State-Based Styling

```tsx
<input
  className={cn(
    "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
    error
      ? "border-destructive focus-visible:ring-destructive/30"
      : "border-input focus-visible:ring-primary/30",
    "focus-visible:outline-none focus-visible:ring-2"
  )}
/>
```

### Responsive Overrides

```tsx
<div className={cn(
  "grid grid-cols-1 gap-4",
  columns === 2 && "sm:grid-cols-2",
  columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
  columns === 4 && "sm:grid-cols-2 lg:grid-cols-4"
)}>
  {children}
</div>
```

## cva() — Class Variance Authority

For components with multiple variants and sizes, use `cva` (class-variance-authority) alongside `cn`:

```bash
pnpm add class-variance-authority
```

```typescript
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  // Base styles (always applied)
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-secondary hover:text-secondary-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Using cva with Components

```tsx
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

// Usage
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="outline" className="w-full">Full Width</Button>
```

### Compound Variants

Apply styles when multiple variants are active simultaneously:

```typescript
const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border border-border text-foreground",
      success: "bg-green-50 text-green-700",
      warning: "bg-yellow-50 text-yellow-700",
      error: "bg-red-50 text-red-700",
    },
    size: {
      sm: "px-2 py-0 text-[10px]",
      default: "px-2.5 py-0.5 text-xs",
    },
  },
  compoundVariants: [
    {
      variant: "success",
      size: "sm",
      class: "bg-green-100", // Stronger background at small size for readability
    },
  ],
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});
```

## Anti-Patterns

### Don't Concatenate Strings

```typescript
// ❌ Wrong — no deduplication, no conditional logic
const className = `px-4 py-2 ${isActive ? "bg-primary" : "bg-secondary"}`;

// ✅ Correct — cn handles conflicts and conditions
const className = cn("px-4 py-2", isActive ? "bg-primary" : "bg-secondary");
```

### Don't Repeat Base Classes in Conditionals

```typescript
// ❌ Wrong — base classes repeated
cn(isActive ? "px-4 py-2 bg-primary text-white" : "px-4 py-2 bg-secondary text-black");

// ✅ Correct — base classes once, conditional classes separately
cn("px-4 py-2", isActive ? "bg-primary text-white" : "bg-secondary text-black");
```

### Don't Use cn() for Static Classes

```tsx
// ❌ Unnecessary — no dynamic classes
<div className={cn("flex items-center gap-2")} />

// ✅ Just use a string
<div className="flex items-center gap-2" />
```

### Don't Put `className` Before Base Styles

```typescript
// ❌ Wrong — className overrides get overridden by base styles
cn(className, "bg-primary text-white");

// ✅ Correct — className last so overrides win
cn("bg-primary text-white", className);
```
