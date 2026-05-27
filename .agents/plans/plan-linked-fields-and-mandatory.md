# plan-linked-fields-and-mandatory.md

> **Date:** 2026-05-27
> **Agent target:** Antigravity / Gemini Pro
> **Pre-read (mandatory):** `idea.md`, `developer-guide.md`, `PROJECT_MAP.md`, `schema.prisma`, `design-system/colors.md`, `design-system/components.md`

---

## Overview

This plan covers three independent features:

1. **Model filter in Vehicles page** — add a Model `FilterSelect` with the new bidirectional relationship
2. **Bidirectional parent-child dropdowns** — reverse the direction so child can be selected first and parent auto-fills; applies to Make/Model, Category/Subcategory, and the new Country/City
3. **Country & City as choice fields** — migrate legal entity `address_country`/`address_city` from free-text `CharField` to FK choice fields, with a new `Country → City` hierarchy managed in Choice Management
4. **Unfilled mandatory field highlight** — amber tint on empty mandatory fields across all forms, visible before the user tries to submit

Implement in this order: **3 (backend first) → 3 (frontend) → 2 → 1 → 4**. Each feature is self-contained but they share patterns.

---

## Feature 1 — Model Filter in Vehicles Page

### Current state
`VehicleFilters.tsx` (the Sheet sidebar) has a Make `FilterSelect` but no Model filter. The backend `vehicle_api.py` already filters by `model_id` when `filters.model` is set. `VehicleFilters` in `vehicle.ts` already has `model?: number`.

### What to add

**File:** `frontend/src/components/vehicles/VehicleFilters.tsx`

Add a Model `FilterSelect` immediately after the Make `FilterSelect` in the Vehicle Details section. The model list should be bidirectional (see Feature 2 for the full behavior spec). In the filter context, the bidirectional rules are:

- **Selecting Make** → model list narrows to that make's models; if a model was already selected from a different make, clear it
- **Selecting Model** → make auto-selects to that model's parent make
- **Clearing Make** → model list returns to all models; selected model stays if still valid
- **Clearing Model** → make stays as-is

