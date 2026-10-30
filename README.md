# BE-Code Redux: Skill Packs

<img width="1024" height="768" alt="TheSkills" src="https://github.com/user-attachments/assets/61b512c2-a305-47e9-876a-b51392cf674d" />

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

> **Status: beta.** These packs are early, still being written, and — for the
> ones that need an external server (reverse-engineer, agentcad) — their
> capabilities depend on a server that is not part of this repository. They are
> provided **as-is, without warranty of any kind**: verify what a pack makes the
> agent do, and do not rely on it for work you cannot check. Use at your own risk.

| Pack | What it knows | State |
|---|---|---|
| [`packs/assist`](packs/assist) | A personal assistant over the state of the work: git, task documents, the changelog. Facts come from a scan script; judgement comes from core's rules, whose spine is withholding | 0.1.0 — seed. Switched on by hand, never detected. No test state, no outward action; phase 2 (mail, calendar) waits on pack-declared MCP servers |
| [`packs/reverse-engineer`](packs/reverse-engineer) | Reverse engineering a binary or app the model has no prior knowledge of: connect to the REA MCP server, route by target, native artifacts via Hopper/Ghidra, JavaScript source recovery via Wakaru, Android via JADX, and runtime observation. Evidence-first, every claim a ref or a quote | 0.1.0 — ported from the REA toolkit. Six chunks, all read-only; the capability lives in the external REA server, so there are no verify commands or parsers. No `detect` — switched on by hand, never auto-activated |
| [`packs/agentcad`](packs/agentcad) | Building, validating, and exporting production-grade CAD parts and assemblies in Python from a natural-language brief, in build123d (default) or CadQuery. The operating guide is the product: canonical workflow, tool catalog, API cheat-sheet, patterns, verification gates | 0.1.0 — ported from the AgentCAD `skill` command. Two complete, byte-identical runtime guides (build123d core + CadQuery chunk); the capability lives in the external AgentCAD server, so there are no verify commands or parsers. No `detect` — switched on by hand, never auto-activated |
| [`packs/bash`](packs/bash) | Shell command discipline: quoting and expansion, pipelines and exit codes, portable text processing, `find`/`xargs`, process control, portability across shells and platforms, non-interactive flags, and script writing. Failure playbook keyed on condensed stderr | 0.1.0 — ported from the `be-bash-pack-handoff` bundle. Core plus eight on-demand chunks, five commands, an error playbook, and a script template. The bundle's `pre_exec` lint hook and `jsonl-diag` verify parser are not 1.3.0 loader features, so linting is a manual `preflight` command and no `verify[]` entry ships |
| [`packs/zsh`](packs/zsh) | zsh shell discipline: globbing and qualifiers, `setopt`/`unsetopt` options, 1-indexed arrays, startup-file order, and where zsh diverges from bash — pair with the bash pack for the shared rules. Failure playbook keyed on condensed stderr | 0.1.0 — ported from the same v0.2.0 shell bundle as the bash pack. Core plus four on-demand chunks, two commands, an error playbook, a script template, and a `shlint` wrapper. The bundle's `pre_exec` lint hook and `jsonl-diag` verify parser are not 1.3.0 loader features, so linting is a manual `preflight` command and no `verify[]` entry ships |
| [`packs/pwsh`](packs/pwsh) | PowerShell discipline: objects not text, non-interactive cmdlets, and gating destructive commands (files, services, AD, Hyper-V, registry). Failure playbook keyed on condensed stderr | 0.1.0 — ported from the same v0.2.0 shell bundle as the bash pack. Core plus eight on-demand chunks, five commands, an error playbook, a script template, and a `shlint` wrapper. The bundle's `pre_exec` lint hook and `ps-script-lint` verify parser are not 1.3.0 loader features, so linting is a manual `preflight` command and no `verify[]` entry ships |
| [`packs/ue5`](packs/ue5) | Unreal Engine 5 C++: reflection and UHT, modules and `.Build.cs`, object lifetime, replication, building with UnrealBuildTool, and 15 playbook entries for the errors that stop a build | 0.1.0 — seed. Two chunks of a planned nine; never yet run against a real engine |
| [`packs/ui-web`](packs/ui-web) | React + TypeScript interfaces: accessibility ordered by measured real-world frequency, state, effects, types. Eight playbook entries, every one written from captured toolchain output rather than from a rule's documentation | 0.1.0 — seed. Six chunks; contrast, empty buttons and unlabelled inputs are rules rather than checks, because no standard lint config catches them |

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

> **Requires BE-Code 1.3.0 or newer.** Pack support shipped in 1.3.0, the
> current release. Earlier releases (v1.2.5 and before) have no `packs`
> command and cannot install a pack — update if `be-code packs` is not found.

**With [BE-Code](https://github.com/BE-AI-Research/be-code-redux)** 1.3.0 or
newer:

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

[`docs/ledgers/2026-10-07-ui-web-pack.md`](docs/ledgers/2026-10-07-ui-web-pack.md)
is that advice applied, kept as a record of what it cost: the error codes the
plan guessed wrong, the accessibility defects no standard lint config catches
at all, a playbook that turned out to be inert on the one check it was written
for, and three verify commands that only worked on the fixture's own layout.
Each was found by running the real toolchain, and none of them by reasoning
about it. `packs/ui-web` keeps the captured output it was written from in
[`fixtures/ui-web/captured/`](fixtures/ui-web/captured), which is a habit worth
copying.

[`docs/ledgers/2026-10-09-assist-pack.md`](docs/ledgers/2026-10-09-assist-pack.md)
is the same lesson about a pack's *prose*. The assist pack ships almost no
checks, so its claims are its product — and four of them were wrong until
somebody ran them: a schedule line the harness rejects, a write grant that
parses and covers nothing, a task-document shape the engine silently splits
into several documents, and a slash command that a schedule delivers as six
literal characters. None was found by reading.

## Status

The format is implemented and tested in BE-Code, and shipped in the current
release (1.3.0). The parser behaviour it describes is covered by tests in the
BE-Code source tree.

The ue5 pack is a seed — two of nine planned chunks, and its build wrapper has
been tested with `--dry-run` against a fake engine tree but not against a real
Unreal install. The assist pack has been run end to end against a real local
model. The reverse-engineer and agentcad packs are ports that depend on an
external MCP server and have no verify commands, so "tested" for them means
byte-identical to their source, not a build they have driven. The bash, zsh, and
pwsh packs are ports from the v0.2.0 shell bundle (bash from
`be-bash-pack-handoff`); their pre-execution linting needs the optional `shlint`
binary (built by you, not shipped), and the two hook and parser features the
bundle used were adapted to what the 1.3.0 loader supports rather than dropped. Each pack's own README says what it does not do, and
`docs/ledgers/` records where the plans turned out to be wrong.

Contributions welcome, particularly real toolchain output: a few hundred lines
of a genuinely failing build is worth more to a playbook than any amount of
careful reasoning about what the error messages probably look like.

## Licence

MIT — see [LICENSE](LICENSE).
