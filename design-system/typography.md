# Typography Scale

Typography uses the default Tailwind CSS scale. Avoid inline `font-size` or arbitrary values.

## Font Sizes
- `text-sm` — Helper text, table data, secondary labels.
- `text-base` — Body text, standard inputs, buttons.
- `text-lg` — Section headers, card titles.
- `text-xl` / `text-2xl` — Page headers (e.g., "Edit {Make} {Model} #34").

## Icons
We exclusively use `lucide-react` for icons. Do not import icons from other libraries.

- **Inline icons**: `h-4 w-4`
- **Button icons**: `h-5 w-5`

## Best Practices
- Keep labels concise and use Choice fields over free text wherever possible.
- User-facing text must **always** use the `t()` function from `react-i18next` (e.g. `t("vehicles.make")`).
- Mandatory fields must be visually distinguished with a red asterisk using `text-destructive`.
