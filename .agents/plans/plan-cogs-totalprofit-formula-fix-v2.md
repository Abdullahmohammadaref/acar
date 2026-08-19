# Plan: Fix COGS + Total Profit + Break-Even formulas (v3 — corrected per your follow-up)

## 0. What changed from the previous version of this plan, and two corrections flagged from verifying against actual code

You corrected two things in your last message. Both are now incorporated below. I also re-verified everything against the actual current code (not assumption) before finalizing this, and found two places where the code doesn't match what you believe — flagging both clearly rather than silently going along with it:

1. **`totalTxnCost` is fully removed from the COGS/Total Profit formulas now** (previously I kept it as an optional third term). **Correction/flag**: you said "we already removed this from our app (or commented out)" — I checked, and that's not accurate. `frontend/src/components/vehicles/VehicleForm.tsx` still actively fetches linked bank transactions (`useTransactions(...)` at line 398), builds `txnsForCalc` from them (line 516), passes them into the calc (`transactions: txnsForCalc` at line 528), and `FinancialMetricsStrip.tsx` still renders a live "VAT Liability" card gated by `hideTransactions={!isEditing}` (line 1273 of `VehicleForm.tsx`). None of this is commented out or removed. This plan removes `totalTxnCost` specifically from the **COGS and Total Profit formulas**, as you instructed — but it does **not** touch the transaction-fetching, the VAT Liability card, or `RelatedTransactionsTable`, since those are a separate, still-fully-active feature you didn't ask to remove. If you do want that whole feature ripped out, say so and I'll scope a separate plan for it — it's a bigger change (touches data fetching, an entire card, and a table component) than "fix two formulas."
2. **Break-Even**: you said it currently uses "sale net price × Target Profit Margin" and should instead use "cogos × Target Profit Margin." **Correction/flag**: I checked `calcBreakEvenPrice` (`frontend/src/lib/vehicleFinancials.ts`, currently lines 294-301) and its call site inside `calcVehicleFinancials` (currently line 384-387) — it is **already** `COGS × (1 + targetMargin)`, not sale-net-based. The equation label in `FinancialMetricsStrip.tsx` (line 162) also already reads `${fc(f.cogs)} × ...`, confirmed COGS-based on screen too. **No code change is needed for Break-Even** — it was already correct. I'm not adding a task for it. If you're seeing something on screen that looks like it's using sale price, it would help to see a screenshot of that specific card, because the formula in the code doesn't match that description.

## 1. The exact formulas this plan now implements

