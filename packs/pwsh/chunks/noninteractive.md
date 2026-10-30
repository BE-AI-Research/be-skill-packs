# Running PowerShell without a human

| Prompts because | Non-interactive form |
|---|---|
| `-Confirm` / `$ConfirmPreference` on state-changing cmdlets (`Remove-*`, `Stop-*`, `Set-*` with high impact) | `-Confirm:$false`; preview first with `-WhatIf` |
| `Remove-Item` on a non-empty directory | `-Recurse` (then it is gated) |
| `New-Item` over an existing item, `Copy-Item`/`Move-Item` over existing | `-Force` |
| `Install-Module` untrusted repository / NuGet provider | `Install-Module x -Scope CurrentUser -Force`; once: `Set-PSRepository PSGallery -InstallationPolicy Trusted`, `Install-PackageProvider NuGet -Force` |
| `Set-ExecutionPolicy` | `-Force -Scope CurrentUser` (gated); or per-run `pwsh -ExecutionPolicy Bypass -File x.ps1` |
| `Read-Host`, `Get-Credential`, `Pause`, `Out-GridView`, `Show-Command` | parameters, PSCredential from a store, `Out-String` |
| `Start-Process -Verb RunAs` (UAC) | elevated session beforehand; agents cannot click UAC |
| `winget install` | `--silent --accept-package-agreements --accept-source-agreements --disable-interactivity` |
| `choco install` | `-y`; `chocolatey feature enable -n allowGlobalConfirmation` once |
| `scoop install` | non-interactive already |
| `git log/diff/show` pager | `git --no-pager`; `$env:GIT_PAGER='cat'` |
| `git commit` without `-m` | `-m` |
| `ssh`/`scp` prompts | `-o BatchMode=yes -o StrictHostKeyChecking=accept-new` |
| `Enter-PSSession`, `Enter-PSHostProcess` | `Invoke-Command` instead |
| `more`, `Out-Host -Paging`, `Get-Help -ShowWindow` | `Out-String`, `Select-Object -First`, `Get-Help -Full | Out-String` |
| `notepad`, `code` (without `--wait`) | the edit tool; `code --wait` never from an agent |
| `diskpart`, `nslookup`, `telnet`, `ftp` interactive | `diskpart /s script.txt`, `Resolve-DnsName`, `Test-NetConnection -Port` |
| `Get-Content -Wait` | `-Tail n` |
| `Wait-Job`, `Wait-Process`, `Wait-Event` | `-Timeout n` |
| `Register-PSRepository`, `Update-Help` | `Update-Help -Force -ErrorAction SilentlyContinue` |
| `az login`, `Connect-AzAccount`, `gh auth login` | service principal / token env vars; `az login --service-principal` |

## Session preamble that removes most prompts
```powershell
$ErrorActionPreference = 'Stop'; $ConfirmPreference = 'None'; $ProgressPreference = 'SilentlyContinue'
$env:GIT_PAGER = 'cat'; $PSNativeCommandUseErrorActionPreference = $true
```
`$ProgressPreference = 'SilentlyContinue'` also makes `Invoke-WebRequest` several times faster on 5.1.

## Detecting a hang
The tool call does not return and there is no output. Prevention: the table above, plus the timeout patterns in the process chunk. If the harness reports a timeout, the fix is the non-interactive form, not a longer limit, unless the work is known to be long.
