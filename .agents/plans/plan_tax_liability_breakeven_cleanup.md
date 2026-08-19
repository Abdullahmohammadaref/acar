# Plan: Tax Liability Field, Dynamic Break-Even, and Holding Cost Cleanup

**Created:** 2026-08-13  
**Scope:** Edit vehicle details page financial metrics strip + Business Settings page label  
**Status:** Ready for execution

---

## Feature Summary

Four concrete changes to the financial metrics strip on the edit-vehicle-details page, plus one business settings label fix:

1. **Comment out** the "Holding Cost" MetricCell (keep code, just comment out — recoverable later)
2. **Comment out** the "Adj. Profit" MetricCell (same — keep, comment out)
3. **Replace** "Txn Expenses" MetricCell with a new **"VAT Liability"** field  
   - Formula: `|saleTaxAmount − buyTaxAmount|` — both values are always treated as absolute (positive), then take the absolute difference  
   - This is what the business owes the government: the net VAT payable after offsetting input VAT against output VAT (Umsatzsteuerzahllast)
4. **Fix break-even** to use `target_annual_return` from Business Settings dynamically instead of the hardcoded `TARGET_MARGIN = 0.10`
5. **Relabel** the "Target Annual Return (%)" field in Business Settings to **"Target Profit Margin (%)"** with an updated description

---

## Pre-Flight: Discrepancies Found (Verified Against Code)

These are mismatches between documentation/expectations and what the actual code does. Flag these to the developer before execution:

### ⚠️ FLAG 1 — Pre-existing unit bug in `calcHoldingCost` (now moot, but documented)
`VehicleForm.tsx` passes `annualTargetRate: businessSettings?.target_annual_return` to `calcVehicleFinancials`.  
The API returns this as a raw percentage (e.g., `10.0` meaning 10%).  
BUT `calcHoldingCost` expects a decimal fraction (`0.10`), and `ANNUAL_TARGET_RATE = 0.10` is the hardcoded default.  
If a user had set a custom value in settings, the holding cost calculation would have been 100× too large.  
**Action:** This bug is moot since we are commenting out holding cost. Documented for awareness. No fix needed in this plan.

### ⚠️ FLAG 2 — Break-even currently ignores `annualTargetRate` from settings entirely
`calcVehicleFinancials` calls `calcBreakEvenPrice(cogs)` with NO second argument. It always uses the hardcoded constant `TARGET_MARGIN = 0.10`. The `input.annualTargetRate` is never passed to break-even. This plan fixes this.

### ✅ CONFIRMED — No backend/migration changes needed
`Business.target_annual_return` already exists in the DB (DecimalField, default 10.00), is served by `GET /settings/business` as `target_annual_return: float`, and is already fetched in `VehicleForm.tsx` via `useQuery(["business-settings"])`. The DB column name stays as-is — only the UI label and description change.

### ✅ CONFIRMED — `buyTax` and `saleTax` in `VehicleFinancials` are already € amounts
Both are the extracted tax amount in euros (computed by `calcBuyTaxAmount` / `calcSaleTaxAmount`), not percentages. The new `calcTaxLiability` function can directly use them.

---

## Agent Architecture

Two phases. Phase 1 has two parallel streams. Phase 2 is blocked until Phase 1's Agent A is done (because `FinancialMetricsStrip.tsx` imports types from `vehicleFinancials.ts`).

```
Phase 1 ──────────────────────────────────────────────────────┐
  Agent A  →  vehicleFinancials.ts (types + calc logic)       │
              ↓ (must complete first)                         │
  Agent A  →  FinancialMetricsStrip.tsx (display/UI)          │  ← sequential pair
                                                              │
  Agent B  →  BusinessSettingsPage.tsx (label text only)      │  ← parallel-safe, independent
└─────────────────────────────────────────────────────────────┘
Phase 2 ─────────────────────────────────────────────────────
  REVIEW CHECKPOINT — verify TypeScript compiles, check visuals
```

---

## Tasks

---

### Task: Calc lib — add VAT Liability, fix break-even, comment out holding/adj
```
SCOPE: frontend/src/lib/vehicleFinancials.ts
MODE: sequential — FinancialMetricsStrip.tsx imports VehicleFinancials type and calc functions from this file; the strip must be edited AFTER this file is finalized
```

**Exact changes (in order):**

