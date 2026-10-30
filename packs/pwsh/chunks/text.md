# Text and data

## Select-String
`Select-String -Pattern 'err(or)?' -Path *.log -CaseSensitive -Context 2,2` → MatchInfo objects with `.Path .LineNumber .Line .Matches`. `-SimpleMatch` for literal, `-NotMatch` to invert, `-List` first match per file, `-AllMatches`. Pipe files in: `gci -Recurse -File | Select-String foo`.

## Regex operators
- `'abc123' -match '\d+'` → `$true`, `$Matches[0]`; named groups `(?<n>\d+)` → `$Matches.n`. Case-insensitive by default (`-cmatch`).
- `-replace 'pattern','replacement'` with `$1`/`${name}` in the replacement (single-quote the replacement so PowerShell does not expand `$1`). Literal replace: `.Replace('a','b')` string method.
- `-split '\s*,\s*'` regex split; `.Split(',')` literal.
- `[regex]::Escape($s)` before putting user text in a pattern. `[regex]::Matches($text, $pat)` for all matches.

## Here-strings
```powershell
$sql = @'
SELECT * FROM t WHERE x = '$notExpanded'
'@
$msg = @"
Hello $name, today is $(Get-Date -Format D)
"@
```
Closing delimiter must be at the start of its line.

## JSON, CSV, XML
- `Get-Content f.json -Raw | ConvertFrom-Json` → objects (`-AsHashtable` on 7 for dictionaries); `ConvertTo-Json -Depth 10` (default depth 2 truncates silently: always set `-Depth`).
- `Import-Csv f.csv` → objects with header names; `-Delimiter "`t"`; `Export-Csv -NoTypeInformation` (7 omits it by default).
- `[xml](Get-Content f.xml -Raw)` then dot into it; `Select-Xml -XPath`.
- `Invoke-RestMethod -Uri $u -Headers @{Authorization="Bearer $t"} -Method Post -Body ($obj | ConvertTo-Json) -ContentType 'application/json'` returns parsed objects.

## Tables from text
`$lines | ConvertFrom-Csv -Delimiter ' ' -Header a,b,c` turns columnar output into objects; `ConvertFrom-StringData` for key=value.

## Dates and numbers
`Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'`, `(Get-Date).AddDays(-7)`, `[datetime]::ParseExact($s,'yyyyMMdd',$null)`, `New-TimeSpan`. Culture affects parsing: `[cultureinfo]::InvariantCulture` for data.

## Encoding pitfalls
Output from native tools may be in the OEM code page; `[Console]::OutputEncoding = [Text.Encoding]::UTF8` at the top of a session that reads UTF-8 tool output (`git`, `rg`).
