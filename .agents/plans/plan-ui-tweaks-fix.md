# plan-ui-tweaks-fix.md

> Feature: UI Tweaks — Fix Set (Transaction Split View Redo + Vehicle Edit Page Header)
> Depends on: `plan-ui-tweaks.md` (the previous round — partially shipped)
> Created: 2026-05-10

---

## Context

The previous agent attempted to implement `plan-ui-tweaks.md`. Most of it shipped correctly. Two things were either skipped or done wrong:

1. **Transaction split view was implemented incorrectly.** The agent added a toggle but it only rearranges cards on top of each other — it does NOT place the transactions table on the right side. The split view is visually useless and worse than the default layout. It must be removed and rebuilt from scratch.
2. **Vehicle edit page header is hard to read.** The make/model/ID info is too small and poorly structured. The manager should be able to glance at the header and immediately know which vehicle he is editing. This was never addressed in the previous plan.

**Do NOT touch anything else.** The dashboard, FinancialMetricsStrip, light mode CSS, and badge fixes from the previous plan are confirmed shipped. Leave them alone.

---

## Fix 1 — Transaction Split View: Remove and Rebuild

### Problem

The current implementation in `EditTransactionPage.tsx` and `TransactionForm.tsx` has a split view toggle but it does nothing useful — it just stacks cards differently. The transactions table (the most important element) is never moved to the right panel.

### What the correct split view must do

```
NORMAL VIEW (toggle OFF or below 2xl breakpoint):
┌──────────────────────────────────────────────────┐
│  Transaction Details Card                        │
│  From / To Card                                  │
│  Additional Info Card                            │
│  Financial Details Card                          │
│  Vehicle Selector Card   ← stays here            │
│  [Go to Vehicle link]                            │
│  Related Transactions Table   ← full width below │
└──────────────────────────────────────────────────┘

SPLIT VIEW (toggle ON, at 2xl / 1536px+):
┌──────────────────────┬───────────────────────────┐
│  LEFT PANEL          │  RIGHT PANEL              │
│  Transaction Details │  Vehicle Selector         │
│  From / To           │  [Go to Vehicle link]     │
│  Additional Info     │  Related Transactions     │
│  Financial Details   │  Table (scrollable)       │
│                      │                           │
│  (fields go 1-col)   │  (sticky top)             │
└──────────────────────┴───────────────────────────┘
```

The **right panel is the point** — the transactions table and vehicle selector move there so the manager can see the linked vehicle's other transactions alongside the form he's editing.

### Step 1 — Remove the broken implementation

In `TransactionForm.tsx` and `EditTransactionPage.tsx`, remove everything the previous agent added for split view. This includes:
- Any state variable for split view in those files
- Any layout wrapper that toggles between "split" and "stack"
- Any toggle button that was added to the StickyFooter
- Any props that were added for split view (`isSplitView`, `splitViewToggle`, etc.)

Start clean.

### Step 2 — Rebuild in EditTransactionPage.tsx

Add split view state management here, not in `TransactionForm`:

```tsx
// EditTransactionPage.tsx
const [isSplitView, setIsSplitView] = useState<boolean>(() => {
  const stored = localStorage.getItem("acar_transaction_split_view")
  return stored === null ? true : stored === "true"  // default ON
})

const toggleSplitView = () => {
  const next = !isSplitView
  setIsSplitView(next)
  localStorage.setItem("acar_transaction_split_view", String(next))
}
```

Pass `isSplitView` and `splitViewToggle` as props to `TransactionForm`:

```tsx
<TransactionForm
  isSplitView={isSplitView}
  splitViewToggle={
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggleSplitView}>
          {isSplitView
            ? <PanelRightClose className="h-4 w-4" />
            : <PanelRightOpen className="h-4 w-4" />
          }
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isSplitView ? t("ui.stackView") : t("ui.splitView")}
      </TooltipContent>
    </Tooltip>
  }
/>
```

The `splitViewToggle` node is rendered inside `TransactionForm`'s `StickyFooter` — same pattern as `VehicleForm` uses.

### Step 3 — Rebuild layout in TransactionForm.tsx

`TransactionForm` receives two new props:

