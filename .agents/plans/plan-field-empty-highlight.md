# plan-field-empty-highlight.md

> Feature: Mandatory Field Empty-State Visual Indicator
> Before writing a single line of code, read `idea.md` and `developer-guide.md`.

---

## What We're Building

Right now, mandatory fields are only marked with a red asterisk (`*`) next to their label.
There is no visual difference between a filled mandatory field and an **empty** mandatory field — until the user clicks Save/Create and the red error state fires.

This feature adds a **subtle, persistent visual cue** on mandatory fields that are currently empty:
a muted amber/warm-neutral border (not red, not yellow, not alarming) so the manager can scan a form and instantly see what still needs to be filled — without submitting first.

The goal is clarity without noise. The form should still look clean and professional.

---

## Color Choice

### The Color: Muted Amber — `amber-400/50` border tint

- **Light mode**: `border-amber-300` — a soft, warm gold that reads as "attention needed" without screaming.
- **Dark mode**: `border-amber-500/60` — slightly brighter to stay visible against dark backgrounds, still not harsh.
- **Why amber?** It's already used in the system (`--color-status-purchased` is amber). It reads as "pending / needs action" in this codebase's visual language. It will not be confused with the red destructive error state.
- **Why not red?** Red = error = something went wrong. An empty field isn't wrong yet — it just needs to be filled. Red would feel alarming and is reserved for post-submit validation errors.
- **Why not yellow?** Too bright. Makes the form look like a warning sign.
- **The feel:** Like a gentle highlight. A field with this border says "I'm waiting" — not "you messed up."

---

## Scope

This applies to every form in the app:

| Page | Form |
|------|------|
| `VehicleFormPage` | Add New Vehicle |
| `VehicleEditPage` | Edit Vehicle |
| `TransactionFormPage` | Add New Transaction |
| `TransactionEditPage` | Edit Transaction |
| `EntityFormPage` (or inline) | Add / Edit Legal Entity |

The vehicle edit page is the most important — it has the most fields and the manager spends the most time there.

---

## Behavior Spec

### When the highlight appears
- A mandatory field shows the amber border **if and only if**:
  - The field is marked as mandatory (has the `*` asterisk), AND
  - The field's current value is empty, null, undefined, or 0 (for numeric fields where 0 is not valid).
- The highlight is **always on** — not just after a submit attempt. The manager should see it the moment he opens a half-filled vehicle record.

### When the highlight disappears
- The moment the field receives a valid, non-empty value, the amber border is gone. No delay, no blur event needed — reactive.

### When the red error state fires (unchanged)
- On submit/save with missing mandatory fields, the existing React Hook Form `formState.errors` red error still fires as today. The amber highlight is a **pre-submit companion**, not a replacement for error validation.
- When a field is in red error state, the red border takes visual priority over the amber one. Both should not show simultaneously — red wins.

### Fields that need the highlight

**Inputs / Textareas**: border color changes.
**Select / DynamicSelect / SearchableSelect**: border color changes on the trigger button.
**File/Image inputs**: a faint amber background tint on the upload area container.

---

## Implementation Plan

### Step 1 — Create a reusable CSS class / utility

Add a Tailwind utility class (or a small helper) for the empty-mandatory border state.
Do NOT hardcode the amber color on every component. Centralise it.

**Option A — Tailwind classes (preferred):**

Define a consistent class string to apply conditionally:
```ts
// lib/utils.ts — add this helper
export function emptyMandatoryClass(isEmpty: boolean): string {
  if (!isEmpty) return ""
  return "border-amber-300 dark:border-amber-500/60"
}
```

**Option B — CSS variable in globals.css:**
```css
/* If you want a single token to update later */
:root {
  --color-field-empty: theme(colors.amber.300);
}
.dark {
  --color-field-empty: rgb(217 119 6 / 0.6); /* amber-600 at 60% */
}
```

Use Option A unless the team wants a design token for this. Option A is faster and keeps it in TypeScript where the conditional logic already lives.

---

### Step 2 — Define which fields are mandatory per form

This information already exists in two places:
1. The Zod schema in `lib/validations.ts` — required fields are non-optional there.
2. The `*` asterisk in the JSX labels.

Do NOT re-derive this logic. Use the Zod schema as the source of truth.

For each form, identify the mandatory fields and extract a small helper or list:

```ts
// Example for Vehicle form — derive from existing Zod schema
const MANDATORY_VEHICLE_FIELDS = [
  "make_id",
  "vehicle_model_id",
  "year",
  "buy_price",
  // ... (check validations.ts for the full list)
] as const
```

Avoid hardcoding if React Hook Form can tell you. RHF's `getFieldState(name)` and the Zod schema resolver will flag required fields — but only after first interaction by default. Since we want the highlight before interaction, we need a `watch()`-based approach (see Step 3).

