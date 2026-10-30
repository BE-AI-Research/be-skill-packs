# Bash

A skill-pack for writing and running shell commands with discipline: correct
quoting and expansion, sensible pipelines, portable text processing, `find`/
`xargs`, process control, and non-interactive flags. It carries the failure
playbook (stderr line → cause → fix) and a reusable script skeleton, plus a
`shlint` wrapper for pre-execution linting.

Adapted from the `be-bash-pack-handoff` bundle so its rules, playbooks, and
lint hook are available inside be-code as a skill-pack.

## What it gives the agent

- `core.md` (always loaded when the pack is enabled) — the standing rules:
  quote every expansion, fail hard, list before you delete, and keep commands
  non-interactive.
- Eight on-demand chunks under `chunks/`, loaded only when the topic is in scope:
  - `quoting` — word splitting, globbing, `"$var"` vs `${var:?}`, arrays, `$(...)`, heredocs
  - `pipes` — redirection, exit codes, `pipefail`, `&&`/`||`/`;`, subshells, process substitution
  - `text` — grep/rg, sed, awk, cut, sort, uniq, tr, jq; portable idioms and traps
  - `find` — `-print0`/`-0`, `-exec` vs `xargs`, pruning, filters, `fd`/`rg` alternatives
  - `process` — `timeout`, background jobs, `wait`, traps, signals, `nohup`, exit-code conventions
  - `portability` — bash vs sh vs zsh, GNU vs BSD vs busybox, WSL and the PowerShell/cmd boundary
  - `noninteractive` — every tool that prompts or pages and its non-interactive flag; detecting a hang
  - `scripts` — shebang, `set -euo pipefail`, argument parsing, usage, temp files, logging, idempotence
- Five commands under `commands/`: `explain`, `porta`, `preflight`, `safe-rm`, `script-new`.
- `playbooks/errors.md` — a failure-line → `cause:`/`fix:` playbook keyed on the
  condensed stderr (and `shlint`) codes this pack emits.
- `templates/script.sh` — a hardened bash skeleton (`set -euo pipefail`, `getopts`,
  `-n` dry-run, `mktemp` + `trap` cleanup, `log`/`die` helpers).
- `tools/shlint` and `tools/shlint.cmd` — a small wrapper that locates a `shlint`
  binary (from `$SHLINT`, `~/.be-code/bin/shlint`, or `PATH`) and reports a
  `PACK-TOOLMISSING` finding if it is not built.

## Detection

This pack has no `detect` signal: shell discipline applies to every command, so
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

Write or run shell, and ask for a check, e.g. "explain this pipeline", "make this
portable to macOS", "preflight this command", "delete this directory the safe
way", or "start a script from the template". The core rules load automatically;
the relevant chunk and command are pulled in when the task matches.

The pack ships the lint wrapper but not the `shlint` binary; build it to
`~/.be-code/bin/shlint` (or set `SHLINT`) to get pre-execution findings. Without
it the wrapper reports `PACK-TOOLMISSING` and the playbook tells the agent how
to build it.

## Source

Ported from the `be-bash-pack-handoff` bundle (core, eight chunks, five commands,
the error playbook, the script template, and the `shlint` wrapper), adapted to the
be-code 1.3.0 packs loader as described above.
