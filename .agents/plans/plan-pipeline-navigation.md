# plan-pipeline-navigation.md

> Features:
> 1. Bidirectional vehicle status pipeline with visual pipeline UI in footer and vehicle cards
> 2. Sale field values preserved but excluded from calculations when status is Purchased
> 3. Transaction autosave guard — block save if a mandatory field is emptied
> 4. Inactive vehicle UI — replace pipeline with reactivate button
>
> Before writing a single line of code, read `idea.md` and `developer-guide.md`.

---

## Feature 1 — Bidirectional Vehicle Status Pipeline

### Current behavior (what exists today)
The app only allows moving **forward** in the pipeline:
```
Purchased → Ready for Sale → Reserved → Sold
```
There is no way to go back. If a customer ditches a reservation, the vehicle is stuck at Reserved with no way to revert to Purchased or Ready for Sale.

### New allowed transitions

| Current Status | Can move TO |
|---|---|
| `purchased` | `ready_for_sale`, `reserved` |
| `ready_for_sale` | `purchased`, `reserved`, `sold`* |
| `reserved` | `purchased`, `ready_for_sale`, `sold`* |
| `sold` | `ready_for_sale`, `reserved` (**not** Purchased — can never un-sell back to raw purchase) |

`*` Moving to `sold` requires sale fields to be complete — this existing gate (`can_generate_sale_contract` flag) **must remain enforced at all costs**. Do not weaken it.

`inactive` is handled separately — see Feature 4.

---

## Feature 2 — Sale Fields Hidden But Excluded From Calculations When Status Is Purchased

### What this means
When a vehicle is in `purchased` status:
- Sale fields and sale calculations are **hidden** in the UI (this already works today — keep it).
- Any sale field values that exist in the database (left over from a previous `reserved` or `ready_for_sale` stint) must be **excluded from all calculations and statistics** across the entire app.
- This includes: dashboard KPIs, vehicle list analytics strip, financial summaries, per-vehicle financial metrics, any aggregate query that touches revenue or profit.
- The values are NOT deleted from the database — they stay so they can reappear if the vehicle moves back to a sale-visible status.

### Where calculations live (files to audit)
- `frontend/src/lib/vehicleFinancials.ts` — per-vehicle calculations. Add a guard: if `vehicle.status === "purchased"`, zero out all sale-side inputs before computing.
- Backend aggregate endpoints (vehicle list analytics, dashboard) — the Django queries must filter out sale values for vehicles with `status = "purchased"`. Check `vehicle_api.py` and any dashboard/analytics endpoint.
- Any place that computes revenue, gross profit, net profit, margin, ROI must respect this rule.

### Same rule for `inactive`
Inactive vehicles must also be excluded from all calculations everywhere. (This was already stated as intended behavior — confirm it is actually enforced in every query and frontend calc. If not, fix it as part of this feature.)

### Implementation note — backend
Add a utility or annotation in the Django queryset layer:

```python
# Vehicles that should contribute to financial calculations:
CALCULATION_ELIGIBLE_STATUSES = ["ready_for_sale", "reserved", "sold"]

# In any aggregate query:
qs = Vehicle.objects.filter(
    business=business,
    is_active=True,
    status__in=CALCULATION_ELIGIBLE_STATUSES
)
```

This single constant, used consistently, is the source of truth. Do not scatter status checks across multiple endpoints.

---

## Feature 3 — Pipeline UI in Vehicle Edit Footer

### Design

The footer currently has status change buttons. Replace them with a **compact horizontal pipeline indicator** that fits in the existing footer height without making it taller.

```
[ Purchased ]  →  [ Ready for Sale ]  [ Reserved ]  →  [ Sold ]
```

The branching (Ready for Sale and Reserved are both reachable from Purchased, and both lead to Sold) is shown by having them side-by-side in the middle column. The arrows (`→`) are just visual separators, not interactive.

**Visual states for each status button:**

| State | Appearance |
|---|---|
| **Current status** | Full color (uses the existing status color from `colors.md`), solid background, white text, slightly larger or bolder |
| **Clickable** (valid transition) | Dimmed version of that status's color — e.g. `bg-amber-400/30 text-amber-600 border border-amber-400/50`, cursor-pointer, hover brightens to near-full color |
| **Not clickable** (invalid transition for current status) | Muted gray, `opacity-40`, `cursor-not-allowed`, no hover effect |

Use the existing CSS variable colors from `colors.md`:
- Purchased: `--color-status-purchased` (amber)
- Ready for Sale: `--color-status-ready-for-sale` (blue)
- Reserved: `--color-status-reserved` (purple)
- Sold: `--color-status-sold` (green)

**Sold button special case:** Even if `sold` is a valid transition for the current status, if `can_generate_sale_contract` is false (sale fields incomplete), the Sold button is `cursor-not-allowed` with a tooltip: `t("vehicles.pipeline.sold_fields_incomplete")` — something like "Fill in all sale fields first."

**Compact layout:** Each status is a small pill/badge-style button, not a full-width button. They sit in a single row. The whole pipeline group sits on the right side of the footer alongside the existing deactivate, doc generate, and nav arrow buttons. If horizontal space is very tight at smaller breakpoints, consider hiding the label text and keeping only the icon + tooltip at `lg:` and below.

