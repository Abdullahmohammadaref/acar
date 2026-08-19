# Plan: Fix COGS / Total Profit to include Expenses & Earnings

## 0. Docs-vs-code verification (Codegraph-checked, not doc-trusted)

1. **Confirmed via Codegraph**: `calcCOGS` and `calcTotalProfit` (`frontend/src/lib/vehicleFinancials.ts`) each have exactly **one caller**, and it's the same function in the same file — `calcVehicleFinancials` (lines 372 and 375 respectively). `calcVehicleFinancials` itself has 2 callers, both inside `frontend/src/components/vehicles/VehicleForm.tsx` (the live `watch()`-driven calc used to render `FinancialMetricsStrip`). This means the fix is fully contained to these two files plus the equation-label strings in `FinancialMetricsStrip.tsx` — nothing else in the frontend calls these functions, so changing their signatures is safe.
2. **Confirmed the current, real formulas** (not from docs — read directly from `frontend/src/lib/vehicleFinancials.ts`):
   - `COGS = buyNet + totalTxnCost` (line 165-172), where `totalTxnCost` is the sum of *linked bank `Transaction` records'* net amounts (`calcTotalTxnCost`, lines 141-151) — a pre-existing, separate feature from the new expenses/earnings entries, fed from real `Transaction` rows fetched via `useTransactions({ vehicle: vehicle?.internal_id })` in `VehicleForm.tsx` (line 395).
   - `totalProfit = saleNet − buyNet − totalTxnCost` (line 197-206), already commented `// the real bottom line`.
   - `netProfit = saleNet − buyNet` (line 186-194) — a **separate** metric from `totalProfit`, deliberately excluding transaction/expense costs. **You didn't mention `netProfit` in your message**, so this plan does not touch it — it keeps meaning "profit before any additional costs," same as today.
