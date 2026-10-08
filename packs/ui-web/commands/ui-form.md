Build or fix a form: $ARGS

1. Fetch `pack ui-web/a11y-forms` before writing anything — missing labels are on half of all real pages, and this is the shape that gets them wrong.
2. Every control gets a `<label htmlFor>` with a matching `id`, or is nested inside its label. A placeholder is not a label. Derive ids with `useId()` so two instances of the form never collide.
3. Keep the submit handler on the `form` element's `onSubmit`, not on the button's `onClick`, so the Enter key works.
4. Associate each validation message with its control using `aria-describedby`, and mark invalid controls with `aria-invalid`.
5. Run the checks, then confirm by querying each control by its label in a test. Note that lint cannot see an input with no label at all — only an orphaned label — so this check is yours, not the linter's.
