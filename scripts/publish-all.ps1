# publish-all.ps1 - thin wrapper over scripts/release.js (keeps skill `tianming-hotupdate-push` param contract)
# 2026-06-11 S10: real logic lives in release.js (version fan-out + dual builds + gates + gh upload + runbook)
# Usage:
#   powershell -File scripts/publish-all.ps1 -Version 1.3.4.0 -Notes "..." [-MinAppVersion 1.2.1.0]
#       [-CapgoMode full|manifest] [-Push] [-SkipDesktop] [-SkipAndroid] [-WithInstaller]
# NOTE: -Push maps to actually uploading to GitHub; without -Push only builds + stages locally.
param(
  [Parameter(Mandatory=$true)][string]$Version,
  [string]$Notes = '',
  [string]$MinAppVersion = '',
  [ValidateSet('full','manifest')][string]$CapgoMode = 'manifest',
  [switch]$Push,
  [switch]$SkipDesktop,
  [switch]$SkipAndroid,
  [switch]$WithInstaller,
  [switch]$Offline
)
$ErrorActionPreference = 'Stop'
$releaseJs = Join-Path $PSScriptRoot 'release.js'
$args2 = @('--version', $Version)
if ($Notes)          { $args2 += @('--notes', $Notes) }
if ($MinAppVersion)  { $args2 += @('--min-app-version', $MinAppVersion) }
if ($CapgoMode -eq 'full') { $args2 += '--no-delta' }
if (-not $Push)      { $args2 += '--no-upload' }
if ($WithInstaller)  { $args2 += '--with-installer' }
if ($Offline)        { $args2 += '--offline' }
if ($SkipDesktop -or $SkipAndroid) {
  Write-Warning 'release.js builds both ends by design (dual-pipeline discipline: never ship one end only). -SkipDesktop/-SkipAndroid are ignored; use deploy.py --only on the server side for partial publishes.'
}
Write-Host "publish-all -> node release.js $($args2 -join ' ')"
& node $releaseJs @args2
exit $LASTEXITCODE
