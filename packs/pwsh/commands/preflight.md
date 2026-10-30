---
name: preflight
description: Lint a PowerShell command before running it (manual form of the pre_exec hook)
args: <command>
---
Run `{pack}/tools/shlint preflight --shell pwsh --cmd '$@'` (add `--analyze` for PSScriptAnalyzer on a long one-liner). Fix errors per hint and re-run. For gated findings write the approval (object, -WhatIf output, what is destroyed, why, rollback) before executing.
