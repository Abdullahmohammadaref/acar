# Spacing Rules

The UI prioritizes **density without being cramped**. The core user is accustomed to dense data views (MS Access).

## Tailwind Scale
- Use the standard Tailwind spacing scale (`p-2`, `p-4`, `gap-2`, `gap-4`).
- **Never** use arbitrary spacing values like `p-[15px]` or inline margins.

## Layout Spacing
- **Sidebar Collapsed**: `w-16` (64px)
- **Sidebar Expanded**: `w-64` (256px)
- **Header**: `h-16` (64px)
- **Main Content**: `pt-16` (to clear header), padding `p-8`, bottom padding `pb-32` (to clear StickyFooter).

## Component Spacing
- Use `gap-2` for tightly coupled actions (e.g., icon buttons in a row).
- Use `gap-4` for standard spacing between form fields or card sections.
- When designing layouts, ask: *"Can we reduce vertical space without making this feel claustrophobic?"*
