# verify-staging-dryrun.ps1 — PS5.1-safe, read-only release-tree audit.
param(
  [string]$WebDir = "$PSScriptRoot\..\..\web"
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$stageScript = Join-Path $repoRoot 'scripts\stage-web-release.js'
$source = (Resolve-Path -LiteralPath $WebDir).Path
& node $stageScript --repo-root $repoRoot --source $source --dry-run --label mobile-www
exit $LASTEXITCODE
