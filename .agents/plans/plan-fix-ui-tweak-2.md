# plan-fix-ui-tweak-2.md

> Feature: UI Fix Round 2 — Split View Density, FinancialMetricsStrip 5+5 Restore, Transaction Calculations Restore
> Depends on: `docs-ui-tweak-fix.md` (previous round — shipped)
> Created: 2026-05-11

---

## Context

Three issues remain after the previous round:

| # | Problem | Files |
|---|---------|-------|
| 1 | Transaction split view left panel: fields stack vertically inside each card instead of going side-by-side, wasting space | `TransactionForm.tsx` |
| 2 | `FinancialMetricsStrip` has 4+5+1 rows instead of 5+5. The 10th metric (`Adjusted Profit`) was deleted instead of moved to Row 1 | `FinancialMetricsStrip.tsx` |
| 3 | Transaction edit and add pages lost their financial calculations strip (the Gross/Net/Tax breakdown) | `TransactionForm.tsx` |

**Do NOT touch anything else.** Vehicle split view, dashboard, light mode CSS, badge fixes — all confirmed good. Leave them alone.

---

## Fix 1 — Transaction Split View: Left Panel Field Density

### Problem

In split view, the left panel renders all card field grids as `grid-cols-1` (one field per row). This was intended to save horizontal space in a narrower left panel, but in practice it makes each card very tall and forces the user to scroll a lot to reach the right panel.

The four cards currently in the left panel are:
1. **Transaction Details** — Category, Subcategory, Description, Notes (currently forced to single column)
2. **Usage Details** — Date, Method, From/To (currently forced to single column)
3. **Additional Information** — Commission, Reference, any extra fields (currently forced to single column)
4. **Purchase Details** — Calculation strip + Amount, Tax, Currency (calculation on its own line, fields forced to single column)

### What to change

**Cards 1, 2, 3 — use 2 columns in split view instead of 1:**

Change the field grid inside each of these three cards from:
```tsx
className={cn("grid gap-4 p-5", showSplitView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3")}
```
to:
```tsx
className={cn("grid gap-4 p-5", showSplitView ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3")}
```

This means in split view, fields sit 2-per-row instead of stacked. The left panel is ~900px wide at 2xl — plenty of room for 2 columns.

**Card 4 (Purchase Details) — calculation on its own line, fields 3-per-row:**

The Purchase Details card has two parts:
- The calculation strip (the Gross/Net/Tax pill) — this must stay on its own full-width line, as it is now
- The three input fields below it (Amount, Tax, Currency)

Change the fields grid from:
```tsx
className={cn("grid gap-4 p5 pt-2", showSplitView ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3")}
```
to:
```tsx
className={cn("grid gap-4 p-5 pt-2", showSplitView ? "grid-cols-3" : "grid-cols-1 md:grid-cols-3")}
```

So in split view: Amount | Tax | Currency sit on one row, with the Gross/Net/Tax calculation pill above them on its own full-width line. This is identical to how the normal (non-split) view renders, just always active.

### What NOT to change

- The calculation pill / price breakdown strip itself — do not touch its layout or content
- The right panel — vehicle selector, go-to-vehicle link, transactions table — leave completely alone
- Normal (non-split) view — only the `showSplitView ? ...` branch changes

### Files changed

| File | Change |
|------|--------|
| `frontend/src/components/transactions/TransactionForm.tsx` | Change `showSplitView ? "grid-cols-1"` to `"grid-cols-2"` for cards 1/2/3; change to `"grid-cols-3"` for the Purchase Details fields grid |

---

## Fix 2 — FinancialMetricsStrip: Restore 5+5 Layout

### Problem

The strip currently renders:
- Row 1: COGS, Txn Expenses, Break-Even, Holding Cost → **4 metrics** (`lg:grid-cols-4`)
- Row 2 (when sold): Gross Profit, Net Profit, Total Profit, Margin, ROI → **5 metrics** (`lg:grid-cols-5`)
- The 10th metric, **Adjusted Profit**, was deleted in the previous round