```tsx
interface TransactionFormProps {
  // ... existing props
  isSplitView?: boolean       // only true when editing (never on add page)
  splitViewToggle?: ReactNode // button node to render in footer
}
```

**Important:** `isSplitView` should be treated as `false` whenever `isEditing` is `false`. The add transaction page never passes these props, so the default of `undefined` / `false` is enough — but add a guard in the layout logic:

```tsx
const showSplitView = isSplitView && isEditing
```

**Layout switch:**

```tsx
{showSplitView ? (
  // SPLIT LAYOUT — 2xl: two columns, below 2xl: single column (falls back gracefully)
  <div className="grid grid-cols-1 2xl:grid-cols-[1fr_420px] gap-6">

    {/* LEFT: form cards */}
    <div className="space-y-4">
      <TransactionDetailsCard isSplitView={true} />
      <FromToCard isSplitView={true} />
      <AdditionalInfoCard isSplitView={true} />
      <FinancialDetailsCard isSplitView={true} />
      {/* Vehicle field NOT here in split view — it's in the right panel */}
    </div>

    {/* RIGHT: vehicle selector + link + transactions table */}
    <div className="flex flex-col gap-4 2xl:sticky 2xl:top-4 2xl:self-start">
      {/* Vehicle selector moved here */}
      <VehicleSelectorField />

      {/* Go to vehicle link — only if a vehicle is linked */}
      {linkedVehicleId && (
        <a
          href={vehicleEditUrl}
          className="text-sm text-primary flex items-center gap-1 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("transactions.goToVehicle")}
        </a>
      )}

      {/* Transactions table */}
      <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
        <RelatedTransactionsPanel />
      </div>
    </div>
  </div>

) : (
  // NORMAL LAYOUT — unchanged from current
  <div className="space-y-6">
    {/* all form cards + vehicle selector + go-to-vehicle link + transactions table stacked */}
    {/* identical to current layout before the previous agent touched it */}
  </div>
)}
```

**Vehicle selector field — avoid JSX duplication:**
Extract the vehicle selector into its own small component or variable (`<VehicleSelectorField />`) so it can be rendered in two different positions without duplicating the form logic. Both instances reference the same React Hook Form `control` — they don't conflict because only one renders at a time:

```tsx
const vehicleSelectorField = (
  <Card>
    <CardContent className="pt-4">
      <FormField
        control={form.control}
        name="vehicle_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("transactions.vehicle")}</FormLabel>
            <SearchableSelect ... />
          </FormItem>
        )}
      />
    </CardContent>
  </Card>
)

// Then in JSX:
// In split view: render vehicleSelectorField in right panel
// In normal view: render vehicleSelectorField in its current position
```

**Left panel fields go single-column in split view:**
Inside each card's field grid, use `isSplitView` to collapse to one column:

```tsx
<div className={cn(
  "grid gap-4",
  isSplitView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
)}>
  {/* fields */}
</div>
```

Thread `isSplitView` down into each card sub-component as a prop, or use a React context if the depth gets too cumbersome. Prop-threading is preferred (only 1 level deep per card).

**StickyFooter — render the toggle button:**
`TransactionForm` already has a `StickyFooter`. Add the `splitViewToggle` node to it:

```tsx
<StickyFooter>
  <div className="flex items-center gap-2">
    {splitViewToggle}   {/* ← toggle button from EditTransactionPage */}
    {/* ...other left-side footer items */}
  </div>
  <div className="flex items-center gap-2">
    {/* ...right-side footer items (save status, navigation, etc.) */}
  </div>
</StickyFooter>
```

### Edge cases

- **Below 2xl breakpoint:** The `2xl:grid-cols-[1fr_420px]` collapses to `grid-cols-1` naturally. Both panels stack. This is acceptable — the toggle is most useful on large monitors.
- **No vehicle linked:** The right panel in split view shows only the vehicle selector (empty table or empty state). Do not hide the right panel — the manager may want to link a vehicle.
- **`Go to Vehicle` link:** Render only when `linkedVehicleId !== null`. Do not render a greyed-out placeholder.
- **Add Transaction page:** Never passes `isSplitView`. `showSplitView` is `false`. Normal layout renders. No toggle button in footer.
- **Right panel max-height:** Use `max-h-[calc(100vh-220px)]` with `overflow-y-auto` — not a fixed pixel height. This adapts to header + footer height.