**1. Add `calcTaxLiability` function**  
Insert after `calcAdjustedProfit` (line ~224 currently):

```typescript
/**
 * taxLiability = |saleTaxAmount − buyTaxAmount|
 *
 * Represents the net VAT the business owes the government (Umsatzsteuerzahllast).
 * Both amounts are treated as positive (absolute values) before subtracting,
 * then the result is made absolute to handle the loss case (negative VAT → refund).
 *
 * Returns null if saleTaxAmount is null (sale not set yet, cannot compute liability).
 */
export function calcTaxLiability(
    buyTaxAmount: number | null | undefined,
    saleTaxAmount: number | null | undefined,
): number | null {
    const b = safeNum(buyTaxAmount)
    const s = safeNum(saleTaxAmount)
    if (s === null) return null  // cannot compute without a sale tax
    return roundMoney(Math.abs(Math.abs(s) - Math.abs(b ?? 0)))
}
```

**2. Update `VehicleFinancials` interface**  
Add `taxLiability` field. Comment out `holdingCost` and `adjustedProfit` with recovery instructions:

```typescript
export interface VehicleFinancials {
    // Buy side
    buyGross: number | null
    buyTax: number | null
    buyNet: number | null
    // Sale side
    saleGross: number | null
    saleTax: number | null
    saleNet: number | null
    // Transaction side
    totalTxnCost: number
    txnCount: number
    // Derived
    cogs: number | null
    grossProfit: number | null
    netProfit: number | null
    totalProfit: number | null
    revenue: number | null
    profitMargin: number | null
    roi: number | null
    daysOnStock: number | null
    // VAT Liability — replaces Txn Expenses display; the net VAT owed to government
    taxLiability: number | null
    // COMMENTED OUT — recoverable: uncomment calc call in calcVehicleFinancials + MetricCell in FinancialMetricsStrip
    // holdingCost: number | null
    // adjustedProfit: number | null
    breakEvenPrice: number | null
}
```

**3. Fix `calcVehicleFinancials` function body**  
Three changes inside the function:

**3a.** Add `taxLiability` calculation after existing `const daysOnStock = ...` line:
```typescript
const taxLiability = calcTaxLiability(buyTax, saleTax)
```

**3b.** Fix break-even to use dynamic target margin from settings.  
Change:
```typescript
const breakEvenPrice = calcBreakEvenPrice(cogs)
```
To:
```typescript
// input.annualTargetRate is raw % from API (e.g., 10.0 means 10%).
// calcBreakEvenPrice expects a decimal fraction, so divide by 100.
const breakEvenPrice = calcBreakEvenPrice(
    cogs,
    input.annualTargetRate != null ? input.annualTargetRate / 100 : TARGET_MARGIN
)
```

**3c.** Comment out holding cost and adjusted profit calc calls (keep the lines, just comment out):
```typescript
// COMMENTED OUT — re-enable when holding cost logic is re-implemented correctly
// const holdingCost = calcHoldingCost(cogs, daysOnStock, input.annualTargetRate)
// const adjustedProfit = calcAdjustedProfit(totalProfit, holdingCost)
```

**3d.** Update the return object:
```typescript
return {
    buyGross,
    buyTax,
    buyNet,
    saleGross,
    saleTax,
    saleNet,
    totalTxnCost,
    txnCount,
    cogs,
    grossProfit,
    netProfit,
    totalProfit,
    revenue,
    profitMargin,
    roi,
    daysOnStock,
    taxLiability,
    // holdingCost,     // COMMENTED OUT
    // adjustedProfit,  // COMMENTED OUT
    breakEvenPrice,
}
```

**4. Add `taxLiability` color to `getFinancialColor`**  
Inside the `colors` record, add:
```typescript
taxLiability: "text-orange-600 dark:text-orange-400",
```
Remove or keep (keep is safe) the existing `holdingCost` and `adjustedProfit` color entries — they're not referenced anywhere once the MetricCells are commented out, but leaving them causes no harm.

---

### Task: Strip UI — replace Txn Expenses with VAT Liability, comment out holding/adj cells, fix break-even equation
```
SCOPE: frontend/src/components/vehicles/FinancialMetricsStrip.tsx
MODE: sequential — must run AFTER the vehicleFinancials.ts task above, because this file imports VehicleFinancials type and the new taxLiability field must exist before this compiles
```

**Exact changes:**

