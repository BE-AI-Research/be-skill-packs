# PowerShell

A skill-pack for writing and running PowerShell with discipline: objects rather
than text on the pipeline, non-interactive cmdlets, and gating the destructive
ones (files, services, Active Directory, Hyper-V, registry). It carries the
failure playbook (stderr line → cause → fix) and a reusable script skeleton,
plus a `shlint` wrapper for pre-execution linting.

Adapted from the v0.2.0 shell bundle (the same source as the bash pack) so its
rules, playbook, and lint wrapper are available inside be-code as a skill-pack.

## What it gives the agent

- `core.md` (always loaded when the pack is enabled) — the standing PowerShell
  rules.
- Eight on-demand chunks under `chunks/`, loaded only when the topic is in scope:
  - `translate` — bash → PowerShell translation rules and idioms
  - `pipeline` — objects, properties, `ForEach-Object`, piping cmdlets
  - `files` — file and path cmdlets
  - `text` — text and string cmdlets
  - `process` — processes, jobs, background work
  - `noninteractive` — cmdlets that prompt and how to make them non-interactive
  - `scripts` — shebangless scripts, param blocks, error handling, idempotence
  - `windows-admin` — services, AD, Hyper-V, registry, and gating the destructive ones
- Five commands under `commands/`: `explain`, `preflight`, `safe-remove`,
  `script-new`, `translate`.
- `playbooks/errors.md` — a failure-line → `cause:`/`fix:` playbook keyed on the
  condensed stderr (and `shlint`) codes this pack emits.
- `templates/script.ps1` — a PowerShell script skeleton.
- `tools/shlint` and `tools/shlint.cmd` — a small wrapper that locates a `shlint`
  binary (from `$SHLINT`, `~/.be-code/bin/shlint`, or `PATH`) and reports a
  `PACK-TOOLMISSING` finding if it is not built.

## Detection

This pack has no `detect` signal: PowerShell discipline applies to every
PowerShell command, so the pack is always active once enabled for the session.

## 1.3.0 adaptations

Two features the original bundle relied on are not loader capabilities in
be-code 1.3.0, and were adapted rather than dropped:

- The original `pre_exec` hook (auto-lint a command before it runs) is not a
  packs-loader feature in 1.3.0. Its behaviour is preserved as the manual
  `preflight` command: run `shlint preflight --cmd '<command>'` before executing,
  fix findings, and gate destructive commands behind the approval prompt.
- The original `verify[]` entry used the `ps-script-lint` parser, which is not a
  compiled-in parser in 1.3.0. No `verify[]` entry is shipped; `shlint` output
  is a plain JSON finding the agent reads directly, and its codes are indexed in
  `playbooks/errors.md`.

## Using it

Write or run PowerShell, and ask for a check, e.g. "translate this bash script
to PowerShell", "preflight this command", "remove this path the safe way", or
"start a script from the template". The core rules load automatically; the
relevant chunk and command are pulled in when the task matches.

The pack ships the lint wrapper but not the `shlint` binary; build it to
`~/.be-code/bin/shlint` (or set `SHLINT`) to get pre-execution findings. Without
it the wrapper reports `PACK-TOOLMISSING` and the playbook tells the agent how
to build it.

## Source

Ported from the v0.2.0 shell bundle (core, eight chunks, five commands, the
error playbook, the script template, and the `shlint` wrapper), adapted to the
be-code 1.3.0 packs loader as described above.
