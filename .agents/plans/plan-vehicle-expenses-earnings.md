# Plan: Vehicle Expenses & Earnings (MVP) + Remove Sale Commission

## 0. Docs-vs-code mismatches found (flagging, not silently trusting docs)

While verifying via Codegraph/direct file reads, these were confirmed **against actual code**, not just docs:

1. **`sale_commission` really exists and is wired end-to-end**: `Vehicle.sale_commission` (backend/manager/models.py:821), exposed in `VehicleDetailOut` (schemas.py:356) and `VehicleUpdate` (schemas.py:504), serialized in `serialize_vehicle_detail` (api.py:254), typed in `frontend/src/types/vehicle.ts:82`, validated in `frontend/src/lib/validations.ts:121`, and rendered in `VehicleForm.tsx` (lines 1240-1250 JSX block, plus default-value wiring at lines 238 and 454). All of these must be touched to remove it cleanly — PROJECT_MAP.md/developer_guide.md do not enumerate all of these call sites, so this list below is the authoritative one.
2. **Category/Subcategory choices are already fully reusable for this feature.** The `/api/choices` endpoint (`get_all_choices` in api.py:937) already returns `categories` and `subcategories` (with `category_id` on each subcategory), and `VehicleForm.tsx` already loads this via `useChoices(vehicle?.id)`. The `DynamicSelect` component (`frontend/src/components/ui/dynamic-select.tsx`) already supports `choiceType="category"` and `choiceType="subcategory"` (with `parentId`) and POSTs new items to `/transactions/choices/{choiceType}`, exactly matching what `TransactionForm.tsx` uses. **Confirmed: zero backend choice/endpoint changes are needed to reuse category/subcategory** — this matches what you asked for.
3. **The existing `Transaction` model is a separate concept from what you're describing.** `Vehicle.total_revenue` / `total_expenses` / `net_profit` (models.py ~940-965) already aggregate `vehicle.vehicle_transactions` (the `Transaction` model's `related_name` for its `vehicle` FK, models.py:1163) using a signed `amount`. These fields are already in `VehicleDetailOut` (schemas.py:373-375) and `vehicle.ts` (lines 90-92) **but are not rendered anywhere in the current UI** (confirmed via grep — no usage in `VehicleForm.tsx` or `FinancialMetricsStrip.tsx`). This is pre-existing, dead-in-the-UI infrastructure tied to full bank `Transaction` records, not to the new lightweight per-vehicle entries you're describing. I am **not** touching it. Flagging it because it's a natural target for your "later" linking idea, but that's out of scope now.
4. **Design system has no pre-existing green/red "financial" token**, but `frontend/src/index.css` already defines plain utility classes `.text-success` / `.bg-success` (`#16a34a`) and `.text-error` / `.bg-error` (`#ef4444`), lines ~199-220. These are NOT part of the Tailwind `@theme` layer (they're hand-written CSS classes), so Tailwind opacity-modifier syntax like `bg-success/10` will NOT work on them. The plan below uses them as solid-fill banners instead. Flagging this so nobody tries `bg-success/10` later and wonders why it's invisible.

## 1. Feature scope confirmation (MVP only, per your instructions)

Building now:
- A new small card in the Vehicle edit page, in the space freed up by combining Description + Internal Comments into one row.
- "+ Add Expense/Earning" button → inline form (Category, Subcategory, Type toggle, Amount).
- Amount input disabled until Type is chosen; shows a fixed non-removable `−` or `+` sign based on Type.
- On Add: new small banner appears, red background for expense, green for earning, showing type + amount.
- Remove the `sale_commission` field entirely (backend + frontend).

Explicitly NOT building now (per your "not now" note, design only kept forward-compatible):
- Linking Expense/Earning entries to actual `Transaction` records (many-to-many).
- The grayed-out "linked transactions" field on the Expense/Earning form.
- Vehicle-transaction connection shown in `RelatedTransactionsTable.tsx`.
- Buy/Sale price auto-appearing as expense/earning options.
- "Link to transactions" blue text under Buy/Sale price fields.

The new model is deliberately **not** using `on_delete=CASCADE` in a way that would make future linking hard, and uses a plain integer PK so a future M2M-through table can reference it cleanly — but no M2M field is added now.

## 2. Layout decision for the freed-up card space (design assumption — flagging for your confirmation)

Current structure in `frontend/src/components/vehicles/VehicleForm.tsx`, inside the "Basic Info" grid (`className="grid gap-2 md:grid-cols-2 lg:grid-cols-6"`, opens at line 716):
- Line 978-988: Vehicle Image — `className="max-w-md md:col-span-2 lg:col-span-2 lg:row-span-2"`
- Line 990-999: Description — `className="space-y-2 md:col-span-2 lg:col-span-2"`
- Line 1001-1009: Internal Comments — `className="space-y-2 md:col-span-2 lg:col-span-2"`
- Line 1010: closing `</div>` of the 6-col grid
- Line 1011: closing `</div>` of the Basic Info section wrapper

My concrete interpretation of your ask ("make description + internal comments take one field in vertical length, freeing an area of two fields, sized like buy/sale details but smaller"):

Pull these 3 elements out of the flowing 6-col grid into their own **dedicated 4-column sub-grid** (so their position doesn't depend on how many fields precede them, and so the freed rectangle is predictable):

```
New local grid: grid grid-cols-1 md:grid-cols-4 gap-2
├─ col-span-2, row-span-2: Vehicle Image (unchanged component/props)
├─ col-span-1, row 1:      Description (textarea, same styling, narrower)
├─ col-span-1, row 1:      Internal Comments (textarea, same styling, narrower)
└─ col-span-2, row 2:      <VehicleExpensesEarningsCard /> ← NEW
```

This makes Description and Internal Comments sit side-by-side (one row tall, instead of two stacked full-width rows), which is what frees up exactly a "2-field-wide, 1-row-tall" area — directly under them, next to the image — for the new card. This is a smaller footprint than the Buy/Sale Details cards (which are full-width `xl:grid-cols-2` cards below), matching "not as big."

**I'm flagging this as my interpretation, not a literal transcription of your message** — the prose described the visual goal but not exact CSS. If you want a different arrangement after seeing it, it's a small follow-up change confined to this one file section.

## 3. Backend

### Task: Add VehicleExpenseEarning model + migration
SCOPE: `backend/manager/models.py`, `backend/manager/migrations/0068_vehicleexpenseearning.py` (generated)
MODE: sequential — must run before any other backend task; other backend tasks depend on this model existing

Steps:
1. In `backend/manager/models.py`, insert a new model class immediately **after** the `Transaction` model class ends and **before** `class AuthActionRequest` (Transaction's `save()` ends around line 574, `__str__` shortly after — insert after that class closes, matching the file's existing clustering of financial models: Category/Subcategory around lines 455-525, Transaction after that).

```python
class VehicleExpenseEarning(models.Model):
    """
    Lightweight, vehicle-scoped expense/earning entry (MVP).
    Distinct from Transaction — NOT linked to bank transactions yet.
    Reuses the same Category/Subcategory models as Transaction.
    """
    TYPE_CHOICES = [
        ('expense', _('Expense')),
        ('earning', _('Earning')),
    ]

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='vehicle_expenses_earnings',
        verbose_name=_('business'),
    )
    vehicle = models.ForeignKey(
        'Vehicle',
        on_delete=models.CASCADE,
        related_name='expenses_earnings',
        verbose_name=_('vehicle'),
    )
    category = models.ForeignKey(
        'Category',
        on_delete=models.PROTECT,
        related_name='vehicle_expenses_earnings',
        verbose_name=_('category'),
    )
    subcategory = models.ForeignKey(
        'Subcategory',
        on_delete=models.PROTECT,
        related_name='vehicle_expenses_earnings',
        verbose_name=_('subcategory'),
    )
    type = models.CharField(_('type'), max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(_('amount'), max_digits=12, decimal_places=2)
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def signed_amount(self):
        return self.amount if self.type == 'earning' else -self.amount

    def __str__(self):
        return f"{self.get_type_display()}: {self.amount} ({self.vehicle_id})"
```

   - `on_delete=models.PROTECT` on category/subcategory is a deliberate choice matching this project's "never hard-delete data" convention (developer_guide.md) — categories are soft-deactivated (`is_active=False`) elsewhere, never hard-deleted, so PROTECT should never actually fire in practice, but it's a safety net instead of silently nulling out financial records.
2. Run `python manage.py makemigrations manager` from `backend/` — expect a new file `backend/manager/migrations/0068_vehicleexpenseearning.py` (next available number after `0067_remove_legalentity_city_remove_legalentity_country_and_more.py`). Do not hand-write the migration; verify the generated one only adds this one model.
3. Run `python manage.py migrate` locally to confirm it applies cleanly.

### Task: Remove sale_commission from Vehicle model
SCOPE: `backend/manager/models.py`, `backend/manager/migrations/0069_remove_vehicle_sale_commission.py` (generated)
MODE: sequential — same file as previous task (models.py), must run after Task above so migration numbering stays linear; do not combine into the same migration (keep additive and destructive schema changes in separate migrations for easier rollback)

Steps:
1. In `backend/manager/models.py`, delete the field definition at line 821: `sale_commission = models.DecimalField(_('sale commission'), blank=True, null=True, max_digits=12, decimal_places=2)`.
2. Run `python manage.py makemigrations manager` — expect `0069_remove_vehicle_sale_commission.py` with a single `RemoveField` operation.
3. Run `python manage.py migrate`.

### Task: Add schemas for the new entries + remove sale_commission schema fields
SCOPE: `backend/manager/schemas.py`
MODE: sequential — depends on the model from Task 1 existing; also removes sale_commission (same file, must not run in parallel with anything else touching this file)

Steps:
1. Add new schemas near `AllChoices`/`VehicleDetailOut` (schemas.py, same file section as `CategoryOut`/`SubcategoryOut`):
```python
class VehicleExpenseEarningOut(Schema):
    id: int
    category_id: int
    category_name: str
    subcategory_id: int
    subcategory_name: str
    type: str
    amount: Decimal
    created_at: datetime


class VehicleExpenseEarningCreate(Schema):
    category_id: int
    subcategory_id: int
    type: str  # "expense" | "earning"
    amount: Decimal = Field(gt=0)
```
   (Confirm `datetime` and `Field` are already imported at the top of schemas.py; if not, add `from datetime import datetime` and `Field` to the existing `from ninja import Schema, Field` or `pydantic` import line — check the exact existing import line before adding a duplicate.)
2. In `class VehicleDetailOut(Schema)`, immediately after the `net_profit: Decimal = Decimal("0")` line (schemas.py:375), add:
```python
    expenses_earnings: List[VehicleExpenseEarningOut] = []
```
3. In `class VehicleDetailOut(Schema)`, delete line 356: `sale_commission: Optional[Decimal] = None`.
4. In `class VehicleUpdate(Schema)`, delete line 504: `sale_commission: Optional[Decimal] = Field(default=None, ge=0)`.
5. Leave `class VehicleCreate(Schema)` untouched — confirmed via grep it never had a `sale_commission` field (sale details are only set post-creation via update).

### Task: Add expenses/earnings endpoints + remove sale_commission serialization
SCOPE: `backend/manager/api.py`
MODE: sequential — depends on schemas from the previous task; touches the same `serialize_vehicle_detail` function that also needs the sale_commission line removed, so both changes must be done together by the same agent to avoid a broken intermediate state

Steps:
1. Add import: extend the `from .models import (...)` block at the top of api.py to include `VehicleExpenseEarning` (Category/Subcategory are already imported — confirmed via grep).
2. Add import for the two new schemas to the existing `from .schemas import (...)` block: `VehicleExpenseEarningOut, VehicleExpenseEarningCreate`.
3. In `serialize_vehicle_detail(vehicle)` (api.py, function starting ~line 200), delete the line `"sale_commission": vehicle.sale_commission,` (currently at api.py:254 within the dict update, "Sale details" comment block).
4. In the same function, immediately after the existing `"transactions": [...]` block (api.py ~line 269-281, the list comprehension over `vehicle.vehicle_transactions.exclude(status='inactive')`), add a sibling key:
```python
        "expenses_earnings": [
            {
                "id": e.id,
                "category_id": e.category_id,
                "category_name": e.category.name if e.category else None,
                "subcategory_id": e.subcategory_id,
                "subcategory_name": e.subcategory.name if e.subcategory else None,
                "type": e.type,
                "amount": e.amount,
                "created_at": e.created_at,
            }
            for e in vehicle.expenses_earnings.filter(is_active=True).select_related('category', 'subcategory')
        ],
```
5. Add three new endpoints, placed directly after `upload_vehicle_image` (api.py, ends ~line 930, right before the `# Dynamic Choices Endpoints` section comment at line 933):
```python
@router.get("/vehicles/{internal_id}/expenses-earnings", response={200: List[VehicleExpenseEarningOut], 404: ErrorResponse})
def list_vehicle_expenses_earnings(request, internal_id: int):
    """List active expense/earning entries for a vehicle."""
    business = get_user_business(request)
    vehicle = get_object_or_404(Vehicle, business=business, internal_id=internal_id)
    entries = vehicle.expenses_earnings.filter(is_active=True).select_related('category', 'subcategory')
    return [
        {
            "id": e.id,
            "category_id": e.category_id,
            "category_name": e.category.name if e.category else None,
            "subcategory_id": e.subcategory_id,
            "subcategory_name": e.subcategory.name if e.subcategory else None,
            "type": e.type,
            "amount": e.amount,
            "created_at": e.created_at,
        }
        for e in entries
    ]


@router.post("/vehicles/{internal_id}/expenses-earnings", response={201: VehicleExpenseEarningOut, 400: ErrorResponse, 404: ErrorResponse})
def create_vehicle_expense_earning(request, internal_id: int, payload: VehicleExpenseEarningCreate):
    """Create a new expense/earning entry for a vehicle."""
    business = get_user_business(request)
    vehicle = get_object_or_404(Vehicle, business=business, internal_id=internal_id)

    if payload.type not in ('expense', 'earning'):
        return 400, {"detail": "type must be 'expense' or 'earning'"}

    category = get_object_or_404(Category, id=payload.category_id, business=business)
    subcategory = get_object_or_404(Subcategory, id=payload.subcategory_id, business=business, category=category)

    entry = VehicleExpenseEarning.objects.create(
        business=business,
        vehicle=vehicle,
        category=category,
        subcategory=subcategory,
        type=payload.type,
        amount=payload.amount,
    )

    log_activity(
        request,
        action='create',
        entity_type='vehicle_expense_earning',
        entity_id=entry.id,
        entity_name=f"{entry.get_type_display()} #{entry.id} for Vehicle #{vehicle.internal_id}",
    )

    return 201, {
        "id": entry.id,
        "category_id": entry.category_id,
        "category_name": entry.category.name,
        "subcategory_id": entry.subcategory_id,
        "subcategory_name": entry.subcategory.name,
        "type": entry.type,
        "amount": entry.amount,
        "created_at": entry.created_at,
    }


@router.delete("/vehicles/{internal_id}/expenses-earnings/{entry_id}", response={200: SuccessResponse, 404: ErrorResponse})
def delete_vehicle_expense_earning(request, internal_id: int, entry_id: int):
    """Soft-delete (deactivate) an expense/earning entry."""
    business = get_user_business(request)
    vehicle = get_object_or_404(Vehicle, business=business, internal_id=internal_id)
    entry = get_object_or_404(VehicleExpenseEarning, id=entry_id, vehicle=vehicle, business=business)
    entry.is_active = False
    entry.save(update_fields=['is_active'])

    log_activity(
        request,
        action='delete',
        entity_type='vehicle_expense_earning',
        entity_id=entry.id,
        entity_name=f"{entry.get_type_display()} #{entry.id} for Vehicle #{vehicle.internal_id}",
    )

    return {"success": True, "message": "Entry removed"}
```
   Note: `SuccessResponse`, `ErrorResponse`, `get_object_or_404`, `get_user_business`, `log_activity` are all already imported/defined in api.py — confirmed via grep, no new imports needed for those.
   Note: the delete endpoint was **not explicitly requested** in your description (you only described Add). I'm including it because every other entity in this app follows a soft-delete pattern and a wrong entry would otherwise be permanently stuck. Flagging this as an addition beyond the literal spec — easy to drop if you don't want it yet, but I'd recommend keeping it since a mis-typed amount is inevitable.

## 4. Frontend

### Task: Types
SCOPE: `frontend/src/types/vehicle.ts`
MODE: sequential — must complete before hooks/component tasks that import these types; also removes sale_commission (same file)

Steps:
1. Delete line 82: `sale_commission: number | null`.
2. Add a new exported interface, placed near the other vehicle-detail-related interfaces in this file:
```typescript
export interface VehicleExpenseEarning {
    id: number
    category_id: number
    category_name: string
    subcategory_id: number
    subcategory_name: string
    type: "expense" | "earning"
    amount: number
    created_at: string
}
```
3. In the `VehicleDetail` interface (the one containing `total_revenue`/`total_expenses`/`net_profit` at lines 90-92), add:
```typescript
    expenses_earnings: VehicleExpenseEarning[]
```

### Task: Validation schema cleanup
SCOPE: `frontend/src/lib/validations.ts`
MODE: parallel-safe — independent of vehicle.ts (different file), independent of hooks/component work; only touches the commission removal

Steps:
1. Delete line 121: `sale_commission: optionalNumberWithMin(0).nullable(),`.

### Task: Hooks for expenses/earnings
SCOPE: `frontend/src/hooks/useVehicles.ts`
MODE: sequential — depends on the `VehicleExpenseEarning` type from the Types task; must complete before the component task that imports these hooks

Steps: Add these exports to `frontend/src/hooks/useVehicles.ts`, following the exact same pattern as `useDeleteVehicle`/`useChangeVehicleStatus` (lines 149-189) and importing `VehicleExpenseEarning` from `@/types/vehicle`:
```typescript
/**
 * Fetch expense/earning entries for a vehicle
 */
export function useVehicleExpensesEarnings(internalId: number | undefined) {
    return useQuery({
        queryKey: [...vehicleKeys.detail(internalId!), "expenses-earnings"] as const,
        queryFn: async (): Promise<VehicleExpenseEarning[]> => {
            const response = await api.get<VehicleExpenseEarning[]>(`/vehicles/${internalId}/expenses-earnings`)
            return response.data
        },
        enabled: !!internalId,
    })
}

/**
 * Create an expense/earning entry for a vehicle
 */
export function useCreateVehicleExpenseEarning() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            internalId,
            data,
        }: {
            internalId: number
            data: { category_id: number; subcategory_id: number; type: "expense" | "earning"; amount: number }
        }): Promise<VehicleExpenseEarning> => {
            const response = await api.post<VehicleExpenseEarning>(
                `/vehicles/${internalId}/expenses-earnings`,
                data
            )
            return response.data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.internalId) })
        },
    })
}

/**
 * Delete (soft) an expense/earning entry for a vehicle
 */
export function useDeleteVehicleExpenseEarning() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ internalId, entryId }: { internalId: number; entryId: number }) => {
            await api.delete(`/vehicles/${internalId}/expenses-earnings/${entryId}`)
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.internalId) })
        },
    })
}
```
Also add `import type { VehicleExpenseEarning } from "@/types/vehicle"` to the existing type-only import block at the top of the file (currently importing `VehiclesResponse, VehicleDetail, VehicleFilters, AllChoices`).

### Task: New VehicleExpensesEarningsCard component
SCOPE: `frontend/src/components/vehicles/VehicleExpensesEarningsCard.tsx` (new file)
MODE: sequential — depends on hooks task and types task both being done first

Steps: Create a new component with this behavior (following the existing Buy/Sale Details card visual pattern — `rounded-xl border border-border bg-card shadow-sm overflow-hidden` wrapper with a `bg-muted/50 px-6 py-4 border-b border-border` header — but smaller/tighter padding, e.g. `px-4 py-3`, since it must fit the freed 2-field-sized slot):

- Props: `vehicleId: number | undefined` (the `internal_id`), `categories: {id:number;name:string}[]`, `subcategories: {id:number;name:string;category_id:number}[]` (passed down from `VehicleForm.tsx`'s already-loaded `choices` object — no separate fetch).
- Local state: `formOpen` (boolean, default false), `categoryId`, `subcategoryId` (number | null), `type` (`"expense" | "earning" | null`), `amount` (string).
- Uses `useVehicleExpensesEarnings(vehicleId)`, `useCreateVehicleExpenseEarning()`, `useDeleteVehicleExpenseEarning()`.
- When `formOpen === false`: render a centered `<Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add Expense/Earning</Button>` that sets `formOpen = true`.
- When `formOpen === true`: render, in order:
  1. `DynamicSelect` with `choiceType="category"`, `options={categories}`, `value={categoryId}`, `onChange` sets `categoryId` and resets `subcategoryId` to `null`, `allowCreate={true}`, `createLabel="Category"`.
  2. `DynamicSelect` with `choiceType="subcategory"`, `options={subcategories.filter(s => s.category_id === categoryId)}`, `value={subcategoryId}`, `disabled={!categoryId}`, `allowCreate={!!categoryId}`, `createLabel="Subcategory"`, `parentId={categoryId ?? undefined}`.
  3. A two-button segmented toggle (not a dropdown — a binary choice reads better as two buttons than a select, this is a deliberate deviation from "everything is a DynamicSelect" for usability; flagging this design choice): `<Button variant={type==='expense'?'destructive':'outline'} onClick={() => setType('expense')}>Expense</Button>` and the same pattern for `earning` using `className="bg-success ..."` when active (since there's no `variant="success"` on the shared `Button` component — confirm this by checking `frontend/src/components/ui/button.tsx`'s `variant` prop options before writing; if a success variant doesn't exist, apply `.bg-success` utility class directly instead of inventing a new Button variant).
  4. Amount input: `disabled={!type}`, wrapped like the Date field pattern in `TransactionForm.tsx` (`relative` div + absolutely positioned prefix), showing a fixed `<span className={cn("absolute left-3 top-1/2 -translate-y-1/2 font-medium", type === "expense" ? "text-error" : type === "earning" ? "text-success" : "text-muted-foreground")}>{type === "expense" ? "−" : type === "earning" ? "+" : "±"}</span>` and `<Input type="number" step="0.01" min="0" className="pl-7" disabled={!type} value={amount} onChange={...} />`. The sign is cosmetic only — the actual signed value is derived server-side/client-side from `type`, never typed by the user (matches "cannot be removed").
  5. An "Add" button, `disabled={!categoryId || !subcategoryId || !type || !amount || Number(amount) <= 0}`, calling `useCreateVehicleExpenseEarning().mutate(...)`. On success: reset `categoryId/subcategoryId/type/amount` to empty and set `formOpen = false` (collapses back to the "+" button, per the MVP flow — banner now appears in the list below).
- Banner list (always rendered, below the button/form, regardless of `formOpen`): for each entry from `useVehicleExpensesEarnings`, a small pill/row:
```tsx
<div className={cn(
    "flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-white",
    entry.type === "expense" ? "bg-error" : "bg-success"
)}>
    <span>{entry.category_name} / {entry.subcategory_name}</span>
    <span className="font-semibold">{entry.type === "expense" ? "−" : "+"}€{entry.amount.toFixed(2)}</span>
</div>
```
  Wrap the list in a `max-h-[140px] overflow-y-auto` container (space is tight — this card is intentionally small) with `gap-1.5` between banners.
- Include a small "×" delete affordance per banner (calls `useDeleteVehicleExpenseEarning`) — same "not explicitly requested but matches the no-hard-delete/always-correctable convention" reasoning as the backend delete endpoint; flagging together with that one.

### Task: Wire the new card into VehicleForm.tsx + apply the grid restructure + remove commission JSX
SCOPE: `frontend/src/components/vehicles/VehicleForm.tsx`
MODE: sequential — depends on `VehicleExpensesEarningsCard` component existing; also this is the same file where the sale_commission JSX removal happens, must be one agent to avoid two edits racing on the same file

Steps:
1. Add import: `import { VehicleExpensesEarningsCard } from "./VehicleExpensesEarningsCard"`.
2. Replace lines 978-1009 (the Vehicle Image / Description / Internal Comments block, still inside the outer `md:grid-cols-2 lg:grid-cols-6` grid that opens at line 716) with a new self-contained sub-grid per the layout in Section 2 above:
```tsx
                            {/* Photo / Description / Internal Comments / Expenses & Earnings */}
                            <div className="md:col-span-2 lg:col-span-6 grid grid-cols-1 md:grid-cols-4 gap-2">
                                <div className="max-w-md md:col-span-2 md:row-span-2">
                                    <VehicleImageUpload
                                        imageUrl={vehicle?.image_url}
                                        selectedFile={selectedImageFile}
                                        onFileChange={handleVehicleImageChange}
                                        isUploading={isUploadingImage}
                                        errorMessage={imageUploadError}
                                        disabled={mutation.isPending || isUploadingImage}
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-1">
                                    <Label className="text-foreground">Description</Label>
                                    <textarea
                                        value={watch("description") ?? ""}
                                        onChange={(e) => handleTextChange("description", e.target.value)}
                                        placeholder="Public description of the vehicle"
                                        className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-1">
                                    <Label className="text-foreground">Internal Comments</Label>
                                    <textarea
                                        value={watch("internal_comments") ?? ""}
                                        onChange={(e) => handleTextChange("internal_comments", e.target.value)}
                                        placeholder="Private notes (not visible to customers)"
                                        className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <VehicleExpensesEarningsCard
                                        vehicleId={vehicle?.internal_id}
                                        categories={choices?.categories ?? []}
                                        subcategories={choices?.subcategories ?? []}
                                    />
                                </div>
                            </div>
```
   Confirm the exact prop name `choices?.categories` / `choices?.subcategories` matches what `useChoices()` returns (confirmed already in Section 0.2 — `AllChoices` schema has `categories: List[CategoryOut]` and `subcategories: List[SubcategoryOut]`).
3. Remove commission field: delete lines 1240-1250 (the `{/* Commission */}` block: `<div className="space-y-2"><Label>Commission (€)</Label><Input .../></div>`).
4. Remove commission default-value wiring: delete line 238 (`sale_commission: toNum(vehicle?.sale_commission),`) and line 454 (`sale_commission: toNum(vehicle.sale_commission),`) — re-view the file immediately before editing since line numbers will have shifted after step 2's edit; locate by the unique string `sale_commission` instead of by line number at this point.

## 5. Execution order (dependency graph)

```
Phase A (backend, one agent, strictly sequential — same 3 files depend on each other):
  A1. models.py: add VehicleExpenseEarning + migration 0068
  A2. models.py: remove sale_commission + migration 0069
  A3. schemas.py: add new schemas + expenses_earnings field + remove sale_commission fields
  A4. api.py: add 3 endpoints + wire expenses_earnings into serializer + remove sale_commission line
  → REVIEW CHECKPOINT: run backend, hit /api/vehicles/{id}, confirm expenses_earnings: [] appears and sale_commission is gone; test POST/DELETE on the new endpoints manually.

Phase B (frontend, can start after Phase A review passes):
  Two parallel-safe tracks (zero file overlap, neither reads the other's output):
    B1 [parallel-safe]: types/vehicle.ts — add VehicleExpenseEarning type, remove sale_commission
    B2 [parallel-safe]: lib/validations.ts — remove sale_commission validation
  Then, sequential (depends on B1 for the type import):
    B3 [sequential, after B1]: hooks/useVehicles.ts — add the 3 new hooks
    B4 [sequential, after B3]: new file VehicleExpensesEarningsCard.tsx
    B5 [sequential, after B4]: VehicleForm.tsx — grid restructure + wire card + remove commission JSX
  → REVIEW CHECKPOINT: open Vehicle edit page, confirm layout matches Section 2, add a test expense and a test earning, confirm banner colors, confirm amount sign lock behavior, confirm Commission field is gone from Sale Details.
```

B1 and B2 are the only two tasks in this whole plan safe to run as true parallel subagents (disjoint files, neither depends on the other's output). Every other task is sequential either because it shares a file with an adjacent task or because it imports something the previous task produces.
