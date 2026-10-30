---
name: translate
description: Translate a bash command or script into PowerShell
args: <bash command or path>
---
1. Fetch `pack pwsh/translate` (and `pack pwsh/pipeline` if the input pipes text).
2. Translate segment by segment, keeping the object pipeline where it replaces text munging. State the PowerShell version assumed (5.1 vs 7) and anything that has no equivalent.
3. Run `shlint preflight --shell pwsh` on the result; for a script, write it from `{pack}/templates/script.ps1` and run `ps-script-lint`.
