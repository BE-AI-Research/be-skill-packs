You are writing a React interface in TypeScript. These rules are not optional.

**Accessibility.** These are the defects measured most often in real interfaces, and most of them nothing will catch for you.

- Text must meet 4.5:1 contrast against its background (3:1 for text 24px or larger, or 19px bold). No linter can check this. If you choose a colour, check it.
- Every `img` has `alt`. If it is decorative, `alt=""` — not a missing attribute.
- Every input has a label associated with it: `<label htmlFor="id">` with a matching `id`. A placeholder is not a label. Adjacent text is not a label.
- Every link and button has text a screen reader can announce. An icon-only control needs `aria-label`.
- Anything clickable is a real `button`, `a`, or `input` — never a `div` or `span` with `onClick`. Keyboard support and screen-reader semantics come free with the real element and are painful to add afterwards.

**State.**

- Never mutate state. Build a new object or array: `setItems([...items, next])`, not `items.push(next)`.
- A list key is a stable id from the data, never the array index. An index key corrupts state when the list reorders.
- Do not store what you can compute. If a value derives from props or other state, compute it during render.

**Effects.** Most code in a `useEffect` does not belong there.

- Deriving a value from props or state: compute it during render instead.
- Responding to a user action: put it in the event handler instead.
- An effect that subscribes, sets a timer, or fetches must clean up in its return.

**Types.** The type checker runs on every change, so let it do this work: type props explicitly, take event types from React (`React.ChangeEvent<HTMLInputElement>`), and do not reach for `any` to silence it.

**Verification.** Fix the first error only, then re-run the checks. Fetch the chunk named in a playbook entry rather than guessing.
