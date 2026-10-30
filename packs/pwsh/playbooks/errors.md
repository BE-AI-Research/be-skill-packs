# pwsh pack - error playbook

## Cmdlet not recognized
match: is not recognized as the name of a cmdlet|CommandNotFoundException|The term '.*' is not recognized
cause: Typo, module not installed/imported, or a Unix command (`grep`, `awk`, `ls -la` flags) used in PowerShell.
fix: `Get-Command *word*` to find it; `Get-Module -ListAvailable name` then `Import-Module`; for RSAT cmdlets (`Get-ADUser`) install the feature (`Add-WindowsCapability -Online -Name Rsat.ActiveDirectory*`); for Unix tools use the translate chunk or `wsl bash -c`.

## Parameter cannot be found
match: A parameter cannot be found that matches parameter name|Cannot bind parameter
cause: Unix-style flag on an alias (`ls -la`, `curl -s`, `rm -rf`), or a parameter from a different version/cmdlet.
fix: `Get-Help cmdlet -Parameter *` (or `cmdlet -?`), use the PowerShell parameter name; `curl.exe` for real curl.

## Ambiguous parameter
match: Parameter cannot be processed because the parameter name '.*' is ambiguous
cause: An abbreviated parameter (`-r`, `-f`) matches several.
fix: Spell it out: `-Recurse`, `-Force`, `-Filter`.

## Parse error
match: PS-SYNTAX|Missing closing|Unexpected token|Missing expression after|The string is missing the terminator
cause: Unbalanced `{ } ( ) " '`, bash syntax (`fi`, `then`, `$(( ))`), or a `$` in a double-quoted string that should be literal.
fix: Read the line/column in the message; fix only that; single-quote strings with `$`; `` ` `` is the escape character, not `\`.

## Access denied / requires elevation
match: Access to the path .* is denied|Access is denied|requires elevation|UnauthorizedAccessException|Requested registry access is not allowed
cause: Not running as administrator, or ACL on the target.
fix: Check `([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole('Administrator')`. If elevation is required, say so and stop; an agent cannot click UAC. `Get-Acl` on the path to see who can.

## Execution policy
match: cannot be loaded because running scripts is disabled|UnauthorizedAccess.*execution policy|is not digitally signed
cause: Restricted/AllSigned policy blocks the script.
fix: Run with `pwsh -NoProfile -ExecutionPolicy Bypass -File x.ps1` (gated, per-run) rather than changing the machine policy; or `Unblock-File` for a downloaded script after reading it.

## Path not found
match: Cannot find path|ItemNotFoundException|does not exist
cause: Wrong cwd (did not persist), `[` in the name with `-Path`, or wildcard interpreted.
fix: `Get-Location; Get-ChildItem -LiteralPath <parent>` in the same call; `-LiteralPath`; absolute paths from `$PSScriptRoot`.

## Null-valued expression
match: You cannot call a method on a null-valued expression|The property '.*' cannot be found on this object
cause: A cmdlet returned nothing (or an array where one object was expected) and the next step dotted into it.
fix: Check the previous step's output with `| Get-Member`; guard with `if ($null -ne $x)`; `Set-StrictMode` turns these into early errors.

## Confirm prompt / hang
match: PF-HANG|Confirm\s*\n|Are you sure you want to perform this action|exit status 124|timed out
cause: A cmdlet asked a question nobody answered.
fix: `-Confirm:$false`, `-Force`, `-Recurse`, `-Scope CurrentUser -Force` per the noninteractive chunk; never a longer timeout.

## Native command failed
match: LASTEXITCODE|NativeCommandError|exited with code [1-9]
cause: A non-PowerShell program (git, dotnet, msbuild) failed; its stderr shows as red text, and `$?` may still be true on 5.1.
fix: Read the program's own error line; `if ($LASTEXITCODE -ne 0) { throw }` after native calls.

## Destructive command needs approval
match: PF-DESTRUCTIVE|PF-SUDO
cause: The command removes, disables, stops, formats, or escalates.
fix: Not an error: a gate. Run `-WhatIf`, list the object (`Get-*`), and write the approval with exact identity, what is destroyed, why, dependencies, and the rollback (snapshot, export, disable-instead-of-delete).

## Unsafe recursive delete
match: PF-RMUNSAFE
cause: Delete target is a root, `$HOME`, a system folder, `*`, or an unchecked variable.
fix: `if (-not $var) { throw }`; `Test-Path`; build the path with `Join-Path`; list it; then gate.

## Code from the network
match: PF-PIPESHELL|PSAvoidUsingInvokeExpression
cause: `iex (iwr ...)` or `Invoke-Expression`.
fix: `Invoke-WebRequest -OutFile x.ps1; Get-Content x.ps1 -First 40`, read, then `& .\x.ps1`. Replace Invoke-Expression with direct calls or `& $cmd @args`.

## Unix syntax in PowerShell
match: PF-WINSHELL
cause: bash command or flag in a PowerShell session.
fix: Translate (translate chunk) or `wsl bash -c '...'` / `bash -c '...'` explicitly.

## && or || on Windows PowerShell 5.1
match: The token '&&' is not a valid statement separator|PF-PSCHAIN
cause: Pipeline chain operators arrived in PowerShell 7.
fix: `cmd1; if ($?) { cmd2 }` or `-ErrorAction Stop` with `try/catch`; or run under `pwsh`.

## ScriptAnalyzer finding
match: ^PS(Avoid|Use|Provide|Reserved|Possible|DSC)\w+
cause: PSScriptAnalyzer rule, named in the code; the hint links its doc page.
fix: Apply the rule's recommended change; do not add a suppression attribute without a comment saying why.

## Checker not installed
match: PACK-TOOLMISSING|PF-NOANALYZER:pwsh-missing
cause: `shlint`, `pwsh` or PSScriptAnalyzer missing.
fix: Build shlint; install PowerShell 7; `Install-Module PSScriptAnalyzer -Scope CurrentUser -Force`. Do not bypass the preflight.
