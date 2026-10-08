# Effects

An effect synchronises your component with something **outside** React: the
DOM, a subscription, a timer, the network. If nothing outside React is
involved, the effect is probably the wrong tool.

Work through this before writing one:

| You are doing | Where it belongs |
| --- | --- |
| Deriving a value from props or state | Compute it during render. |
| Responding to a click, submit or change | The event handler. |
| Resetting state when a prop changes | A `key` on the component, which remounts it. |
| Transforming data for display | Render, or `useMemo` if measured. |
| Subscribing, timing, measuring, fetching | An effect. |

```tsx
export function Results({ query }: { query: string }) {
  const [data, setData] = useState<Result[] | null>(null);

  useEffect(() => {
    // Every async effect needs cancellation, or a slow earlier response
    // overwrites a fast later one and the list shows the wrong query.
    const ac = new AbortController();
    setData(null);
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") throw e;
      });
    return () => ac.abort();
  }, [query]); // re-runs when query changes, and cleans up first

  if (!data) return <p aria-live="polite">Searching…</p>;
  return <ResultList results={data} />;
}
```

## Dependencies

The dependency array is not a trigger list — it is a declaration of everything
the effect reads. Lying about it causes a stale closure: the effect keeps using
the value from the render that created it.

- Include every reactive value the effect body reads: props, state, and
  anything derived from them.
- A `useState` setter is stable and never needs listing.
- `[]` means "read nothing reactive, run once on mount". Correct for a
  subscription to a fixed source; wrong the moment the body reads a prop.
- If adding a dependency causes a loop, the value is recreated every render.
  Move it inside the effect, memoise it with `useCallback`/`useMemo`, or keep
  it out of the effect's inputs — do not silence the rule.

## Cleanup

Anything the effect starts, the cleanup must stop: `removeEventListener`,
`clearInterval`, `unsubscribe`, `abort`. Cleanup runs before every re-run and
on unmount. In development, React mounts twice on purpose — an effect that
breaks under that is missing cleanup, and the double mount has found a real
bug.

## Common mistakes

- **`// eslint-disable-next-line react-hooks/exhaustive-deps`.** Almost always
  hiding a stale closure. Fix the structure instead.
- **Fetching with no cancellation.** Races, and a state update after unmount.
- **An empty array on an effect that reads props.** It works on first render
  and never updates again — the hardest kind of bug to see.
- **An object or array literal in the deps.** A new identity every render, so
  the effect runs every render.
- **Setting state the effect also depends on.** An infinite loop.
- **`useLayoutEffect` by default.** It blocks painting. Use it only to measure
  the DOM before the browser paints.