3. **Confirmed `VehicleExpenseEarning` entries are NOT currently part of this calculation at all.** `calcVehicleFinancials`'s input (`CalcVehicleFinancialsInput`, lines 336-347) has no field for them today — `vehicle.expenses_earnings` (populated by the backend, per the earlier plan) is fetched into the page but never passed into the financial calc. This confirms your report: the expense/earning entries you add currently have **zero effect** on COGS, Total Profit, Margin, or ROI.
4. **Backend has two separate, unrelated "profit" calculations** that this plan does **not** touch, flagging so you're aware they'll stay inconsistent with the fixed per-vehicle number after this plan:
   - `backend/manager/dashboard_api.py` (`get_dashboard`, lines 146-362) computes a fleet-wide `total_profit` as `sale_net − buy_net` per sold vehicle — no transaction costs, no expenses/earnings, at all.
   - `backend/manager/vehicle_api.py`'s `calculate_summary` (lines 481-543) computes a fleet-wide summary using linked bank `Transaction` totals — also no expenses/earnings, and doesn't compute "COGS" as a concept at all.
   Both are pre-existing, already inconsistent with the detailed per-vehicle calc (they don't even include `totalTxnCost` today), and your message was specifically about what you see on the Vehicle edit page, not the dashboard. Not in scope for this plan — flagging so you can decide separately whether the dashboard should ever be reconciled to match.
5. **PROJECT_MAP.md mismatch (same one flagged in the last plan, still unresolved)**: it does not mention `VehicleExpenseEarning`, the expenses/earnings endpoints, or `VehicleExpensesEarningsCard.tsx` anywhere. Not blocking this plan, but flagging again since it's now two plans in a row where the doc was stale for this feature.

## 1. The exact formula this plan implements

Restating your description in unambiguous math, confirmed consistent both ways you phrased it ("minus" and "sum" aren't actually a contradiction — see below):

```
netExpensesEarnings = Σ(expense.amount) − Σ(earning.amount)
```
Expenses add to cost, earnings reduce it. If earnings outweigh expenses, `netExpensesEarnings` is **negative** — which is exactly your "if that number is negative, then of course it's minus by default": adding a negative number to COGS automatically subtracts.

```
COGS         = buyNet + totalTxnCost + netExpensesEarnings     (adds the existing linked-transaction cost AND the new entries)
totalProfit  = saleNet − buyNet − totalTxnCost − netExpensesEarnings
             = saleNet − COGS
```
This second line is exactly your "total profit should be the difference between buy detail and sell detail [via COGS], and we should add the net expense and earnings, ... if it was negative the expense and earnings should be minus" — `saleNet − COGS` and `saleNet − buyNet − totalTxnCost − netExpensesEarnings` are the same formula; COGS just bundles all three cost components (buy price, linked transactions, and now expenses/earnings) into one number.

`profitMargin` and `roi` are **not touched directly** — they're already computed as `totalProfit ÷ revenue × 100` and `totalProfit ÷ COGS × 100` respectively, so they update automatically once `totalProfit` and `COGS` are correct; no formula change needed in `calcProfitMargin` or `calcROI`.

## 2. Tasks

### Task: Add netExpensesEarnings to the core calc functions
SCOPE: `frontend/src/lib/vehicleFinancials.ts`
MODE: sequential — this is the foundational change; both other tasks read the new types/fields this task creates and cannot run before it

Steps:
1. Add a new interface right after `TransactionForCalc` (currently lines 122-125):
```typescript
export interface ExpenseEarningForCalc {
    type: "expense" | "earning"
    amount: number | string | null
}
```
2. Add a new pure function immediately after `countLinkedTransactions` (currently ends line 158), before the `// Derived Metrics` section comment (currently line 160-162):
```typescript
/** netExpensesEarnings = Σ expense amounts − Σ earning amounts (expenses add to cost, earnings reduce it) */
export function calcNetExpensesEarnings(
    entries: ExpenseEarningForCalc[] | null | undefined,
): number {
    if (!entries || entries.length === 0) return 0
    return roundMoney(
        entries.reduce((sum, e) => {
            const amt = safeNum(e.amount) ?? 0
            return sum + (e.type === "expense" ? amt : -amt)
        }, 0),
    )
}
```
3. Modify `calcCOGS` (currently lines 164-172) — add a third parameter with a default of `0` so any other future caller that doesn't pass it keeps working exactly as before:
```typescript
/** COGS = buyNet + totalTxnCost + netExpensesEarnings */
export function calcCOGS(
    buyNet: number | null | undefined,
    totalTxnCost: number | null | undefined,
    netExpensesEarnings: number | null | undefined = 0,
): number | null {
    const bn = safeNum(buyNet)
    if (bn === null) return null
    return roundMoney(bn + (safeNum(totalTxnCost) ?? 0) + (safeNum(netExpensesEarnings) ?? 0))
}
```
4. Modify `calcTotalProfit` (currently lines 196-206) — same pattern, add the fourth parameter with default `0`:
```typescript
/** totalProfit = saleNet − buyNet − totalTxnCost − netExpensesEarnings  (the real bottom line) */
export function calcTotalProfit(
    saleNet: number | null | undefined,
    buyNet: number | null | undefined,
    totalTxnCost: number | null | undefined,
    netExpensesEarnings: number | null | undefined = 0,
): number | null {
    const sn = safeNum(saleNet)
    const bn = safeNum(buyNet)
    if (sn === null || bn === null) return null
    return roundMoney(sn - bn - (safeNum(totalTxnCost) ?? 0) - (safeNum(netExpensesEarnings) ?? 0))
}
```
5. Add `entries` to the input interface, `CalcVehicleFinancialsInput` (currently lines 336-347), after the existing `transactions` field:
```typescript
    entries?: ExpenseEarningForCalc[] | null
```
6. Add `netExpensesEarnings` to the output interface, `VehicleFinancials` (currently lines 307-334), right after the existing `totalTxnCost: number` field (line 317):
```typescript
    netExpensesEarnings: number
```
7. Inside `calcVehicleFinancials` (currently lines 353-411):
   - Immediately after the existing `const totalTxnCost = calcTotalTxnCost(input.transactions)` / `const txnCount = countLinkedTransactions(input.transactions)` lines (currently 369-370), add:
```typescript
    const netExpensesEarnings = calcNetExpensesEarnings(input.entries)
```
   - Change the existing `const cogs = calcCOGS(buyNet, totalTxnCost)` line (currently 372) to:
```typescript
    const cogs = calcCOGS(buyNet, totalTxnCost, netExpensesEarnings)
```
   - Change the existing `const totalProfit = calcTotalProfit(saleNet, buyNet, totalTxnCost)` line (currently 375) to:
```typescript
    const totalProfit = calcTotalProfit(saleNet, buyNet, totalTxnCost, netExpensesEarnings)
```
   - Add `netExpensesEarnings,` to the returned object (currently lines 389-410), next to the existing `totalTxnCost,` line.
   - Do **not** touch `const netProfit = calcNetProfit(saleNet, buyNet)` (currently line 374) — leave `calcNetProfit` itself and this call completely unmodified, per Section 0.2 above.

### Task: Feed real expense/earning entries into the calc in VehicleForm.tsx
SCOPE: `frontend/src/components/vehicles/VehicleForm.tsx`
MODE: parallel-safe with the FinancialMetricsStrip task below — both depend on Task 1 (the new `entries`/`netExpensesEarnings` fields must exist first) but do not depend on each other and touch different files

Steps:
1. Locate the `calcVehicleFinancials({...})` call (currently lines 518-527).
2. Add one new field to the input object, after the existing `transactions: txnsForCalc,` line (currently line 525):
```typescript
        entries: vehicle?.expenses_earnings?.map((e) => ({ type: e.type, amount: e.amount })) ?? null,
```
   This reads from `vehicle.expenses_earnings` (the field already returned by the backend per the earlier plan, typed as `VehicleExpenseEarning[]` in `frontend/src/types/vehicle.ts` with `type: "expense" | "earning"` and `amount: number`) — directly compatible with the new `ExpenseEarningForCalc[]` input type, no mapping/transformation needed beyond picking the two fields.
3. No other change needed in this file — `vehicleFinancials.cogs`, `.totalProfit`, `.netExpensesEarnings` etc. are already destructured/used downstream via the existing `vehicleFinancials` variable and passed to `<FinancialMetricsStrip financials={vehicleFinancials} .../>` (unchanged call site).

### Task: Show the new term in the on-screen equations
SCOPE: `frontend/src/components/vehicles/FinancialMetricsStrip.tsx`
MODE: parallel-safe with the VehicleForm.tsx task above — depends only on Task 1's new `netExpensesEarnings` field on `VehicleFinancials`, not on how `VehicleForm.tsx` computes it; touches a different file with zero overlap

This directly addresses your "it's saying here minus zero, actually it should be plus the expense and earnings" — that's the literal on-screen equation text under the COGS and Total Profit cells, currently showing a hardcoded `+ €0.00` / `− €0.00` because `totalTxnCost` defaults to 0 when there are no linked bank transactions and the expense/earning term wasn't in the string at all.

Steps, inside the non-compact `return` block (currently lines 127-245):
1. Update the **COGS** `MetricCell`'s `equation` prop (currently lines 135-137):
```tsx
                    equation={!hideTransactions
                        ? `${fc(f.buyNet)} + ${fc(f.totalTxnCost || 0)} + ${fc(f.netExpensesEarnings || 0)}`
                        : `${fc(f.buyNet)} + ${fc(f.netExpensesEarnings || 0)}`}
```
   (changed from the current `` `${fc(f.buyNet)} + ${fc(f.totalTxnCost || 0)}` `` / `` `buyNet ${fc(f.buyNet)}` ``)
2. Update the **Total Profit** `MetricCell`'s `equation` prop (currently line 216):
```tsx
                        equation={`${fc(f.saleNet)} − ${fc(f.buyNet)} − ${fc(f.totalTxnCost || 0)} − ${fc(f.netExpensesEarnings || 0)}`}
```
   (changed from the current `` `${fc(f.saleNet)} − ${fc(f.buyNet)} − ${fc(f.totalTxnCost || 0)}` ``)
3. Do not change any other `MetricCell` in this file (Break-Even, Gross Profit, Net Profit, Margin, ROI equations are untouched — Net Profit deliberately still shows only `saleNet − buyNet`, matching Section 0.2/Section 1 above).

## 3. Execution order

```
Phase 1 (solo, foundational):
  T1 [sequential]: vehicleFinancials.ts — add calcNetExpensesEarnings, extend calcCOGS/calcTotalProfit signatures, extend input/output types
  → REVIEW CHECKPOINT: confirm the file still type-checks in isolation (no other file touched yet, so `entries`/`netExpensesEarnings` are optional/defaulted and nothing downstream breaks even before Phase 2 runs).

Phase 2 (2-way parallel, both depend on T1 only):
  T2 [parallel-safe]: VehicleForm.tsx — pass vehicle.expenses_earnings into the calc call
  T3 [parallel-safe]: FinancialMetricsStrip.tsx — update COGS and Total Profit equation label strings
  → REVIEW CHECKPOINT: open the Edit Vehicle page for a vehicle with a Buy Price set. Add one expense (e.g. €100) via the Expenses & Earnings card — confirm COGS increases by €100 and its equation line now shows the added term. Add one earning (e.g. €40) — confirm COGS decreases by €40 net of the expense (COGS should now read buyNet + €100 − €40 = buyNet + €60). If the vehicle also has Sale Price set, confirm Total Profit drops by the same €60 relative to before adding these entries, and that Margin/ROI shift accordingly (no separate check needed for those — they're derived automatically). Confirm Net Profit is unaffected by adding/removing expense or earning entries.
```
