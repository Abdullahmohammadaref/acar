# Plan: Vehicle Edit Page — 6-Column Layout Rework (matches uploaded mockup)

## 0. What actually happened last time (verified against real code, not docs)

I re-read the current on-disk code before writing this plan. Confirmed via Codegraph + direct file reads:

1. **The previous plan's backend + new component were implemented.** `VehicleExpenseEarning` model, `/vehicles/{id}/expenses-earnings` endpoints, `VehicleExpensesEarningsCard.tsx`, and the `useCreateExpenseEarning`/`useDeleteExpenseEarning` hooks in `frontend/src/hooks/useVehicles.ts` all exist and work. **No backend changes are needed in this plan** — this is a frontend-only layout/UI rework.
2. **The layout restructure from the previous plan was NOT applied.** Confirmed: `frontend/src/components/vehicles/VehicleForm.tsx` still has Vehicle Image / Description / Internal Comments at the tail of the original flowing `grid gap-2 md:grid-cols-2 lg:grid-cols-6` Basic Info grid (currently lines 977-1009), exactly as before any of this work started. `VehicleExpensesEarningsCard` was instead just appended as a new full-width block after the Buy/Sale grid (line 1255), and `FinancialMetricsStrip` right after it (line 1264) — both just bolted on, not integrated into any new layout. This matches your description exactly ("it was just added").
3. **`VehicleExpensesEarningsCard.tsx` (current implementation, 347 lines) uses an inline expanding form and a divided vertical list** — not a modal dialog, not pills. Each entry currently renders as its own full-width row (`divide-y divide-border/50`), which is exactly the "gives it a whole line" behavior you don't want. This entire component needs to be rebuilt to match your uploaded mockup's `Pill` + `AddDialog` pattern.
4. **`FinancialMetricsStrip.tsx`'s non-compact render uses flowing responsive rows** (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2`), not a fixed 3×3 grid. It currently has exactly 8 real metrics (COGS, VAT Liability, Break-Even / Gross Profit, Net Profit, Total Profit, Margin, ROI) plus 2 commented-out ones (Holding Cost, Adj. Profit) — this maps cleanly onto your mockup's 3×3 grid with slot 9 empty, no metric needs to be invented or dropped.
5. **The "split view" mechanism is in `frontend/src/pages/VehicleFormPage.tsx`**, not `VehicleForm.tsx`. It has a `splitView` boolean (persisted to `localStorage`), and the file contains **two separate, near-duplicate JSX return blocks**: one for `splitView && showTransactions` (lines 231-249, using a `formContent` variable defined at lines 130-205 plus a side `transactionsPanel`), and one "Standard stacked layout" for everything else (lines 252-326), which has its own separate `<VehicleForm>` call (lines 278-311) and its own standalone `<RelatedTransactionsTable>` render below it (lines 313-320). **This second block — "Standard stacked layout" — is exactly what you call "normal view."** The split-view block is fully separate code and will not be touched by this plan.
6. **`RelatedTransactionsTable.tsx`** is a self-contained component (`vehicleId`, `vehicleName`, `highlightedTransactionId`, `hideNavigationLink` props) that internally renders `<TransactionTable maxHeight="400px" .../>` plus its own pagination — it can be dropped into a narrower column as-is.
7. **PROJECT_MAP.md mismatch, flagging to you**: `PROJECT_MAP.md` (last updated 2026-08-13, per its own header) does not mention `VehicleExpenseEarning`, `VehicleExpensesEarningsCard.tsx`, or the `/vehicles/{id}/expenses-earnings` endpoints anywhere in the sections I checked (Backend Data Layer, API Layer). It's stale relative to the current code from the last plan's implementation. Not blocking for this plan (frontend-only), but you should regenerate it at some point.

## 1. Scope confirmation

**Applies to:** `frontend/src/components/vehicles/VehicleForm.tsx`, **only when `isEditing === true`** (the Edit Vehicle page). The Add New Vehicle page (`isEditing === false`) keeps its current layout, pixel-for-pixel — per your explicit "no, don't apply it to the add vehicle page" instruction. Since `VehicleForm.tsx` is one shared component used by both pages, this is done via an `isEditing` branch inside the component (detailed in Task 3 below), not a separate file.

**Does not touch:** the split-view code path in `VehicleFormPage.tsx` (the `formContent` variable, the `if (splitView && showTransactions)` block, `transactionsPanel`, `transactionsPanelMobile`), the contents/fields of the Buy Details card, the contents/fields of the Sale Details card, any backend code, any other vehicle field.