---

### Step 3 — Wire up the conditional class in each form

Use React Hook Form's `watch()` to observe mandatory field values reactively.

```tsx
// Inside the form component:
const { watch, formState: { errors } } = useFormContext() // or useForm()

const makeId = watch("make_id")
const year = watch("year")

// Apply to the field wrapper or input directly:
<DynamicSelect
  name="make_id"
  className={cn(
    "w-full",
    emptyMandatoryClass(!makeId), // amber if empty
    errors.make_id && "border-destructive" // red takes priority on error
  )}
/>
```

**Priority rule in className order:**
Always put the error class (`border-destructive`) after the empty class so Tailwind specificity or the last-wins rule resolves to red when both conditions are technically true (post-submit, field still empty).

---

### Step 4 — Apply to shadcn/ui component variants

The shadcn `Input`, `Select`, and `Textarea` components accept a `className` prop that merges into their root element's border. No component internals need to change.

For `DynamicSelect` and `SearchableSelect`, the amber class should go on the trigger `<Button>` element — that's the visible border the user sees.

For image upload fields: wrap the upload area in a `<div>` and apply `ring-1 ring-amber-300 dark:ring-amber-500/60` instead of border — ring doesn't affect layout and looks cleaner on image containers.

---

### Step 5 — Vehicle Edit Page (autosave context)

The vehicle edit page uses **autosave** (PATCH on field change), not a submit button. This means:
- There is no "submit attempt" trigger.
- The amber highlight is especially important here — it tells the manager at a glance which fields are still empty when he opens a vehicle record.

Implementation is the same as Step 3. `watch()` is already being used for autosave triggers — piggyback on that.

**Do not disable autosave when a mandatory field is empty.** Autosave partial saves are fine. The highlight is purely visual.

---

### Step 6 — Legal Entity inline form

The legal entity form can appear both as its own page AND as a larger inline form inside the vehicle edit page. The same logic applies in both contexts because it uses the same form component. No extra work needed if the component is shared correctly (it should be).

---

### Step 7 — i18n

No new translation keys needed. This is a visual-only change.

---

### Step 8 — QA checklist

Before marking this done, verify:

- [ ] Light mode: amber border is clearly visible but not jarring on empty mandatory fields
- [ ] Dark mode: amber border is still visible (not washed out) on dark backgrounds
- [ ] Filled field: no amber border at all
- [ ] Post-submit with error: red border only — amber does not show alongside red
- [ ] Non-mandatory field: no amber border regardless of value
- [ ] Image upload area: ring tint shows, not full border
- [ ] DynamicSelect: trigger button shows the tinted border
- [ ] SearchableSelect: trigger button shows the tinted border
- [ ] Vehicle edit page: works with autosave (no submit button) context
- [ ] Transaction edit page: works correctly
- [ ] Add New Vehicle / Add New Transaction: works on fresh empty forms
- [ ] Legal entity inline form (inside vehicle edit): works
- [ ] Legal entity standalone page: works
- [ ] Switching locale does not break anything

---

## Files That Will Change

| File | Change |
|------|--------|
| `frontend/src/lib/utils.ts` | Add `emptyMandatoryClass()` helper |
| `frontend/src/pages/VehicleEditPage.tsx` | Apply conditional class to mandatory fields |
| `frontend/src/pages/VehicleFormPage.tsx` | Apply conditional class to mandatory fields |
| `frontend/src/pages/TransactionEditPage.tsx` | Apply conditional class to mandatory fields |
| `frontend/src/pages/TransactionFormPage.tsx` | Apply conditional class to mandatory fields |
| `frontend/src/components/legal-entities/EntityForm.tsx` | Apply conditional class to mandatory fields |
| `frontend/src/components/vehicles/VehicleForm.tsx` | If vehicle fields are in a shared component, change here instead of the page |

Check `frontend/src/lib/validations.ts` before starting to confirm which fields are required by the Zod schema — that is the authoritative mandatory field list, not the asterisk labels (which may be incomplete per known backlog item).

---

## What NOT to Do

- Do not use `!important` overrides or inline styles.
- Do not add the amber class to non-mandatory fields.
- Do not replace the existing red error state — this is additive.
- Do not trigger the highlight only on blur/submit — it must be visible on page load for pre-filled-but-incomplete records (vehicle edit use case).
- Do not use arbitrary color values — use only Tailwind scale classes (`amber-300`, `amber-500/60`).
- Do not modify files in `components/ui/` — shadcn base components are untouched; apply classes via props.

---

## Out of Scope for This Feature

- Adding missing `*` asterisks to fields that currently lack them (separate backlog item).
- Changing the post-submit red error message behavior.
- Any backend changes — this is 100% frontend.
