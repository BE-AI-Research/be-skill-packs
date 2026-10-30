#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$Path,
    [int]$Days = 7
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Path -PathType Container)) { throw "not a directory: $Path" }
$cutoff = (Get-Date).AddDays(-$Days)
Get-ChildItem -LiteralPath $Path -File -Filter '*.log' -Recurse |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
        if ($PSCmdlet.ShouldProcess($_.FullName, 'Compress')) {
            Compress-Archive -LiteralPath $_.FullName -DestinationPath "$($_.FullName).zip" -Force
            Remove-Item -LiteralPath $_.FullName -Force
        }
    }
