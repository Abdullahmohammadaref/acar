---
name: Professional Calculator & Formula UI
description: Triggers whenever the user asks to build a calculator, pricing module, tax breakdown, or formula display.
---

# 🎯 Objective
Generate a UI for calculations that clearly displays the mathematical formula, inputs, and final results using a professional, color-coded scheme that is not overwhelming or "childish."

# 📐 UI & Layout Rules
1. **Side-by-Side Context:** On desktop, split the view. Left side: Input form. Right side: Live calculation breakdown and formula display.
2. **Formula Transparency:** Always show the user how the math is happening. Display the abstract formula (e.g., `Base Price + (Tax % * Base) - Discount`), followed by the actual numbers plugged in.
3. **Professional Color Coding:** - Use subtle background tints to group related variables (e.g., a very light `bg-blue-50` for taxes, `bg-emerald-50` for discounts). 
   - Use standard text colors (`text-slate-900`) and rely on subtle border colors or badge components to differentiate data. No neon colors.
4. **Input Constraints:** Use number inputs with clear labels, step values, and visual indicators of currency (€) or percentages (%).

# 🧩 Component Output Structure
1. **Input Section:** Clear form fields with Shadcn/UI styling.
2. **Formula Section:** A styled block (like a terminal or a muted card) showing the exact math taking place.
3. **Result Section:** A highly visible, large-text display of the final calculated value, formatted accurately (e.g., German locale `10.500,00 €`).