**1. Remove unused icon imports**  
`Timer` (was: Holding Cost icon) and `TrendingDown` (was: Adj. Profit icon) are no longer needed.  
Change the lucide-react import from:
```typescript
import {
    Banknote, LineChart, PackageSearch, Percent, PieChart, Receipt, Target, Timer, TrendingUp, TrendingDown,
} from "lucide-react"
```
To:
```typescript
import {
    Banknote, LineChart, PackageSearch, Percent, PieChart, Receipt, Target, TrendingUp,
    // Timer,       // COMMENTED OUT — was used for Holding Cost cell
    // TrendingDown, // COMMENTED OUT — was used for Adj. Profit cell
} from "lucide-react"
```

**2. Replace "Txn Expenses" MetricCell with "VAT Liability"**  
Find the existing `{/* Txn Expenses */}` block:
```tsx
{/* Txn Expenses */}
{!hideTransactions && (
    <MetricCell
        label="Txn Expenses"
        value={f.txnCount > 0 ? formatCurrency(f.totalTxnCost) : "€0.00"}
        equation={f.txnCount > 0 ? `${f.txnCount} transactions` : "none"}
        colorClass={getFinancialColor("totalTxnCost")}
        icon={<Receipt className="h-3 w-3" />}
    />
)}
```
Replace it entirely with:
```tsx
{/* VAT Liability — net VAT owed to government (Umsatzsteuerzahllast) */}
{!hideTransactions && (
    <MetricCell
        label="VAT Liability"
        value={f.taxLiability !== null ? formatCurrency(f.taxLiability) : "—"}
        equation={
            f.taxLiability !== null
                ? `|${f.saleTax !== null ? formatCurrency(f.saleTax) : "—"} − ${f.buyTax !== null ? formatCurrency(f.buyTax) : "—"}|`
                : "sale tax not set"
        }
        colorClass={getFinancialColor("taxLiability")}
        icon={<Receipt className="h-3 w-3" />}
    />
)}
```

**3. Comment out "Holding Cost" MetricCell**  
Find:
```tsx
{/* Holding Cost */}
{f.holdingCost !== null && (
    <MetricCell
        label="Holding Cost"
        value={formatCurrency(f.holdingCost)}
        equation={`${fc(f.cogs)} × ${annualTargetRate ?? 10}% ÷ 365 × ${f.daysOnStock || 0}d`}
        colorClass={getFinancialColor("holdingCost")}
        icon={<Timer className="h-3 w-3" />}
    />
)}
```
Replace with:
```tsx
{/* HOLDING COST — COMMENTED OUT: to be re-implemented correctly later */}
{/* {f.holdingCost !== null && (
    <MetricCell
        label="Holding Cost"
        value={formatCurrency(f.holdingCost)}
        equation={`${fc(f.cogs)} × ${annualTargetRate ?? 10}% ÷ 365 × ${f.daysOnStock || 0}d`}
        colorClass={getFinancialColor("holdingCost")}
        icon={<Timer className="h-3 w-3" />}
    />
)} */}
```

**4. Comment out "Adj. Profit" MetricCell**  
Find:
```tsx
{/* Adjusted Profit */}
{f.adjustedProfit !== null && (
    <MetricCell
        label="Adj. Profit"
        value={fc(f.adjustedProfit)}
        equation={`${fc(f.totalProfit)} − ${fc(f.holdingCost)}`}
        colorClass={getFinancialColor("adjustedProfit")}
        icon={<TrendingDown className="h-3 w-3" />}
    />
)}
```
Replace with:
```tsx
{/* ADJ. PROFIT — COMMENTED OUT: to be re-implemented correctly later */}
{/* {f.adjustedProfit !== null && (
    <MetricCell
        label="Adj. Profit"
        value={fc(f.adjustedProfit)}
        equation={`${fc(f.totalProfit)} − ${fc(f.holdingCost)}`}
        colorClass={getFinancialColor("adjustedProfit")}
        icon={<TrendingDown className="h-3 w-3" />}
    />
)} */}
```