The user wants 5 metrics in each row: `5 + 5`.

### What the correct layout must be

**Row 1 — Cost Basis (5 metrics, always shown when buy data exists):**

| # | Label | Value | Equation |
|---|-------|-------|----------|
| 1 | COGS | `f.cogs` | `buyNet + totalTxnCost` |
| 2 | Txn Expenses | `f.totalTxnCost` | `{txnCount} transactions` |
| 3 | Break-Even | `f.breakEvenPrice` | `cogs × 1.10` |
| 4 | Holding Cost | `f.holdingCost` | `cogs × rate% ÷ 365 × Nd` |
| 5 | **Adjusted Profit** | `f.adjustedProfit` | `totalProfit − holdingCost` |

**Adjusted Profit** moves from where it was (end of Row 2) to **the end of Row 1**. It belongs in the cost basis group conceptually — it shows profit after accounting for holding cost, which is a cost metric.

**Row 2 — Profit (5 metrics, only when `hasSale === true`):**

| # | Label | Value | Equation |
|---|-------|-------|----------|
| 1 | Gross Profit | `f.grossProfit` | `saleGross − buyGross` |
| 2 | Net Profit | `f.netProfit` | `saleNet − buyNet` |
| 3 | Total Profit | `f.totalProfit` | `saleNet − buyNet − txnCost` ← highlighted |
| 4 | Margin | `f.profitMargin` | `totalProfit ÷ saleNet × 100` |
| 5 | ROI | `f.roi` | `totalProfit ÷ cogs × 100` |

Row 2 is already correct — do not touch it.

### Implementation

**Step 1 — In `FinancialMetricsStrip.tsx`, update Row 1:**

Change the Row 1 grid from `lg:grid-cols-4` to `lg:grid-cols-5`:

```tsx
{/* Row 1: Cost basis metrics */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
    {/* COGS — unchanged */}
    <MetricCell ... />

    {/* Txn Expenses — unchanged, keep the !hideTransactions guard */}
    {!hideTransactions && <MetricCell ... />}

    {/* Break-Even — unchanged, keep the null guard */}
    {f.breakEvenPrice !== null && <MetricCell ... />}

    {/* Holding Cost — unchanged, keep the null guard */}
    {f.holdingCost !== null && <MetricCell ... />}

    {/* Adjusted Profit — ADD THIS BACK at the end of Row 1 */}
    {f.adjustedProfit !== null && (
        <MetricCell
            label="Adj. Profit"
            value={fc(f.adjustedProfit)}
            equation={`${fc(f.totalProfit)} − ${fc(f.holdingCost)}`}
            colorClass={getFinancialColor("adjustedProfit")}
            icon={<TrendingDown className="h-3 w-3" />}
        />
    )}
</div>
```

**Icon to import:** `TrendingDown` from `lucide-react` — add it to the existing import at the top of the file. Check what icons are already imported and add only what's missing.

**`getFinancialColor("adjustedProfit")`** — this already exists in `vehicleFinancials.ts` (confirmed: line 406 defines `adjustedProfit: "text-red-700 dark:text-red-300"`). Do not change `vehicleFinancials.ts`.

**`f.adjustedProfit`** — this field already exists on the `VehicleFinancials` type (confirmed: line 310 in `vehicleFinancials.ts`). No type changes needed.

**Step 2 — Verify Row 2 is untouched**

Row 2 (Gross Profit, Net Profit, Total Profit, Margin, ROI) should not change at all. Double-check it still uses `lg:grid-cols-5` and all 5 metrics are present. If anything was removed in the previous round, restore it to match the spec above.

### Edge cases

