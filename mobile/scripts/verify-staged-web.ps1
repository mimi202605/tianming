# Verify that a staged www/native public tree exactly matches current web/ and
# its .tm-release-manifest.json. Read-only; suitable before Android Studio builds.
param(
  [string]$WebDir = "$PSScriptRoot\..\..\web",
  [string]$TargetDir = "$PSScriptRoot\..\www"
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$stageScript = Join-Path $repoRoot 'scripts\stage-web-release.js'
$source = (Resolve-Path -LiteralPath $WebDir).Path
if (-not (Test-Path -LiteralPath $TargetDir)) { throw "待验证 staging 不存在: $TargetDir" }
& node $stageScript --repo-root $repoRoot --source $source --target $TargetDir --verify --label mobile-www
if ($LASTEXITCODE -ne 0) { throw "staging 校验失败·exit=$LASTEXITCODE" }
