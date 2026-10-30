---
name: preflight
description: Lint a command before running it (manual form of the pre_exec hook)
args: <command>
---
Run `{pack}/tools/shlint preflight --cmd '$@'`. If it reports an error, fix the command per the hint and re-run preflight. If it reports a gated finding, write the approval message (target, what is destroyed, why, alternative rejected) before executing. Only then execute.