- `f.adjustedProfit` can be `null` if `holdingCost` is null (no days-on-stock data). The `!== null` guard already handles this — the cell simply won't render, and the grid will have 4 items instead of 5 (graceful degradation).
- `hideTransactions={true}` (add mode): Txn Expenses is hidden, so Row 1 may show 4 metrics instead of 5. This is correct — the grid reflows naturally.
- Do NOT show `Adjusted Profit` in compact mode — compact mode has its own simpler rendering and is unchanged.

### Files changed

| File | Change |
|------|--------|
| `frontend/src/components/vehicles/FinancialMetricsStrip.tsx` | Add `Adjusted Profit` cell at end of Row 1; change Row 1 grid to `lg:grid-cols-5`; add `TrendingDown` to imports |

---

## Fix 3 — Transaction Form: Restore Financial Calculations Strip

### Problem

The transaction edit and add pages previously showed a financial calculations strip (the **Gross/Net/Tax price breakdown**) inside the Purchase Details card. Looking at the current code, this strip IS still present in the file — it is the pill that shows:

```
Gross: €X,XXX.XX    Net (€X,XXX.XX) + Tax XX% (€XX.XX)
```

However, the user reports it is not visible. There are two possible causes:

**Cause A — The strip exists but is hidden in split view.** In split view, the Purchase Details card is in the left panel. If the card itself or the pill inside it is accidentally inside a block that doesn't render in split view, it won't appear.

**Cause B — The two-column inner layout wrapper broke the rendering.** The current code has a `grid lg:grid-cols-2` wrapper around the two "column" groups (Transaction Details + Usage Details on one side; Purchase Details on the other). In split view, this inner grid was changed to `space-y-6`. It's possible the Purchase Details card (Column 2) is now rendering outside the visible area or below a closing `</div>` that's in the wrong place.

### What to verify and fix

**Step 1 — Read the current JSX structure of `TransactionForm.tsx` carefully.**

Trace the div nesting from the outermost split view grid down to the Purchase Details card. Confirm:
- The Purchase Details card is inside the LEFT column `<div>` in split view
- The price breakdown pill (`Gross: / Net + Tax`) is inside the Purchase Details card header area (`px-5 pt-5 pb-0` block)
- The pill renders unconditionally (not gated on any condition that might be false)

**Step 2 — The pill content must be:**

```tsx
{/* Price breakdown — always visible, own full-width line above the three fields */}
<div className="px-5 pt-5 pb-0">
    <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1 min-w-0 rounded-md border p-2 shadow-sm transition-colors bg-background border-border/40 hover:border-border/80 w-full mb-2">
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">
                Gross:
            </span>
            <span className={`text-sm font-bold ${getAmountColor(grossAmount)} whitespace-nowrap`}>
                {formatMoney(grossAmount)}
            </span>
        </div>
        <div className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">
            Net ({formatMoney(netAmount)}) + Tax {taxRate}% ({formatMoney(taxAmount)})
        </div>
    </div>
</div>
```

This pill is NOT gated on `showSplitView` — it always renders whenever the Purchase Details card is visible, in both normal and split view.

**Step 3 — If the pill is present but not visible:** check whether the Purchase Details card itself is inside the right column (split view right panel) instead of the left panel. It should always be in the LEFT panel. Only the vehicle selector and transactions table belong in the right panel.

**Step 4 — If the pill was deleted:** restore it exactly as shown above, placed between the card header (`<div className="border-b ...">`) and the fields grid (`<div className="grid gap-4 p-5 pt-2 ...">`) inside the Purchase Details card.

### Note on "additional calculations"

Beyond the Gross/Net/Tax pill, if there were other calculation displays previously visible on the transaction form (e.g. a running total, a commission calculation), identify them in the file and ensure they render. Do not invent new calculations — only restore what was there. If they are conditionally rendered (e.g. only when `amount > 0`), make sure those conditions are still met.

### Files changed

| File | Change |
|------|--------|
| `frontend/src/components/transactions/TransactionForm.tsx` | Verify/restore price breakdown pill visibility in both normal and split view |

---

## Complete File Manifest

