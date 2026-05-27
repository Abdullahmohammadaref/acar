# plan-auto-keys.md — Auto-populate Key Field on Add New Vehicle

> **Date:** 2026-05-27
> **Agent target:** Antigravity / Gemini Pro
> **Scope:** Backend (1 new endpoint) + Frontend (1 new hook + VehicleForm wiring)
> **Pre-read (mandatory):** `idea.md`, `developer-guide.md`, `PROJECT_MAP.md`, `schema.prisma`, `design-system/components.md`

---

## Context & Feature Summary

The vehicle form has a **Key** field — a `DynamicSelect` dropdown where a physical key tag number (1, 2, 3…) is assigned to each vehicle. Currently the manager must manually pick a key every time they add a new vehicle.

The requested behaviour: **when the "Add New Vehicle" page loads, the key field is automatically pre-populated with the next available key.** The user can override it manually at any time. The auto-selection only fires once on page load — it does not interfere with editing.

---

## Pre-implementation: Verify the Key Field

Before writing any code, the agent MUST verify these exact names by reading the current codebase:

| What to verify | Where to look | Expected value (confirm or correct) |
|---|---|---|
| Django model name for keys | `backend/manager/models.py` | Likely `Key` or `VehicleKey` |
| Django table name | same file, `class Meta` | e.g. `manager_key` |
| Vehicle FK field name | `backend/manager/models.py`, Vehicle model | Likely `key_id` |
| Choice type string used in API | `backend/manager/api.py` (choices endpoint) | e.g. `"key"` |
| Vehicle API field name in schema | `backend/manager/schemas.py` | e.g. `key_id: Optional[int]` |
| Frontend form field name | `frontend/src/components/vehicles/VehicleForm.tsx` | e.g. `key_id` in `DynamicSelect` |
| Frontend type field | `frontend/src/types/vehicle.ts` | e.g. `key_id: number \| null` |

**If any of these don't exist yet** (the Key model or Vehicle.key_id), create them following the same pattern as `DoorsChoice` / `doors_id`. The Key choice model is a standard dynamic choice: `{ id, name, business_id, is_active }`. Then run `python manage.py makemigrations && python manage.py migrate` before proceeding.

Use the verified names throughout the rest of this plan wherever `key_id` and `Key` are referenced.

---

## Algorithm — Next Available Key

This is the core logic. Read it carefully before writing any code.

**Definitions:**
- **All keys** = all `Key` choice records for `request.user.business`, filtered by `is_active=True`
- **Taken keys** = keys currently assigned to vehicles with `status != 'inactive'` and `key_id is not null`
- **Available keys** = keys in "All keys" that are NOT in "Taken keys" (exist but not assigned)

**Finding the "next available key":**

1. Parse the names of all taken keys as integers: `taken_numbers = {int(k.name) for k in taken_keys}`
2. Find the smallest positive integer ≥ 1 that is NOT in `taken_numbers`:
   ```
   candidate = 1
   while candidate in taken_numbers:
       candidate += 1
   ```
