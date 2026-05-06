# Radix UI

## Overview

Radix UI provides unstyled, accessible primitives for building component libraries. shadcn/ui is built on top of Radix. When using shadcn/ui components, you're using Radix under the hood.

**Key benefits:**
- Full WAI-ARIA compliance out of the box
- Keyboard navigation built in
- Focus management handled automatically
- Screen reader support included
- Controlled and uncontrolled modes

## Common Primitives

### Dialog (Modal)

```tsx
import * as Dialog from "@radix-ui/react-dialog";

function ConfirmDeleteDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="destructive">Eliminar</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">
            ¿Estás seguro?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Esta acción no se puede deshacer.
          </Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Button variant="destructive" onClick={onConfirm}>Eliminar</Button>
            </Dialog.Close>
          </div>
          <Dialog.Close asChild>
            <button className="absolute right-4 top-4" aria-label="Cerrar">
              <XIcon className="size-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Key behaviors:**
- Focus trapped inside when open
- `Escape` closes the dialog
- Clicking overlay closes the dialog
- Focus returns to trigger on close
- `aria-labelledby` auto-linked to `Dialog.Title`

### Dropdown Menu

```tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

function UserMenu({ user }: { user: User }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2">
          <Avatar src={user.avatar} alt={user.name} />
          <ChevronDownIcon className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] rounded-md border bg-background p-1 shadow-md"
          sideOffset={5}
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-sm font-semibold">
            {user.name}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-secondary">
            <UserIcon className="mr-2 size-4" />
            Perfil
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-secondary">
            <SettingsIcon className="mr-2 size-4" />
            Configuración
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10">
            <LogOutIcon className="mr-2 size-4" />
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

**Key behaviors:**
- Arrow key navigation between items
- Type-ahead search for items
- `Enter`/`Space` to select
- `Escape` to close
- Opens on click (not hover) for accessibility

### Tabs

```tsx
import * as Tabs from "@radix-ui/react-tabs";

function ProfileTabs() {
  return (
    <Tabs.Root defaultValue="personal">
      <Tabs.List className="flex border-b border-border">
        <Tabs.Trigger
          value="personal"
          className="px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground"
        >
          Datos personales
        </Tabs.Trigger>
        <Tabs.Trigger
          value="medical"
          className="px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground"
        >
          Historial médico
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="personal" className="pt-4">
        <PersonalInfoForm />
      </Tabs.Content>
      <Tabs.Content value="medical" className="pt-4">
        <MedicalHistory />
      </Tabs.Content>
    </Tabs.Root>
  );
}
```

**Key behaviors:**
- Arrow keys navigate between triggers
- `Tab` moves focus into content panel
- `aria-selected` managed automatically
- Lazy rendering available via `forceMount`

### Select

```tsx
import * as Select from "@radix-ui/react-select";

function SpecialtySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <Select.Value placeholder="Selecciona especialidad" />
        <Select.Icon>
          <ChevronDownIcon className="size-4 opacity-50" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="overflow-hidden rounded-md border bg-background shadow-md">
          <Select.Viewport className="p-1">
            <Select.Group>
              <Select.Label className="px-2 py-1.5 text-sm font-semibold">
                Especialidades
              </Select.Label>
              <SelectItem value="cardiology">Cardiología</SelectItem>
              <SelectItem value="dermatology">Dermatología</SelectItem>
              <SelectItem value="pediatrics">Pediatría</SelectItem>
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Select.Item
      value={value}
      className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-secondary data-[highlighted]:bg-secondary"
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="ml-auto">
        <CheckIcon className="size-4" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}
```

### Tooltip

```tsx
import * as Tooltip from "@radix-ui/react-tooltip";

function IconButtonWithTooltip({ label, icon, onClick }: Props) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button onClick={onClick} aria-label={label} className="rounded-md p-2 hover:bg-secondary">
            {icon}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md"
            sideOffset={5}
          >
            {label}
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
```

## Data Attributes for Styling

Radix components expose `data-state` and `data-*` attributes for CSS styling. Use these instead of managing your own `isOpen` CSS classes:

```css
/* Using Tailwind */
data-[state=open]:bg-secondary
data-[state=active]:border-primary
data-[state=checked]:bg-primary
data-[disabled]:opacity-50
data-[highlighted]:bg-secondary
```

Common states:
- `data-[state=open]` / `data-[state=closed]`
- `data-[state=active]` / `data-[state=inactive]`
- `data-[state=checked]` / `data-[state=unchecked]`
- `data-[state=on]` / `data-[state=off]`
- `data-[disabled]`
- `data-[highlighted]` — for focused/hovered items in menus

## The `asChild` Pattern

Radix uses `asChild` to merge behavior onto your own element instead of rendering a wrapper:

```tsx
// Without asChild — Radix renders its own <button>
<Dialog.Trigger>Open</Dialog.Trigger>
// Renders: <button>Open</button>

// With asChild — Radix merges onto YOUR element
<Dialog.Trigger asChild>
  <Button variant="outline">Open</Button>
</Dialog.Trigger>
// Renders: <button class="...your-button-classes">Open</button>
```

**Rule**: Always use `asChild` when you want to use your own styled component as a trigger, close button, or any other Radix slot.

## Accessibility Checklist

When building with Radix:

1. **Always include `Dialog.Title`** — Required for screen readers. Use `VisuallyHidden` if you don't want it visible.
2. **Always include `Dialog.Description`** — Or set `aria-describedby={undefined}` to opt out.
3. **Use `asChild` with styled buttons** — Don't nest `<button>` inside `<button>`.
4. **Provide `aria-label` for icon-only triggers** — Radix can't infer labels from icons.
5. **Test with keyboard** — Verify `Tab`, `Escape`, arrow keys, `Enter`/`Space` all work.

## Anti-Patterns

### Don't Fight the Component Model

```tsx
// ❌ Wrong — trying to control open state AND using uncontrolled mode
<Dialog.Root defaultOpen>
  <button onClick={() => setIsOpen(false)}>Close</button>
</Dialog.Root>

// ✅ Correct — use controlled mode when you need external control
<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
  {/* ... */}
</Dialog.Root>
```

### Don't Skip the Portal

```tsx
// ❌ Wrong — content may be clipped by parent overflow
<Dialog.Content>{/* ... */}</Dialog.Content>

// ✅ Correct — Portal renders at document root
<Dialog.Portal>
  <Dialog.Overlay />
  <Dialog.Content>{/* ... */}</Dialog.Content>
</Dialog.Portal>
```

### Don't Nest Interactive Elements

```tsx
// ❌ Wrong — button inside button
<Dialog.Trigger>
  <button>Open</button>
</Dialog.Trigger>

// ✅ Correct — use asChild
<Dialog.Trigger asChild>
  <button>Open</button>
</Dialog.Trigger>
```
