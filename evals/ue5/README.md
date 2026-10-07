# ue5 pack evals

Measures whether the pack makes models better at UE5 work. Run each task with
the pack disabled and enabled, on each model, through the real agent
(`be-code run --json`), and record: build passes (yes/no), repair rounds,
turns, tokens, and whether the check script passes.

## Fixture

The tasks need a small UE5 C++ project (`Fixture.uproject`, one runtime
module `Fixture`) checked into a private location, since it needs a real
engine to build. Each task starts from a clean copy with the task's `setup`
applied. Keep the project minimal: one character class, one actor, no content
beyond the default map.

## Tasks

See `tasks.json`. Each has:

- `prompt` — what the agent is told
- `setup` — the deliberate starting state (a broken file, a missing piece)
- `check` — what must be true afterwards, beyond "it builds"

## Suggested matrix

| Model | Pack off | Pack on |
|---|---|---|
| Qwen3 8B | | |
| Qwen3 27B | | |
| A frontier model (online provider) | | |

The pack is worth shipping when 8B and 27B with the pack close a meaningful
part of the gap to the frontier model without it.
