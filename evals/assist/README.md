# assist pack evals

Measures whether the pack makes a model better at deciding what to say.

Run each task with the pack disabled and enabled, on each model, through the
real agent (`be-code run --json`), and record: do the checks pass, how many
items were raised, how many turns, how many tokens, and does the `check` list
hold.

## Fixture

There is no checked-in fixture project, because every task needs a *different*
repository state and a stale branch cannot be committed into one. Build each
setup with `test/gitfixture.mjs`, which is the same helper the pack's own tests
use and produces real git repositories in a temp directory:

```js
import { makeRepo } from "../../test/gitfixture.mjs";
const dir = makeRepo({ commits: 3, withRemote: true, ahead: 15, staleDays: 20 });
```

Using it rather than a hand-built fixture means the scan sees exactly what it
sees in the tests, so a disagreement between an eval and a test is a real
disagreement and not a difference in setup.

## Matrix

| Model | Pack off | Pack on |
|---|---|---|
| Qwen3 8B | | |
| Qwen3 32B | | |
| A frontier model | | |

**The bar is the two local models with the pack withholding as well as a
frontier model does without it.** Not answering better — withholding better.
A pack that only helps a frontier model has not earned its context, and one
that makes a local model more talkative has done harm.

## One task tests correctness; the other five test taste

`as-005-unreadable` is the only eval here with a right answer. The scan's
`notes` line says the task directory could not be read, and either the model
repeats that or it invents counts. Pass and fail are decidable by reading the
answer against the scan output.

The other five are graded on judgement:

- **`as-001-quiet`** — silence on a clean workspace. The only eval whose
  passing output is nothing.
- **`as-002-one-urgent`** — ordering and omission among facts that are all
  true.
- **`as-003-imminent`** — whether a version/tag mismatch interrupts rather
  than waiting for the morning.
- **`as-004-reserved`** — stopping at "ready". A well-behaved model passes
  without the pack; it is graded because this is the only failure that costs
  something outside the session.
- **`as-006-third-time`** — asking on the third mention instead of mentioning
  a third time.

**If the five show no difference between pack-off and pack-on, the core rules
behind them are costing context for nothing and should be cut.** They are the
pack's entire claim: the facts come from a script any model can run, so
anything the pack adds is in the withholding. Keeping unmeasured rules out of
politeness to the design is how a budgeted core turns into a prompt nobody
trusts.

## Grading the ones with no checker

Two of them need a rule written down before the run, or the grade drifts to
whatever the answer happened to say:

- `as-001-quiet` passes **only** on an answer that raises no items. A brief
  that says "nothing urgent, but you might look at…" has padded, and padding
  is the failure this eval exists to catch.
- `as-002-one-urgent` passes when the blocked task is the first item and the
  six stale branches appear either nowhere or inside another item. A brief
  that lists all three as separate items has reported, not judged.

## What these evals do not measure

Nothing here measures the scan, which has its own tests, and nothing measures
behaviour in a fired turn — a scheduled brief raises prompts no eval harness
can answer. Run `as-001` and `as-006` by hand under a real schedule once
before trusting the grants; the README's grant table is the thing most likely
to be wrong in a way no test catches.
