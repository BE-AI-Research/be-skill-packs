# Scripts and modules

## Skeleton
```powershell
#Requires -Version 7.0
<#
.SYNOPSIS  One line.
.PARAMETER Path  What it is.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][ValidateScript({ Test-Path -LiteralPath $_ })][string]$Path,
    [ValidateRange(1, 365)][int]$Days = 7,
    [switch]$Force
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Log { param([string]$Message) Write-Verbose ("{0:s} {1}" -f (Get-Date), $Message) }

try {
    $items = Get-ChildItem -LiteralPath $Path -File -Recurse
    foreach ($i in $items) {
        if ($PSCmdlet.ShouldProcess($i.FullName, 'Compress')) {
            Compress-Archive -LiteralPath $i.FullName -DestinationPath "$($i.FullName).zip" -Force
        }
    }
    Write-Log "processed $($items.Count) files"
}
catch {
    Write-Error "failed: $($_.Exception.Message)"
    exit 1
}
```
`SupportsShouldProcess` gives every caller `-WhatIf` and `-Confirm` for free; the pack's gate asks you to run `-WhatIf` first, so write scripts that honour it.

## Rules
- `Set-StrictMode -Version Latest`: unset variables and missing properties become errors instead of `$null`.
- `$ErrorActionPreference = 'Stop'` plus `try/catch` around the part that can fail; `exit 1` on failure so callers and the harness see it.
- `param()` with types and validation attributes; `[Parameter(Mandatory)]` prompts when missing, so always pass mandatory parameters from an agent.
- `Write-Verbose`/`Write-Information` for progress (`-Verbose` to see them), `Write-Output` for results, `Write-Host` only for human-facing colour. `Write-Error` for errors.
- Return objects, not formatted text. Let the caller format.
- No `Invoke-Expression`. Build commands with splatting or `& $exe $args`.
- Secrets: `Get-Secret` (SecretManagement) or env vars; never a plain-text password literal (PSScriptAnalyzer flags it).
- `#Requires -RunAsAdministrator` when needed, so the failure is clear instead of an access-denied mid-run.
- Paths relative to `$PSScriptRoot`, never to `$PWD`.

## Modules
`x.psm1` with functions, `x.psd1` manifest (`New-ModuleManifest`), `Export-ModuleMember`. `Import-Module .\x.psd1 -Force` while developing. Put modules on `$env:PSModulePath` or install from a private repository (`Register-PSRepository`).

## Testing and lint
`Invoke-Pester` with `Describe/It/Should` blocks and `Mock` for cmdlets. `Invoke-ScriptAnalyzer -Path x.ps1 -Severity Warning` (the pack's `ps-script-lint` runs it and promotes Invoke-Expression and plain-text-password findings to errors). Do not add `[Diagnostics.CodeAnalysis.SuppressMessageAttribute()]` to silence a rule without a comment saying why.

## Compatibility
`#Requires -Version 5.1` if it must run on Windows PowerShell; then no `&&`, no `-Parallel`, no `ConvertFrom-Json -AsHashtable`, no ternary, no null-coalescing `??`, UTF-8 BOM defaults. `$PSVersionTable.PSEdition` is `Desktop` (5.1) or `Core` (7).
