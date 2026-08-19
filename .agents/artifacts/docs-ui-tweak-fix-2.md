# docs-ui-tweak-fix-2: COGS + Total Profit Formula Fix

**Date:** 2026-08-19  
**Scope:** Frontend financial calculation formulas + equation display labels  
**Plan:** `plan-cogs-totalprofit-formula-fix-v2.md`

---

## What Changed

### 1. New `ExpenseEarningForCalc` Interface + `calcNetExpensesEarnings` Function
**File:** `frontend/src/lib/vehicleFinancials.ts`

Added a new interface and pure function to compute the net cost from vehicle-scoped expense/earning entries:

```typescript
export interface ExpenseEarningForCalc {
    type: "expense" | "earning"
    amount: number | string | null
}

export function calcNetExpensesEarnings(
    entries: ExpenseEarningForCalc[] | null | undefined,
): number
```

Formula: `netExpensesEarnings = Σ(expense.amount) − Σ(earning.amount)`

### 2. COGS Formula Updated
**File:** `frontend/src/lib/vehicleFinancials.ts`

| Before | After |
|--------|-------|
| `COGS = buyNet + totalTxnCost` | `COGS = buyNet + netExpensesEarnings` |

The `totalTxnCost` parameter was removed from `calcCOGS`. It now takes `netExpensesEarnings` (from vehicle expenses/earnings entries) instead of the old bank-transaction-derived cost.

### 3. Total Profit Formula Updated
**File:** `frontend/src/lib/vehicleFinancials.ts`

| Before | After |
|--------|-------|
| `totalProfit = saleNet − buyNet − totalTxnCost` | `totalProfit = saleNet − COGS − taxLiability` |

The function signature changed from `(saleNet, buyNet, totalTxnCost)` to `(saleNet, cogs, taxLiability)`. This means Total Profit now properly accounts for:
- All expenses/earnings (via COGS)
- VAT liability (subtracted as a separate cost)

### 4. `VehicleFinancials` Interface Updated
**File:** `frontend/src/lib/vehicleFinancials.ts`

Removed fields:
- `totalTxnCost: number`
- `txnCount: number`

Added field:
- `netExpensesEarnings: number`

### 5. `CalcVehicleFinancialsInput` Updated
**File:** `frontend/src/lib/vehicleFinancials.ts`

Added `entries?: ExpenseEarningForCalc[] | null` to accept vehicle expense/earning entries.

### 6. Computation Order Change
**File:** `frontend/src/lib/vehicleFinancials.ts` — inside `calcVehicleFinancials()`

`taxLiability` is now computed **before** `totalProfit` (it was previously computed after), because `totalProfit` now depends on it.

### 7. VehicleForm.tsx — Passes Entries to Calc
**File:** `frontend/src/components/vehicles/VehicleForm.tsx`

Added `entries: vehicle?.expenses_earnings?.map(...)` to the `calcVehicleFinancials()` call. This feeds the real expense/earning data into the new formula.

### 8. Equation Labels Updated
**File:** `frontend/src/components/vehicles/FinancialMetricsStrip.tsx`

| Metric | Old Equation | New Equation |
|--------|-------------|--------------|
| COGS | `buyNet + totalTxnCost` (with transaction gating) | `buyNet + netExpensesEarnings` (always shown) |
| Total Profit | `saleNet − buyNet − totalTxnCost` | `saleNet − cogs − taxLiability` |

Break-Even equation was confirmed already correct — no change needed.

---

## What Was NOT Changed

- **Break-Even formula** — already correct (`COGS × (1 + targetMargin)`)
- **`calcTotalTxnCost`, `calcTxnNet`, `countLinkedTransactions`, `TransactionForCalc`** — left defined and exported (still used by the active transaction-fetching code in VehicleForm.tsx)
- **VAT Liability card** — unchanged, still active
- **Net Profit card** — unchanged (`saleNet − buyNet`)
- **Gross Profit, Margin, ROI** — unchanged (they consume the corrected `totalProfit`/`cogs` automatically)
- **Backend** — no backend changes in this plan
- **Design system** — no design changes needed

---

## Verification

- ✅ TypeScript compiles with zero errors (`npx tsc --noEmit`)
- ✅ All existing functions remain exported (no breaking import changes)
- ✅ `transactions` field still accepted by `CalcVehicleFinancialsInput` (backward compatible)

---

## Files Modified

| File | Lines Changed |
|------|--------------|
| `frontend/src/lib/vehicleFinancials.ts` | ~40 lines across 8 chunks |
| `frontend/src/components/vehicles/VehicleForm.tsx` | 1 line added |
| `frontend/src/components/vehicles/FinancialMetricsStrip.tsx` | 2 equation props updated |
