# Verify that a staged www/native public tree exactly matches current web/ and
# its .tm-release-manifest.json. Read-only; suitable before Android Studio builds.
param(
  [string]$WebDir = "",
  [string]$TargetDir = "$PSScriptRoot\..\www"
)
$ErrorActionPreference = 'Stop'
function Resolve-TianmingRepoRoot {
  param([string]$ScriptDir = $PSScriptRoot)
  # 以 marker scripts\stage-web-release.js 为准逐级上溯仓根。mobile 是指向 E:\MovedFromC 的 junction，
  # 某些 shell 会把 $PSScriptRoot 解到物理盘 -> $PSScriptRoot\..\.. 落到错处；故先从脚本目录上溯、
  # 命不中再从当前工作目录(这些脚本恒以仓根为 cwd 被调用)上溯，两条都靠 marker 命中即仓根真源。
  $marker = Join-Path 'scripts' 'stage-web-release.js'
  foreach ($start in @($ScriptDir, (Get-Location).Path)) {
    if (-not $start) { continue }
    $dir = $start
    while ($dir) {
      if (Test-Path -LiteralPath (Join-Path $dir $marker)) { return (Resolve-Path -LiteralPath $dir).Path }
      $parent = Split-Path -Parent $dir
      if (-not $parent -or $parent -eq $dir) { break }
      $dir = $parent
    }
  }
  throw "找不到天命仓根(marker=$marker)·PSScriptRoot=$ScriptDir·cwd=$((Get-Location).Path) 逐级上溯均未命中"
}
$repoRoot = Resolve-TianmingRepoRoot
if (-not $WebDir) { $WebDir = Join-Path $repoRoot 'web' }
$stageScript = Join-Path $repoRoot 'scripts\stage-web-release.js'
$source = (Resolve-Path -LiteralPath $WebDir).Path
if (-not (Test-Path -LiteralPath $TargetDir)) { throw "待验证 staging 不存在: $TargetDir" }
& node $stageScript --repo-root $repoRoot --source $source --target $TargetDir --verify --label mobile-www
if ($LASTEXITCODE -ne 0) { throw "staging 校验失败·exit=$LASTEXITCODE" }
