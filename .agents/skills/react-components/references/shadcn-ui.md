# shadcn/ui

## Core Philosophy

shadcn/ui is not a component library — it's a collection of reusable components you copy into your project and own. You're not installing a dependency; you're copying source code.

**Key principles:**
- **Copy, don't install** — Components are copied into your codebase, not imported from `node_modules`
- **Own the code** — Modify freely. No version lock-in.
- **Built on Radix UI** — Accessible primitives with custom styling
- **Styled with Tailwind** — All styles use utility classes and CSS variables

## Setup

### Initialize

```bash
pnpm dlx shadcn@latest init
```

This creates:
- `components.json` — Configuration file
- `lib/utils.ts` — The `cn()` utility
- CSS variables in your global stylesheet

### Configuration (`components.json`)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "tailwind": {
    "config": "",
    "css": "src/app.css",
    "baseColor": "zinc"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "hooks": "@/hooks"
  }
}
```

## Adding Components

```bash
# Add a single component
pnpm dlx shadcn@latest add button

# Add multiple components
pnpm dlx shadcn@latest add button input label card

# Add with all dependencies resolved automatically
pnpm dlx shadcn@latest add dialog
# Adds Dialog, Button (if not present), and any other dependencies
```

Components are copied to the `ui` alias path (default: `src/components/ui/`).

## Customization

### Modifying Existing Components

Since you own the code, modify directly:

```tsx
// components/ui/button.tsx — your copy, customize freely
const buttonVariants = cva(
  "inline-flex items-center justify-center ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Add your own variant
        success: "bg-green-600 text-white hover:bg-green-700",
      },
      size: {
        default: "h-9 px-4 py-2",
        // Add your own size
        xs: "h-7 px-2 text-xs",
      },
    },
  }
);
```

### Theming with CSS Variables

shadcn/ui components reference CSS variables for colors. Change the theme by updating variables:

```css
@theme {
  --color-primary: #16a34a;          /* Green instead of default */
  --color-primary-foreground: #fff;
  --color-secondary: #f4f4f5;
  --color-destructive: #dc2626;
  --color-muted: #f4f4f5;
  --color-muted-foreground: #71717a;
  --color-border: #e4e4e7;
  --color-ring: #16a34a;
}
```

All shadcn/ui components automatically pick up these values.

### Extending Components

Wrap shadcn/ui components with domain-specific logic:

```tsx
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

function LoadingButton({ isLoading, loadingText, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
      {isLoading ? (loadingText ?? children) : children}
    </Button>
  );
}
```

## Component Catalog

### Form Components

| Component | Radix Primitive | Use For |
|---|---|---|
| `Input` | None (native) | Text, email, password, number fields |
| `Textarea` | None (native) | Multi-line text |
| `Select` | `@radix-ui/react-select` | Single selection from options |
| `Checkbox` | `@radix-ui/react-checkbox` | Boolean toggle or multi-select |
| `RadioGroup` | `@radix-ui/react-radio-group` | Single selection from few options |
| `Switch` | `@radix-ui/react-switch` | On/off toggle |
| `Slider` | `@radix-ui/react-slider` | Range value selection |
| `DatePicker` | Custom | Date selection |

### Layout Components

| Component | Use For |
|---|---|
| `Card` | Content containers |
| `Separator` | Visual dividers |
| `Tabs` | Tabbed content |
| `Accordion` | Collapsible sections |
| `Sheet` | Slide-out panels |
| `Dialog` | Modal dialogs |

### Feedback Components

| Component | Use For |
|---|---|
| `Alert` | Inline alerts and callouts |
| `Toast` | Temporary notifications |
| `Badge` | Status indicators and labels |
| `Skeleton` | Loading placeholders |
| `Progress` | Progress bars |

### Navigation Components

| Component | Use For |
|---|---|
| `DropdownMenu` | Context menus |
| `NavigationMenu` | Top-level navigation |
| `Command` | Command palette / search |
| `Breadcrumb` | Page hierarchy |
| `Pagination` | Page navigation |

## Form Patterns with shadcn/ui

### Basic Form

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" type="email" placeholder="tu@correo.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" />
      </div>
      <Button type="submit" className="w-full">Iniciar sesión</Button>
    </form>
  );
}
```

### With React Hook Form

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico no válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm({ onSubmit }: { onSubmit: (data: LoginFormData) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Cargando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
```

## Placement in Monorepo

In the DrZum monorepo, shadcn/ui components live in the shared component library:

```
components/web/src/
├── chad-cn/           # Raw shadcn/ui copies (as installed by CLI)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...
├── atoms/             # Re-exports + custom atoms
│   ├── Button/
│   │   ├── Button.tsx  # Wraps chad-cn/button with project conventions
│   │   └── index.ts
│   └── ...
└── molecules/         # Compositions of atoms
    └── FormField/
        ├── FormField.tsx
        └── index.ts
```

Import from the atomic level, not from `chad-cn` directly:

```tsx
// ✅ Correct — import from atomic level
import { Button } from "@drzum/ui/atoms";

// ❌ Wrong — importing raw shadcn component
import { Button } from "@drzum/ui/chad-cn";
```

## Anti-Patterns

### Don't Install shadcn as a Package

```bash
# ❌ Wrong — there's no npm package to install
pnpm add shadcn-ui

# ✅ Correct — use the CLI to copy components
pnpm dlx shadcn@latest add button
```

### Don't Modify shadcn Components for One-Off Cases

```tsx
// ❌ Wrong — modifying the shared Button for one page's needs
// components/ui/button.tsx
const buttonVariants = cva("...", {
  variants: {
    variant: {
      specialDashboardButton: "...", // Too specific for a shared component
    },
  },
});

// ✅ Correct — compose in the consuming component
function DashboardActionButton(props: ButtonProps) {
  return <Button className="bg-gradient-to-r from-green-500 to-teal-500" {...props} />;
}
```

### Don't Override the cn() Utility

The `cn()` function is the foundation. Don't create alternative class merging utilities — use `cn()` everywhere.
