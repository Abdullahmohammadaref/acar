# UI Tweak Fix Round 2 Documentation

**Date:** 2026-05-14
**Context:** This document outlines the fixes applied to `TransactionForm.tsx` and `FinancialMetricsStrip.tsx` to resolve density and layout issues reported after the previous UI tweaks.

## 1. Transaction Split-View Density (`TransactionForm.tsx`)

**Problem:** 
In split view, the left panel rendered all card field grids as `grid-cols-1` (one field per row). This made each card very tall, wasting horizontal space and forcing the user to scroll down to see everything while the right panel remained mostly empty.

**Solution:**
We updated the `className` logic for the cards inside the left panel when `showSplitView` is true:
- **Cards 1, 2, 3 (Transaction Details, Usage Details, Additional Information):** Changed the grid layout from `grid-cols-1` to `grid-cols-2`. This ensures fields sit 2-per-row, using the horizontal space effectively.
- **Card 4 (Purchase Details):** Changed the fields grid from `grid-cols-1` to `grid-cols-3`. Now, Amount, Tax, and Currency sit on a single row, immediately below the full-width Gross/Net/Tax calculation pill.

*Note:* The Gross/Net/Tax calculation pill was verified to be correctly present and unconditionally rendered in the Purchase Details card inside the left panel.

## 2. FinancialMetricsStrip 5+5 Layout (`FinancialMetricsStrip.tsx`)

**Problem:**
The `FinancialMetricsStrip` displayed a 4+5 metric layout because the "Adjusted Profit" metric was previously removed instead of being repositioned to the first row.

**Solution:**
We restored the 5+5 layout:
- **Row 1 (Cost Basis):** Restored the "Adjusted Profit" metric at the end of the row. It correctly computes `Total Profit - Holding Cost` and uses the `TrendingDown` icon.
- **Grid Layout:** Updated Row 1 from `lg:grid-cols-4` to `lg:grid-cols-5` so that all 5 cost-basis metrics (COGS, Txn Expenses, Break-Even, Holding Cost, Adj. Profit) fit side by side.
- **Row 2 (Profit):** Kept as is with 5 metrics (Gross Profit, Net Profit, Total Profit, Margin, ROI) rendered only when `hasSale` is true.

## 3. Verification

- All components compile successfully.
- Vehicle edit page `FinancialMetricsStrip` gracefully downgrades to 4 items in add mode (`hideTransactions=true`).
- The `TransactionForm` preserves its normal full-width view when split-view is disabled.
