# assist pack evals

Measures whether the pack makes a model better at deciding what to say.

Run each task with the pack disabled and enabled, on each model, and record:
do the checks pass, how many items were raised, how many turns, how many
tokens, and does the `check` list hold.

**Not through `be-code run`.** Four of the six prompts are slash commands, and
headless `run` passes its prompt straight to `RunFull` with no custom-command
expansion — the eval would measure the model's reaction to the literal string
`/assist-brief`. Drive a plain session instead, which does expand them:

```sh
printf '/assist-brief\n' | be-code --plain --no-host --new -y -C "$FIXTURE"
```

Pipe the command and nothing else: a `/quit` after it is serviced *during* the
run and cancels it. EOF is deferred until the run ends, so it is the right way
to finish. And set `verify_on_done: false` in the fixture, or the brief's own
scan call sends the agent into the project's verification loop and the eval
measures that instead.

## Fixture

There is no checked-in fixture project, because every task needs a *different*
repository state and a stale branch cannot be committed into one. Build each
setup with `test/gitfixture.mjs`, which is the same helper the pack's own tests
use and produces real git repositories in a temp directory:

```js
import { makeRepo, gitOut } from "../../test/gitfixture.mjs";
const dir = makeRepo({ commits: 3, withRemote: true, ahead: 15,
                       tasks: { "001-x.md": "…" }, taskAges: { "001-x.md": 20 } });
```

Using it rather than a hand-built fixture means the scan sees exactly what it
sees in the tests, so a disagreement between an eval and a test is a real
disagreement and not a difference in setup.

**It does not cover everything these setups need**, and pretending otherwise
is how an eval silently measures the wrong state. Use `gitOut(dir, argv)` for
the rest:

| Setup needs | How |
|---|---|
| A tag (`as-003`) | `gitOut(dir, ["tag", "v1.2.5"])` |
| A branch old enough to be `(old)` rather than `(merged)` (`as-002`) | commit with `GIT_COMMITTER_DATE` set back more than 30 days, then branch |
| One stale document among fresh ones | `taskAges`, not `staleDays`, which backdates every document |
| An existing brief log (`as-006`) | write `.be-code/assist/brief-log.md` yourself; the helper has no notion of it |

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
