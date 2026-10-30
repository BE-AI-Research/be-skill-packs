# Windows Server administration without surprises

These are the rules for touching a domain controller, DNS/DHCP, Hyper-V, the registry, or the firewall from an agent. Every change here is gated; the gate is only useful if the message carries the facts below.

## Before any change
1. `-WhatIf` in the same tool call, and read the output.
2. Identify the object unambiguously: AD by DistinguishedName or ObjectGUID, not SamAccountName alone; VMs by Id; services by Name; registry by full key path.
3. Record current state in the same call: `Get-ADUser -Identity ... -Properties *`, `Get-ItemProperty HKLM:\...`, `Get-VM | Select Name,State,Id`, `reg export`.
4. Say what else depends on it (service accounts, GPO links, DNS records, replication).
5. Do not change the path you are connected through (adapter, firewall, RDP/WinRM, the DC you are talking to).

## Active Directory
- Read: `Get-ADUser -Filter "Department -eq 'Eng'" -Properties mail,lastLogonDate` (`-Filter` is PowerShell-like; `-LDAPFilter` for raw). `Get-ADGroupMember -Recursive`. `Get-ADComputer`. `Get-ADDomainController -Filter *`. `Search-ADAccount -AccountDisabled|-LockedOut|-PasswordExpired`.
- Change (gated): `New-ADUser` (pass `-AccountPassword` from a secure source, `-Enabled $true`), `Set-ADUser -Replace @{title='x'}`, `Add-ADGroupMember`, `Disable-ADAccount`, `Remove-ADUser` (prefer disable + move to a holding OU; delete after retention), `Set-ADAccountPassword -Reset`, `Unlock-ADAccount`.
- Never on a DC: `Remove-ADObject -Recursive`, `Set-ADDomain`, `Move-ADDirectoryServerOperationMasterRole`, `Uninstall-ADDSDomainController`, raw `ntdsutil` without a change record and a backup (`wbadmin start systemstatebackup`).
- Replication check after change: `repadmin /replsummary`, `Get-ADReplicationPartnerMetadata`.
- `Get-ADObject -IncludeDeletedObjects` and `Restore-ADObject` need the Recycle Bin enabled; check `Get-ADOptionalFeature`.

## DNS and DHCP
`Get-DnsServerResourceRecord -ZoneName z`, `Add-DnsServerResourceRecordA`, `Remove-DnsServerResourceRecord` (gated; `-WhatIf`), `Get-DhcpServerv4Scope`, `Get-DhcpServerv4Lease`, `Add-DhcpServerv4Reservation`. Export before edits: `Export-DnsServerZone`, `Export-DhcpServer -File`.

## Group Policy
`Get-GPO -All`, `Get-GPOReport -ReportType Html -Path`, `Backup-GPO -All -Path` before any `Set-GPRegistryValue`/`New-GPLink`/`Remove-GPO` (gated). `gpresult /r` on a client to verify; `Invoke-GPUpdate` to push.

## Hyper-V
`Get-VM`, `Get-VMSnapshot`, `Checkpoint-VM -Name x -SnapshotName "before-<change>"` before anything inside a VM; `Stop-VM` (graceful) vs `-TurnOff` (gated, data loss); `Remove-VM*` (gated); `Set-VMMemory`, `Set-VMProcessor` only when stopped. Snapshot chains eat disk: `Get-VHD` and `Merge-VHD` with care.

## Registry
`Get-ItemProperty -Path HKLM:\SOFTWARE\x -Name y`, `Set-ItemProperty`, `New-ItemProperty -PropertyType DWord`. `reg export HKLM\SOFTWARE\x backup.reg` first. `Remove-Item`/`Remove-ItemProperty` on `HK*:` are gated. HKLM changes often need elevation and sometimes a reboot; say which.

## Firewall, adapters, features
`Get-NetFirewallRule -Enabled True | Where DisplayName -like '*x*'`, `New-NetFirewallRule -Direction Inbound -LocalPort 5985 -Protocol TCP -Action Allow` (adding is fine; disabling profiles or removing rules is gated). `Get-NetAdapter`, `Get-NetIPConfiguration`; `Disable-NetAdapter` on the adapter you are using locks you out. `Get-WindowsFeature`, `Install-WindowsFeature -IncludeManagementTools`, `Uninstall-WindowsFeature` (gated).

## Updates and reboots
`Get-WindowsUpdate` (PSWindowsUpdate module) ; `Install-WindowsUpdate -AcceptAll -IgnoreReboot` ; `Restart-Computer` is gated and must name a maintenance window. `Get-ComputerInfo | Select OsLastBootUpTime`.

## Evidence
End an admin task with the post-state query that proves it: `Get-ADUser ... | Select Enabled,MemberOf`, `Get-Service x`, `Get-ItemProperty ...`. The gate approval, the -WhatIf output, and the post-state are the change record.
