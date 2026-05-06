---
name: react-components
description: >-
  This skill should be used when creating, modifying, or reviewing React UI
  components. It covers Atomic Design methodology (atoms through pages),
  shadcn/ui setup and customization, Radix UI accessibility primitives,
  responsive design patterns, and component placement rules for monorepos.
---

# React Components

Quick reference for building UI components with Atomic Design, shadcn/ui, and Radix UI. Each section summarizes the key rules — reference files provide full examples and edge cases.

## Atomic Design

Five-level component hierarchy: Atoms → Molecules → Organisms → Templates → Pages.

### Classification Quick Reference

| Level | Breaks Down Further? | Fetches Data? | Business Logic? | Reusable? |
|---|---|---|---|---|
| Atom | No | No | No | Yes |
| Molecule | Into atoms | No | Minimal | Yes |
| Organism | Into molecules | Maybe | Yes | Usually |
| Template | Into organisms | No | No | Yes |
| Page | Into templates | Yes | Orchestration | No |

### Examples

- **Atoms**: Button, Input, Label, Avatar, Badge, Spinner, Separator
- **Molecules**: FormField (Label + Input + Error), SearchInput (Input + Button)
- **Organisms**: Header, SignUpForm, AppointmentCard, DoctorSearchResults
- **Templates**: MainLayout (Header + Sidebar + Content), AuthLayout
- **Pages**: DashboardPage, DoctorProfilePage (fetch data, wire to template)

### Naming

- Component files: PascalCase — `Button.tsx`, `FormField.tsx`
- Directories: PascalCase — `Button/`, `FormField/`
- Tests: `Button/__tests__/Button.test.tsx`
- Barrel exports per level: `atoms/index.ts`

See [references/atomic-design.md](./references/atomic-design.md) for classification decision table, naming conventions, barrel exports, and anti-patterns.

## Shared vs App-Specific Components

### Placement Rules

```
components/web/src/         → Shared across apps (@drzum/ui)
├── atoms/                  → @drzum/ui/atoms
├── molecules/              → @drzum/ui/molecules
├── organisms/              → @drzum/ui/organisms
├── templates/              → @drzum/ui/templates
└── chad-cn/                → Raw shadcn/ui copies

patient/src/components/     → Patient app only
├── atoms/
├── molecules/
├── organisms/
└── templates/
```

**Decision flow:**
1. Used by 2+ apps? → `components/web/` (shared)
2. Used by 1 app? → `{app}/src/components/` (app-specific)
3. Is a page? → `{app}/src/pages/`
4. Might become shared? → Start in the app, move later when needed

### Import Convention

```tsx
// ✅ Shared components
import { Button, Input } from "@drzum/ui/atoms";
import { FormField } from "@drzum/ui/molecules";

// ✅ App-specific components
import { AppointmentCard } from "@/components/organisms/AppointmentCard";
```

## shadcn/ui

Copy-and-own component collection. Not a dependency — source code lives in your project.

### Adding Components

```bash
pnpm dlx shadcn@latest add button input dialog
```

### Customization

Modify the source directly — you own the code:

```tsx
// Add a custom variant
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      success: "bg-green-600 text-white hover:bg-green-700", // Custom
    },
  },
});
```

### Theming

shadcn/ui uses CSS variables. Change your theme by updating variables in `@theme`:

```css
@theme {
  --color-primary: #16a34a;
  --color-primary-foreground: #ffffff;
  --color-destructive: #dc2626;
}
```

### Extending for Domain Use

Wrap shadcn components with domain-specific behavior:

```tsx
function LoadingButton({ isLoading, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
      {isLoading ? "Cargando..." : children}
    </Button>
  );
}
```

See [references/shadcn-ui.md](./references/shadcn-ui.md) for setup, configuration, form patterns with React Hook Form, and monorepo placement.

## Radix UI

Accessible, unstyled primitives that shadcn/ui builds on. Key concepts:

### The `asChild` Pattern

```tsx
// Merges Radix behavior onto YOUR component
<Dialog.Trigger asChild>
  <Button variant="outline">Abrir</Button>
</Dialog.Trigger>
```

Always use `asChild` when passing your own styled component as a Radix slot.

### Data Attributes for Styling

Radix exposes state via data attributes — use them for Tailwind styling:

```tsx
<Tabs.Trigger
  className="text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground"
>
  Tab
</Tabs.Trigger>
```

Common: `data-[state=open]`, `data-[state=active]`, `data-[state=checked]`, `data-[disabled]`

### Common Primitives

| Primitive | Use For | Key Behavior |
|---|---|---|
| Dialog | Modals, confirmations | Focus trap, Escape to close |
| DropdownMenu | Context menus | Arrow key navigation, type-ahead |
| Tabs | Tabbed content | Arrow keys between triggers |
| Select | Selection from options | Keyboard navigation, type-ahead |
| Tooltip | Hover information | Delay, accessible labels |
| Accordion | Collapsible sections | Single or multiple open |

### Accessibility Checklist

1. Always include `Dialog.Title` (use `VisuallyHidden` if not visible)
2. Use `asChild` to avoid nesting `<button>` inside `<button>`
3. Provide `aria-label` for icon-only triggers
4. Test with keyboard: Tab, Escape, arrow keys, Enter/Space

See [references/radix-ui.md](./references/radix-ui.md) for Dialog, Dropdown, Tabs, Select, Tooltip examples and anti-patterns.

## Responsive Design

Mobile-first: base styles are mobile, breakpoints add larger-screen overrides.

### Breakpoints

| Prefix | Min Width | Target |
|---|---|---|
| (none) | 0px | Mobile (base) |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |

### Common Patterns

```tsx
{/* Stack → Row */}
<div className="flex flex-col gap-4 sm:flex-row">{/* ... */}</div>

{/* Responsive grid */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{/* ... */}</div>

{/* Show/hide */}
<nav className="hidden lg:block">{desktopNav}</nav>
<button className="lg:hidden">{hamburger}</button>
```

### Touch Targets

Minimum 44x44px for interactive elements on mobile. Use `h-11` (44px) as minimum button height.

### Rules

- **Start mobile** — Write base styles for the smallest screen
- **Add up** — Use `sm:`, `md:`, `lg:` to progressively enhance
- **Prefer CSS breakpoints** — Use `useMediaQuery` only when component trees differ, not just layout
- **Test on real devices** — Don't rely only on browser DevTools resize

See [references/responsive-design.md](./references/responsive-design.md) for responsive tables, container queries, touch targets, and testing patterns.

## Form Element Styling

When styling form elements, follow the project's design system:

- **Focus ring**: `focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30` — green glow effect
- **Default borders**: `border-border` — light, subtle
- **Error state**: `border-destructive focus-visible:ring-destructive/30`
- **Disabled**: `disabled:cursor-not-allowed disabled:opacity-50`

Reference `.molcajete/research/ui-ideas/form-ui.png` for the desired look and feel.

## Reference Files

| File | Description |
|---|---|
| [references/atomic-design.md](./references/atomic-design.md) | Five-level hierarchy, classification checklists, naming, barrel exports |
| [references/shadcn-ui.md](./references/shadcn-ui.md) | Setup, adding components, customization, cva variants, theming |
| [references/radix-ui.md](./references/radix-ui.md) | Dialog, Dropdown, Tabs, Select, Tooltip, accessibility |
| [references/responsive-design.md](./references/responsive-design.md) | Mobile-first breakpoints, responsive patterns, touch targets, container queries |
