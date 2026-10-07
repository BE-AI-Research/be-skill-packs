# BE Skill Packs

Domain expertise for agentic coding harnesses, as folders of Markdown and JSON.

A **pack** is what you give a coding agent so it stops guessing about a
technology it only half knows. It carries a small block of always-on rules, a
set of knowledge chunks the model fetches by name when it needs them, the
commands that verify work in that technology, and a playbook mapping each
failure to its cause, a fix, and something different to try when the fix does
not work.

Packs are plain files. You can read them, diff them, and edit them. Nothing in
a pack executes inside the harness: a pack *names* a command to run and
*names* a parser the harness already has, so loading one never means running
code somebody else wrote into your agent's process.

| Pack | What it knows | State |
|---|---|---|
| [`packs/ue5`](packs/ue5) | Unreal Engine 5 C++: reflection and UHT, modules and `.Build.cs`, object lifetime, replication, building with UnrealBuildTool, and 15 playbook entries for the errors that stop a build | 0.1.0 — seed. Two chunks of a planned nine; never yet run against a real engine |

## Why packs exist

The harness this came from is built on a premise: the model is small, local
and fallible, so the harness has to supply the quality. Verification loops,
context budgeting, one failure at a time. A pack is that premise applied to
domain knowledge — the measure of a good pack is how much of its expertise is
*mechanical* (build it, parse the error, match the playbook) rather than prose
the model has to remember and obey.

That is also why the always-on part is capped. A pack that fills the context
window with rules has taken away the thing it was supposed to help with.

## Using a pack

**With [BE-Code](https://github.com/BE-AI-Research/be-code-redux)** (1.3.0 or
newer):

```sh
git clone https://github.com/BE-AI-Research/be-skill-packs
cp -r be-skill-packs/packs/ue5 ~/.be-code/packs/ue5
export UE_ROOT=/path/to/UnrealEngine   # if it is not auto-detected
```

It activates in any workspace with a `.uproject` at its root. `/packs` lists
what is installed and which are active; `be-code packs validate <dir>` checks
a pack you are writing.

**With your own harness:** [`docs/PACK-FORMAT.md`](docs/PACK-FORMAT.md) is the
format, written as a contract rather than a description of one
implementation. It covers the manifest, how chunks should be served, why
verify commands are argument vectors rather than shell strings, the parser
contract, the playbook escalation rule, and the trust rules for a pack that
arrived with somebody's repository.

Two things in that document are worth reading even if you never load a pack,
because they are easy to get wrong and fail silently: serving pack files
without breaking your workspace path confinement, and what to do when the
same failure comes back twice.

## Writing a pack

Start from `packs/ue5` — it is deliberately small enough to read in one
sitting. The shape that works:

1. **`core.md`**, under its token budget, holding only what the model gets
   wrong *every time* and what it must never do. Rules, not a tutorial.
2. **Chunks** of 1.5–3k tokens each, one topic per chunk, each with a correct
   minimal example, tables of the parts you actually need, and a list of
   common mistakes. Everything the model can look up on demand goes here, not
   in core.
3. **A playbook** before you write more chunks. Run the real toolchain, collect
   the errors it actually produces, and write an entry for each — with a
   `next` step that is genuinely different from the `fix`.
4. **Evals** ([`evals/`](evals)) measuring whether the pack helps: run the same
   tasks with the pack off and on, on a small model and a large one. A pack is
   worth shipping when it closes a meaningful part of the gap.

The honest version of step 3: a playbook written from documentation is a
guess. Write it from output you have seen.

## Status

Early. The ue5 pack is a seed — two of nine planned chunks, and its build
wrapper has been tested with `--dry-run` against a fake engine tree but not
against a real Unreal install. The format is implemented and tested in
BE-Code 1.3.0; the parser behaviour it describes is covered by tests there.

Contributions welcome, particularly real toolchain output: a few hundred lines
of a genuinely failing build is worth more to a playbook than any amount of
careful reasoning about what the error messages probably look like.

## Licence

MIT — see [LICENSE](LICENSE).
