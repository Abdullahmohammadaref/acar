# docs-pdf-popup-handling.md — PDF Popup Blocker Safety Net

> **Date:** 2026-05-17
> **Scope:** Frontend only — `ContractModal.tsx`
> **Backend changes:** None

---

## Summary

Added a "download-ready" step to the ContractModal wizard that acts as a popup blocker safety net. When the user selects any document option (buy contract, sales agreement, receipt, or binding order), the modal now:

1. **Best-effort:** Attempts to open all PDFs in new browser tabs programmatically (same as before)
2. **Safety net:** Always transitions to a new "download-ready" step showing individual `<a>` download buttons for each PDF

Each download button is a plain `<a target="...">` tag — clicking it is a direct user interaction, which browsers never block. This turns "one click opens 2 tabs" (blocked) into "user clicks each button once" (always works).

---

## Files Modified

| File | Change |
|---|---|
| `frontend/src/components/vehicles/ContractModal.tsx` | Full rewrite of PDF handling logic |

---

## What Changed in ContractModal.tsx

### New types
- `PdfEntry` interface: `{ label: string, url: string }` — represents one PDF in the download-ready step
- `ModalStep` extended with `"download-ready"`

### New state
- `pendingPdfs: PdfEntry[]` — the PDFs to show in the download-ready step
- `originStep: ModalStep` — tracks which step triggered download-ready (for back navigation)

### Replaced logic
- **Removed:** `openPdfTabs()` helper (old mass-open approach)
- **Removed:** `window.open()` calls in `handleBuyContract` and `handleBindingOrder`
- **Removed:** All `setTimeout(() => handleOpenChange(false), 50)` calls — the modal no longer auto-closes after PDF generation
- **Added:** `triggerPdfGeneration(pdfs, fromStep)` — unified handler that does best-effort tab opens + transitions to download-ready step
- All four handler functions (`handleBuyContract`, `handleSalesAgreement`, `handleReceipt`, `handleBindingOrder`) now call `triggerPdfGeneration`

### New JSX
- "download-ready" step: shows one `<a>` button per PDF with label and "Open PDF →" hint
- Quiet popup hint (only for multi-PDF sets): tells user to use buttons if tabs didn't open
- Back button from download-ready returns to the originating step

### Updated reset
- `handleOpenChange` now also resets `pendingPdfs` and `originStep` on close
- `handleBack` handles `download-ready` → `originStep` navigation

---

## Design Decisions

1. **Download buttons are `<a>` tags, not `<Button>`** — intentional. Browser popup blockers distinguish between programmatic opens and direct user-initiated `<a>` clicks. The `<a>` approach guarantees each PDF opens.

2. **No i18n added** — the existing ContractModal uses hardcoded English strings throughout. Adding `t()` calls would require touching every string in the file. Out of scope per plan.

3. **No loading/success states** — the PDF either opens or it doesn't. The buttons are always there. No spinners, no toasts, no tracking.

4. **Popup hint is subtle** — `text-xs text-muted-foreground`, separated by a border-t, only shown for 2+ PDF sets. Single-PDF cases show no hint (no noise).

---

## Behavior Matrix

| Scenario | What Happens |
|---|---|
| Buy Contract | Tries 1 tab → shows 1 button |
| Sales Agreement | Tries 2 tabs (2nd likely blocked) → shows 2 buttons |
| Receipt | Tries 2 tabs (2nd likely blocked) → shows 2 buttons |
| Binding Order | Tries 1 tab → shows 1 button |
| Back from download-ready | Returns to previous step |
| Close modal | Everything resets |
