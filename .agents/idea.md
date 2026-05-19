# idea.md — Vehicle Management System (VMS)

> Non-technical, user-first product description.
> Read this before touching any code, writing any plan, or making any decision.

---

## What This Is

A web-based vehicle management system for a business that **buys, repairs, and sells vehicles**.

The business currently runs on Microsoft Access with a hosted database. That system has accumulated enough issues that they need a full replacement — not a redesign, a replacement. The manager is familiar with how Access works and values being able to see everything on screen without scrolling. That comfort level is the benchmark this app is held to.

The new system is built with **Django (backend), SQLite (database), React (frontend)**, and hosted on **Oracle Cloud**. It is a private, single-business application — not a SaaS product.

---

## Who Uses It

### The Manager
- The primary user. Runs the business. Makes all decisions.
- Always logs in with **2FA via email**.
- Has access to everything: all pages, all settings, all data.
- Cares deeply about speed and density — he wants to see as much as possible without scrolling, just like his Access app.
- Likely uses **light mode** on a large monitor.
- Prefers working with his mouse, not typing. Choice fields over free text wherever possible.
- Works through stacks of review-required transactions regularly — needs to cycle through them quickly.

### Employees
- Created and managed by the manager, not self-registered.
- Log in without 2FA, but the manager receives an email and must approve each login attempt before the employee gains access.
- May or may not have access to the Transactions section — the manager controls this per employee.
- If an employee has no transaction access, **nothing transaction-related shows anywhere in the app** — not in the sidebar, not on vehicle edit pages, nowhere.

### The Developer (me)
- I approve manager account registrations manually. Managers register and wait for my setup before they can use the app.
- I am the only one who deploys and maintains the system.

---

## The Four Core Sections

### 1. Vehicles (most important)
The heart of the system. Every vehicle goes through a lifecycle:

```
Purchased → Ready for Sale → Reserved → Sold
                ↑_____________↓  (can go back)
[Any status] → Inactive (soft delete — data is never lost)
```

- Vehicles are **never deleted**, only deactivated.
- The manager can move a vehicle forward or backward in its pipeline at any time.
- Each vehicle has an **internal ID** (business-facing, sequential per business) and a **database ID** (never shown to users).

### 2. Transactions (most important)
Financial transactions linked to the business bank account.

- Imported automatically via **CSV upload** from StarMoney (a bank data export tool).
- CSV always contains duplicates — the system detects them by matching datetime and skips already-imported entries.
- New imports arrive as **"Under Review"** status because mandatory fields are missing.
- Once all mandatory fields are filled and the record autosaves, status automatically becomes **"Reviewed"**.
- Transactions created manually start as "Reviewed" immediately.
- Transactions can be **exported to PDF** (currently shown records, with applied filters).
- Transactions can optionally be **linked to a vehicle**.

### 3. Legal Entities (important)
People or companies that appear in buy/sale transactions — buyers, sellers, partners.

- Two types: **Individual** (private person) or **Business** (company).
- Linked to vehicles in the buy/sale detail fields.
- Can be activated or deactivated. Never deleted.
- Adding a new legal entity from within a vehicle edit page opens a larger inline form (same flow, different form size).

### 4. Choice Management (important)
All dropdown/choice fields across the app are managed here.

- Choices are global to the business (e.g. vehicle makes, models, fuel types, colours).
- Choices can be enabled or disabled — disabled choices don't appear in dropdowns.
- The manager can search, filter, sort, and manage all choices in one place.
- **Make → Model relationship**: when a make is selected, only models for that make appear.
- If a user types a make that already exists, the system silently selects it instead of throwing an error.
- If search finds no results, the user can click a small add button next to the search field to add and immediately select a new choice.

---

## Key Pages and What They Do

### Vehicles List Page
- **Sidebar entry is a dropdown**: clicking it navigates to the page AND opens a quick-filter dropdown with status filters: All / Purchased / Ready / Reserved / Sold / Inactive.
- **Top of page**: real-time analytics for currently displayed vehicles (updates when filters change).
- **Filter + sort bar**: advanced but easy to use. Users can freely combine filters and sorts.
- **Advanced search bar**: searches across (almost) all vehicle attributes. Searching "200" might return vehicle #200 AND a vehicle with 200hp. Scope is defined and documented.
- **Vehicle cards**: wide e-commerce style cards. Show the most important details at a glance. Hovering highlights the card and makes it feel clickable anywhere (not just a small button).
- **Card quick actions** (without entering edit page):
  - Change status (options shown depend on current status)
  - Deactivate (trash icon)
  - Generate documents (starts onboarding flow)
