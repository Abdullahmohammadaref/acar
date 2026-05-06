# Component Patterns

## Composition Over Configuration

Prefer composing components from smaller pieces over passing configuration props.

### Props Drilling vs Composition

```tsx
// ❌ Configuration-heavy — hard to extend
<Card
  title="Dr. García"
  subtitle="Cardiología"
  image="/avatar.jpg"
  showBadge
  badgeText="Disponible"
  footer={<BookButton />}
  onImageClick={handleClick}
/>

// ✅ Composition — flexible, clear structure
<Card>
  <Card.Header>
    <Avatar src="/avatar.jpg" onClick={handleClick} />
    <div>
      <Card.Title>Dr. García</Card.Title>
      <Card.Description>Cardiología</Card.Description>
    </div>
    <Badge>Disponible</Badge>
  </Card.Header>
  <Card.Footer>
    <BookButton />
  </Card.Footer>
</Card>
```

## Compound Components

Components that work together, sharing implicit state. The parent manages state; children consume it via context.

```tsx
import { createContext, use, useState } from "react";
import type { ReactNode } from "react";

// Context for internal state
interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  const context = use(TabsContext);
  if (!context) throw new Error("Tab components must be used within <Tabs>");
  return context;
}

// Root component
function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext>
  );
}

// Sub-components
function TabsList({ children }: { children: ReactNode }) {
  return <div role="tablist" className="flex gap-1 border-b border-border">{children}</div>;
}

function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
      className={cn(
        "px-3 py-2 text-sm font-medium",
        activeTab === value ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div role="tabpanel" className="pt-4">{children}</div>;
}

// Attach sub-components
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

// Usage
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Trigger value="profile">Perfil</Tabs.Trigger>
    <Tabs.Trigger value="appointments">Citas</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="profile"><ProfileForm /></Tabs.Content>
  <Tabs.Content value="appointments"><AppointmentList /></Tabs.Content>
</Tabs>
```

## Render Props

Pass a function as children or a prop to delegate rendering:

```tsx
interface DataLoaderProps<T> {
  query: string;
  children: (data: T, loading: boolean) => ReactNode;
}

function DataLoader<T>({ query, children }: DataLoaderProps<T>) {
  const [data] = useQuery<T>({ query });

  if (data.error) return <ErrorMessage error={data.error} />;
  return <>{children(data.data as T, data.fetching)}</>;
}

// Usage
<DataLoader<Doctor[]> query={GET_DOCTORS}>
  {(doctors, loading) =>
    loading ? <Skeleton /> : doctors.map((d) => <DoctorCard key={d.id} doctor={d} />)
  }
</DataLoader>
```

Use render props when a component needs to control what it renders but the consumer decides how.

## Polymorphic Components

Components that render as different HTML elements based on an `as` prop:

```tsx
import type { ElementType, ComponentPropsWithoutRef } from "react";

type TextProps<T extends ElementType = "p"> = {
  as?: T;
  variant?: "body" | "caption" | "label";
} & ComponentPropsWithoutRef<T>;

function Text<T extends ElementType = "p">({ as, variant = "body", className, ...props }: TextProps<T>) {
  const Component = as ?? "p";

  return (
    <Component
      className={cn(
        variant === "body" && "text-base text-foreground",
        variant === "caption" && "text-sm text-muted-foreground",
        variant === "label" && "text-sm font-medium",
        className
      )}
      {...props}
    />
  );
}

// Usage
<Text>Default paragraph</Text>
<Text as="span" variant="caption">Small caption</Text>
<Text as="label" variant="label" htmlFor="email">Email</Text>
```

## Controlled vs Uncontrolled

### Controlled Component

Parent owns the state:

```tsx
interface InputProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchInput({ value, onChange }: InputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar..."
    />
  );
}

// Parent controls the state
function SearchPage() {
  const [query, setQuery] = useState("");
  return <SearchInput value={query} onChange={setQuery} />;
}
```

### Uncontrolled Component

Component manages its own state:

```tsx
function SearchInput({ defaultValue = "", onSearch }: { defaultValue?: string; onSearch: (query: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputRef.current) onSearch(inputRef.current.value);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue={defaultValue} placeholder="Buscar..." />
    </form>
  );
}
```

### Hybrid (Controlled + Uncontrolled)

Support both modes — controlled when `value` is provided, uncontrolled otherwise:

```tsx
interface ToggleProps {
  value?: boolean;
  defaultValue?: boolean;
  onChange?: (value: boolean) => void;
}

function Toggle({ value: controlledValue, defaultValue = false, onChange }: ToggleProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  function handleChange() {
    const next = !value;
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  }

  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={handleChange}
      className={cn("...", value ? "bg-primary" : "bg-muted")}
    />
  );
}
```

## Children Patterns

### ReactNode for Flexible Content

```tsx
interface AlertProps {
  variant: "info" | "warning" | "error";
  children: ReactNode; // Accepts strings, elements, fragments
}

function Alert({ variant, children }: AlertProps) {
  return (
    <div role="alert" className={cn("rounded-md p-4", variantStyles[variant])}>
      {children}
    </div>
  );
}
```

### Function Children for Render Control

```tsx
interface DropdownProps {
  children: (props: { isOpen: boolean; toggle: () => void }) => ReactNode;
}

function Dropdown({ children }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  return <>{children({ isOpen, toggle: () => setIsOpen(!isOpen) })}</>;
}
```

## Error Boundaries

Wrap components that might fail with error boundaries to prevent the entire app from crashing:

```tsx
// Reusable error boundary wrapper
function WithErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback: ReactNode,
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Usage
const SafeDoctorList = WithErrorBoundary(DoctorList, <p>Error loading doctors</p>);
```

## Anti-Patterns

### Don't Use Index as Key for Dynamic Lists

```tsx
// ❌ Wrong — index key causes bugs with reordering/deletion
{items.map((item, index) => <Item key={index} {...item} />)}

// ✅ Correct — stable unique key
{items.map((item) => <Item key={item.id} {...item} />)}
```

### Don't Deeply Nest Ternaries in JSX

```tsx
// ❌ Wrong — unreadable
return isLoading ? <Spinner /> : error ? <Error /> : data ? <Content data={data} /> : <Empty />;

// ✅ Correct — early returns
if (isLoading) return <Spinner />;
if (error) return <Error />;
if (!data) return <Empty />;
return <Content data={data} />;
```

### Don't Create Components Inside Components

```tsx
// ❌ Wrong — Inner re-created every render, state resets
function Outer() {
  function Inner() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
  }
  return <Inner />;
}

// ✅ Correct — separate component
function Inner() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

function Outer() {
  return <Inner />;
}
```
