#Requires -Version 5.1
<#
.SYNOPSIS
  webharvester setup for Windows.
.DESCRIPTION
  .\setup.ps1              Install the Claude Code plugin.
  .\setup.ps1 -Measure     Also install Growser from the Microsoft Store,
                           add a launcher that loads the all-permissions
                           extension into the default profile, and regenerate
                           the guides for that browser.

  The plugin needs no browser. -Measure is only for re-measuring which
  permissions your own browser grants and rebuilding the guides from that.
#>
[CmdletBinding()]
param([switch]$Measure)

$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$MarketplaceName = 'webharvester'
$MarketplaceSlug = 'dsfox-idea/webharvester'  # public repo, used when run outside a clone
$Plugin = "web-harvester@$MarketplaceName"
$StoreProductId = '9P4JQVLX29T9'

function Log  ($m) { Write-Host "[setup] $m" -ForegroundColor Cyan }
function Warn ($m) { Write-Host "[setup] $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "[setup] $m" -ForegroundColor Red; exit 1 }
function Have ($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
# $ErrorActionPreference covers cmdlets only: a native command reports failure through its exit code.
function Assert-Exit ($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" } }

function Install-Plugin {
  if (-not (Have 'claude')) { Die "Claude Code CLI 'claude' not found. Install it first: https://claude.com/claude-code" }
  $source = if (Test-Path (Join-Path $Repo '.claude-plugin/marketplace.json')) { $Repo } else { $MarketplaceSlug }
  Log "Adding marketplace from $source"
  claude plugin marketplace add "$source"
  if ($LASTEXITCODE -ne 0) {
    claude plugin marketplace update $MarketplaceName
    Assert-Exit "Adding marketplace $source"
  }
  Log "Installing $Plugin"
  claude plugin install $Plugin --yes
  Assert-Exit "Installing $Plugin"
  Log "Plugin installed. It loads as a skill in your next Claude Code session."
}

function Get-GrowserExe {
  $candidates = @(
    "$Env:LOCALAPPDATA\Growser\Application\growser.exe",
    "$Env:ProgramFiles\Growser\Application\growser.exe",
    "${Env:ProgramFiles(x86)}\Growser\Application\growser.exe"
  )
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  $alias = Get-Command growser.exe -ErrorAction SilentlyContinue
  if ($alias) { return $alias.Source }
  return $null
}

function Install-Growser {
  if (Get-GrowserExe) { Log "Growser already installed"; return }
  if (Have 'winget') {
    Log "Installing Growser via winget (Microsoft Store)"
    winget install --id $StoreProductId --source msstore --accept-package-agreements --accept-source-agreements
  } else {
    Warn "winget not available. Opening the Microsoft Store page; install Growser, then re-run with -Measure."
    Start-Process "ms-windows-store://pdp/?ProductId=$StoreProductId"
    Die "Growser not installed yet."
  }
  if (-not (Get-GrowserExe)) { Die "Growser did not install where expected. Open it once from the Start menu, then re-run." }
}

function New-Launcher {
  param([string]$Exe)
  $ext = Join-Path $Repo 'extension'
  $launcher = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Growser (webharvester).cmd'
  @"
@echo off
rem Starts Growser with the bundled webharvester extension enabled.
rem Close any running Growser first: a second instance on the same profile ignores the flag.
rem On a Growser build without the bundled extension, use --load-extension="$ext" instead.
start "" "$Exe" --enable-webharvester %*
"@ | Set-Content -Encoding ASCII $launcher
  Log "Launcher written: $launcher"
  Log "Close Growser, then run that file to start it with the extension loaded."
}

function Invoke-Measure {
  if (-not (Have 'node')) { Die "Node.js is required for -Measure. Install Node 22.18+ and retry." }
  # The scripts are .ts files run by node itself: type stripping is on by default only since 22.18 / 23.6.
  if ((node -p 'Boolean(process.features.typescript)') -ne 'true') { Die "Node $(node -v) cannot run TypeScript files. Install Node 22.18+ and retry." }
  if (-not (Have 'npm'))  { Die "npm is required for -Measure." }
  Install-Growser
  $exe = Get-GrowserExe
  New-Launcher -Exe $exe
  Log "Installing project dependencies"
  $report = Join-Path $Repo 'test-results/probe-report.json'
  Push-Location $Repo
  try {
    npm install --no-audit --no-fund
    Assert-Exit 'npm install'
    npm run build-manifest -- --full
    Assert-Exit 'npm run build-manifest -- --full'
    $Env:CHROME_PATH = $exe; $Env:HEADED = '1'
    Remove-Item $report -ErrorAction SilentlyContinue
    # With the full manifest the live tests fail wherever a permission does not work: the report they write is the measurement.
    npm run test:live
    if (-not (Test-Path $report)) { throw "The live run wrote no $report" }
    npm run mark-non-working
    Assert-Exit 'npm run mark-non-working'
    npm run build-manifest
    Assert-Exit 'npm run build-manifest'
    npm run build-guides
    Assert-Exit 'npm run build-guides'
  } finally { Pop-Location }
  Log "Refreshing the installed plugin"
  claude plugin marketplace update $MarketplaceName
  if ($LASTEXITCODE -ne 0) { Warn "Could not refresh the plugin; run: claude plugin marketplace update $MarketplaceName" }
  Log "Done. Guides now reflect $exe."
}

Install-Plugin
if ($Measure) { Invoke-Measure }
Log "All set."
