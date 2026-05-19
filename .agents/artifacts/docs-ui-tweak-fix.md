# UI Tweak Fix Documentation

**Date:** 2026-05-10
**Context:** This document outlines the fixes applied to the `TransactionForm.tsx` and `VehicleFormPage.tsx` components to resolve a broken layout implementation from previous UI tweaks.

## 1. Transaction Split-View Fix (`TransactionForm.tsx`)

**Problem:** 
The previous split-view implementation simply changed the left column to a grid layout (`isSplitView ? "grid lg:grid-cols-2" : "space-y-6"`). It did not actually create a dedicated right-hand panel for the transaction list and vehicle selector, resulting in a cluttered, card-stacking mess rather than a true split view.

**Solution:**
We restructured the form's grid layout using Tailwind's `grid-cols-[1fr_420px]` class for the `2xl` breakpoint when split-view is active. 

- **Left Panel:** Maintains the core form input cards (Transaction Details, Usage Details, Purchase Details, Additional Information).
- **Right Panel (Sticky):** We extracted the `SearchableSelect` for the Vehicle field and placed it in a dedicated card at the top of the right panel, followed immediately by the `RelatedTransactionsTable`.
- **Conditional Rendering:** 
  - If `splitView` is active (and the user is in `edit` mode), the vehicle selector is stripped from the main form body and rendered on the right.
  - If `splitView` is inactive, the form defaults to a single-column block format (`space-y-6`), rendering the vehicle selector inline within the Transaction Details card, and rendering the transactions table at the very bottom.
- **Toggle State:** Preserved the `acar_transaction_split_view` key in `localStorage` inside `EditTransactionPage.tsx` to remember user preference.

## 2. Vehicle Edit Page Header/Footer Identity (`VehicleFormPage.tsx` & `VehicleForm.tsx`)

**Problem:**
The vehicle edit page did not clearly communicate the vehicle's identity (Make, Model, ID) in the sticky header and footer, requiring users to scroll or search for context while editing long forms.

**Solution:**
- **Page Header (`VehicleFormPage.tsx`):** Consolidated the `Car` icon and multi-line title into a single, prominent header using the format: `Edit — {Make} {Model} #{ID}`. We used `text-2xl font-bold` for emphasis and `text-muted-foreground` for the ID to ensure clear visual hierarchy.
- **Sticky Footer (`VehicleForm.tsx`):** Added a compact, inline span `hidden sm:inline text-sm font-medium text-foreground mr-2` displaying `{Make} {Model} #{ID}` directly before the status actions in the footer.
- **Localization:** Leveraged the `useTranslation` hook to dynamically render the "Edit" prefix (`t("vehicles.editTitle")`). Added new translation keys (`vehicles.editTitle`, `ui.splitView`, `ui.stackView`) across `en.json`, `de.json`, `tr.json`, and `ar.json` to ensure full multi-lingual support.

## 3. Stability Checks
We verified the TS build (`npx tsc --noEmit`) to ensure all extracted components and layout refactors remain strongly typed and free of syntax errors. Unused variables (`Car`, `vehicleName`) were purged from `VehicleFormPage.tsx` to maintain codebase cleanliness.
