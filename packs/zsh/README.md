# Zsh

A skill-pack for writing and running zsh with discipline: zsh's globbing and
qualifiers, `setopt`/`unsetopt` options, 1-indexed arrays, startup-file order,
and the places zsh diverges from bash. It pairs with the bash pack for the
shared shell rules (quoting, pipelines, text processing) and carries its own
failure playbook (stderr line → cause → fix) and a reusable script skeleton,
plus a `shlint` wrapper for pre-execution linting.

Adapted from the v0.2.0 shell bundle (the same source as the bash pack) so its
rules, playbook, and lint wrapper are available inside be-code as a skill-pack.

## What it gives the agent

- `core.md` (always loaded when the pack is enabled) — the standing zsh rules.
- Four on-demand chunks under `chunks/`, loaded only when the topic is in scope:
  - `differences` — where zsh diverges from bash and what to watch for
  - `globbing` — zsh globs and qualifiers
  - `options` — `setopt`/`unsetopt` and the options that change behaviour
  - `config` — startup-file order (`.zshenv`, `.zprofile`, `.zshrc`, `.zlogin`)
- Two commands under `commands/`: `glob`, `to-bash`.
- `playbooks/errors.md` — a failure-line → `cause:`/`fix:` playbook keyed on the
  condensed stderr (and `shlint`) codes this pack emits.
- `templates/script.zsh` — a zsh script skeleton.
- `tools/shlint` and `tools/shlint.cmd` — a small wrapper that locates a `shlint`
  binary (from `$SHLINT`, `~/.be-code/bin/shlint`, or `PATH`) and reports a
  `PACK-TOOLMISSING` finding if it is not built.

## Detection

This pack has no `detect` signal: zsh discipline applies to every zsh command, so
the pack is always active once enabled for the session.

## 1.3.0 adaptations

Two features the original bundle relied on are not loader capabilities in
be-code 1.3.0, and were adapted rather than dropped:

- The original `pre_exec` hook (auto-lint a command before it runs) is not a
  packs-loader feature in 1.3.0. Its behaviour is preserved as the manual
  `preflight` command: run `shlint preflight --cmd '<command>'` before executing,
  fix findings, and gate destructive commands behind the approval prompt.
- The original `verify[]` entry used the `jsonl-diag` parser, which is not a
  compiled-in parser in 1.3.0. No `verify[]` entry is shipped; `shlint` output
  is a plain JSON finding the agent reads directly, and its codes are indexed in
  `playbooks/errors.md`.

## Using it

Write or run zsh, and ask for a check, e.g. "explain this zsh glob", "will this
run the same in bash", or "preflight this command". The core rules load
automatically; the relevant chunk and command are pulled in when the task
matches. Pair with the bash pack for the rules the two shells share.

The pack ships the lint wrapper but not the `shlint` binary; build it to
`~/.be-code/bin/shlint` (or set `SHLINT`) to get pre-execution findings. Without
it the wrapper reports `PACK-TOOLMISSING` and the playbook tells the agent how
to build it.

## Source

Ported from the v0.2.0 shell bundle (core, four chunks, two commands, the error
playbook, the script template, and the `shlint` wrapper), adapted to the
be-code 1.3.0 packs loader as described above.
