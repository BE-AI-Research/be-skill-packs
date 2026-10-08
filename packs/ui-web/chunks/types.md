# Types

The type checker runs on every change, so give it enough to work with. Type the
props, take event types from React, and let inference do the rest — annotating
what is already inferred is noise that goes stale.

```tsx
import { type ReactNode, type ChangeEvent, useId } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;          // optional: may be absent
  disabled?: boolean;
};

export function Field({ label, value, onChange, hint, disabled = false }: Props) {
  const id = useId();
  // The event type comes from React and from the element, so e.target is
  // known to be an input and e.target.value is a string.
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={handle} disabled={disabled} />
      {hint}
    </>
  );
}
```

## What to reach for

| Need | Type |
| --- | --- |
| Anything renderable | `ReactNode` — covers strings, numbers, elements, arrays, null. |
| A component that wraps children | `{ children: ReactNode }`. |
| An input change | `ChangeEvent<HTMLInputElement>`. |
| A click | `MouseEvent<HTMLButtonElement>`. |
| A form submit | `FormEvent<HTMLFormElement>`. |
| A key press | `KeyboardEvent<HTMLInputElement>`. |
| A ref to a DOM node | `useRef<HTMLDivElement>(null)`, then check for null before use. |
| Every prop a real `button` takes, plus your own | `ComponentProps<"button"> & { variant: Variant }`. |
| A fixed set of options | A union of string literals: `"sm" \| "md" \| "lg"`. Not `string`. |

## Variants that carry different data

When one shape makes some fields meaningless, a discriminated union says so and
the checker narrows for you:

```tsx
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Item[] };

if (state.status === "ready") state.items.map(…);   // items known to exist here
```

That is better than `{ loading: boolean; items?: Item[]; error?: string }`,
which permits `loading` and `error` at once and forces a `?.` at every use.

## Common mistakes

- **`any` to silence an error.** It disables checking for everything that value
  touches. `unknown` plus a narrowing check keeps the safety.
- **`as` to force a type.** A cast asserts you know better than the checker;
  usually the checker was right. Narrow with a condition instead.
- **`!` on a possibly-undefined value.** It removes exactly the warning that
  described a state your component can be in.
- **`React.FC`.** It adds nothing now and complicates generic components. Write
  a plain function with a typed parameter.
- **Widening a prop type** so a wrong call site compiles. Fix the call.
- **`string` where a union belongs.** Then a typo in a variant name compiles.
- **Annotating what is inferred.** `const [n, setN] = useState<number>(0)` says
  nothing `useState(0)` did not. Annotate when the initial value is `null` or
  an empty array, where inference cannot tell.