- **Footer (always visible, never scrolls away)**: pagination controls, "Showing X of Y vehicles", quick analytics (TBD on final placement).
- **Pagination**: shown in footer. Same format used everywhere.

### Vehicle Edit Page
- **Header**: "Edit {Make} {Model} #34" — always know what you're editing.
- **Autosave**: every field change saves automatically. Footer shows "Saving..." then "Autosave complete". No submit button needed.
- **Fields**: mix of text, number, image, and choice fields. Choices are alphabetically/numerically sorted, searchable, with an inline "add new" button.
- **Image fields**: always show a preview of the uploaded image, formatted to look good.
- **Mandatory fields**: always marked with a red asterisk `*`.
- **Buy Details card**: fields and real-time calculations for purchase info (net, gross, tax, etc.).
- **Sale Details card**: fields and real-time calculations for sale info. Not shown on the "Add New Vehicle" page.
- **10+ financial calculations**: COGS, revenue, and others shown on the page.
- **Legal entity field**: same as other choice fields, but adding a new one shows a larger form.
- **Transactions table**: shows only transactions linked to this vehicle. Clicking a row goes to that transaction's edit page.
- **Footer (always visible)**:
  - Autosave status icon
  - Vehicle status indicator
  - Days on stock
  - Deactivate button
  - Status change buttons
  - Document generation button (starts onboarding)
  - Left/right arrows to go to previous/next vehicle (respects current list filters and sort order)
  - Back button → goes to the vehicle list (labeled "Back to Vehicles")
- **Back arrow `<`** (top left): stack-based — goes to the previous page you were on (could be a transaction, could be the list).

### Add New Vehicle Page
- Simpler version of the edit page.
- Shows: fields + buy details only. No sale details, no financial calculations.
- Header shows next internal ID that will be assigned.
- Footer: one "Create Vehicle" button + back button.
- On creation, vehicle status is set to **Purchased** automatically.

### Transactions List Page
- Same structure as vehicles list (sidebar dropdown, quick filters, analytics, search, sort, filter, footer pagination).
- Quick filters: All / Under Review / Reviewed.
- **Table layout** (not cards): rows show the most important transaction fields.
- **CSV Upload**: button to import StarMoney CSV. Duplicate detection via datetime matching.
- **PDF Export**: exports currently shown/filtered transactions to a formatted PDF.
- **Footer**: pagination controls, "Showing X of Y transactions".

### Transaction Edit Page
- Same autosave behavior as vehicle edit.
- **Vehicle link field**: optional. Choosing a vehicle populates the transactions table at the bottom with that vehicle's transactions. A blue link above the table navigates to that vehicle's edit page.
- **Footer**: left/right arrows (normal: any transaction), PLUS **red left/right arrows** to cycle through Under Review transactions only (for fast batch processing).
- **Back button**: labeled "Back to Transactions".
- **`<` arrow**: stack-based back navigation.

### Add New Transaction Page
- Simpler version. Vehicle link field still available — if chosen, transaction table appears.
- On creation, status is **Reviewed** (manual entries are already complete).
- Footer: "Create Transaction" + back.

### Legal Entities Page
- Same list pattern: search, filter, sort, table.
- **Footer present** (consistency — currently missing and this is a known bug to fix).
- Activate / deactivate / change type (Individual ↔ Business).

### Choice Management Page
- All choices across the system in one place.
- Search, filter, sort.
- Enable / disable choices.

### Dashboard (optional but valuable)
- Key metrics at a glance: vehicles by status, recent transactions, days-on-stock summary, etc.
- Directly addresses the manager's desire to see everything without navigating.

---

## Document Generation (Vehicle)

Triggered from the vehicle card (list) or the vehicle edit footer. Starts an onboarding flow:

