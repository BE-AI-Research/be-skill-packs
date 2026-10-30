# The object pipeline

## The shape of a command
`Get-X | Where-Object {cond} | Select-Object props | Sort-Object prop | Format-Table` — get, filter, shape, order, and only then render. Anything after a `Format-*` is text and cannot be filtered again.

## Core cmdlets
- `Where-Object { $_.Status -eq 'Running' }` or simplified `Where-Object Status -eq Running`. `?` alias.
- `Select-Object Name,Id` ; `-First 10`, `-Last 5`, `-Skip 20`, `-Unique`, `-ExpandProperty Name` (unwrap to raw values), `-Property @{n='MB';e={$_.Length/1MB}}` (calculated).
- `ForEach-Object { ... }` (`%`), `-Parallel -ThrottleLimit 4` on 7+.
- `Sort-Object Length -Descending`, `Group-Object Extension`, `Measure-Object -Sum Length`, `Compare-Object`, `Tee-Object -FilePath`.
- `Out-String` (object → text), `Out-File`, `Out-Null`.
- `Get-Member` (`gm`) shows an object's properties and methods: the answer to "what can I select here".

## Operators
`-eq -ne -gt -lt -ge -le` (case-insensitive on strings; `-ceq` for case-sensitive), `-like 'a*'`, `-match 'regex'` (sets `$Matches`), `-replace`, `-split`, `-join`, `-in`/`-contains`, `-and -or -not`, `-is [type]`. Arithmetic and comparison on `$null`: `$null -eq $x` (null on the left) to avoid array surprises.

## Errors
- Non-terminating by default: `Get-Item missing` prints red and continues. `-ErrorAction Stop` makes it terminating; `$ErrorActionPreference = 'Stop'` does so for everything after it in the scope.
- `try { ... } catch { $_.Exception.Message }`, `finally { cleanup }`. Only terminating errors are caught.
- `$?` is true/false for the last command. `$Error[0]` is the last error record. `$LASTEXITCODE` is the exit code of the last native program; cmdlets do not set it.
- Native programs writing to stderr are not errors unless `$PSNativeCommandUseErrorActionPreference = $true` (7.3+); check `$LASTEXITCODE`.
- `-ErrorVariable ev` collects errors without stopping.

## Output discipline for an agent
`| Select-Object -First 50`, `| Out-String -Width 200 | Select-Object -First 50` for text, `| ConvertTo-Json -Depth 4 -Compress` for structured results, `| Measure-Object` to size first. `Format-List` for one object with many properties; `Format-Table -AutoSize` for many objects.

## Strings and expansion
`"$var and $($obj.Prop) and $(1+1)"` expand; `'...'` literal; backtick `` ` `` escapes inside double quotes (`` `n `` newline, `` `" `` quote); `-f` formatting: `'{0:N2} MB' -f ($b/1MB)`.

## Splatting (long commands)
```powershell
$p = @{ Path = $src; Destination = $dst; Recurse = $true; Force = $true; ErrorAction = 'Stop' }
Copy-Item @p
```
Readable, diffable, and the agent gets each parameter on its own line.
