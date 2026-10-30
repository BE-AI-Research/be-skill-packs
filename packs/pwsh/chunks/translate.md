# bash → PowerShell

| bash | PowerShell | Note |
|---|---|---|
| `ls -la` | `Get-ChildItem -Force` (`gci`) | `ls` is an alias for gci; Unix flags fail |
| `ls -R` | `Get-ChildItem -Recurse` | |
| `find . -name '*.log'` | `Get-ChildItem -Recurse -Filter *.log -File` | `-Filter` is fast; `-Include` needs `-Recurse` |
| `find . -mtime -7` | `gci -Recurse -File \| Where-Object LastWriteTime -gt (Get-Date).AddDays(-7)` | |
| `cat f` | `Get-Content f` ; whole file as one string: `-Raw` | |
| `head -n 20 f` | `Get-Content f -First 20` (also `-TotalCount`) | |
| `tail -n 50 f` | `Get-Content f -Tail 50` | |
| `grep -n pat f` | `Select-String -Pattern pat -Path f` | regex by default; `-SimpleMatch` for literal; `-CaseSensitive` |
| `grep -r pat .` | `Get-ChildItem -Recurse -File \| Select-String pat` | |
| `sed 's/a/b/g' f` | `(Get-Content f -Raw) -replace 'a','b' \| Set-Content f` | `-replace` is regex; escape with `[regex]::Escape()` |
| `awk '{print $2}'` | `ForEach-Object { ($_ -split '\s+')[1] }` | or `ConvertFrom-Csv -Delimiter` for real columns |
| `wc -l f` | `(Get-Content f \| Measure-Object -Line).Lines` | |
| `sort \| uniq -c` | `Group-Object \| Select-Object Count,Name` | |
| `cut -d, -f2` | `Import-Csv` or `($_ -split ',')[1]` | |
| `echo $X` | `Write-Output $X` / just `$X` | `Write-Host` bypasses the pipeline |
| `export X=1` | `$env:X = '1'` | process-scoped; `[Environment]::SetEnvironmentVariable` for persistent |
| `X=1 cmd` | `$env:X='1'; cmd` (then unset) | no per-command env prefix |
| `which cmd` | `Get-Command cmd` (`gcm`) | |
| `cmd > f 2>&1` | `cmd *> f` or `cmd 2>&1 \| Out-File f` | `*>` all streams |
| `2>/dev/null` | `2>$null` | |
| `cmd1 && cmd2` | `cmd1 && cmd2` (7+) ; `cmd1; if ($?) { cmd2 }` (5.1) | |
| `$?` (exit code) | `$?` is bool success; native exit code is `$LASTEXITCODE` | |
| `set -e` | `$ErrorActionPreference = 'Stop'` | plus `-ErrorAction Stop` per cmdlet |
| `mkdir -p d` | `New-Item -ItemType Directory -Force d` | |
| `rm -rf d` | `Remove-Item -Recurse -Force d` | gated |
| `cp -r a b` | `Copy-Item -Recurse a b` | |
| `mv a b` | `Move-Item a b` | |
| `touch f` | `New-Item f -ItemType File -Force` or `(Get-Item f).LastWriteTime = Get-Date` | |
| `chmod +x` | not applicable; `icacls` for ACLs | |
| `curl -s URL` | `Invoke-RestMethod URL` (parsed) / `Invoke-WebRequest URL` (raw) / `curl.exe -s URL` | |
| `wget URL -O f` | `Invoke-WebRequest URL -OutFile f` | |
| `jq .key` | `ConvertFrom-Json \| Select-Object -Expand key` | |
| `ps aux` | `Get-Process` | |
| `kill PID` | `Stop-Process -Id PID` | gated |
| `systemctl status x` | `Get-Service x` | |
| `sleep 5` | `Start-Sleep -Seconds 5` | |
| `date +%F` | `Get-Date -Format yyyy-MM-dd` | |
| `$(cmd)` | `$(cmd)` or `(cmd)` | `$()` inside strings too |
| `"$var"` | `"$var"` ; property: `"$($obj.Name)"` | single quotes are literal, same as bash |
| `'...'` heredoc | `@'` ... `'@` here-string (literal) / `@"` ... `"@` (expanding) | delimiters at line start |
| `[ -f f ]` | `Test-Path f -PathType Leaf` | |
| `[ -d d ]` | `Test-Path d -PathType Container` | |
| `basename`/`dirname` | `Split-Path -Leaf` / `Split-Path -Parent` | |
| `readlink -f` | `Resolve-Path` / `(Get-Item f).FullName` | |
| `sudo` | elevated session or `sudo` (Win 11 24H2+) | `-Verb RunAs` prompts UAC: never from an agent |
| `#!/bin/bash` | `#Requires -Version 7.0` | |

## Running real bash when you need it
`wsl bash -c 'grep -rn foo .'` (WSL), `bash -c '...'` (Git Bash on PATH), or `& 'C:\Program Files\Git\bin\bash.exe' -lc '...'`. Quote the inner command once with single quotes; PowerShell does not expand inside them.
