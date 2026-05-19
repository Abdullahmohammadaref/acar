# UI Tweaks Documentation

## Changes Implemented

### 1. Visual Aesthetics (Light Mode)
- **File**: `index.css`
- **Changes**: 
  - Adjusted `--card` to `#f7f9fc` for a very subtle blue-white tint, improving separation from the white background.
  - Adjusted `--border` and `--input` to `#b0bed2` (which maps to HSL 214 20% 74%), making borders slightly more visible but still soft.

### 2. Transaction Status Badges
- **Files**: `TransactionTable.tsx`, `RelatedTransactionsTable.tsx`
- **Changes**:
  - Implemented `compactBadges` prop in `TransactionTable`.
  - When `compactBadges` is true, long statuses like `review_required` are rendered on two stacked lines with smaller text, reducing horizontal space requirements.
  - Passed `compactBadges={true}` from `RelatedTransactionsTable` to ensure it only applies to the inline vehicle view.
  - Audited the `w-24` column width in `TransactionTable` for the actions column.

### 3. Financial Metrics Strip
- **File**: `FinancialMetricsStrip.tsx`
- **Changes**:
  - Reverted the layout back to a strict 2-row design.
  - Row 1 now explicitly uses `lg:grid-cols-4` with 4 metrics (COGS, Txn Expenses, Break-Even, Holding Cost) or `Days on Stock` if unsold.
  - Row 2 explicitly uses `lg:grid-cols-5` with 5 metrics (Gross Profit, Net Profit, Total Profit, Margin, ROI).
  - Removed the extraneous "Adjusted Profit" metric to maintain the 5-column requirement.

### 4. Split-View for Transaction Edit
- **Files**: `EditTransactionPage.tsx`, `TransactionForm.tsx`
- **Changes**:
  - Implemented a persistent split-view layout toggle stored in `localStorage` under the key `acar_transaction_split_view`.
  - The toggle button (Split View vs Stack View) was added to the `StickyFooter` of the transaction form, identical to the vehicle edit page.
  - Refactored `TransactionForm.tsx` to accept `isSplitView` and `splitViewToggle` props, rendering its inner layout as `lg:grid-cols-2` when split view is active.
