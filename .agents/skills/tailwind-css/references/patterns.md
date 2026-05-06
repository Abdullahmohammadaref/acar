# Tailwind CSS Patterns

Common UI patterns built with Tailwind utility classes. All examples use Tailwind v4 syntax.

## Layout Patterns

### Container with Max Width

```tsx
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Centered Content

```tsx
{/* Horizontal + vertical center */}
<div className="flex min-h-screen items-center justify-center">
  <div>Centered content</div>
</div>

{/* Grid center (simpler for single items) */}
<div className="grid min-h-screen place-items-center">
  <div>Centered content</div>
</div>
```

### Sticky Header

```tsx
<header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
    {/* Header content */}
  </div>
</header>
```

### Sidebar Layout

```tsx
<div className="flex min-h-screen">
  {/* Sidebar */}
  <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
    <nav className="flex flex-col gap-1 p-4">
      {/* Nav items */}
    </nav>
  </aside>

  {/* Main content */}
  <main className="flex-1 overflow-auto p-6">
    {/* Page content */}
  </main>
</div>
```

## Grid Patterns

### Responsive Card Grid

```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Card key={item.id}>{/* ... */}</Card>
  ))}
</div>
```

### Dashboard Grid

```tsx
{/* Stats row + main content + sidebar */}
<div className="grid gap-6 lg:grid-cols-[1fr_300px]">
  <div className="space-y-6">
    {/* Stats row */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard />
      <StatCard />
      <StatCard />
      <StatCard />
    </div>
    {/* Main content */}
    <MainContent />
  </div>

  {/* Sidebar */}
  <aside className="space-y-6">
    <RecentActivity />
    <QuickActions />
  </aside>
</div>
```

### Auto-Fill Grid

```tsx
{/* Cards auto-fill available space, min 250px each */}
<div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
  {items.map((item) => (
    <Card key={item.id}>{/* ... */}</Card>
  ))}
</div>
```

## Card Patterns

### Basic Card

```tsx
<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
</div>
```

### Interactive Card

```tsx
<div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/50 hover:shadow-md">
  {/* Card content */}
</div>
```

### Card with Header and Footer

```tsx
<div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
  <div className="border-b border-border px-6 py-4">
    <h3 className="font-semibold">{title}</h3>
  </div>
  <div className="p-6">
    {/* Card body */}
  </div>
  <div className="border-t border-border bg-muted/50 px-6 py-3">
    {/* Card footer */}
  </div>
</div>
```

## Button Patterns

### Button Variants

```tsx
{/* Primary */}
<button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
  Primary
</button>

{/* Secondary */}
<button className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80">
  Secondary
</button>

{/* Outline */}
<button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-secondary hover:text-secondary-foreground">
  Outline
</button>

{/* Ghost */}
<button className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground">
  Ghost
</button>

{/* Destructive */}
<button className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90">
  Delete
</button>
```

### Icon Button

```tsx
<button className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-sm shadow-sm transition-colors hover:bg-secondary" aria-label="Settings">
  <SettingsIcon className="size-4" />
</button>
```

### Button with Loading State

```tsx
<button
  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
  disabled={isLoading}
>
  {isLoading && <Loader2Icon className="size-4 animate-spin" />}
  {isLoading ? "Guardando..." : "Guardar"}
</button>
```

## Form Input Patterns

### Text Input

```tsx
<input
  type="text"
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
  placeholder="Ingresa tu nombre"
/>
```

### Input with Label and Error

```tsx
<div className="space-y-2">
  <label htmlFor="email" className="text-sm font-medium leading-none">
    Correo electrónico
  </label>
  <input
    id="email"
    type="email"
    className="flex h-10 w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
    aria-describedby="email-error"
  />
  <p id="email-error" className="text-sm text-destructive">
    El correo electrónico no es válido
  </p>
</div>
```

### Select

```tsx
<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50">
  <option value="">Seleccionar...</option>
  <option value="cdmx">Ciudad de México</option>
  <option value="gdl">Guadalajara</option>
</select>
```

### Checkbox

```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    className="size-4 rounded border-input text-primary focus:ring-primary/30"
  />
  <span className="text-sm">Acepto los términos y condiciones</span>
</label>
```

## Text and Typography

### Heading Hierarchy

```tsx
<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
  Título principal
</h1>
<h2 className="text-2xl font-semibold tracking-tight text-foreground">
  Subtítulo
</h2>
<h3 className="text-xl font-semibold text-foreground">
  Sección
</h3>
<p className="text-base text-muted-foreground">
  Texto de cuerpo con color atenuado.
</p>
<p className="text-sm text-muted-foreground">
  Texto pequeño para descripciones secundarias.
</p>
```

### Truncated Text

```tsx
{/* Single line truncation */}
<p className="truncate">{longText}</p>

{/* Multi-line clamp */}
<p className="line-clamp-3">{longText}</p>
```

## Badge / Tag Patterns

```tsx
{/* Default */}
<span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-foreground">
  Default
</span>

{/* Success */}
<span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
  Activo
</span>

{/* Warning */}
<span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
  Pendiente
</span>
```

## Spacing and Composition

### Stack (Vertical Spacing)

```tsx
{/* Consistent vertical spacing between children */}
<div className="space-y-4">
  <Component1 />
  <Component2 />
  <Component3 />
</div>
```

### Inline (Horizontal Spacing)

```tsx
<div className="flex items-center gap-2">
  <Avatar />
  <span>{name}</span>
  <Badge>{role}</Badge>
</div>
```

### Divider

```tsx
<div className="my-4 h-px bg-border" />

{/* Or with text */}
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">O continuar con</span>
  </div>
</div>
```

## Animation Patterns

### Transitions

```tsx
{/* Smooth color transition */}
<button className="transition-colors hover:bg-primary/90">Click</button>

{/* Multiple properties */}
<div className="transition-all duration-200 hover:scale-105 hover:shadow-md">
  Hover me
</div>

{/* Specific duration and easing */}
<div className="transition-transform duration-300 ease-out hover:-translate-y-1">
  Lift on hover
</div>
```

### Loading Spinner

```tsx
<div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
```

### Skeleton Loader

```tsx
<div className="animate-pulse space-y-4">
  <div className="h-4 w-3/4 rounded bg-muted" />
  <div className="h-4 w-1/2 rounded bg-muted" />
  <div className="h-4 w-5/6 rounded bg-muted" />
</div>
```
