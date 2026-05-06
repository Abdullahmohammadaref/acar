# Responsive Design

## Mobile-First Approach

Design for the smallest screen first, then progressively enhance for larger screens. This is both a CSS strategy and a design philosophy.

### Why Mobile-First

1. **Performance** — Mobile users get only the styles they need, no overrides
2. **Simplicity** — Start with the simplest layout, add complexity
3. **Progressive enhancement** — Features layer on, never degrade
4. **Content priority** — Forces you to prioritize what matters most

### Breakpoints

Tailwind's default breakpoints, used as min-width modifiers:

| Prefix | Min Width | Target Devices |
|---|---|---|
| (none) | 0px | All (mobile base) |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets (portrait) |
| `lg:` | 1024px | Tablets (landscape), laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

## Responsive Patterns

### Stack to Row

The most common pattern — items stack vertically on mobile, side-by-side on desktop:

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
  <Avatar src={user.avatar} />
  <div>
    <h2 className="font-semibold">{user.name}</h2>
    <p className="text-sm text-muted-foreground">{user.email}</p>
  </div>
</div>
```

### Responsive Grid

```tsx
{/* 1 → 2 → 3 columns */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {appointments.map((apt) => <AppointmentCard key={apt.id} appointment={apt} />)}
</div>
```

### Show/Hide Elements

```tsx
{/* Mobile navigation (hamburger) */}
<button className="lg:hidden" aria-label="Abrir menú">
  <MenuIcon />
</button>

{/* Desktop sidebar */}
<aside className="hidden lg:block lg:w-64">
  <DesktopNav />
</aside>

{/* Desktop-only extra info */}
<div className="hidden md:block">
  <DoctorBio doctor={doctor} />
</div>
```

### Responsive Typography

```tsx
<h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
  Bienvenido
</h1>
<p className="text-sm sm:text-base">
  Encuentra a tu doctor ideal
</p>
```

### Responsive Spacing

```tsx
<main className="p-4 sm:p-6 lg:p-8">
  <section className="space-y-4 sm:space-y-6 lg:space-y-8">
    {/* Content */}
  </section>
</main>
```

### Responsive Card Layouts

```tsx
{/* Full width on mobile, card layout on desktop */}
<div className="sm:rounded-lg sm:border sm:border-border sm:p-6 sm:shadow-sm">
  {/* On mobile: no border, no padding, no shadow (edge-to-edge) */}
  {/* On desktop: card appearance */}
  <h2>Mis citas</h2>
  {/* ... */}
</div>
```

### Two-Column Layout

```tsx
{/* Stacked on mobile, side-by-side on desktop */}
<div className="grid gap-6 lg:grid-cols-[1fr_300px]">
  <main>
    {/* Primary content */}
    <AppointmentList />
  </main>
  <aside className="hidden lg:block">
    {/* Secondary content — hidden on mobile */}
    <QuickActions />
    <RecentActivity />
  </aside>
</div>
```

## useMediaQuery Hook

For behavior changes (not just styling) based on screen size:

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// Usage
function Navigation() {
  const isMobile = useMediaQuery("(max-width: 1023px)");

  if (isMobile) {
    return <MobileNav />; // Hamburger menu with Sheet/Drawer
  }
  return <DesktopNav />; // Full sidebar
}
```

**Rule**: Prefer CSS-based responsiveness (Tailwind breakpoints) over `useMediaQuery`. Only use the hook when you need to render entirely different component trees or change behavior (not just layout).

## Touch Targets

Mobile users interact with fingers, not cursors. Ensure interactive elements are large enough:

```tsx
{/* ✅ Correct — 44px minimum touch target */}
<button className="flex h-11 min-w-11 items-center justify-center rounded-md px-4">
  <span className="text-sm">Agendar</span>
</button>

{/* ✅ Correct — icon button with adequate size */}
<button className="flex size-11 items-center justify-center rounded-md" aria-label="Cerrar">
  <XIcon className="size-5" />
</button>

{/* ❌ Wrong — too small for touch */}
<button className="size-6">
  <XIcon className="size-3" />
</button>
```

**Rule**: Interactive elements should be at least 44x44px on mobile. Use `h-11` (44px) as the minimum height for buttons and links.

## Responsive Tables

Tables are notoriously hard on mobile. Common strategies:

### Horizontal Scroll

```tsx
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
    {/* Full table, scrollable on mobile */}
  </table>
</div>
```

### Card Layout on Mobile

```tsx
{/* Table on desktop, cards on mobile */}
<div className="hidden sm:block">
  <table>{/* Full table */}</table>
</div>
<div className="space-y-4 sm:hidden">
  {appointments.map((apt) => (
    <div key={apt.id} className="rounded-lg border p-4">
      <p className="font-medium">{apt.doctorName}</p>
      <p className="text-sm text-muted-foreground">{apt.date}</p>
      <p className="text-sm">{apt.status}</p>
    </div>
  ))}
</div>
```

## Container Queries

Tailwind v4 supports container queries for component-level responsiveness (instead of viewport-based):

```tsx
<div className="@container">
  <div className="flex flex-col gap-2 @sm:flex-row @sm:items-center">
    <Avatar />
    <div className="@sm:ml-2">
      <h3>{name}</h3>
      <p className="hidden @md:block">{bio}</p>
    </div>
  </div>
</div>
```

Container queries respond to the container's width, not the viewport. Useful for components that appear in different-sized containers (sidebar vs main content).

## Testing Responsive Design

### Vitest / Testing Library

```tsx
// Mock window.matchMedia for responsive hook tests
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 1023px)", // Simulate mobile
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});
```

### Playwright

```typescript
// Test at different viewport sizes
test("shows mobile navigation on small screens", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); // iPhone
  await page.goto("/");
  await expect(page.getByLabel("Abrir menú")).toBeVisible();
  await expect(page.getByRole("navigation")).not.toBeVisible();
});

test("shows sidebar on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByLabel("Abrir menú")).not.toBeVisible();
});
```

## Anti-Patterns

### Don't Use max-* Breakpoints

```tsx
// ❌ Wrong — max-width is not mobile-first
<div className="max-sm:hidden">Only on sm+</div>

// ✅ Correct — mobile-first with min-width
<div className="hidden sm:block">Only on sm+</div>
```

### Don't Duplicate Content for Mobile/Desktop

```tsx
// ❌ Wrong — same content rendered twice
<h1 className="text-xl sm:hidden">Welcome</h1>
<h1 className="hidden text-3xl sm:block">Welcome to Our Platform</h1>

// ✅ Correct — one element, responsive classes
<h1 className="text-xl sm:text-3xl">Welcome</h1>
```

### Don't Hardcode Pixel Values

```tsx
// ❌ Wrong — fixed width breaks responsiveness
<div style={{ width: "800px" }}>Content</div>

// ✅ Correct — responsive width with max
<div className="w-full max-w-3xl">Content</div>
```
