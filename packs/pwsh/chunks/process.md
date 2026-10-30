# Processes, services, jobs, remoting

## Running native programs
`& 'C:\path with space\tool.exe' --flag value` (call operator). Arguments with spaces: pass as separate strings; PowerShell quotes them. `$LASTEXITCODE` after; `-ErrorAction` does not apply to native programs (7.3+: `$PSNativeCommandUseErrorActionPreference = $true`). stderr shows as error records; `2>&1` merges.

## Start-Process
`Start-Process -FilePath tool.exe -ArgumentList '--x','1' -Wait -NoNewWindow -PassThru` → process object with `.ExitCode`. Without `-Wait` it returns immediately (background). `-RedirectStandardOutput out.txt -RedirectStandardError err.txt` for capture. `-Verb RunAs` prompts UAC: never from an agent.

## Timeouts
No `timeout` command. Patterns:
```powershell
$p = Start-Process tool.exe -ArgumentList '...' -PassThru -NoNewWindow
if (-not $p.WaitForExit(60000)) { $p.Kill(); throw 'timed out' }
# or
$j = Start-Job { & tool.exe }
if (Wait-Job $j -Timeout 60) { Receive-Job $j } else { Stop-Job $j; throw 'timed out' }
```

## Jobs and parallelism
`Start-Job { }` (separate process, slow start), `Receive-Job`, `Wait-Job -Timeout`, `Remove-Job`. `ForEach-Object -Parallel { } -ThrottleLimit 4` (7+, in-process runspaces) for fan-out. `Start-ThreadJob` from ThreadJob module.

## Processes and services
`Get-Process -Name x`, `Stop-Process -Id n -Force` (gated), `Get-Service x | Select Status,StartType`, `Start-Service`, `Stop-Service`/`Restart-Service` (gated), `Set-Service -StartupType Automatic`, `Get-CimInstance Win32_Service | Where PathName -like '*x*'` for the executable path. `sc.exe` and `net` still work for edge cases.

## Remoting
`Invoke-Command -ComputerName srv -ScriptBlock { Get-Service } -ErrorAction Stop` (WinRM; `Enable-PSRemoting` on the target, HTTPS listener for non-domain). `-Credential` needs a PSCredential built without a prompt: `[pscredential]::new($user, (ConvertTo-SecureString $pw -AsPlainText -Force))` from a secure store, never from a literal in a script. `New-PSSession` / `Enter-PSSession` (interactive: never). `-ArgumentList` to pass values in; `$using:var` in the script block. SSH remoting: `Invoke-Command -HostName srv -UserName u` on 7+.

## Scheduled tasks
```powershell
$a = New-ScheduledTaskAction -Execute 'pwsh.exe' -Argument '-NoProfile -NonInteractive -File C:\jobs\x.ps1'
$t = New-ScheduledTaskTrigger -Daily -At 03:00
Register-ScheduledTask -TaskName 'x' -Action $a -Trigger $t -RunLevel Highest -User 'SYSTEM'
```
`Get-ScheduledTask`, `Start-ScheduledTask`, `Get-ScheduledTaskInfo` (LastTaskResult), `Unregister-ScheduledTask` (gated).

## Event logs
`Get-WinEvent -FilterHashtable @{LogName='System'; Level=2; StartTime=(Get-Date).AddHours(-1)} -MaxEvents 50 | Select TimeCreated,Id,ProviderName,Message`. Always `-MaxEvents`. `Get-EventLog` is 5.1-only.
