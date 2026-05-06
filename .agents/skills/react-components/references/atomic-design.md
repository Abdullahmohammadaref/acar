# Atomic Design

## Five-Level Hierarchy

### 1. Atoms

The smallest building blocks. Cannot be broken down further without losing function.

**Examples**: Button, Input, Label, Icon, Avatar, Badge, Spinner, Separator

**Characteristics**:
- No internal state (or minimal — e.g., Input manages its own focus ring)
- Accepts props for variants, sizes, and content
- No data fetching
- No business logic
- Can be styled via `className` prop with `cn()`

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

function Button({ variant = "default", size = "default", className, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
```

### 2. Molecules

Simple groups of atoms that function as a unit.

**Examples**: FormField (Label + Input + Error), NavItem (Icon + Link), SearchInput (Input + Button), AvatarWithName (Avatar + Text)

**Characteristics**:
- Combines 2-4 atoms
- May have minimal internal state (e.g., form validation)
- No data fetching
- Can accept an `onSubmit`, `onChange`, etc.
- Still presentation-focused

```tsx
interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children as ReactElement, { id, "aria-describedby": error ? `${id}-error` : undefined })}
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

### 3. Organisms

Complex UI sections composed of molecules and atoms. They form distinct sections of the page.

**Examples**: Header (NavItems + Logo + Avatar), SignUpForm (FormFields + Button), Sidebar (NavItems + User info), AppointmentCard (Avatar + Details + Actions)

**Characteristics**:
- Contains business logic (form validation, submission)
- May fetch data (via hooks or props)
- Has internal state management
- Composes multiple molecules and atoms
- Reusable across pages

```tsx
function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const { t } = useLingui();

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <Avatar src={appointment.doctor.avatar} alt={appointment.doctor.fullName} />
        <div>
          <p className="font-medium">{appointment.doctor.fullName}</p>
          <p className="text-sm text-muted-foreground">{appointment.doctor.specialty}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <time className="text-sm">{formatDate(appointment.dateTime)}</time>
        <Badge variant={statusVariant[appointment.status]}>
          {appointment.status}
        </Badge>
      </div>
    </div>
  );
}
```

### 4. Templates

Page-level layouts without data. Define the structure and arrangement of organisms on a page.

**Examples**: MainLayout (Header + Sidebar + Content area), AuthLayout (centered form container), DashboardTemplate (Stats + Content + Sidebar)

**Characteristics**:
- No data fetching — receives all content as children or props
- Defines the page skeleton (grid, spacing, responsive behavior)
- Handles responsive layout changes
- Provides slots for organisms to fill

```tsx
function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 5. Pages

Templates filled with real data. These are route-level components that wire up data to the template.

**Examples**: DashboardPage, DoctorProfilePage, AppointmentListPage

**Characteristics**:
- Fetch data (via GraphQL queries, hooks)
- Pass data down to templates and organisms
- Handle loading/error states
- Minimal UI — delegate rendering to templates and organisms

```tsx
function DashboardPage() {
  const [result] = useQuery({ query: DASHBOARD_QUERY });

  if (result.fetching) return <DashboardSkeleton />;
  if (result.error) return <ErrorMessage error={result.error} />;

  return (
    <MainLayout>
      <StatsRow stats={result.data.viewer.stats} />
      <AppointmentList appointments={result.data.viewer.appointments} />
    </MainLayout>
  );
}
```

## Classification Decision Table

| Question | Atom | Molecule | Organism | Template | Page |
|---|---|---|---|---|---|
| Can it be broken into smaller UI components? | No | Into atoms | Into molecules | Into organisms | Into templates |
| Does it fetch data? | No | No | Maybe | No | Yes |
| Does it have business logic? | No | Minimal | Yes | No | Orchestration |
| Is it reusable across pages? | Yes | Yes | Usually | Yes | No |
| Does it define page layout? | No | No | No | Yes | No |

## Naming Conventions

### Files

- **Component file**: PascalCase — `Button.tsx`, `FormField.tsx`, `AppointmentCard.tsx`
- **Directory**: PascalCase matching the component — `Button/`, `FormField/`
- **Index file**: Re-exports from the directory — `index.ts`
- **Test file**: In `__tests__/` — `Button/__tests__/Button.test.tsx`

### Directories

```
ComponentName/
├── ComponentName.tsx      # Main component
├── index.ts               # Re-export: export { ComponentName } from "./ComponentName"
├── types.ts               # If types are complex enough to extract (optional)
└── __tests__/
    └── ComponentName.test.tsx
```

### Barrel Exports per Level

```typescript
// atoms/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
export { Label } from "./Label";
export { Badge } from "./Badge";
export { Avatar } from "./Avatar";
export type { ButtonProps, InputProps } from "./types";
```

## Placement Rules for Monorepo

### Shared Components (`@drzum/ui`)

Used by 2+ apps → goes in `components/web/src/{level}/`:

```
components/web/src/
├── atoms/       → exported as @drzum/ui/atoms
├── molecules/   → exported as @drzum/ui/molecules
├── organisms/   → exported as @drzum/ui/organisms
├── templates/   → exported as @drzum/ui/templates
└── chad-cn/     → shadcn/ui components (re-exported through atoms/molecules)
```

### App-Specific Components

Used by only one app → goes in `{app}/src/components/{level}/`:

```
patient/src/components/
├── atoms/
├── molecules/
├── organisms/
└── templates/
```

### Decision Flow

1. Is the component used by multiple apps? → `components/web/`
2. Is it used by only one app? → `{app}/src/components/`
3. Is it a page? → `{app}/src/pages/`
4. Can it become shared later? → Start in the app, move to shared when needed

## Anti-Patterns

### Don't Skip Levels

```tsx
// ❌ Wrong — organism directly using HTML elements
function Header() {
  return (
    <header>
      <img src={logo} alt="Logo" />           {/* Should be an atom */}
      <a href="/profile">Profile</a>           {/* Should be an atom */}
      <button onClick={logout}>Logout</button> {/* Should be an atom */}
    </header>
  );
}

// ✅ Correct — organisms compose molecules and atoms
function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <Logo />
      <NavItem href="/profile" icon={<UserIcon />}>Perfil</NavItem>
      <Button variant="ghost" onClick={logout}>Salir</Button>
    </header>
  );
}
```

### Don't Make Everything an Atom

If a component is only used inside one organism and has no reuse potential, don't extract it. Over-atomization adds complexity without benefit.

### Don't Put Business Logic in Atoms

```tsx
// ❌ Wrong — atom fetching data
function Avatar({ userId }: { userId: string }) {
  const [user] = useQuery({ query: GET_USER, variables: { userId } });
  return <img src={user.data?.avatar} />;
}

// ✅ Correct — atom is purely presentational
function Avatar({ src, alt, className }: AvatarProps) {
  return <img src={src} alt={alt} className={cn("rounded-full", className)} />;
}
```