### New component
Create `components/vehicles/VehiclePipeline.tsx`:

```tsx
interface VehiclePipelineProps {
  currentStatus: VehicleStatus
  canMoveTo: VehicleStatus[]    // computed from transition rules above
  canSell: boolean              // = can_generate_sale_contract from API
  onStatusChange: (newStatus: VehicleStatus) => void
  isLoading?: boolean
}
```

Use this in:
1. `VehicleEditPage.tsx` — inside the `StickyFooter`, replacing the current status change buttons
2. `VehicleCard.tsx` (vehicle list page) — **vertical layout** (see below)

### Vertical layout for Vehicle Cards (list page)

On the vehicle list cards, the pipeline is shown **vertically** as a compact sidebar-style indicator on the card:

```
● Purchased
  │
○ Ready for Sale
○ Reserved
  │
○ Sold
```

- Filled circle (`●`) = current status, full color
- Empty circle (`○`) = other statuses, dimmed
- Vertical line connecting the stages
- Clicking a reachable status on the card triggers the same status change (with the same sold-gate rule)
- This replaces or sits alongside the current quick-action status change button on the card

The vertical pipeline on cards should be narrow — it is a secondary UI element on the card, not the headline. Keep the card layout from getting wider. Place it on the right edge of the card.

---

## Feature 4 — Inactive Vehicle UI

When `vehicle.is_active === false`:

**In the footer (edit page):** Hide the pipeline entirely. Replace it with:
- A gray/muted badge: `Inactive` (using `--color-status-inactive`)
- A single `Reactivate` button that calls the existing reactivate endpoint and sets `is_active = true` and restores the vehicle's last active status (or defaults to `purchased` if none stored)

**On vehicle cards (list page):** Same — hide the vertical pipeline, show a gray Inactive badge and a Reactivate button.

**No calculations:** Inactive vehicles produce zero contribution to any financial calculation or statistic — this must be enforced at the backend query level, not just hidden in the UI.

---

## Feature 5 — Transaction Autosave Guard (Mandatory Field Emptied)

### Problem
Today, if a Reviewed transaction has a mandatory field cleared and the autosave fires, the backend saves an empty value for a mandatory field. This is wrong.

### New behavior
When autosave is about to fire on a transaction edit:
1. Before sending the PATCH, validate the full current form state against the transaction Zod schema.
2. If any mandatory field is empty/null/undefined:
   - **Do NOT send the PATCH.**
   - Show the autosave indicator as `"failed"` (same visual as a network error, but with a different message — use `t("autosave.failed_mandatory")`): something like "Not saved — required field is empty."
   - The field with the problem gets the amber empty-field highlight from `plan-field-empty-highlight.md`.
3. If ALL mandatory fields are filled, the PATCH fires normally and the indicator shows `"saved"`.

### Field-level independence (important edge case)
Autosave fires per-field, not for the whole form at once. The guard must work per-save-attempt:

- Field A (mandatory) was saved OK earlier → its value is in the database. ✓
- Field B (mandatory) is now emptied → autosave for Field B is blocked, shows failed. ✗
- Field A's previously saved value is **not affected** — it remains saved in the database.
- If Field B is then corrected and filled → autosave fires for Field B, shows saved. ✓
- The failed indicator only reflects the last save attempt, not the overall form state.

### Where to implement
The guard goes inside `useAutoSave.ts`. Before the API call, run:

```typescript
// Pseudo-code inside useAutoSave saveNow / saveDebounced:
const currentValues = getValues() // from RHF context passed into the hook
const result = transactionUpdateSchema.safeParse(currentValues)
if (!result.success) {
  setStatus("failed_mandatory") // new status variant
  return // abort the PATCH
}
// proceed with api.patch(...)
```

The `AutoSaveIndicator` component needs a new visual state for `"failed_mandatory"` — distinct from network failure. Suggested: same red X icon but message says `t("autosave.failed_mandatory")` instead of a generic error.

### Transaction status NOT auto-demoted
Do NOT automatically change a Reviewed transaction back to Under Review if a field is emptied. Just block the save and show the indicator. The status change is manual and intentional; auto-demotion would be confusing.

---

## Backend Changes Required

### 1. New status transition endpoint flexibility
The existing `POST /api/vehicles/{id}/change-status` endpoint likely validates only forward transitions. Update the allowed transitions map to match the new bidirectional rules from Feature 1.

In `vehicle_api.py`, find the transition validation and replace with:

```python
ALLOWED_TRANSITIONS = {
    "purchased":      ["ready_for_sale", "reserved"],
    "ready_for_sale": ["purchased", "reserved", "sold"],
    "reserved":       ["purchased", "ready_for_sale", "sold"],
    "sold":           ["ready_for_sale", "reserved"],
    # inactive is handled separately via is_active flag
}
```

The `sold` gate (checking sale field completeness) stays as-is — run it before accepting any transition TO `sold`.

