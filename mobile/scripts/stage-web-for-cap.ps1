# stage-web-for-cap.ps1 — PS5.1-safe wrapper around the shared Node release-tree stage.
# All Unicode JSON parsing, exclusion matching, SHA256 and manifest writing happen
# in Node, avoiding Windows PowerShell 5.1's locale/BOM traps.
param(
  [string]$WebDir = "$PSScriptRoot\..\..\web",
  [string]$WwwDir = "$PSScriptRoot\..\www"
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$stageScript = Join-Path $repoRoot 'scripts\stage-web-release.js'
$officialSync = Join-Path $repoRoot 'web\scripts\sync-official-scenarios.js'
if (-not (Test-Path -LiteralPath $stageScript)) { throw "共享 staging 脚本缺失: $stageScript" }
$source = (Resolve-Path -LiteralPath $WebDir).Path

& node $officialSync
if ($LASTEXITCODE -ne 0) { throw "官方剧本生成失败·exit=$LASTEXITCODE" }
& node $stageScript --repo-root $repoRoot --source $source --target $WwwDir --label mobile-www
if ($LASTEXITCODE -ne 0) { throw "mobile www staging 失败·exit=$LASTEXITCODE" }