### Files changed

| File | Action |
|------|--------|
| `frontend/src/pages/EditTransactionPage.tsx` | Add split view state + toggle button + pass props to TransactionForm |
| `frontend/src/components/transactions/TransactionForm.tsx` | Remove broken split view → rebuild with correct two-panel layout |

---

## Fix 2 — Vehicle Edit Page: Header and Footer Vehicle Identity

### Problem

On the vehicle edit page (`VehicleFormPage.tsx`), the current header shows something like:

```
Edit Vehicle
Honda Civic           ← small, secondary text
```

The make/model and ID are too small and not prominent enough. The manager is often cycling through multiple vehicles and needs to immediately know which one he's on.

The footer also has no vehicle identity — it just shows status buttons and navigation arrows. Adding the vehicle name+ID there reinforces which record is open.

### What the correct state should look like

**Header (target):**

```
Edit — Honda Civic #42
```

- "Edit — " is a prefix label (translated via `t()`)
- Make + Model + internal ID are the main title — **bold, large** (`text-2xl font-bold`)
- The whole thing is one line when space allows, wraps gracefully on small screens

**Implementation in `VehicleFormPage.tsx`:**

Find the page header section. It currently renders the page title and a subtitle. Replace it with a single prominent heading:

```tsx
<h1 className="text-2xl font-bold text-foreground">
  {t("vehicles.editTitle")} — {vehicle.make_name} {vehicle.model_name}{" "}
  <span className="text-muted-foreground">#{vehicle.internal_id}</span>
</h1>
```

- `t("vehicles.editTitle")` → `"Edit"` (add to all locale files: `de.json`, `en.json`, `tr.json`, `ar.json`)
- The `#ID` is slightly muted (`text-muted-foreground`) so it doesn't compete with the make/model, but it is still part of the same large heading — not a separate small subtitle
- Remove any existing subtitle that shows make/model separately — it's now in the heading

**If a subtitle is still needed** (e.g. for VIN or license plate), keep it small and below, but do not put make/model there anymore.

**Footer vehicle identity:**

In the `StickyFooter` of `VehicleFormPage`, add the vehicle identifier between the back button and the status/action buttons. Keep it compact — this is not a heading, just a quick reference:

```tsx
<StickyFooter>
  <div className="flex items-center gap-3">
    {/* Back to Vehicles button */}
    <Button variant="outline" size="sm" onClick={...}>
      ← {t("common.backToVehicles")}
    </Button>

    {/* Vehicle identity — compact, muted */}
    <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
      {vehicle.make_name} {vehicle.model_name}{" "}
      <span className="font-bold text-foreground">#{vehicle.internal_id}</span>
    </span>
  </div>

  <div className="flex items-center gap-2">
    {/* AutoSaveIndicator, status buttons, navigation arrows, etc. — unchanged */}
  </div>
</StickyFooter>
```

- Use `hidden sm:inline` so it only appears when there's enough horizontal space — the footer is already busy on small screens
- The make/model is `text-muted-foreground` and the `#ID` is `font-bold text-foreground` — the ID pops slightly
- Do NOT remove or reorder any existing footer elements — this is an additive change only

### i18n keys to add

Add these keys to all four locale files (`de.json`, `en.json`, `tr.json`, `ar.json`):

| Key | DE | EN |
|-----|----|----|
| `vehicles.editTitle` | `"Bearbeiten"` | `"Edit"` |

The `ui.splitView` and `ui.stackView` keys are needed for Fix 1 if not already present:

| Key | DE | EN |
|-----|----|----|
| `ui.splitView` | `"Geteilte Ansicht"` | `"Split View"` |
| `ui.stackView` | `"Gestapelte Ansicht"` | `"Stack View"` |

For Turkish and Arabic, use reasonable translations or leave as the English string temporarily — do not block the feature on translation.

### Files changed