### 2. Calculation queries — status exclusion
Audit every aggregation query in:
- `vehicle_api.py` — list analytics, financial summaries
- Any dashboard/analytics endpoints
- Any endpoint that returns totals, averages, or profit metrics

Add the `CALCULATION_ELIGIBLE_STATUSES` filter (see Feature 2) to all of them. Do not leave any aggregate query that could accidentally include `purchased` or `inactive` vehicles in revenue/profit totals.

### 3. `can_move_to` field on vehicle detail response
Add a computed field to the vehicle detail schema so the frontend doesn't need to reimplement the transition logic:

```python
class VehicleDetailOut(Schema):
    # ... existing fields ...
    can_move_to: list[str]  # e.g. ["purchased", "reserved"] when status is ready_for_sale
    can_generate_sale_contract: bool  # already exists — keep it
```

This keeps the transition rules in one place (backend) and the frontend just reads `can_move_to`.

---

## Frontend Changes Summary

| File | Change |
|---|---|
| `components/vehicles/VehiclePipeline.tsx` | **New file** — horizontal pipeline for footer |
| `components/vehicles/VehicleCard.tsx` | Replace status button with vertical pipeline |
| `pages/VehicleEditPage.tsx` | Swap status buttons for `<VehiclePipeline>`, add inactive guard |
| `lib/vehicleFinancials.ts` | Guard: zero out sale inputs if `status === "purchased"` |
| `hooks/useAutoSave.ts` | Add mandatory-field pre-validation guard for transactions |
| `components/AutoSaveIndicator.tsx` | Add `"failed_mandatory"` visual state |
| `locales/{de,en,tr,ar}.json` | New translation keys (see below) |

---

## New Translation Keys Needed

```json
{
  "vehicles.pipeline.sold_fields_incomplete": "Fill in all sale fields to mark as Sold",
  "vehicles.pipeline.reactivate": "Reactivate Vehicle",
  "vehicles.pipeline.inactive_label": "Inactive",
  "autosave.failed_mandatory": "Not saved — required field is empty"
}
```

Add these to all four locale files. German is the default — make sure DE is complete. EN, TR, AR can be filled in or left as the EN fallback initially.

---

## QA Checklist

### Vehicle status transitions
- [ ] Purchased → Ready for Sale: works
- [ ] Purchased → Reserved: works
- [ ] Purchased → Sold: **blocked** (not a valid transition)
- [ ] Ready for Sale → Purchased: works (new)
- [ ] Ready for Sale → Reserved: works
- [ ] Ready for Sale → Sold with incomplete sale fields: blocked with tooltip
- [ ] Ready for Sale → Sold with complete sale fields: works
- [ ] Reserved → Purchased: works (new)
- [ ] Reserved → Ready for Sale: works (new)
- [ ] Reserved → Sold with incomplete fields: blocked
- [ ] Reserved → Sold with complete fields: works
- [ ] Sold → Ready for Sale: works (new)
- [ ] Sold → Reserved: works (new)
- [ ] Sold → Purchased: **blocked** (not valid)
- [ ] Inactive vehicle: pipeline hidden, Reactivate button shown
- [ ] Reactivate: restores vehicle to active, pipeline reappears

### Pipeline UI
- [ ] Current status pill is bright / full color
- [ ] Reachable statuses are dimmed but visible and have hover effect
- [ ] Unreachable statuses are gray and cursor-not-allowed
- [ ] Sold button has tooltip when sale fields are incomplete
- [ ] Footer height has not increased
- [ ] Vertical pipeline on vehicle cards renders correctly
- [ ] Both light mode and dark mode look correct

### Calculations
- [ ] Purchased vehicle: sale figures do NOT appear in dashboard totals
- [ ] Purchased vehicle: sale figures do NOT appear in vehicle list analytics
- [ ] Inactive vehicle: does NOT appear in any financial calculation
- [ ] Vehicle moved from Sold → Reserved: its sale figures DROP from totals immediately
- [ ] Vehicle moved from Reserved → Sold: its sale figures APPEAR in totals
- [ ] Sale field values are preserved in DB when moving backward (not wiped)

### Transaction autosave guard
- [ ] Clearing a mandatory field: PATCH is blocked, indicator shows failed message
- [ ] Re-filling the cleared field: PATCH fires, indicator shows saved
- [ ] Previously saved fields are unaffected by a failed save on a different field
- [ ] Network error and mandatory-field failure show distinct messages
- [ ] Reviewed status does NOT change to Under Review when a field is emptied

---

## What NOT to Do

- Do not delete sale field values from the database when moving a vehicle backward. Preserve them.
- Do not allow Purchased → Sold as a direct transition. It skips the pipeline.
- Do not allow Sold → Purchased as a transition. You cannot un-sell a vehicle all the way back to raw purchase.
- Do not auto-demote a transaction from Reviewed to Under Review on field clear. Just block the save.
- Do not make the footer taller. The pipeline pills must fit in the existing height.
- Do not scatter the transition rules across frontend and backend. Backend owns the rules via `can_move_to`; frontend just renders them.
- Do not modify `components/ui/` base components.
- Do not break the existing `can_generate_sale_contract` sold-gate. It is the most important business rule in the pipeline.