**5. Fix Break-Even equation label (hardcoded `× 1.10` → dynamic)**  
Find:
```tsx
{/* Break-Even */}
{f.breakEvenPrice !== null && (
    <MetricCell
        label="Break-Even"
        value={formatCurrency(f.breakEvenPrice)}
        equation={`${fc(f.cogs)} × 1.10`}
        colorClass={getFinancialColor("breakEvenPrice")}
        icon={<Target className="h-3 w-3" />}
    />
)}
```
Replace with:
```tsx
{/* Break-Even */}
{f.breakEvenPrice !== null && (
    <MetricCell
        label="Break-Even"
        value={formatCurrency(f.breakEvenPrice)}
        equation={`${fc(f.cogs)} × ${(1 + (annualTargetRate ?? 10) / 100).toFixed(2)}`}
        colorClass={getFinancialColor("breakEvenPrice")}
        icon={<Target className="h-3 w-3" />}
    />
)}
```

---

### Task: BusinessSettingsPage — relabel Target Annual Return to Target Profit Margin
```
SCOPE: frontend/src/pages/BusinessSettingsPage.tsx
MODE: parallel-safe — this file has zero import overlap with vehicleFinancials.ts or FinancialMetricsStrip.tsx; it only updates two strings in JSX and is fully independent of the other two tasks
```

**Exact changes — both are in the "Financial Preferences" section (~line 440 area):**

**1. Change the field label**  
Find:
```html
<label className="block text-sm font-medium text-foreground mb-1.5">Target Annual Return (%)</label>
```
Replace with:
```html
<label className="block text-sm font-medium text-foreground mb-1.5">Target Profit Margin (%)</label>
```

**2. Change the description text**  
Find:
```html
<p className="mt-1 text-xs text-muted-foreground">Used to calculate holding costs</p>
```
Replace with:
```html
<p className="mt-1 text-xs text-muted-foreground">Target profit margin used to calculate break-even sale price for each vehicle</p>
```

No other changes. The field's `value`, `onChange`, and the `formData.target_annual_return` binding all stay exactly the same. The DB field name and API key (`target_annual_return`) are unchanged.

---

## Review Checkpoint (after both Phase 1 agents complete)

Before declaring done, verify:

- [ ] TypeScript compiles with no errors in `vehicleFinancials.ts` and `FinancialMetricsStrip.tsx`
- [ ] On edit vehicle page with only buy details filled (no sale): VAT Liability shows "—", Break-Even shows using the settings value, Holding Cost and Adj. Profit are gone
- [ ] On edit vehicle page with both buy + sale details: VAT Liability shows a positive number equal to `|saleTaxAmount − buyTaxAmount|`, with the equation visible below
- [ ] Break-even equation now shows the dynamic rate (e.g., `× 1.10` if target is 10%, `× 1.15` if set to 15%) — not always hardcoded `1.10`
- [ ] Business Settings page → Financial Preferences section shows "Target Profit Margin (%)" label and new description
- [ ] No "holdingCost" or "adjustedProfit" displayed anywhere in the UI (only commented out in source, recoverable)
- [ ] VehicleCard compact mode unaffected (compact mode never showed these fields)

---

## Files NOT Touched

These files are explicitly out of scope for this plan:

| File | Why excluded |
|------|-------------|
| `backend/manager/models.py` | `target_annual_return` field stays as-is, no migration needed |
| `backend/manager/settings_api.py` | API key and schema unchanged |
| `frontend/src/components/vehicles/VehicleCard.tsx` | Uses compact mode — never showed holdingCost/adjustedProfit |
| `frontend/src/components/vehicles/FinancialSummary.tsx` | Separate component, different scope |
| `frontend/src/pages/VehicleFormPage.tsx` | VehicleForm.tsx already passes `annualTargetRate` correctly |
| `frontend/src/components/vehicles/VehicleForm.tsx` | Already passes `annualTargetRate: businessSettings?.target_annual_return` correctly |
| Any backend migration files | No DB schema changes in this plan |

---

## Recovery Instructions (if you want to re-enable holding cost later)

To restore holding cost and adjusted profit later:

1. In `vehicleFinancials.ts`:
   - Uncomment `holdingCost` and `adjustedProfit` in `VehicleFinancials` interface
   - Uncomment the two calc lines in `calcVehicleFinancials`
   - Add them back to the return object
   - Fix the unit bug: divide `input.annualTargetRate` by 100 when passing to `calcHoldingCost` (same as the break-even fix done in this plan)

2. In `FinancialMetricsStrip.tsx`:
   - Uncomment the Holding Cost MetricCell block
   - Uncomment the Adj. Profit MetricCell block
   - Restore `Timer` and `TrendingDown` to the lucide-react import