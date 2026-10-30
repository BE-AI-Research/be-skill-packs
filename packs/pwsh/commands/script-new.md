---
name: script-new
description: Create a new PowerShell script from the pack skeleton
args: <path> <one-line purpose>
---
1. Fetch `pack pwsh/scripts`.
2. Write `$1` from `{pack}/templates/script.ps1`: synopsis from the purpose, typed `param()` with validation, `SupportsShouldProcess` if it changes state, StrictMode + ErrorActionPreference, try/catch, `Write-Verbose` progress.
3. Run `ps-script-lint`; fix the first finding until clean.
4. Run `.\$1 -WhatIf` (or with harmless parameters) and show the output.
