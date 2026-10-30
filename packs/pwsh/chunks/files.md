# Files, paths and providers

## Paths
- `Join-Path $a 'sub\file.txt'` (handles separators); `Split-Path -Parent/-Leaf/-Extension`; `Resolve-Path`; `[IO.Path]::GetFullPath()`.
- `$PSScriptRoot` (script's folder), `$PWD`, `$HOME`, `$env:USERPROFILE`, `$env:TEMP`, `$env:ProgramFiles`, `$env:SystemRoot`.
- `-Path` accepts wildcards (`*`, `?`, `[a-z]`); `-LiteralPath` does not. A filename with `[` in it needs `-LiteralPath` or it will not be found.
- Forward slashes are tolerated on Windows; `"$var/sub"` works in most cmdlets but not in native programs. Prefer `Join-Path`.
- Long paths (> 260 chars) need the LongPathsEnabled registry key or `\\?\` prefix on Windows PowerShell 5.1.

## Listing
`Get-ChildItem -Path . -Recurse -File -Filter *.log` ; `-Directory` ; `-Force` includes hidden ; `-Depth 2` ; `-Include *.log,*.txt -Recurse`. Properties: `FullName, Length, LastWriteTime, Extension, Attributes`. `-ErrorAction SilentlyContinue` to skip access-denied folders, after you decide that is acceptable.

## Reading and writing
- `Get-Content f` → array of lines. `-Raw` → one string (for regex across lines). `-First n`, `-Tail n`, `-Encoding utf8`.
- `Set-Content f -Value $text -Encoding utf8` (7: UTF-8 no BOM; 5.1: `utf8` adds a BOM, use `[IO.File]::WriteAllText($p,$t,[Text.UTF8Encoding]::new($false))` for no BOM). `Add-Content` appends. `Out-File` for pipeline output (`-Width` matters).
- `Test-Path`, `-PathType Leaf|Container`; `New-Item -ItemType Directory -Force` (idempotent mkdir -p); `New-Item -ItemType File`.
- `Copy-Item -Recurse -Force`, `Move-Item`, `Rename-Item`, `Remove-Item -Recurse -Force` (gated), `Get-Item`, `Get-ItemProperty`.
- `Get-FileHash -Algorithm SHA256`, `Compress-Archive`/`Expand-Archive`, `Get-Acl`/`Set-Acl`, `icacls` for ACL edits.

## Providers
Paths are not only disks: `Env:\PATH`, `HKLM:\SOFTWARE\...`, `HKCU:`, `Cert:\LocalMachine\My`, `WSMan:`, `Function:`, `Variable:`. The same Get/Set/Remove-Item cmdlets work on all of them, which is why registry deletes are gated like file deletes. `Get-PSDrive` lists them.

## Encoding and line endings
Windows PowerShell 5.1 defaults to UTF-16/ANSI in places; PowerShell 7 defaults to UTF-8. Always pass `-Encoding utf8` when a file leaves PowerShell for another tool. CRLF is the default line ending; `-NoNewline` and `($text -replace "`r`n","`n")` when a Unix tool will read the file.

## Deleting safely
```powershell
$target = Join-Path $root 'build\obj'
if (-not $root) { throw 'root is empty' }
Get-ChildItem -LiteralPath $target -Recurse | Measure-Object | Select-Object Count
Remove-Item -LiteralPath $target -Recurse -Force -WhatIf
# then, through the gate:
Remove-Item -LiteralPath $target -Recurse -Force -Confirm:$false
```
