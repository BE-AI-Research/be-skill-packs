---
name: safe-remove
description: Delete a path, registry key, VM, or AD object the safe way: get, -WhatIf, gate
args: <target>
---
1. Fetch `pack pwsh/windows-admin` if the target is not a file path.
2. `Get-*` the target in this call and show size/count/properties. If it is a variable, check it is non-empty and `Test-Path` it.
3. Run the removal with `-WhatIf` in the same call.
4. Write the approval: exact identity, what is destroyed, why, dependents, rollback (export/snapshot/disable instead).
5. Execute with `-Confirm:$false` through the gate. Show the post-state query.
