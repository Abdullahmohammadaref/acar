---
name: Dealership Dashboard UI Architect
description: Triggers whenever the user asks to build a dashboard, data visualization, analytics view, or data table for the vehicle dealership.
---

# 🎯 Objective
Generate a React/Tailwind component for dealership analytics that maximizes data density, prevents vertical scrolling, and looks highly professional.

# 📏 Strict UI/UX Rules
1. **Zero-to-Minimal Scrolling:** Design the layout to fit within standard viewport heights (e.g., `h-screen`). Use CSS Grid to lock panels in place. If data overflows, use localized scrolling (`overflow-y-auto`) inside specific data cards, never on the main page body.
2. **Responsive Degradation:** - Desktop: Multi-column grid (e.g., KPIs on top, chart on left, list on right).
   - Tablet/Mobile: Stack gracefully.
3. **Data Density:** Avoid excessive padding. Use compact table rows and tight spacing (e.g., `p-3` or `p-4` instead of `p-6`).
4. **Visual Hierarchy:** Use Shadcn/UI conventions. Muted text for secondary data, bold primary colors for actionable metrics. Do not use childish or overly bright colors; stick to slate, zinc, and a single primary brand color.

# 📊 Component Output Structure
When generating the component, you MUST include:
- A top row of KPI summary cards (Total Inventory, Sales Volume, etc.).
- A central data visualization area (Charts/Graphs).
- A secondary list or table view (Recent transactions or low-stock alerts).

# 🛑 Anti-Patterns (NEVER DO THIS)
- Do not use `min-h-screen` if it forces page-level scrolling.
- Do not make text massive; keep base text at `text-sm`.
- Do not use primary colors for backgrounds; use them only for active states, buttons, or chart accents.