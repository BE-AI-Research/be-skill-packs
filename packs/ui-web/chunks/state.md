# State

Most state bugs are a value being stored that should have been computed. Before
adding `useState`, ask whether the value can be derived from what you already
have. Derived values cannot go stale; stored ones can, and then you need an
effect to resynchronise them, which is a second bug.

```tsx
export function Cart({ items }: { items: Item[] }) {
  const [code, setCode] = useState("");

  // Derived during render. No state, no effect, never stale.
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = code === "SAVE10" ? total * 0.1 : 0;

  return (
    <>
      <p>Total: {formatPrice(total - discount)}</p>
      <input value={code} onChange={(e) => setCode(e.target.value)} />
    </>
  );
}
```

## Choosing where it lives

| Situation | What to use |
| --- | --- |
| Computable from props or other state | Nothing. Compute it during render. |
| One component owns it | `useState`. |
| Several fields change together, or the next value depends on the last | `useReducer`. One dispatch instead of three setters that can disagree. |
| Two siblings need it | Lift it to their closest common parent and pass it down. |
| It belongs in the URL (a filter, a tab, a page) | The URL. It survives reload and can be shared. |
| Server data | A fetching library's cache, not `useState` — it also has to handle loading, errors, and staleness. |
| Genuinely global and rarely changing (theme, current user) | `useContext`. |

## Updating without mutating

React compares by identity, so changing an object in place renders nothing.

```tsx
setItems([...items, next]);                                 // add
setItems(items.filter((i) => i.id !== id));                 // remove
setItems(items.map((i) => (i.id === id ? { ...i, qty } : i))); // update one
setUser({ ...user, address: { ...user.address, city } });    // nested: copy each level
```

When the next value depends on the current one, pass a function —
`setCount((c) => c + 1)`. Two calls in one handler that both read `count`
directly produce one increment, not two.

## Common mistakes

- **Duplicating a prop into state.** `useState(props.value)` reads the prop
  once and then ignores it. Use the prop, or lift the state.
- **An effect that copies one state into another.** That is derived state
  written the expensive way. Compute it during render.
- **`items.push(x)` then `setItems(items)`.** Same array identity, so nothing
  re-renders.
- **Storing a filtered or sorted copy** alongside the source. Two sources of
  truth that drift. Sort during render; memoise only if profiling says so.
- **One `useState` per field in a form that submits together.** A reducer, or
  one object, keeps them consistent.
- **Context for values that change often.** Every consumer re-renders on every
  change. Context suits rarely-changing values.
- **Reading state immediately after setting it.** The variable in scope is
  still the old value for the rest of that render.