| File | Action |
|------|--------|
| `frontend/src/pages/VehicleFormPage.tsx` | Update header to show `Edit — Make Model #ID` prominently; add vehicle identity to StickyFooter |
| `frontend/src/locales/de.json` | Add `vehicles.editTitle`, `ui.splitView`, `ui.stackView` |
| `frontend/src/locales/en.json` | Same |
| `frontend/src/locales/tr.json` | Same (or English fallback) |
| `frontend/src/locales/ar.json` | Same (or English fallback) |

---

## Complete File Manifest

| File | Action | Fix # |
|------|--------|-------|
| `frontend/src/pages/EditTransactionPage.tsx` | Edit — add split state + toggle button + props | 1 |
| `frontend/src/components/transactions/TransactionForm.tsx` | Edit — remove broken split, rebuild two-panel layout | 1 |
| `frontend/src/pages/VehicleFormPage.tsx` | Edit — update page header + add vehicle ID to footer | 2 |
| `frontend/src/locales/de.json` | Edit — add i18n keys | 2 (+ 1) |
| `frontend/src/locales/en.json` | Edit — add i18n keys | 2 (+ 1) |
| `frontend/src/locales/tr.json` | Edit — add i18n keys | 2 (+ 1) |
| `frontend/src/locales/ar.json` | Edit — add i18n keys | 2 (+ 1) |

**No backend changes. No new files. No new dependencies.**

---

## Implementation Order

```
Step 1  EditTransactionPage.tsx     ← add split state + props (no UI change yet)
Step 2  TransactionForm.tsx         ← remove old broken split, rebuild layout
Step 3  Test split view manually    ← toggle ON, verify right panel has vehicle selector + table
Step 4  Test normal view            ← toggle OFF, verify unchanged from pre-agent state
Step 5  Test add transaction page   ← must have no toggle, no split, normal stacked layout
Step 6  VehicleFormPage.tsx header  ← update title heading
Step 7  VehicleFormPage.tsx footer  ← add vehicle identity span
Step 8  Locale files                ← add all missing i18n keys
Step 9  npm run build               ← zero TypeScript errors required
```

---

## Constraints

- **Do not touch** `AddTransactionPage.tsx` — it must not receive any split view props
- **Do not touch** `VehicleForm.tsx` — the vehicle split view is working correctly, leave it alone
- **Do not touch** `FinancialMetricsStrip.tsx`, `index.css`, `RelatedTransactionsTable.tsx` — those fixes are confirmed shipped
- **Do not touch** the backend — this is frontend-only
- The `StickyFooter` in `TransactionForm` already exists — do not create a new one, just add the toggle button into it
- The vehicle identity in the footer must use `hidden sm:inline` — the footer is crowded on mobile
- All user-visible strings go through `t()` — no hardcoded English

---

## Verification Checklist

### Fix 1 — Transaction Split View

- [ ] Toggle button appears in the StickyFooter of the transaction edit page
- [ ] Toggle button does NOT appear on the add transaction page
- [ ] Split view is ON by default (first load, no localStorage key)
- [ ] Toggling persists across page reload (localStorage key `acar_transaction_split_view`)
- [ ] In split view at 2xl+: left panel has form cards, right panel has vehicle selector + link + transactions table
- [ ] In split view: vehicle selector does NOT appear in the left panel
- [ ] In split view: "Go to Vehicle" link appears only when a vehicle is linked
- [ ] In split view: transactions table is scrollable, does not overflow the viewport
- [ ] In normal view (toggle OFF): layout is identical to pre-agent state
- [ ] On add transaction page: layout is always normal stacked (no split, no toggle)
- [ ] Below 2xl breakpoint: split view gracefully falls back to single column

### Fix 2 — Vehicle Edit Header and Footer

- [ ] Header reads: `Edit — {Make} {Model} #{ID}` in bold, large text (`text-2xl font-bold`)
- [ ] Header `#ID` is slightly muted compared to make/model
- [ ] No separate small subtitle showing make/model (it's now in the heading)
- [ ] Footer shows `{Make} {Model} #{ID}` between back button and status buttons
- [ ] Footer identity is hidden on small screens (`hidden sm:inline`)
- [ ] Footer identity does not push existing footer buttons off screen
- [ ] All new strings use `t()` — no hardcoded English text
- [ ] i18n keys added to all four locale files

### General

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Dark mode: nothing broken
- [ ] Vehicle edit page split view: unchanged, still works (no regression)
