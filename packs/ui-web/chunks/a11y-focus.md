# Focus and keyboard

Every interactive thing must be reachable with Tab, operable with the keyboard,
and visible when focused. Use real elements and all three come free. The work
starts only when you build something the platform does not have — a dialog, a
menu, a combobox.

```tsx
export function Dialog({ onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Remember where focus was, so closing can put it back.
    returnTo.current = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    // Escape belongs on the document, not on the dialog element. A key
    // listener on a non-interactive element only fires while that element
    // itself has focus — and once the user tabs to a control inside, it does
    // not. It is also a lint error (no-noninteractive-element-interactions).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo.current?.focus();
    };
  }, [onClose]);

  // A real modal also traps Tab inside itself — see the rules below. This
  // example shows naming, focus and return only.
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1}>
      <h2 id="dialog-title">Confirm</h2>
      {children}
    </div>
  );
}
```

## The rules

| Rule | Detail |
| --- | --- |
| Tab order follows the DOM | Reorder the markup, not the tab order. |
| `tabIndex={0}` | Makes a non-interactive element focusable. Needed only for custom widgets. |
| `tabIndex={-1}` | Focusable by script but not by Tab. For a dialog container or a scroll region. |
| Never `tabIndex` above 0 | A positive value jumps ahead of everything and breaks the order of the whole page. |
| Focus must be visible | Never remove an outline without replacing it. Use `:focus-visible` so it shows for keyboard users without a ring on every mouse click. |
| Escape closes | Any overlay. |
| Focus returns | When an overlay closes, focus goes back to whatever opened it. |
| Arrow keys within a widget | Tab moves between widgets; arrows move inside one (menus, tabs, radio groups). |
| Click target ≥ 24×24 CSS px | Smaller fails WCAG 2.2 target size. |

## Live regions

A change the user did not cause needs announcing. `aria-live="polite"` waits
for a pause; `assertive` interrupts and is almost always wrong. The container
must exist in the DOM *before* the text appears — a region rendered at the same
moment as its message announces nothing.

```tsx
<p aria-live="polite">{status}</p>  // container always rendered, text changes
```

`role="alert"` is an assertive live region in one attribute, and is the right
choice for a validation error.

## Common mistakes

- **`outline: none`** with nothing in its place. A keyboard user cannot see
  where they are.
- **A focus trap with no way out.** Trap Tab inside a modal dialog only, and
  always honour Escape.
- **Autofocus on page load.** It skips the content above the field.
- **`onKeyDown` only for Enter** on a custom button. Native buttons also
  activate on Space; handle both, or use a `button`.
- **Rendering the live region together with its message.** Render the region
  always and change its contents.
- **Hiding a focused element** with `display: none` or `aria-hidden`. Focus
  lands nowhere and the tab order collapses.
