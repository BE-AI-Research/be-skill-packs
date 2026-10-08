# ui-web pack evals

Measures whether the pack makes a model better at React + TypeScript interfaces.

Run each task with the pack disabled and enabled, on each model, through the
real agent (`be-code run --json`), and record: do the checks pass, how many
repair rounds, how many turns, how many tokens, and does the `check` list hold.

## Fixture

`fixtures/ui-web` is the starting project. Each task begins from a clean copy
with its `setup` applied.

## Matrix

| Model | Pack off | Pack on |
|---|---|---|
| Qwen3 8B | | |
| Qwen3 32B | | |
| A frontier model | | |

The pack is worth shipping when the two local models with it close a meaningful
part of the gap to the frontier model without it. A pack that only helps a
frontier model has not earned its context.

## The three tasks no check can grade

Most tasks here are graded by the toolchain: lint or `tsc` either passes or it
does not. Three are not, and they are the ones that decide whether the
budgeted core rules earn their place.

- **`uiw-008-contrast`** — no static checker can compute contrast, so this
  measures whether a rule with no verification behind it changes behaviour at
  all.
- **`uiw-006-index-key`** — `eslint-plugin-react` is not assumed present, so
  nothing flags an index key. Unlike contrast the bug is reproducible by hand,
  which makes it the cheaper of the two to grade honestly.
- **`uiw-002-label`** — lint reports an orphaned `<label>` but never an input
  with no label at all (see `fixtures/ui-web/captured/a11y.txt`). A new field
  added without a label therefore passes every check in the project.

If these three show no difference between pack-off and pack-on, the core rules
behind them are costing context for nothing and should be cut.

## One task needs a non-default config

`uiw-007-repeat` depends on a missing-dependency diagnostic reaching the
harness, which happens only where `react-hooks/exhaustive-deps` is set to
`"error"`. In the plugin's own recommended config, and in Next.js's, it is a
warning, and `tools/lint` drops warnings so a check cannot fail on one. Set up
that task's project accordingly; `fixtures/ui-web/captured/hooks-strict.txt` is
the output it should produce.
