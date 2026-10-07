<#
.SYNOPSIS
  Build an Unreal Engine project with UnrealBuildTool (Windows).
  Used as the ue5 pack's verify command on Windows; output is parsed by BE-Code's "ubt" parser.
.PARAMETER Project  Project directory or .uproject file (default: current directory)
.PARAMETER Target   Build target (default: <Project>Editor)
.PARAMETER Config   Debug | DebugGame | Development | Shipping (default: Development)
.PARAMETER Engine   Engine root, the folder containing Engine\ (default: $env:UE_ROOT, then the
                    project's EngineAssociation resolved via registered builds and the launcher)
.PARAMETER DryRun   Print the UBT command instead of running it
#>
param(
    [string]$Project = ".",
    [string]$Target = "",
    [string]$Config = "Development",
    [string]$Engine = $env:UE_ROOT,
    [switch]$DryRun
)
$ErrorActionPreference = "Stop"

function Fail($msg) { [Console]::Error.WriteLine("ERROR: ue-build: $msg"); exit 2 }
function Test-Engine($p) { $p -and (Test-Path (Join-Path $p "Engine\Build\BatchFiles\Build.bat")) }

# Locate the .uproject.
if (Test-Path $Project -PathType Leaf) {
    $uproject = (Resolve-Path $Project).Path
} else {
    $found = @(Get-ChildItem -Path $Project -Filter *.uproject -File)
    if ($found.Count -eq 0) { Fail "no .uproject found in $Project" }
    if ($found.Count -gt 1) { Fail "more than one .uproject in $Project; pass -Project FILE" }
    $uproject = $found[0].FullName
}
$name = [IO.Path]::GetFileNameWithoutExtension($uproject)
if (-not $Target) { $Target = "${name}Editor" }

$assoc = ""
try { $assoc = (Get-Content $uproject -Raw | ConvertFrom-Json).EngineAssociation } catch { }

if (-not (Test-Engine $Engine)) {
    $Engine = $null

    # Source builds registered on this machine (GUID associations).
    if ($assoc) {
        $reg = "HKCU:\Software\Epic Games\Unreal Engine\Builds"
        if (Test-Path $reg) {
            $p = (Get-ItemProperty $reg -ErrorAction SilentlyContinue).$assoc
            if (Test-Engine $p) { $Engine = $p }
        }
    }

    # Launcher installs (versioned associations like "5.4").
    if (-not $Engine -and $assoc) {
        $dat = Join-Path $env:ProgramData "Epic\UnrealEngineLauncher\LauncherInstalled.dat"
        if (Test-Path $dat) {
            try {
                $list = (Get-Content $dat -Raw | ConvertFrom-Json).InstallationList
                $hit = $list | Where-Object { $_.AppName -eq "UE_$assoc" } | Select-Object -First 1
                if ($hit -and (Test-Engine $hit.InstallLocation)) { $Engine = $hit.InstallLocation }
            } catch { }
        }
    }

    if (-not $Engine -and $assoc) {
        $p = Join-Path $env:ProgramFiles "Epic Games\UE_$assoc"
        if (Test-Engine $p) { $Engine = $p }
    }
}

if (-not (Test-Engine $Engine)) {
    Fail "cannot find the Unreal Engine install (EngineAssociation `"$assoc`"). Set UE_ROOT to the folder containing Engine\, or pass -Engine."
}

$bat = Join-Path $Engine "Engine\Build\BatchFiles\Build.bat"
$ubtArgs = @($Target, "Win64", $Config, "-Project=`"$uproject`"", "-WaitMutex", "-FromMsBuild")

if ($DryRun) {
    Write-Output ("`"$bat`" " + ($ubtArgs -join " "))
    exit 0
}

[Console]::Error.WriteLine("ue-build: $Target Win64 $Config ($Engine)")
& $bat @ubtArgs
exit $LASTEXITCODE