**Target layout for the Edit page, normal (non-split) view — verbatim from your uploaded mockup's legend:**
```
Row 1 (6 cols): Vehicle Photo (1) | Description (1) | Internal Comments (1) | Expenses & Earnings (3)
Row 2 (6 cols): Buy Details (3) | Sale Details (3)
Row 3 (6 cols): Calculation Cards, 3×3 mini-grid (3) | Transactions (3)
```
This sits **below** the existing Basic Info fields (Branch, Vehicle Type, Make, Model, Chassis Number, etc.) — the mockup doesn't show those fields at all because they aren't moving; they stay exactly where they are today, in the same card-less flowing grid, just without Photo/Description/Internal Comments tacked onto the end of it anymore.

## 2. Design decisions I made (flagging clearly, not guessing silently)

1. **Card chrome for Photo / Description / Internal Comments**: today these three are bare form fields with no card border (just `space-y-2` / plain divs inside the big flowing grid). Your mockup wraps each in its own small bordered card (`bg-white border rounded-xl p-4` in the mockup's raw Tailwind). I'm giving them that same card treatment for visual consistency with the rest of Row 1 — but using this project's **existing design-system tokens** (`rounded-xl border border-border bg-card p-3`, the same pattern Buy Details/Sale Details already use) instead of the mockup's hardcoded `bg-white dark:bg-zinc-900`. This is a deliberate deviation from the mockup's literal color values, kept for consistency with the rest of the app — the position/sizing/column-span follows the mockup exactly.
2. **Pills and Add dialog colors**: your mockup's `Pill` and `AddDialog` components use literal Tailwind palette classes (`bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300`, `bg-green-500`, `bg-blue-600`, etc.), not this project's semantic `bg-error`/`bg-success` tokens. Since you were explicit — "the form I wanted to be exactly like this JSX one, don't use the old" — **I'm using your mockup's literal color classes verbatim** for the Pill and AddDialog, not the project's `bg-success`/`bg-error` tokens. This is the one deliberate exception to the design-system's "semantic tokens only" rule in this plan, made because you asked for an exact match.
3. **Calculation-card 3×3 grid mapping**: your mockup shows placeholder card content (COGS / VAT Liability / Break-Even / Gross Profit / Net Profit / Total Profit / Margin / ROI / empty "Reserved"). This maps 1:1 onto the 8 real metrics `FinancialMetricsStrip.tsx` already computes, in the same order, with slot 9 left empty exactly as your mockup shows it. No new metric is invented, nothing is dropped.
4. **Transactions column width**: `RelatedTransactionsTable`'s inner `TransactionTable` isn't currently used at half-page width anywhere. I'm adding a horizontal-scroll safety wrapper (`overflow-x-auto`) around it purely so columns don't get crushed at `col-span-3` width — this does not change `TransactionTable.tsx` itself, just adds a wrapping div in `RelatedTransactionsTable.tsx`. Flagging as a small addition beyond the literal ask, needed so the table doesn't visually break.

## 3. Tasks

### Task: Rebuild the Expenses & Earnings card to match the mockup exactly
SCOPE: `frontend/src/components/vehicles/VehicleExpensesEarningsCard.tsx`
MODE: parallel-safe — self-contained file; its external prop interface (`vehicleInternalId`, `entries`, `choices`) stays unchanged, so nothing else needs to wait on this or read its output

Rewrite the file completely. Keep:
- The exact same prop interface: `{ vehicleInternalId: number; entries: VehicleExpenseEarning[]; choices: AllChoices | undefined }` — do not change this, `VehicleForm.tsx` calls it with these exact props and must not need to change.
- The exact same hooks: `useCreateExpenseEarning`, `useDeleteExpenseEarning` from `@/hooks/useVehicles` (unchanged signatures — `createMutation.mutateAsync({ vehicleInternalId, payload: { type, amount, category_id, subcategory_id } })` and `deleteMutation.mutateAsync({ vehicleInternalId, entryId })`).
- Real category/subcategory data: `choices?.categories` / `choices?.subcategories` filtered by `category_id`, exactly as the current implementation does it (lines 45-60 of the current file) — **do not use the mockup's hardcoded `CATEGORIES`/`SUBCATEGORIES` arrays**, those were only illustrative placeholders in the mockup file since real API-backed category/subcategory choices already exist and must keep being used.

Replace:
- **Card outer shell**: keep `rounded-xl border border-border bg-card shadow-sm overflow-hidden` (unchanged from current), but make the header a single condensed line instead of the current 3-cell `grid grid-cols-3 divide-x` summary banner block (current lines 140-172). Match the mockup's header exactly (mockup lines 206-229): title + one-line summary text `−€{totalExpenses} / +€{totalEarnings} → Net: {sign}€{net}` in muted/red/green inline spans, plus a small "+ Add" button on the right that opens the dialog (`setShowDialog(true)`), not an inline form toggle.
- **Add form**: replace the current inline expanding form (current lines 174-278) with a **modal dialog component**, ported from the mockup's `AddDialog` function (mockup lines 40-153) almost verbatim — `fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm` overlay, centered white/zinc-900 rounded-2xl card, Category select → Subcategory select (disabled until category chosen, reset on category change) → two-button Expense/Earning type toggle (`grid-cols-2`, red-filled when Expense selected, green-filled when Earning selected) → Amount input with the locked ±/−/+ prefix sign (disabled until type is chosen) → Cancel / Add footer buttons, Add disabled until `category && subcategory && type && amount && parseFloat(amount) > 0`. Swap the mockup's plain `<select>` elements for this project's real `DynamicSelect` component (`choiceType="category"` / `choiceType="subcategory"` with `parentId`, exactly as the current file already wires them at lines 220-249) — the dialog's outer chrome/layout/buttons follow the mockup exactly, only the two dropdown implementations are swapped for the project's real component.
- **Entry list**: replace the current `divide-y` vertical list (current lines 280-343) with a **wrapping pill list**, ported from the mockup's `Pill` function (mockup lines 14-38) — `flex flex-wrap gap-2`, each entry a `rounded-full px-2.5 py-1.5 text-xs` pill showing `{category} • {subcategory} {sign}€{amount}` with a small `×` remove button wired to the existing `handleDelete`/`deleteMutation`. This is the literal fix for "it gives it a pill... until the row is filled, then we go down" — `flex-wrap` is what makes pills wrap onto new lines only when a row fills up, instead of every entry consuming its own full-width line.
- Keep the "No expenses or earnings added" empty state (mockup line 232-234 style), and keep the existing loading/error handling pattern from the current file (`formError` state, `createMutation.isPending` disabling the Add button) — just applied inside the new dialog instead of the old inline form.

### Task: Restructure FinancialMetricsStrip into a fixed 3×3 grid
SCOPE: `frontend/src/components/vehicles/FinancialMetricsStrip.tsx`
MODE: parallel-safe — self-contained file; prop interface (`financials`, `hideTransactions`, `compact`, `annualTargetRate`) stays unchanged, and the `compact` branch (used by `VehicleCard`, not part of this feature) must not be touched

Only change the **non-compact return branch** (current lines 127-245). Leave the `compact` branch (lines 99-122) and `MetricCell` component (lines 47-85) completely untouched.

Replace the current two `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2` rows (lines 130 and 193) with a single fixed `grid grid-cols-3 gap-3` container holding all cells in this exact order, matching the mockup's 3×3 layout (mockup lines 292-347) 1:1:

```
Row 1: COGS · VAT Liability (only if !hideTransactions) · Break-Even
Row 2: Gross Profit · Net Profit · Total Profit          (only rendered when hasSale, same as today)
Row 3: Margin · ROI · (empty reserved cell)
```

Concretely:
1. Change the outer wrapper's row grouping — instead of two separate `<div className="grid ...">` blocks (cost-basis row, then conditional profit row), keep the same conditional structure (`hasSale` still gates whether Gross/Net/Total/Margin/ROI cells exist) but change every grid container's className from `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2` to `grid grid-cols-3 gap-3`.
2. The commented-out Holding Cost / Adj. Profit `MetricCell`s (lines 168-188) stay commented out exactly as they are — not part of this task.
3. Since this component now always renders inside a fixed `col-span-3` half-width slot on the edit page (see Task 3), remove the responsive breakpoints (`sm:`, `lg:`) from these specific grid containers — they're dead weight once the column width is fixed by the parent grid; a static `grid-cols-3` is correct here. Do not remove responsive classes from anywhere else in the file.
4. If `hasSale` is false (no Gross/Net/Total/Margin/ROI), Row 3 (Margin/ROI/empty) naturally won't render either since those cells live inside the same `hasSale`-gated block as Row 2 in current code — that's fine and matches the mockup screenshot which assumes a fully-populated vehicle; verify visually at the review checkpoint that a purchased-but-not-sold vehicle (only Row 1 populated) still looks reasonable with just 3 cells and no dangling empty grid rows.

### Task: Add horizontal-scroll safety wrapper to RelatedTransactionsTable
SCOPE: `frontend/src/components/transactions/RelatedTransactionsTable.tsx`
MODE: parallel-safe — isolated one-line wrapper change, no dependency on any other task, doesn't touch `TransactionTable.tsx` itself

In the `return` block (current lines 95-167), wrap the existing `<TransactionTable ... />` call (currently lines 125-134) in a new `<div className="overflow-x-auto">...</div>`. Nothing inside `TransactionTable`'s own props changes — this is purely a wrapping container so the table can be placed in a half-width (`col-span-3`) column without letting its columns get crushed.

### Task: Rework VehicleForm.tsx into the 6-column edit-mode layout
SCOPE: `frontend/src/components/vehicles/VehicleForm.tsx`
MODE: parallel-safe with the three tasks above — this task calls `VehicleExpensesEarningsCard`, `FinancialMetricsStrip`, and (indirectly, via the new prop) `RelatedTransactionsTable` using their **existing, unchanged prop interfaces**, so it does not need to wait for their internal rewrites to finish; it only needs to reposition existing call sites, not change what's passed to them

Steps, in order:

1. **Add the new prop.** In `interface VehicleFormProps` (currently lines 39-54), add one line after `splitViewToggle?: React.ReactNode` (line 53):
```typescript
    /** Compact transactions table rendered inline in the edit-mode grid (normal/stacked view only) */
    inlineTransactions?: React.ReactNode
```
   Add the matching destructured prop after `splitViewToggle,` (currently line 171):
```typescript
    inlineTransactions,
```

2. **Extract the reusable JSX blocks into local `const`s**, defined inside the component function body, right before the final `return (` statement (i.e., after all the hooks/derived-state calculations, immediately before the JSX is returned). Cut-and-paste each block from its current location into a variable — **do not alter a single character inside `buyDetailsCard`, `saleDetailsCard`, `expensesEarningsBlock`, or `financialMetricsBlock`** (their outer wrapper `className`s, exactly as they exist today, are part of what gets carried over unmodified — this is the literal meaning of "give them the card itself, don't change the inside"):

```typescript
    const vehiclePhotoField = (
        <div className="rounded-xl border border-border bg-card p-3">
            {/* ...exact unchanged contents currently at lines 977-987 (the "Vehicle Image" comment + VehicleImageUpload)... */}
        </div>
    )

    const descriptionField = (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            {/* ...exact unchanged contents currently at lines 989-998 (the "Description" comment + Label + textarea)... */}
        </div>
    )

    const internalCommentsField = (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            {/* ...exact unchanged contents currently at lines 1000-1009 (the "Internal Comments" comment + Label + textarea)... */}
        </div>
    )

    const buyDetailsCard = (
        <>{/* ...exact unchanged contents currently at lines 1015-1127 (the entire "Buy Details Section" div, its own rounded-xl border wrapper included, unmodified)... */}</>
    )

    const saleDetailsCard = (
        <>{/* ...exact unchanged contents currently at lines 1128-1254 (the entire "Sale Details Section" conditional block, its own rounded-xl border wrapper included, unmodified)... */}</>
    )

    const expensesEarningsBlock = (
        isEditing && vehicle ? (
            <VehicleExpensesEarningsCard
                vehicleInternalId={vehicle.internal_id!}
                entries={vehicle.expenses_earnings ?? []}
                choices={choices}
            />
        ) : null
    )

    const financialMetricsBlock = (
        buyBreakdown.hasValue ? (
            <FinancialMetricsStrip
                financials={vehicleFinancials}
                hideTransactions={!isEditing}
                annualTargetRate={businessSettings?.target_annual_return}
            />
        ) : null
    )

    const transactionsBlock = inlineTransactions ?? null
```
   Important: for `vehiclePhotoField`, `descriptionField`, and `internalCommentsField` only, the **outer wrapper className is new** (`rounded-xl border border-border bg-card p-3[...]`) per Section 2.1's design decision — everything *inside* that wrapper (the `<Label>`, the `<VehicleImageUpload>`, the `<textarea>` with its exact existing className and `onChange`/`value` wiring) is carried over completely unchanged. For `buyDetailsCard`/`saleDetailsCard`/`expensesEarningsBlock`/`financialMetricsBlock`, even the outer wrapper is unchanged — the *only* new thing is the grid-cell `<div className="col-span-3">` (or similar) that will wrap them from *outside*, added in step 4 below, never inside these consts.

3. **Delete the old inline locations** these blocks were cut from:
   - Remove the now-empty `{/* Vehicle Image */}` / `{/* Description */}` / `{/* Internal Comments */}` block entirely from the tail of the Basic Info grid (currently lines 977-1009), so that grid (`grid gap-2 md:grid-cols-2 lg:grid-cols-6`, opened at line 715) now closes immediately after the "Power KW" field.
   - Remove the old `{/* Two Column Layout for Buy and Sale */}` wrapper div and its direct children (currently lines 1013-1254) from their current position — its contents now live in the `buyDetailsCard`/`saleDetailsCard` consts instead.
   - Remove the old `{/* Expenses & Earnings Card — only in edit mode */}` block (currently lines 1255-1262) and `{/* Financial Metrics Strip — compact live summary */}` block (currently lines 1264-1271) from their current position — their contents now live in `expensesEarningsBlock`/`financialMetricsBlock`.

4. **Render two different layouts based on `isEditing`**, in the exact spot where all of the above used to sit (immediately after the Basic Info grid's closing `</div></div>`, inside the existing `<div className="space-y-5">` "All Fields Content" wrapper):

```tsx
                    {isEditing ? (
                        <>
                            {/* Row 1: Photo (1) | Description (1) | Internal Comments (1) | Expenses & Earnings (3) */}
                            <div className="grid grid-cols-6 gap-4">
                                <div className="col-span-6 sm:col-span-3 lg:col-span-1">{vehiclePhotoField}</div>
                                <div className="col-span-6 sm:col-span-3 lg:col-span-1">{descriptionField}</div>
                                <div className="col-span-6 sm:col-span-3 lg:col-span-1">{internalCommentsField}</div>
                                <div className="col-span-6 lg:col-span-3">{expensesEarningsBlock}</div>
                            </div>

                            {/* Row 2: Buy Details (3) | Sale Details (3) */}
                            <div className="grid grid-cols-6 gap-4">
                                <div className="col-span-6 lg:col-span-3">{buyDetailsCard}</div>
                                <div className="col-span-6 lg:col-span-3">{saleDetailsCard}</div>
                            </div>

                            {/* Row 3: Calculation Cards 3×3 (3) | Transactions (3) */}
                            <div className="grid grid-cols-6 gap-4">
                                <div className="col-span-6 lg:col-span-3">{financialMetricsBlock}</div>
                                <div className="col-span-6 lg:col-span-3">
                                    {transactionsBlock && (
                                        <div className="rounded-xl border border-border bg-card p-4">
                                            <h2 className="text-lg font-semibold text-foreground mb-3">Transactions</h2>
                                            {transactionsBlock}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Add-vehicle page: unchanged layout, byte-for-byte the same arrangement as before this plan */}
                            <div className="max-w-md md:col-span-2 lg:col-span-2 lg:row-span-2">{vehiclePhotoField}</div>
                            <div className="md:col-span-2 lg:col-span-2">{descriptionField}</div>
                            <div className="md:col-span-2 lg:col-span-2">{internalCommentsField}</div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 items-start">
                                {buyDetailsCard}
                                {saleDetailsCard}
                            </div>

                            {financialMetricsBlock}
                        </>
                    )}
```
   Note on the `else` branch: since `vehiclePhotoField`/`descriptionField`/`internalCommentsField` now each carry the new `rounded-xl border border-border bg-card p-3` wrapper (added in step 2), the add-vehicle page's visual will change slightly too (these three fields will now show a light card border where they didn't before) — this is an unavoidable side effect of extracting them into shared consts with one shared style. **Flagging this explicitly**: if you want the add-vehicle page to look 100% pixel-identical to today (no card border on these three fields there), tell me and I'll split these into two separate variables (a bordered version for edit-mode, a borderless version for add-mode) instead of one shared const — it's a small change to this same task, not a new task. Given you said "let's keep it this way for now" about the add page in general (i.e., not a hard pixel-perfect requirement), I'm treating a faint card border as acceptable collateral, but you may disagree once you see it.

5. **Verify `isSaleTabVisible` still gates the Sale Details card correctly** in both branches — it's referenced inside `saleDetailsCard`'s unchanged content (the current `{isSaleTabVisible && (...)}` conditional stays inside that const exactly as-is), so no separate handling needed, just confirm at the review checkpoint that a `purchased`-status vehicle correctly hides Sale Details in both the old add-page layout and the new edit-page grid.

### Task: Move the normal-view transactions table into VehicleForm's new slot
SCOPE: `frontend/src/pages/VehicleFormPage.tsx`
MODE: sequential — depends on the `inlineTransactions` prop existing on `VehicleForm.tsx` (added in the previous task); must run after that task is verified done, since this task's edit would not compile/work correctly without that prop already defined

Steps, touching **only** the "Standard stacked layout" return block (currently lines 252-326) — do **not** touch `formContent` (lines 130-205), the `if (splitView && showTransactions)` block (lines 231-249), `transactionsPanel` (lines 207-218), or `transactionsPanelMobile` (lines 220-228):

1. On the `<VehicleForm ... />` call inside the Standard stacked layout block (currently lines 278-311), add a new prop:
```tsx
                inlineTransactions={showTransactions ? (
                    <RelatedTransactionsTable
                        vehicleId={vehicle!.internal_id!}
                        vehicleName={`${vehicle!.make_name || ''} ${vehicle!.model_name || ''}`}
                        hideNavigationLink={true}
                    />
                ) : undefined}
```
2. Delete the standalone block immediately after that `<VehicleForm />` call:
```tsx
            {/* Related Transactions Table - below form in stack mode */}
            {showTransactions && !splitView && (
                <RelatedTransactionsTable
                    vehicleId={vehicle!.internal_id!}
                    vehicleName={`${vehicle!.make_name || ''} ${vehicle!.model_name || ''}`}
                    hideNavigationLink={true}
                />
            )}
```
   (currently lines 313-320) — this table now renders *inside* `VehicleForm`'s new Row 3 slot instead of below the whole form.
3. Leave the `formContent` variable's own "Transactions below form (non-split mode)" block (currently lines 191-200) exactly as-is — it is dead code today (only reachable when `!splitView`, but `formContent` itself is only used inside the `splitView === true` branch), and touching it is out of scope; removing genuinely dead code is a nice-to-have I'm flagging but not doing here, since it's not part of what you asked for and touching it risks the split-view path by accident.
4. Result: in normal/stacked view, `showTransactions === true` now produces the compact table inside `VehicleForm`'s Row 3 (via `inlineTransactions`) instead of the old full-width block below the whole form. In split view, nothing changes — `transactionsPanel`/`transactionsPanelMobile` still render the table in the side panel exactly as today, and `inlineTransactions` is simply never passed on that code path (the `formContent`/split-view `<VehicleForm>` call at line 156 is untouched, so it never receives this prop and therefore never renders anything in the new Row 3 slot).

## 4. Execution order

```
Phase 1 (frontend, 4-way parallel — zero file overlap, none read another's output since all downstream prop interfaces are unchanged):
  P1 [parallel-safe]: VehicleExpensesEarningsCard.tsx — modal dialog + pills rebuild
  P2 [parallel-safe]: FinancialMetricsStrip.tsx — 3×3 grid
  P3 [parallel-safe]: RelatedTransactionsTable.tsx — overflow-x-auto wrapper
  P4 [parallel-safe]: VehicleForm.tsx — 6-column edit-mode layout + isEditing branch + new inlineTransactions prop
  → REVIEW CHECKPOINT: open the Edit Vehicle page (normal/stacked view). Confirm: Row 1 shows Photo/Description/Internal Comments/Expenses&Earnings side by side; clicking "+ Add" opens a centered modal matching the uploaded mockup; adding an entry shows a pill, not a full-width row, and pills wrap onto a second line only once the row is full; Buy Details/Sale Details sit side by side in Row 2 with their fields completely unchanged; Row 3 shows the 3×3 calculation grid next to a compact Transactions table. Then open the Add New Vehicle page and confirm it still works (photo/description/comments now have a faint card border — expected per the flagged design decision in Task "Rework VehicleForm.tsx", everything else pixel-identical to before).

Phase 2 (sequential, after Phase 1 review passes):
  P5 [sequential, depends on P4]: VehicleFormPage.tsx — wire inlineTransactions into the normal-view VehicleForm call, remove the old standalone table render
  → REVIEW CHECKPOINT: confirm normal/stacked view now shows the transactions table inside the new Row 3 slot (not below the whole form anymore). Toggle to Split View and confirm it is completely unchanged — table still appears in the side panel, nothing from Row 3's new transactions slot leaks into split view.
```
