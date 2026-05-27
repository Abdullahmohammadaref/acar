# Color Tokens

The VMS design system relies strictly on CSS variables and Tailwind semantic classes to ensure theming and dark mode compatibility. **Never hardcode hex or hsl values.**

## Semantic Base Colors
- `bg-background` / `text-foreground` — primary backgrounds and text
- `bg-primary` / `text-primary-foreground` — primary interactive elements
- `text-muted-foreground` — secondary or helper text
- `border-border` — default borders (light mode: `#e4e7ec`). Borders must be clearly visible.
- `text-destructive` — error states and mandatory field asterisks

## Status Colors
These colors must be consistent everywhere a status is shown (cards, table rows, badges, footer, dropdowns).

| Status | CSS Variable | Hex | Description |
|--------|--------------|-----|-------------|
| `purchased` | `--color-status-purchased` | `#f59e0b` | Amber. Initial state after purchase. |
| `ready_for_sale` | `--color-status-ready-for-sale` | `#465fff` | Blue. Vehicle is prepped. |
| `reserved` | `--color-status-reserved` | `#9333ea` | Purple. Customer hold. |
| `sold` | `--color-status-sold` | `#16a34a` | Green. Sale complete. |
| `inactive` | `--color-status-inactive` | `#6b7280` | Gray. Soft deleted. |

## Dark Mode
- Dark mode is toggled via the `.dark` class.
- All UI components must naturally inherit background and text colors. Use `dark:` variants only when specific overrides are necessary.
