# Semantics and accessible names

A screen reader announces three things about a control: its **name**, its
**role**, and its **state**. A native element supplies all three. ARIA only
ever changes what is announced — it adds no behaviour, no focus, no keyboard
handling. So the first question is always which element this is, not which
attribute to add.

```tsx
// Role, name and keyboard support all come from the element itself.
<button onClick={save}>Save</button>

// An icon-only control has no text, so give it a name explicitly.
<button onClick={close} aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

// Landmarks let a screen reader jump straight to a region.
<header>…</header>
<nav aria-label="Primary">…</nav>
<main>…</main>
```

## Where a name comes from

A control's name is computed from the first of these that exists:

| Source | Use it when |
| --- | --- |
| `aria-labelledby` | Visible text elsewhere already names this control. Takes precedence over everything below. |
| `aria-label` | There is no visible text at all — an icon button, a bare input. |
| its own text content | The normal case for a button or a link. |
| `alt` on an `img` | Always, on every image. |
| `title` | Never rely on it. It is a last resort and is not announced reliably. |

`aria-hidden="true"` removes an element from the accessibility tree entirely.
It belongs on decorative icons sitting inside a control that already has a
name. Never put it on something focusable: a control that can be reached by
keyboard but is not announced is worse than either alone.

## Alt text

Describe what the image conveys in context, not what it depicts.

- A product photo in a listing: `alt="Red wool scarf"`.
- An avatar beside a name already in the text: `alt=""`, because repeating the
  name is noise.
- A chart: the trend in words, with the data in a table nearby.
- Decoration: `alt=""`. A missing `alt` makes a screen reader read the file
  name; an empty one makes it skip the image, which is what you want.

## Common mistakes

- **`<div role="button">`.** Adding the role changes the announcement and
  nothing else. There is still no keyboard activation, no focus, no disabled
  state. Use a `button`.
- **Using ARIA to fix a wrong element.** `role` is a label, not an
  implementation. If you need the behaviour, you need the element.
- **`aria-label` on a `div` or `span`.** Ignored on most generic elements —
  a name needs a role to attach to.
- **Nesting interactive elements.** A `button` inside an `a`, or either inside
  a `label`, has no defined behaviour across browsers.
- **Skipping heading levels** for visual size. Headings are the document
  outline a screen-reader user navigates by; size is CSS's job.
- **Naming the control after its icon.** `aria-label="X"` tells the user
  nothing. Name the action: `aria-label="Close dialog"`.