**Step 1 — Load all models:** The current `VehicleFilters.tsx` uses `useChoices()` which returns all standard choices. Models are not in `AllChoices` (they're fetched per-make via `useModels(makeId)`). For the filter sheet, fetch all models at once.

Add a new backend endpoint (see below) and a new hook `useAllModels()` in `useVehicles.ts`:

```ts
export function useAllModels() {
    return useQuery({
        queryKey: ["models", "all"],
        queryFn: async () => {
            const response = await api.get<VehicleModelChoice[]>("/choices/models/all")
            return response.data
        },
        staleTime: 5 * 60 * 1000,
    })
}
```

**New backend endpoint** in `backend/manager/api.py`:

```python
@router.get("/choices/models/all", response=List[VehicleModelOut], auth=django_auth)
def get_all_models(request):
    """Returns all active models for the current business, with make_id."""
    models = VehicleModel.objects.filter(
        business=request.user.business,
        is_active=True,
    ).select_related("make").order_by("make__name", "name")
    return [
        {"id": m.id, "name": m.name, "make_id": m.make_id, "make_name": m.make.name}
        for m in models
    ]
```

**Step 2 — Bidirectional filter logic in `VehicleFilters.tsx`:**

```tsx
const { data: allModels } = useAllModels()

// Models to show: if make is selected, only show models for that make
const filteredModels = localFilters.make
    ? (allModels ?? []).filter(m => m.make_id === localFilters.make)
    : (allModels ?? [])

// When make changes → clear model if it no longer belongs to new make
const handleMakeChange = (value: string | undefined) => {
    const makeId = value ? Number(value) : undefined
    const currentModel = localFilters.model
    const modelStillValid = currentModel && allModels?.find(
        m => m.id === currentModel && m.make_id === makeId
    )
    updateFilter("make", makeId)
    if (!modelStillValid) updateFilter("model", undefined)
}

// When model changes → auto-select its parent make
const handleModelChange = (value: string | undefined) => {
    const modelId = value ? Number(value) : undefined
    updateFilter("model", modelId)
    if (modelId) {
        const model = allModels?.find(m => m.id === modelId)
        if (model) updateFilter("make", model.make_id)
    }
}
```

**Step 3 — JSX for the Model filter** (insert after Make FilterSelect):

```tsx
<div className="space-y-2">
    <Label className="text-foreground">Model</Label>
    <FilterSelect
        options={filteredModels.map(m => ({
            value: m.id.toString(),
            label: localFilters.make ? m.name : `${m.make_name} — ${m.name}`,
        }))}
        value={localFilters.model?.toString()}
        onChange={handleModelChange}
        placeholder="All models"
        allLabel="All models"
        searchPlaceholder="Search models..."
    />
</div>
```

When no make is selected, show `"BMW — M3"` style labels so the user can tell models apart. When a make is selected, show just `"M3"` since context is clear.

**Step 4 — Update Make FilterSelect** to use `handleMakeChange` instead of the direct `updateFilter`:

```tsx
onChange={handleMakeChange}
```

---

## Feature 2 — Bidirectional Parent-Child Dropdowns (Reverse Relationship)

### Current behavior (old)
- **Make → Model**: can't select Model until Make is chosen; Model is disabled + shows "Select a make first"
- **Category → Subcategory**: same — disabled until Category chosen
- Both use `disabled={!parentId}` in the child component

### New behavior (new)
- **Child shows ALL options** when no parent is selected
- **Selecting child auto-selects parent** (if child has a parent FK)
- **Selecting parent narrows child options** to only that parent's children
- **Clearing parent** returns child to showing all options (keeps child if still valid)
- **Clearing child** does nothing to parent

This applies to three pairs:
| Parent | Child | Where |
|---|---|---|
| Make | Model | VehicleForm, VehicleFilters |
| Category | Subcategory | TransactionForm |
| Country | City | EntityForm, LegalEntitiesPage filters |

### 2A — Make/Model in VehicleForm

**File:** `frontend/src/components/vehicles/VehicleForm.tsx`

The `ModelSelect` component at the top of the file needs to change:

**Current `ModelSelect`:** fetches models only when `makeId` is defined. Disabled when no `makeId`.

**New `ModelSelect`:** always fetches all models. Filters displayed options if `makeId` is set.

```tsx
function ModelSelect({ makeId, value, onChange, onMakeAutoSelect, error }: {
    makeId: number | undefined
    value: number | null | undefined
    onChange: (value: number | null) => void
    onMakeAutoSelect: (makeId: number) => void   // NEW: callback to auto-set make
    error?: string
}) {
    // Always fetch ALL models (not filtered by make)
    const { data: allModels, isLoading } = useAllModels()

    // Filter displayed options if make is selected
    const displayedModels = makeId
        ? (allModels ?? []).filter(m => m.make_id === makeId)
        : (allModels ?? [])

    const options = displayedModels.map(m => ({
        id: m.id,
        name: makeId ? m.name : `${m.make_name} — ${m.name}`,
    }))

    const handleChange = (id: number | null) => {
        onChange(id)
        if (id) {
            const model = allModels?.find(m => m.id === id)
            if (model) onMakeAutoSelect(model.make_id)
        }
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="model">
                {t("vehicles.model")} <span className="text-destructive">*</span>
            </Label>
            <DynamicSelect
                choiceType="vehicle_model"
                options={options}
                value={value ?? null}
                onChange={handleChange}
                placeholder={isLoading ? "Loading models..." : "Select model"}
                createLabel="Model"
                allowCreate={!!makeId}   // Only allow creating a new model when a make is selected
                parentId={makeId}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    )
}
```

Update the Make `DynamicSelect` onChange to also clear model only if the newly selected model doesn't belong to the new make:

```tsx
// Make onChange in VehicleForm:
onChange={(val) => {
    const newMakeId = val ?? 0
    setValue("make_id", newMakeId)
    // Only clear model if it doesn't belong to the new make
    const currentModelId = watch("model_id")
    if (currentModelId) {
        const currentModel = allModels?.find(m => m.id === currentModelId)
        if (currentModel?.make_id !== newMakeId) {
            setValue("model_id", undefined as any)
        }
    }
    if (isEditing && onAutoSave) {
        onAutoSave({ make_id: newMakeId })
    }
}}
```

Pass `onMakeAutoSelect` to `ModelSelect`:
```tsx
<ModelSelect
    makeId={watch("make_id")}
    value={watch("model_id") ?? null}
    onChange={(val) => handleDropdownChange("model_id", val ?? undefined)}
    onMakeAutoSelect={(makeId) => {
        setValue("make_id", makeId)
        if (isEditing && onAutoSave) onAutoSave({ make_id: makeId })
    }}
    error={errors.model_id?.message}
/>
```

Import `useAllModels` at the top:
```tsx
import { useChoices, useModels, useAllModels, useNextVehicleId, vehicleKeys } from "@/hooks/useVehicles"
```

### 2B — Category/Subcategory in TransactionForm

**File:** `frontend/src/components/transactions/TransactionForm.tsx`

Currently `useSubcategories(categoryId)` fetches subcategories only when `categoryId` is set.

**Step 1 — New hook** `useAllSubcategories` in `useTransactions.ts`:
```ts
export function useAllSubcategories() {
    return useQuery({
        queryKey: ["subcategories", "all"],
        queryFn: async () => {
            const response = await api.get<SubcategoriesResponse>("/transactions/subcategories/all")
            return response.data
        },
        staleTime: 5 * 60 * 1000,
    })
}
```

**Step 2 — New backend endpoint** in `transaction_api.py`:
```python
@router.get("/subcategories/all", auth=django_auth)
def get_all_subcategories(request):
    """Returns all active subcategories with their category_id."""
    from .models import Subcategory, Category
    subcategories = Subcategory.objects.filter(
        business=request.user.business,
        is_active=True,
    ).select_related("category").order_by("category__name", "name")
    return [
        {
            "id": s.id,
            "name": s.name,
            "category_id": s.category_id,
            "category_name": s.category.name if s.category else "",
        }
        for s in subcategories
    ]
```

**Step 3 — Update `SubcategorySelect`** in `TransactionForm.tsx`:

```tsx
function SubcategorySelect({ categoryId, value, onChange, onCategoryAutoSelect }) {
    const { data: allSubcats, isLoading } = useAllSubcategories()

    const displayed = categoryId
        ? (allSubcats?.subcategories ?? []).filter(s => s.category_id === categoryId)
        : (allSubcats?.subcategories ?? [])

    const options = displayed.map(s => ({
        id: s.id,
        name: categoryId ? s.name : `${s.category_name} — ${s.name}`,
    }))

    const handleChange = (id: number | null, name?: string) => {
        onChange(id, name)
        if (id) {
            const sub = allSubcats?.subcategories?.find(s => s.id === id)
            if (sub) onCategoryAutoSelect(sub.category_id, sub.category_name)
        }
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="subcategory">Subcategory <span className="text-red-500">*</span></Label>
            <DynamicSelect
                choiceType="subcategory"
                options={options}
                value={value ?? null}
                onChange={(id) => {
                    const sub = allSubcats?.subcategories?.find(s => s.id === id)
                    handleChange(id, sub?.name)
                }}
                placeholder={isLoading ? "Loading..." : "Select subcategory"}
                disabled={false}   // REMOVE the disabled state
                allowCreate={!!categoryId}
                createLabel="Subcategory"
                parentId={categoryId}
            />
        </div>
    )
}
```

Pass `onCategoryAutoSelect` from the parent to auto-fill category when subcategory is chosen.

### 2C — Country/City in EntityForm

This is described in Feature 3 below. The bidirectional pattern for Country/City follows the exact same structure as Make/Model.

---

## Feature 3 — Country & City as Choice Fields in Legal Entities

### Overview

Currently `address_country` and `address_city` on `LegalEntity` are free-text `CharField`. We need to migrate them to FK references to new `Country` and `City` choice models, where `City` has a FK to `Country`.

### 3A — Backend

#### New models in `backend/manager/models.py`

Add after `DoorsChoice` (alphabetically in the file):

```python
class Country(models.Model):
    name = models.CharField(_('country'), max_length=100)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='countries'
    )
    is_active = models.BooleanField(_('active'), default=True)

    class Meta:
        db_table = 'manager_country'
        unique_together = [['name', 'business']]
        verbose_name = _('country')

    def __str__(self):
        return self.name


class City(models.Model):
    name = models.CharField(_('city'), max_length=100)
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name='cities'
    )
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='cities'
    )
    is_active = models.BooleanField(_('active'), default=True)

    class Meta:
        db_table = 'manager_city'
        unique_together = [['name', 'country', 'business']]
        verbose_name = _('city')

    def __str__(self):
        return self.name
```

#### Migrate `LegalEntity` model

Add new FK fields alongside the existing CharField fields (keep old fields as nullable for migration safety):

```python
# In LegalEntity model, add alongside existing address_country / address_city:
country = models.ForeignKey(
    'Country',
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='legal_entities',
    verbose_name=_('country')
)
city = models.ForeignKey(
    'City',
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='legal_entities',
    verbose_name=_('city')
)
```

**Keep** `address_country` and `address_city` CharFields as nullable — they serve as a legacy fallback and are used by PDF generation. Do not delete them. Going forward, the FK fields (`country_id`, `city_id`) are the canonical source of truth; the CharFields can be auto-populated from the FK name on save if needed (a `save()` override in the model).

Run: `python manage.py makemigrations && python manage.py migrate`

#### New API endpoints in `backend/manager/api.py`

Add cities-for-country endpoint (mirroring the models-for-make pattern):

```python
@router.get("/choices/cities/{country_id}", auth=django_auth)
def get_cities_for_country(request, country_id: int):
    """Get cities for a specific country."""
    cities = City.objects.filter(
        country_id=country_id,
        business=request.user.business,
        is_active=True,
    ).order_by("name")
    return [{"id": c.id, "name": c.name, "country_id": c.country_id} for c in cities]


@router.get("/choices/cities/all", auth=django_auth)
def get_all_cities(request):
    """Get all cities for this business with their country info."""
    cities = City.objects.filter(
        business=request.user.business,
        is_active=True,
    ).select_related("country").order_by("country__name", "name")
    return [
        {"id": c.id, "name": c.name, "country_id": c.country_id, "country_name": c.country.name}
        for c in cities
    ]
```

Add `Country` and `City` to the existing choices creation/update/toggle endpoints (the `choice_type` switch in `api.py`):

```python
# In the choice_type → model mapping dict:
'country': Country,
'city': City,
```

For city creation, `parent_id` = `country_id`:
```python
if choice_type == 'city':
    if not payload.parent_id:
        return 400, {"detail": "country_id is required for city"}
    country = get_object_or_404(Country, id=payload.parent_id, business=business)
    obj = City.objects.create(name=payload.name, country=country, business=business)
    return {"id": obj.id, "name": obj.name}
```

#### Update schemas in `backend/manager/schemas.py`

Add `country_id`, `city_id`, `country_name`, `city_name` to `LegalEntitySchema` and `LegalEntityUpdateSchema`:

```python
country_id: Optional[int] = None
city_id: Optional[int] = None
country_name: Optional[str] = None
city_name: Optional[str] = None
```

#### Update the legal entities list/create/update endpoints

In the create/update handlers, accept `country_id` and `city_id` and set them on the `LegalEntity`. Also keep the CharFields in sync:

```python
if payload.country_id:
    country = get_object_or_404(Country, id=payload.country_id, business=business)
    entity.country = country
    entity.address_country = country.name  # keep CharField in sync
if payload.city_id:
    city = get_object_or_404(City, id=payload.city_id, business=business)
    entity.city = city
    entity.address_city = city.name  # keep CharField in sync
```

Add `country` and `city` filters to the legal entities list endpoint:

```python
if filters.country:
    qs = qs.filter(country_id=filters.country)
if filters.city:
    qs = qs.filter(city_id=filters.city)
```

### 3B — Frontend

#### New hooks in `frontend/src/hooks/useLegalEntities.ts`

```ts
export function useCountries() {
    return useQuery({
        queryKey: ["countries"],
        queryFn: async () => {
            const response = await api.get<{id: number; name: string}[]>("/choices/countries")
            return response.data
        },
        staleTime: 5 * 60 * 1000,
    })
}

export function useAllCities() {
    return useQuery({
        queryKey: ["cities", "all"],
        queryFn: async () => {
            const response = await api.get<{id: number; name: string; country_id: number; country_name: string}[]>("/choices/cities/all")
            return response.data
        },
        staleTime: 5 * 60 * 1000,
    })
}
```

You also need a `GET /choices/countries` endpoint (no filter needed):

```python
@router.get("/choices/countries", auth=django_auth)
def get_countries(request):
    countries = Country.objects.filter(
        business=request.user.business, is_active=True
    ).order_by("name")
    return [{"id": c.id, "name": c.name} for c in countries]
```

#### Update `LegalEntityFilters` type in `frontend/src/hooks/useLegalEntities.ts`:

```ts
country?: number
city?: number
```

And pass them to the API call:
```ts
if (filters.country) params.set("country", filters.country.toString())
if (filters.city) params.set("city", filters.city.toString())
```

#### Update `EntityForm.tsx`

Replace the free-text `Input` for `address_country` and `address_city` with `DynamicSelect`:

```tsx
import { DynamicSelect } from "@/components/ui/dynamic-select"
import { useCountries, useAllCities } from "@/hooks/useLegalEntities"

// Inside EntityForm component:
const { data: countries } = useCountries()
const { data: allCities } = useAllCities()

// Filter cities based on selected country
const countryId = data.country_id
const displayedCities = countryId
    ? (allCities ?? []).filter(c => c.country_id === countryId)
    : (allCities ?? [])

const cityOptions = displayedCities.map(c => ({
    id: c.id,
    name: countryId ? c.name : `${c.country_name} — ${c.name}`,
}))
```

Replace the country Input:
```tsx
<Label htmlFor="le-country">
    {t("legalEntities.country", "Country")} <span className="text-red-500">*</span>
</Label>
<DynamicSelect
    choiceType="country"
    options={(countries ?? []).map(c => ({ id: c.id, name: c.name }))}
    value={data.country_id ?? null}
    onChange={(val) => {
        const country = countries?.find(c => c.id === val)
        onChange({
            ...data,
            country_id: val ?? undefined,
            address_country: country?.name ?? "",
            // Clear city if it doesn't belong to new country
            city_id: undefined,
            address_city: "",
        })
    }}
    placeholder="Select country"
    createLabel="Country"
    allowCreate
/>
```

Replace the city Input:
```tsx
<Label htmlFor="le-city">
    {t("legalEntities.city", "City")} <span className="text-red-500">*</span>
</Label>
<DynamicSelect
    choiceType="city"
    options={cityOptions}
    value={data.city_id ?? null}
    onChange={(val) => {
        const city = allCities?.find(c => c.id === val)
        // If a city is selected, auto-select its country
        const newCountryId = city?.country_id ?? data.country_id
        const newCountry = countries?.find(c => c.id === newCountryId)
        onChange({
            ...data,
            city_id: val ?? undefined,
            address_city: city?.name ?? "",
            country_id: newCountryId,
            address_country: newCountry?.name ?? data.address_country,
        })
    }}
    placeholder={countryId ? "Select city" : "Select city (or choose country first)"}
    createLabel="City"
    allowCreate={!!countryId}
    parentId={countryId}
/>
```

Update `EntityForm`'s `data` prop type to include `country_id?: number` and `city_id?: number`. Update wherever `EntityForm` is used (`LegalEntitiesPage.tsx`) to include these in the initial `formData`.

#### Update `LegalEntitiesPage.tsx` — Country and City filters

Add Country and City `FilterSelect` dropdowns in the filter row, following the same bidirectional pattern:

```tsx
const { data: countries } = useCountries()
const { data: allCities } = useAllCities()

const displayedCityFilters = filters.country
    ? (allCities ?? []).filter(c => c.country_id === filters.country)
    : (allCities ?? [])

// Country filter
<FilterSelect
    options={(countries ?? []).map(c => ({ value: c.id.toString(), label: c.name }))}
    value={filters.country?.toString()}
    onChange={(val) => {
        const newCountry = val ? Number(val) : undefined
        // Clear city if it doesn't belong to new country
        const cityStillValid = filters.city && allCities?.find(
            c => c.id === filters.city && c.country_id === newCountry
        )
        setFilters(prev => ({
            ...prev,
            country: newCountry,
            city: cityStillValid ? prev.city : undefined,
            page: 1,
        }))
    }}
    placeholder="All countries"
    allLabel="All countries"
    searchPlaceholder="Search countries..."
/>

// City filter
<FilterSelect
    options={displayedCityFilters.map(c => ({
        value: c.id.toString(),
        label: filters.country ? c.name : `${c.country_name} — ${c.name}`,
    }))}
    value={filters.city?.toString()}
    onChange={(val) => {
        const cityId = val ? Number(val) : undefined
        if (cityId) {
            const city = allCities?.find(c => c.id === cityId)
            setFilters(prev => ({
                ...prev,
                city: cityId,
                country: city?.country_id ?? prev.country,
                page: 1,
            }))
        } else {
            setFilters(prev => ({ ...prev, city: undefined, page: 1 }))
        }
    }}
    placeholder="All cities"
    allLabel="All cities"
    searchPlaceholder="Search cities..."
/>
```

#### Update `ChoicesManagementPage.tsx`

Add a new tab section for Country / City, mirroring how Makes + Models are displayed (parent with its children listed below). The `ChoicesManagementPage` already handles parent-child for Makes/Models and Categories/Subcategories. Add a third group following the exact same pattern:

```tsx
// In the tab list, add:
{ key: "country_city", label: "Countries & Cities" }

// In the render function for "country_city" tab:
// Same structure as the makes_with_models section:
// - Top level: Country rows with Activate/Deactivate
// - Expandable: Cities nested under each Country
// - "Add City" button within each Country row
// - "Add Country" button at the top
```

Also add `"country"` and `"city"` to the `openAddModal` calls and the `createChoiceMutation` type mapping in `ChoicesManagementPage.tsx`.

---

## Feature 4 — Unfilled Mandatory Field Highlight

### Design decision

**Color: Amber `amber-500`** — consistent with the app's existing amber usage (`--color-status-purchased`). It is:
- Not red (which means error after submit)
- Not green (which means success)
- Visible enough to spot without being distracting
- Works well in both light and dark mode with low opacity

**What it looks like:**
- `border-amber-400/50` — slightly amber border (40% opacity in light mode)
- `bg-amber-500/5` — barely-there amber background tint
- In dark mode: `dark:border-amber-400/30 dark:bg-amber-400/5` — even subtler

**When it applies:**
- Field is marked as mandatory (has `required` or has `*` label)
- Field value is currently empty / null / undefined
- Field is not focused (don't show it while user is actively typing)
- The form has been interacted with at least once (don't show on page first load before any action — this avoids the page looking alarming immediately upon opening)

Actually for simplicity — show it immediately on page load. The manager is experienced with this UI; seeing amber on empty mandatory fields tells him "these need filling." This is better than waiting for a submit attempt.

### Implementation strategy

Rather than modifying every Input and DynamicSelect call site individually, create a small wrapper utility and use it consistently.

**File: `frontend/src/index.css`**

Add a CSS class:
```css
/* Mandatory field — unfilled state */
.mandatory-empty {
    --tw-ring-shadow: 0 0 0 0px transparent;
    border-color: color-mix(in srgb, var(--color-status-purchased) 50%, transparent) !important;
    background-color: color-mix(in srgb, var(--color-status-purchased) 5%, transparent) !important;
}
.dark .mandatory-empty {
    border-color: color-mix(in srgb, var(--color-status-purchased) 30%, transparent) !important;
    background-color: color-mix(in srgb, var(--color-status-purchased) 4%, transparent) !important;
}
```

This uses the existing `--color-status-purchased` amber token from the design system — no new color tokens needed, fully consistent with the established design language.

**Alternative (pure Tailwind approach, no CSS class):**

Use a utility function that returns Tailwind classes:

```ts
// frontend/src/lib/utils.ts — add this function:
export function mandatoryFieldClass(value: any): string {
    const isEmpty = value === null || value === undefined || value === "" || value === 0
    if (isEmpty) {
        return "border-amber-400/50 bg-amber-500/[0.04] dark:border-amber-400/30 dark:bg-amber-400/[0.04]"
    }
    return ""
}
```

**Use the Tailwind approach** (no CSS file changes needed, easier to reason about per field).

### Application in each form

#### VehicleForm.tsx

For each mandatory field (marked with `*` in the Label), pass the class to the Input/DynamicSelect wrapper div:

For `Input` fields:
```tsx
<Input
    className={cn("...", mandatoryFieldClass(watch("buy_price")))}
    ...
/>
```

For `DynamicSelect` fields, wrap the DynamicSelect in a div:
```tsx
<div className={cn("rounded-md", mandatoryFieldClass(watch("make_id")))}>
    <DynamicSelect ... />
</div>
```

**Which fields are mandatory in VehicleForm?** Check the Zod schema in `validations.ts` for required fields. Typically:
- `make_id` — required
- `buy_price` — required
- `buy_date` — required
- `buy_tax_id` — required
- `buy_payment_method_id` — required
- `seller_id` — required

Apply `mandatoryFieldClass` only to fields with `<span className="text-destructive">*</span>` in their Label.

#### TransactionForm.tsx

Same pattern. Mandatory fields include amount, date, category, subcategory. Apply `mandatoryFieldClass(watch("fieldName"))` to each.

For fields using `formData` (not react-hook-form `watch`):
```tsx
mandatoryFieldClass(formData.category_fk_id)
```

#### EntityForm.tsx

```tsx
<Input
    className={cn(mandatoryFieldClass(data.name))}
    ...
/>
```

Apply to: `name`, `type`, `tax_identification_number`, `address_street`, `address_street_number`, `address_postal_code`, `address_city` / `city_id`, `address_country` / `country_id`.

#### Important — do not show amber on focused fields

To avoid a jarring "amber while typing" experience, add `:focus-within` override in the CSS:

```css
/* Remove mandatory-empty style when field is focused */
.mandatory-empty:focus,
.mandatory-empty:focus-within,
.mandatory-empty:focus-visible {
    border-color: hsl(var(--ring)) !important;
    background-color: transparent !important;
}
```

Or in the Tailwind approach, add `focus:border-input focus:bg-background` to the `mandatoryFieldClass` return:

```ts
return "border-amber-400/50 bg-amber-500/[0.04] dark:border-amber-400/30 dark:bg-amber-400/[0.04] focus:border-input focus:bg-background focus-within:border-input focus-within:bg-background"
```

---

## Files Modified Summary

| File | Change | Feature |
|---|---|---|
| `backend/manager/models.py` | Add `Country`, `City` models; add FKs to `LegalEntity` | 3A |
| `backend/manager/migrations/` | Auto-generated migration | 3A |
| `backend/manager/api.py` | Add `/choices/countries`, `/choices/cities/all`, `/choices/cities/{country_id}`, `/choices/models/all`; city/country in choices CRUD; country/city filters in legal entities list | 1, 3A |
| `backend/manager/transaction_api.py` | Add `/subcategories/all` endpoint | 2B |
| `backend/manager/schemas.py` | Add `country_id`, `city_id`, `country_name`, `city_name` to LegalEntity schemas | 3A |
| `frontend/src/hooks/useVehicles.ts` | Add `useAllModels` hook | 1, 2A |
| `frontend/src/hooks/useLegalEntities.ts` | Add `useCountries`, `useAllCities` hooks; add `country`/`city` to `LegalEntityFilters` | 3B |
| `frontend/src/hooks/useTransactions.ts` | Add `useAllSubcategories` hook | 2B |
| `frontend/src/components/vehicles/VehicleFilters.tsx` | Add Model filter with bidirectional logic | 1, 2A |
| `frontend/src/components/vehicles/VehicleForm.tsx` | Update `ModelSelect` for bidirectional behavior | 2A |
| `frontend/src/components/transactions/TransactionForm.tsx` | Update `SubcategorySelect` for bidirectional behavior | 2B |
| `frontend/src/components/legal-entities/EntityForm.tsx` | Replace country/city Input with DynamicSelect, bidirectional | 3B |
| `frontend/src/pages/LegalEntitiesPage.tsx` | Add country/city filter dropdowns | 3B |
| `frontend/src/pages/ChoicesManagementPage.tsx` | Add Country/City tab section | 3B |
| `frontend/src/lib/utils.ts` | Add `mandatoryFieldClass` utility | 4 |
| `frontend/src/components/vehicles/VehicleForm.tsx` | Apply `mandatoryFieldClass` to mandatory fields | 4 |
| `frontend/src/components/transactions/TransactionForm.tsx` | Apply `mandatoryFieldClass` to mandatory fields | 4 |
| `frontend/src/components/legal-entities/EntityForm.tsx` | Apply `mandatoryFieldClass` to mandatory fields | 4 |
| `frontend/src/locales/de.json` + `en.json` + `tr.json` + `ar.json` | Add i18n keys for country/city labels | 3B |

---

## Order of Implementation

1. **3A — Backend models + migration** — must be first, everything else depends on it
2. **3A — Backend endpoints** — countries, cities, models/all, subcategories/all
3. **3B — Frontend hooks** — `useCountries`, `useAllCities`, `useAllModels`, `useAllSubcategories`
4. **3B — EntityForm** — replace country/city inputs with DynamicSelect
5. **3B — LegalEntitiesPage filters** — add country/city FilterSelect
6. **3B — ChoicesManagementPage** — add Country/City tab
7. **2A — VehicleForm ModelSelect** — bidirectional make/model
8. **2B — TransactionForm SubcategorySelect** — bidirectional category/subcategory
9. **1 — VehicleFilters model filter** — add model FilterSelect with bidirectional logic
10. **4 — Mandatory field highlight** — `mandatoryFieldClass` utility + apply everywhere

---

## TypeScript Verification

After all changes:
```bash
cd frontend && npx tsc --noEmit
```

Zero errors. No `any` types introduced. Unused imports removed.

---

## Do Not Touch

- The existing `disabled={!parentId}` UX is being REMOVED — do not keep it or re-add it elsewhere
- Free-text `address_country` / `address_city` CharFields on `LegalEntity` — keep them, just stop using them in the UI going forward (they stay for PDF generation)
- Dark mode styling must work — the amber color in Feature 4 is tested with `dark:` prefix variants
- Red error messages shown after submit attempt (Zod `errors` object) — these stay unchanged; the amber highlight is a pre-submit visual aid, not a replacement for post-submit errors
- The `allowCreate={!!parentId}` guard on child DynamicSelects stays — user should only create a new city when a country is selected, a new model when a make is selected