```
Step 1: Buy documents OR Sale documents?

  If Buy documents:
    → Generate 4 PDFs (formats TBD — waiting on manager)

  If Sale documents:
    Step 2: EU country sale OR Outside EU?
      Step 3: Sale document / Receipt / Binding order
        → Generate 1–3 PDFs depending on choices
        → Content varies by vehicle data + business info
```

- PDFs that require multiple files: **all open in separate browser tabs**.
- ⚠️ Known risk: browser popup blockers can prevent multiple tabs from opening. This needs a robust fallback (e.g. merge into single PDF server-side, or sequential modal viewer in-app).
- PDF generation button is **disabled** when required fields are missing.
- Business logo appears on all PDFs (currently broken — easy fix pending).
- PDF content is **confidential** — not committed to the public repo.

---

## Authentication & Security

- **Manager registration**: self-registers, waits for manual approval by the developer before access is granted.
- **Manager login**: always requires 2FA. A code is sent by email.
- **2FA UX**: clicking the email link does NOT redirect to the app. It shows a screen saying "return to the tab you started from." That original tab detects confirmation automatically. This allows the manager to click from his phone while continuing work on his laptop.
- **Employee login**: sends an email to the manager. Manager clicks approve. Employee gains access.
- **Login approval tokens**: have an expiration time.
- **User settings (manager only)**: change details, reset password, change email, backup credentials — all behind 2FA/token verification steps.
- **Business settings**: manage business details, branches, and employees (create accounts, set username/password, grant/revoke transaction access).

---

## Global UI Principles

### Density first, but not cramped
The manager's Access app let him see everything without scrolling. That is the target. Every design decision should ask: "can we reduce vertical space without making this feel claustrophobic?"

### Footer always visible
A sticky footer exists on every main page. It shows the most critical actions and info for that page. Users should never have to scroll to find the next/previous button or the save status.

### Status colors are consistent everywhere
Each vehicle/transaction status has a defined color. That color is used everywhere that status appears — cards, tables, badges, footers, dropdowns. No exceptions.

### Mandatory fields always marked
Every mandatory field shows a red `*`. Not just some of them.

### Choice fields over free text
Whenever a value can be standardized, it's a choice field. Less typing = faster workflow.

### Icons over labels (where safe)
Prefer SVG icons over text labels to save horizontal space. But every icon must have a tooltip or hover label so the user always knows what it does.

### Hover feedback on clickable elements
Every clickable thing — cards, rows, buttons, icons — should visually respond to hover so the user knows it's interactive.

### Consistent pagination placement
Pagination is always in the footer. Same format. Same position. On every page that has a list. (Legal entities footer is currently missing — known bug.)

### Sidebar
- Can be collapsed and expanded.
- Dropdown sections (Vehicles, Transactions, Legal Entities) expand on click and show quick filters as sub-items.

### Header
- Language switcher
- Light/dark theme toggle
- Zoom magnify/minimize (remembered via cookie)
- User dropdown: Logout / User Settings / Business Settings (Settings options hidden from employees)
- Notification bell: shows 5 most recent activity logs, with "show more" to see all

### Light mode
- Borders need to be more visible. Currently too faint — makes the UI hard to read.
- The manager likely uses light mode. This must look professional in light mode.

### Dark mode
- Currently looks good. Maintain it.

---

## What Success Looks Like

- The manager opens the app and can immediately see the state of his business.
- He can process a stack of Under Review transactions quickly using the red arrow navigation.
- He can move a vehicle through its lifecycle — purchased → ready → reserved → sold — in a few clicks.
- He never loses data because something got accidentally deleted.
- He can generate the right sale or purchase PDF in under 30 seconds.
- He can hand the app to an employee and the employee only sees what they're supposed to see.
- The app feels faster and less frustrating than the Access system, not just "modern."

---

## Known Issues / Backlog (not blocking ship)

- Business logo not showing on generated PDFs (easy fix)
- Legal entities page missing footer/pagination in footer (inconsistency)
- Some mandatory fields missing red `*` marking
- Logs page not showing the right content (low priority)
- Dashboard not yet built (low priority for initial ship)
- Light mode border visibility too low
- "Back" button label should say "Back to Vehicles" or "Back to Transactions" not just "Back"
- Buy document PDFs waiting on format from manager (can ship without, add later)
- PDF multi-tab popup blocker risk needs a proper architectural solution