```
netExpensesEarnings = Σ(expense.amount) − Σ(earning.amount)

COGS = buyNet + netExpensesEarnings                              ← totalTxnCost term fully removed

totalProfit = saleNet − COGS − taxLiability                      ← your new instruction: subtract VAT liability too

breakEvenPrice = COGS × (1 + targetMargin)                       ← UNCHANGED, already correct, no task needed
```
`taxLiability` itself is unchanged (`= |saleTaxAmount − buyTaxAmount|`, from `calcTaxLiability`, already existing) — it just now needs to be computed *before* `totalProfit` inside `calcVehicleFinancials`, since `totalProfit` depends on it (today it's computed after, this plan reorders that).

`profitMargin` (`= totalProfit ÷ revenue × 100`) and `roi` (`= totalProfit ÷ cogs × 100`) need **no formula change** — they already consume `totalProfit`/`cogs` as opaque numbers, so they're automatically correct once those two are fixed.

`netProfit` (`= saleNet − buyNet`) is still untouched — separate, simpler metric, not mentioned in your request.

## 2. Tasks

### Task: Rework calcCOGS, calcTotalProfit; remove totalTxnCost from the output; add calcNetExpensesEarnings
SCOPE: `frontend/src/lib/vehicleFinancials.ts`
MODE: sequential — foundational change; both other tasks read the types/fields this task creates

Steps:
1. Add a new interface right after `TransactionForCalc` (currently lines 122-125):
```typescript
export interface ExpenseEarningForCalc {
    type: "expense" | "earning"
    amount: number | string | null
}
```
2. Add a new pure function right after `countLinkedTransactions` (currently ends line 158), before the `// Derived Metrics` section comment (currently lines 160-162):
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
3. Replace `calcCOGS` (currently lines 164-172) — **`totalTxnCost` parameter removed entirely**, replaced by `netExpensesEarnings`:
```typescript
/** COGS = buyNet + netExpensesEarnings */
export function calcCOGS(
    buyNet: number | null | undefined,
    netExpensesEarnings: number | null | undefined = 0,
): number | null {
    const bn = safeNum(buyNet)
    if (bn === null) return null
    return roundMoney(bn + (safeNum(netExpensesEarnings) ?? 0))
}
```
4. Replace `calcTotalProfit` (currently lines 196-206) — signature changes from `(saleNet, buyNet, totalTxnCost)` to `(saleNet, cogs, taxLiability)`:
```typescript
/** totalProfit = saleNet − COGS − taxLiability  (the real bottom line) */
export function calcTotalProfit(
    saleNet: number | null | undefined,
    cogs: number | null | undefined,
    taxLiability: number | null | undefined,
): number | null {
    const sn = safeNum(saleNet)
    const c = safeNum(cogs)
    if (sn === null || c === null) return null
    return roundMoney(sn - c - (safeNum(taxLiability) ?? 0))
}
```
5. Do **not** touch `calcNetProfit`, `calcTaxLiability`, or `calcBreakEvenPrice` function bodies — all three stay exactly as they are today (Section 0 confirms `calcBreakEvenPrice` is already correct).
6. Do **not** delete `calcTotalTxnCost`, `calcTxnNet`, `countLinkedTransactions`, or the `TransactionForCalc` interface — leave these functions defined and exported exactly as they are (they're harmless if unused by this calc, and ripping them out would require touching the still-active transaction-fetching code in `VehicleForm.tsx`, which is out of scope per Section 0.1).
7. Add `entries` to `CalcVehicleFinancialsInput` (currently lines 336-347), after the existing `transactions` field:
```typescript
    entries?: ExpenseEarningForCalc[] | null
```
   Leave the existing `transactions?: TransactionForCalc[] | null` field declared as-is (still accepted as input, simply no longer used by this function's body after step 8 — `VehicleForm.tsx` keeps passing it without needing changes to that part of its call).
8. In the `VehicleFinancials` output interface (currently lines 307-334):
   - **Remove** the two fields `totalTxnCost: number` and `txnCount: number` (currently lines 317-318).
   - Add `netExpensesEarnings: number` in their place.
9. Inside `calcVehicleFinancials` (currently lines 353-411), replace the body from the `totalTxnCost`/`txnCount` computation through `taxLiability` with the following (this reorders `taxLiability` to be computed before `totalProfit`, and removes the two deleted calls):

   **Remove** these two lines entirely (currently 369-370):
   ```typescript
   const totalTxnCost = calcTotalTxnCost(input.transactions)
   const txnCount = countLinkedTransactions(input.transactions)
   ```
   **Replace** with:
   ```typescript
   const netExpensesEarnings = calcNetExpensesEarnings(input.entries)
   ```
   **Change** `const cogs = calcCOGS(buyNet, totalTxnCost)` (currently line 372) to:
   ```typescript
   const cogs = calcCOGS(buyNet, netExpensesEarnings)
   ```
   **Move** the existing `const taxLiability = calcTaxLiability(buyTax, saleTax)` line (currently line 380, after `daysOnStock`) to **immediately after** the `netProfit` line and **before** `totalProfit` — i.e., the order becomes:
   ```typescript
   const grossProfit = calcGrossProfit(saleGross, buyGross)
   const netProfit = calcNetProfit(saleNet, buyNet)
   const taxLiability = calcTaxLiability(buyTax, saleTax)          // ← moved up from its old position
   const totalProfit = calcTotalProfit(saleNet, cogs, taxLiability) // ← was: calcTotalProfit(saleNet, buyNet, totalTxnCost)
   const revenue = calcRevenue(saleNet)
   const profitMargin = calcProfitMargin(totalProfit, revenue)
   const roi = calcROI(totalProfit, cogs)
   const daysOnStock = calcDaysOnStock(input.buyDate, rawSaleDate)
   ```
   (Remove the old `const taxLiability = calcTaxLiability(buyTax, saleTax)` line from its previous position after `daysOnStock` — it now only appears once, in its new earlier position.)
   `breakEvenPrice = calcBreakEvenPrice(cogs, ...)` (currently lines 384-387) stays exactly where it is and exactly as written — unchanged, per Section 0.2.
10. In the returned object (currently lines 389-410): remove `totalTxnCost,` and `txnCount,`, add `netExpensesEarnings,` in their place. Leave every other returned field name unchanged.

### Task: Feed real expense/earning entries into the calc in VehicleForm.tsx
SCOPE: `frontend/src/components/vehicles/VehicleForm.tsx`
MODE: parallel-safe with the FinancialMetricsStrip task below — both depend on Task 1's new types/fields but not on each other, and touch different files

Steps:
1. Locate the `calcVehicleFinancials({...})` call (currently lines 521-530).
2. Add one field after the existing `transactions: txnsForCalc,` line (currently line 528):
```typescript
        entries: vehicle?.expenses_earnings?.map((e) => ({ type: e.type, amount: e.amount })) ?? null,
```
   This reads `vehicle.expenses_earnings` (already fetched today, typed with `type`/`amount` matching `ExpenseEarningForCalc` exactly) — no transformation beyond picking the two fields.
3. No other change in this file. `transactions: txnsForCalc` stays exactly as it is — it's simply an input the calc function no longer reads, per Task 1 step 7; no need to remove it here, and doing so is explicitly out of scope per Section 0.1.

### Task: Update the COGS and Total Profit equation labels; verify Break-Even label is unchanged
SCOPE: `frontend/src/components/vehicles/FinancialMetricsStrip.tsx`
MODE: parallel-safe with the VehicleForm.tsx task above — depends only on Task 1's new `netExpensesEarnings`/`cogs`/`taxLiability` fields on `VehicleFinancials`, not on how `VehicleForm.tsx` computes them; different file, zero overlap

Steps, inside the non-compact `return` block:
1. Update the **COGS** `MetricCell`'s `equation` prop (currently lines 135-137). Since `totalTxnCost` no longer exists on `VehicleFinancials`, the old `hideTransactions`-based branching for this specific equation is no longer meaningful — replace both branches with a single unconditional line:
```tsx
                    equation={`${fc(f.buyNet)} + ${fc(f.netExpensesEarnings || 0)}`}
```
   (removes the old `!hideTransactions ? ... : ...` ternary entirely — `hideTransactions` is still used elsewhere in this file, e.g. to gate the VAT Liability card at line 143, so don't touch those other usages).
2. Update the **Total Profit** `MetricCell`'s `equation` prop (currently line 216):
```tsx
                        equation={`${fc(f.saleNet)} − ${fc(f.cogs)} − ${fc(f.taxLiability || 0)}`}
```
   (changed from the current `` `${fc(f.saleNet)} − ${fc(f.buyNet)} − ${fc(f.totalTxnCost || 0)}` ``).
3. **Leave the Break-Even `MetricCell` (currently lines 158-166) completely untouched** — its equation (`` `${fc(f.cogs)} × ${(1 + (annualTargetRate ?? 10) / 100).toFixed(2)}` ``) is already correct per Section 0.2, no change needed.
4. Do not change any other `MetricCell` in this file (Gross Profit, Net Profit, VAT Liability, Margin, ROI are untouched).

## 3. Execution order

```
Phase 1 (solo, foundational):
  T1 [sequential]: vehicleFinancials.ts — add calcNetExpensesEarnings; strip totalTxnCost from calcCOGS (now 2 params: buyNet, netExpensesEarnings); change calcTotalProfit to (saleNet, cogs, taxLiability); remove totalTxnCost/txnCount from VehicleFinancials output; reorder taxLiability to compute before totalProfit inside calcVehicleFinancials
  → REVIEW CHECKPOINT: confirm the file type-checks in isolation — the internal call site (line ~372-380 area) is part of this same task's scope, so nothing should be broken even before Phase 2 runs. Specifically verify `taxLiability` is defined before its first use in `totalProfit`'s calculation (order-of-declaration matters in JS).

Phase 2 (2-way parallel, both depend on T1 only):
  T2 [parallel-safe]: VehicleForm.tsx — pass vehicle.expenses_earnings into the calc call
  T3 [parallel-safe]: FinancialMetricsStrip.tsx — update COGS and Total Profit equation labels (Break-Even untouched)
  → REVIEW CHECKPOINT: reload the vehicle from your earlier screenshots (buy price 465 gross / 7% tax → buyNet 434,58 €; sale price 90 gross / 15% tax → saleNet 78,26 €, saleTax 11,74 €, buyTax 30,42 € → taxLiability |11,74 − 30,42| = 18,68 €; expenses/earnings net +28.114,00 € per the card shown). Confirm:
    - COGS card reads `434,58 € + 28.114,00 € = 28.548,58 €` (buyNet + netExpensesEarnings only, no third term).
    - Total Profit card reads `78,26 € − 28.548,58 € − 18,68 €` (saleNet − cogs − taxLiability, three terms, no buyNet or totalTxnCost anywhere in it).
    - Break-Even card is visually unchanged from before this plan — still `{cogs} × {multiplier}`.
    - Margin and ROI values shift automatically along with the corrected totalProfit/cogs — no separate check needed beyond confirming the numbers moved sensibly.
    - Net Profit card is unchanged (`78,26 € − 434,58 €`) — confirms scope stayed limited to COGS/Total Profit as intended.
    - VAT Liability card (still active, per Section 0.1) is unaffected — still shows `18,68 €` computed the same way it always was.
```