| File | Fix # | Action |
|------|-------|--------|
| `frontend/src/components/transactions/TransactionForm.tsx` | 1 + 3 | Fix left panel field grid columns; verify/restore calculation pill |
| `frontend/src/components/vehicles/FinancialMetricsStrip.tsx` | 2 | Add Adjusted Profit to Row 1; Row 1 grid → `lg:grid-cols-5` |

**No backend changes. No new files. No new dependencies.**

---

## Implementation Order

```
Step 1  Read TransactionForm.tsx fully       ← understand current div structure before touching anything
Step 2  Fix Purchase Details fields grid     ← cols-2 for cards 1/2/3, cols-3 for Purchase Details fields
Step 3  Verify/fix calculation pill          ← confirm it's visible in both view modes
Step 4  npm run build                        ← must pass before moving on
Step 5  Read FinancialMetricsStrip.tsx       ← understand Row 1 structure
Step 6  Add TrendingDown to imports          ← just add it to the existing lucide-react import line
Step 7  Add Adjusted Profit cell to Row 1   ← at the end of the Row 1 grid
Step 8  Change Row 1 grid to cols-5         ← sm:grid-cols-3 → sm:grid-cols-3, lg:grid-cols-4 → lg:grid-cols-5
Step 9  npm run build                        ← zero TypeScript errors required
```

---

## Constraints

- **Do not touch** `VehicleForm.tsx` — vehicle split view is working correctly
- **Do not touch** `vehicleFinancials.ts` — all the calculated values and types already exist
- **Do not touch** Row 2 of `FinancialMetricsStrip` — it is already correct (5 metrics)
- **Do not touch** the right panel of TransactionForm (vehicle selector, go-to-vehicle link, transactions table)
- **Do not touch** the normal (non-split) view layout of TransactionForm — only the `showSplitView ? ...` branches change
- The `compact` mode of `FinancialMetricsStrip` is unchanged — only the full (non-compact) layout changes

---

## Verification Checklist

### Fix 1 — Split View Left Panel Density

- [ ] In split view: Transaction Details card shows fields 2-per-row (not stacked)
- [ ] In split view: Usage Details card shows fields 2-per-row (Date | Method, From/To wraps)
- [ ] In split view: Additional Information card shows fields 2-per-row
- [ ] In split view: Purchase Details — Gross/Net/Tax pill is on its own full-width line
- [ ] In split view: Purchase Details — Amount | Tax | Currency are on one row (3 columns)
- [ ] Normal (non-split) view: layout completely unchanged

### Fix 2 — FinancialMetricsStrip 5+5

- [ ] Row 1 has exactly 5 metrics: COGS, Txn Expenses, Break-Even, Holding Cost, Adj. Profit
- [ ] Row 2 has exactly 5 metrics: Gross Profit, Net Profit, Total Profit, Margin, ROI
- [ ] Row 2 only renders when vehicle status is sold (hasSale check unchanged)
- [ ] Adjusted Profit shows correct value and equation (totalProfit − holdingCost)
- [ ] Adjusted Profit uses `getFinancialColor("adjustedProfit")` color class
- [ ] Row 1 grid is `lg:grid-cols-5` — all 5 fit on one row on large screens
- [ ] In add mode (`hideTransactions=true`): Row 1 shows 4 metrics (Txn Expenses hidden) — correct
- [ ] Compact mode: unchanged

### Fix 3 — Transaction Calculations Pill

- [ ] Gross/Net/Tax pill is visible on the transaction edit page
- [ ] Gross/Net/Tax pill is visible on the add transaction page
- [ ] Pill updates live as Amount and Tax fields change
- [ ] Pill is visible in both normal view and split view
- [ ] Pill is inside the Purchase Details card, above the Amount/Tax/Currency fields

### General

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Dark mode: nothing broken
- [ ] Vehicle edit page: FinancialMetricsStrip unchanged for unsold vehicles (Row 2 hidden)