3. Check if `candidate` already exists as an active key choice:
   - **Yes** → return it (it's available — exists but not assigned to any active vehicle)
   - **No** → create a new `Key` choice record with `name=str(candidate)` → return it

**Examples (from the user):**

| All keys | Taken keys | `taken_numbers` | Candidate | Exists? | Action |
|---|---|---|---|---|---|
| [1, 5, 7] | none | {} | 1 | ✓ Yes | Return key "1" |
| [1, 5, 7] | [1, 5] | {1, 5} | 2 | ✗ No | Create "2", return it |
| [1, 2, 3, 4, 5, 6, 7] | [1, 2, 3, 4, 5, 6, 7] | {1…7} | 8 | ✗ No | Create "8", return it |

**Edge case — non-numeric key names:**
The algorithm parses key names as integers. If a key's name is not a valid integer (e.g. someone manually created "spare"), skip it — do not include it in `taken_numbers`. This prevents a crash when `int(name)` would fail.

**Edge case — no keys at all:**
If no key choices exist for this business, `candidate = 1`. It doesn't exist → create key "1" → return it.

---

## Backend — New Endpoint

**File:** `backend/manager/vehicle_api.py`

Add a new endpoint at the end of the file:

```python
from django.db import transaction as db_transaction

@router.get("/next-key", auth=django_auth)
def get_next_available_key(request):
    """
    Returns the next available key for a new vehicle.
    
    Logic:
    1. Find all active Key choices for this business.
    2. Find all key_ids currently in use by non-inactive vehicles.
    3. Determine the smallest integer >= 1 not in the taken set.
    4. If that integer exists as a Key choice → return it.
    5. If not → create a new Key choice → return it.
    
    Response: { "id": int, "name": str, "is_new": bool }
    """
    business = request.user.business

    # Step 1: All active keys for this business
    all_keys = Key.objects.filter(business=business, is_active=True)

    # Step 2: Keys currently taken by non-inactive vehicles
    taken_key_ids = set(
        Vehicle.objects.filter(
            business=business,
            key_id__isnull=False,
        )
        .exclude(status="inactive")
        .values_list("key_id", flat=True)
    )

    # Step 3: Build a set of taken numbers from the taken keys' names
    taken_numbers = set()
    for key in all_keys.filter(id__in=taken_key_ids):
        try:
            taken_numbers.add(int(key.name))
        except (ValueError, TypeError):
            pass  # Skip non-numeric key names

    # Step 4: Find the smallest integer >= 1 not in taken_numbers
    candidate = 1
    while candidate in taken_numbers:
        candidate += 1

    # Step 5: Check if candidate exists as a Key choice
    existing = Key.objects.filter(
        business=business,
        name=str(candidate),
    ).first()

    if existing:
        return {"id": existing.id, "name": existing.name, "is_new": False}

    # Step 6: Create new Key choice
    with db_transaction.atomic():
        new_key = Key.objects.create(
            business=business,
            name=str(candidate),
            is_active=True,
        )

    return {"id": new_key.id, "name": new_key.name, "is_new": True}
```

**Important notes:**
- Import `Key` from `manager.models` at the top of the file (it should already be imported if the Key model exists; add it if missing)
- Import `Vehicle` from `manager.models` (already imported)
- The endpoint path is `/api/vehicles/next-key` (Django Ninja mounts vehicle_api at `/vehicles/`)
- Auth: `django_auth` (same as all other endpoints in this file)
- No request body — this is a pure `GET`
- The `db_transaction.atomic()` prevents a race condition if two browsers open "Add New Vehicle" simultaneously (the `create()` call is atomic and the `@@unique([name, businessId])` constraint on the Key model will prevent duplicates)

**Race condition note:** In the rare case two users open the page simultaneously and both try to create the same key number, the second `create()` will raise a `django.db.IntegrityError` due to the unique constraint. Wrap the create in a try/except and retry with `candidate + 1` if this happens. For a single-business single-manager app this is extremely unlikely, but the plan is complete:

```python
# Step 6 (with race condition handling):
max_retries = 5
for attempt in range(max_retries):
    try:
        with db_transaction.atomic():
            new_key = Key.objects.create(
                business=business,
                name=str(candidate),
                is_active=True,
            )
        return {"id": new_key.id, "name": new_key.name, "is_new": True}
    except Exception:
        # Key was created by another request — increment and retry
        candidate += 1
        while candidate in taken_numbers:
            candidate += 1

# Fallback: return the key that now exists for candidate
fallback = Key.objects.get(business=business, name=str(candidate - 1))
return {"id": fallback.id, "name": fallback.name, "is_new": False}
```

---

## Frontend — New Hook

**File:** `frontend/src/hooks/useVehicles.ts`

Add a new hook at the bottom, after all existing hooks:

```ts
/**
 * Fetches the next available key for a new vehicle.
 * Only runs when `enabled` is true (i.e., on the Add New Vehicle page).
 * staleTime: 0 — always refetch fresh when the page loads.
 */
export function useNextAvailableKey(enabled: boolean) {
    return useQuery({
        queryKey: ["vehicles", "next-key"],
        queryFn: async () => {
            const response = await api.get<{ id: number; name: string; is_new: boolean }>(
                "/vehicles/next-key"
            )
            return response.data
        },
        enabled,
        staleTime: 0,        // always fresh — never use cached result on a new page load
        gcTime: 0,           // don't keep in cache after component unmounts
        retry: 1,            // one retry on network error, then give up gracefully
    })
}
```

**Note:** `gcTime: 0` (formerly `cacheTime`) ensures the result is never served stale from a previous "Add New Vehicle" session. Each time the user opens the page, it fetches fresh. This matters because between sessions, a previously chosen key might have become taken.

---

## Frontend — VehicleForm Wiring

The auto-key logic runs **only in create mode** (not edit mode). The key field should be pre-populated when the form mounts, and the field must remain fully editable so the user can override it.

**File:** `frontend/src/components/vehicles/VehicleForm.tsx`

**Step 1 — Add the hook:**

At the top of `VehicleForm`, alongside the other hooks, add:

```tsx
import { useNextAvailableKey } from "@/hooks/useVehicles"

// Inside the component, after the useForm hook:
const { data: nextKeyData, isLoading: isLoadingNextKey } = useNextAvailableKey(!isEditing)
```

The `!isEditing` ensures the fetch only runs when creating a new vehicle.

**Step 2 — Apply the auto-populated value:**

After the `useEffect` that initialises the form for editing, add a new `useEffect` for the create-mode auto-key:

```tsx
// Auto-populate key field in create mode
useEffect(() => {
    if (!isEditing && nextKeyData) {
        // Only set if the field is currently empty (don't override a manual selection)
        const currentKeyId = getValues("key_id")
        if (!currentKeyId) {
            setValue("key_id", nextKeyData.id, {
                shouldDirty: false,   // don't mark as dirty — this is a default, not a user change
                shouldValidate: false,
            })
        }
    }
}, [nextKeyData, isEditing, setValue, getValues])
```

**`shouldDirty: false` is critical.** The form uses auto-save on dirty fields. Setting `shouldDirty: false` ensures this pre-population does NOT trigger an auto-save when the user hasn't explicitly touched the form yet. The key will only be saved when the user submits the "Create Vehicle" form.

**Step 3 — Loading indicator on the key field:**

When `isLoadingNextKey` is true and we're in create mode, show a subtle loading state on the key field label so the manager knows something is happening:

```tsx
{/* Key field label */}
<Label htmlFor="key_id">
    {t("vehicles.key", "Key")}
    {!isEditing && isLoadingNextKey && (
        <span className="ml-1.5 text-xs text-muted-foreground font-normal animate-pulse">
            {t("vehicles.autoSelectingKey", "auto-selecting...")}
        </span>
    )}
</Label>
```

This is a low-key (pun intended) indicator — no spinner, just a pulsing text that disappears once the key is selected.

**Step 4 — Ensure key field is in the correct position in the form:**

The key field should be in the **Vehicle Details card** (the general information section at the top, alongside branch, vehicle type, body type, etc.). Based on the current form structure, it fits naturally after or near `doors_id` since both are operational/physical attributes. Confirm its position in the existing VehicleForm JSX and do not move it.

**Step 5 — Invalidate the next-key query when a new key is created:**

When the `DynamicSelect` for `key_id` triggers a Quick Add (creates a new key via the `onQuickAdd` callback), the `queryClient` should invalidate the `["vehicles", "next-key"]` query so stale suggestions don't persist:

```tsx
// In the DynamicSelect for key_id, add an onSuccess/onSettled to the mutation
// that creates choices (already handled in the choices mutation in VehicleForm):
queryClient.invalidateQueries({ queryKey: ["vehicles", "next-key"] })
```

Check where the `createChoiceMutation.onSuccess` is defined in `VehicleForm.tsx` and add this invalidation line there, alongside the existing `vehicleKeys.choices()` invalidation.

---

## Frontend — TypeScript Types

**File:** `frontend/src/types/vehicle.ts`

Verify `key_id` and `key_name` exist in `VehicleDetail` and `VehicleListItem`. If not, add them:

```ts
// In VehicleDetail:
key_id: number | null
key_name: string | null

// In VehicleListItem (optional — only if keys are shown in the list view):
key_name: string | null
```

Also verify the Zod validation schema in `frontend/src/lib/validations.ts`:
- The `VehicleCreateInput` schema should include `key_id: z.number().optional()` (not required)
- The `VehicleUpdateInput` schema should also have `key_id: z.number().optional()`

If these are missing, add them.

---

## UX Behaviour Summary

| Scenario | Behaviour |
|---|---|
| User opens "Add New Vehicle" | Key field auto-populates with next available key after ~100ms network call |
| Network request is in flight | Small `"auto-selecting..."` label next to the Key field label |
| Network request fails | Key field stays empty, user selects manually — no error shown |
| User manually changes the key before the fetch returns | `getValues("key_id")` check prevents overwriting the user's selection |
| User manually changes the key after auto-populate | DynamicSelect behaves normally — user's choice is respected |
| User is on "Edit Vehicle" page | `useNextAvailableKey(false)` — hook is disabled, no fetch |
| Same key is available vs taken | Taken = assigned to any non-inactive vehicle; available = exists but unassigned OR doesn't exist yet |
| Key "2" was previously assigned but vehicle is now inactive | Key "2" is available again (excluded from `exclude(status="inactive")`) |

---

## Files Modified Summary

| File | Change |
|---|---|
| `backend/manager/vehicle_api.py` | Add `GET /next-key` endpoint |
| `frontend/src/hooks/useVehicles.ts` | Add `useNextAvailableKey` hook |
| `frontend/src/components/vehicles/VehicleForm.tsx` | Wire hook, apply auto-value, add loading label |
| `frontend/src/types/vehicle.ts` | Verify/add `key_id`, `key_name` to interfaces |
| `frontend/src/lib/validations.ts` | Verify/add `key_id` to Zod schemas |

If the Key model or Vehicle.key_id doesn't exist yet, also:

| File | Change |
|---|---|
| `backend/manager/models.py` | Add `Key` model (copy DoorsChoice pattern) + `key_id` FK on Vehicle |
| `backend/manager/schemas.py` | Add `key_id`, `key_name` to VehicleSchema/VehicleUpdateSchema |
| `backend/manager/api.py` | Add `"key"` to the choices endpoint switch/dict |
| `backend/manager/migrations/` | Auto-generated migration |

---

## Order of Implementation

1. **Verify** field names in `models.py`, `schemas.py`, `VehicleForm.tsx` before touching anything
2. **If field is missing**: add model → schema → migration → API choices endpoint → frontend types → VehicleForm DynamicSelect
3. **Backend endpoint**: add `GET /next-key` to `vehicle_api.py`, test via `/api/docs`
4. **Frontend hook**: add `useNextAvailableKey` to `useVehicles.ts`
5. **Frontend wiring**: add `useEffect` in VehicleForm, loading label, query invalidation
6. **TypeScript check**: `npx tsc --noEmit` — all errors must pass

---

## TypeScript Verification

After all changes:
```bash
cd frontend && npx tsc --noEmit
```

Zero errors required. No `any` types introduced. Unused imports removed.

---

## Do Not Touch

- Edit vehicle flow — auto-key logic is strictly `!isEditing`
- Auto-save logic — `shouldDirty: false` prevents any accidental save trigger
- The Key `DynamicSelect` component itself — it already supports Quick Add for manual overrides
- Any existing choice models or endpoints unrelated to Key
- Dark mode — no styling changes in this feature
