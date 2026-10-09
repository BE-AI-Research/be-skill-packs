# Forms

Missing form labels are measured on about half of all real pages, and a linter
catches almost none of them: it can see a `<label>` with no control, but not a
control with no label. Treat every input as unlabelled until you can point at
its label.

```tsx
import { useId } from "react";

export function EmailField({ value, onChange, error }: Props) {
  // One id per control, derived so two instances never collide.
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id}>Email address</label>
      <input
        id={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

## The parts

| Attribute | What it does |
| --- | --- |
| `htmlFor` / `id` | Associates label and control. The values must match exactly. Nesting the input inside the label works too and needs no ids. |
| `type` | Picks the right keyboard and validation on mobile: `email`, `tel`, `url`, `number`. |
| `required` | Announced as part of the control. Prefer it to an asterisk in the label. |
| `aria-invalid` | Announces the error state. Set it only when the field is actually invalid, never `false` as a placeholder. |
| `aria-describedby` | Points at the error or hint text so it is read with the field. |
| `role="alert"` | Makes a newly rendered error announce itself without moving focus. |
| `<fieldset>` + `<legend>` | Names a group. Required for radio groups and checkbox sets — the individual labels do not say what the group is for. |
| `autoComplete` | Lets a browser fill the field. A real accessibility feature, not just convenience. |

## Common mistakes

- **A placeholder as the label.** It vanishes on focus, fails contrast in most
  designs, and is not reliably announced. Placeholders are for examples
  (`jane@example.com`), never for the field's name.
- **Adjacent text as the label.** Text next to an input is not associated with
  it. Without `htmlFor` the control is unlabelled.
- **A hardcoded `id`.** Render the component twice and the ids collide, so the
  label points at the wrong control. Use `useId()`.
- **Errors announced only in colour** — or only visually. Colour is not
  available to every user, and a message with no `aria-describedby` is not
  read with the field.
- **Validating on every keystroke.** Announcing an error while the user is
  still typing interrupts them. Validate on blur or on submit.
- **A `div` with `onClick` instead of a submit button.** Then Enter does not
  submit the form, which is how most people submit forms.
- **`aria-label` on an input that also has a visible label.** The `aria-label`
  wins, so the announced name and the visible text differ — confusing for
  anyone using both.
