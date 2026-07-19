# stage-web-for-cap.ps1 — cap sync 前把 web/ 按「单一真源排除清单」staging 到 mobile/www
#
# 背景（关键缺口修复）：capacitor.config.json 旧 webDir="../web" → `cap sync` 整树无排除拷贝，
#   把 _archive/backups/test-results/godot/docs/preview 设计稿… 全塞进 APK assets（1057MB 根因）。
#   改 webDir="www" 后，由本脚本负责先按 scripts/release-excludes.json 剔垃圾再拷，APK 只含运行时。
# 与 build-capgo-bundle.ps1 / build-hot-update-package.js / package.json(asar) 共用同一份 JSON，改一处全对齐。
#
# 用法：cap sync 前跑一次（mobile/package.json 的 `sync` 脚本已串起来）。
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stage-web-for-cap.ps1
param(
  [string]$WebDir = "$PSScriptRoot\..\..\web",
  [string]$WwwDir = "$PSScriptRoot\..\www"
)
$ErrorActionPreference = 'Stop'
$WebDir = (Resolve-Path $WebDir).Path

# 单一真源排除清单
$exPath = Join-Path $PSScriptRoot '..\..\scripts\release-excludes.json'
if (-not (Test-Path $exPath)) { throw "排除清单缺失: $exPath" }
$ex = Get-Content $exPath -Raw -Encoding UTF8 | ConvertFrom-Json  # PS5.1 默认 GBK 读 UTF-8 JSON→中文乱码呛死 ConvertFrom-Json·必须显式 UTF8

# 目录排除(/XD)·扩展名排除(/XF)·均取自单一真源 JSON。
# robocopy /XD /XF 对「精确全路径 / 就地扩展名」最稳；对前缀型通配名不可靠，故前缀走下方枚举→精确路径。
$xd = @($ex.dirs | ForEach-Object { Join-Path $WebDir $_ })   # 顶层命名目录（.git/docs/scripts/tools/godot…）
$xf = @('*.bak*', '*.log', '*.yml', '*.save.json')            # 扩展名垃圾·与 JSON globs 对齐

# 前缀型排除（JSON.prefixes：.bak- / _codex / .git-defunct-）——单一真源新增消费（旧版只吃 dirs，前缀漏网）。
# robocopy /XD 不吃通配（传 ".bak-*" 会漏 .bak-20260101 之类真名）；改为「枚举 web/ 顶层真实匹配的目录/文件·再喂精确全路径」。
# 顶层枚举即可（这些前缀均为仓根级备份/临时/废弃约定）；万一有嵌套漏网，由下方 www 复制后兜底扫再删。
$prefixes = @($ex.prefixes | Where-Object { $_ })
if ($prefixes.Count -gt 0) {
  Get-ChildItem -LiteralPath $WebDir -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $nm = $_.Name
    foreach ($p in $prefixes) {
      if ($nm.StartsWith($p)) {
        if ($_.PSIsContainer) { $xd += $_.FullName } else { $xf += $_.FullName }
        break
      }
    }
  }
}

# www 每次全量重建（防上版残留混进 APK）。-LiteralPath：路径含 []/空格/中文时不被当通配解析。
if (Test-Path -LiteralPath $WwwDir) { Remove-Item -LiteralPath $WwwDir -Recurse -Force }
New-Item -ItemType Directory -Path $WwwDir -Force | Out-Null
$WwwDir = (Resolve-Path -LiteralPath $WwwDir).Path

Write-Host "staging web -> www（按 release-excludes.json 剔垃圾）..." -ForegroundColor Cyan
# $WebDir/$WwwDir 为单一字符串、$xd/$xf 为数组——PowerShell 自动逐元素加引号，空格/中文路径安全（切勿拼成整串）。
robocopy $WebDir $WwwDir /E /NFL /NDL /NJH /NJS /NP /XD $xd /XF $xf | Out-Null
$rc = $LASTEXITCODE   # 立即定格·防被后续任何语句改写
# robocopy 退出码 <8 = 成功（0=无变化,1=已复制,2=有多余,3=1+2…）；>=8 才是真失败。
# 全量重建后正常必是 1（已复制），绝不能把 exit=1 当错——只有 >=8 才 throw。
if ($rc -ge 8) { throw "robocopy 失败·exit=$rc" }

# preview 子目录设计稿/验证截图·与 hot 端 isPreviewMockup / capgo 对齐（否则白夹带 ~300MB 截图）。
# 只剔 shots + *verify*.png；preview/ 其余（img 运行素材、scenario-editor-sandbox-bridge.js 等）保留——是运行时依赖，勿一刀切成「只留 img」。
$pvShots = Join-Path $WwwDir 'preview\shots'
if (Test-Path -LiteralPath $pvShots) { Remove-Item -LiteralPath $pvShots -Recurse -Force -ErrorAction SilentlyContinue }
$pvDir = Join-Path $WwwDir 'preview'
if (Test-Path -LiteralPath $pvDir) {
  Get-ChildItem -LiteralPath $pvDir -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'verify.*\.png$' } | Remove-Item -Force -ErrorAction SilentlyContinue
}

# 前缀垃圾兜底：万一有嵌套漏网（顶层枚举只看仓根），在已清 www 上再扫一遍（目标树已小·廉价）。深路径先删避免父删子亡告警。
if ($prefixes.Count -gt 0) {
  Get-ChildItem -LiteralPath $WwwDir -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $nm = $_.Name; @($prefixes | Where-Object { $nm.StartsWith($_) }).Count -gt 0 } |
    Sort-Object { $_.FullName.Length } -Descending |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

# 体积 + 空壳兜底：全量重建后 www 若零文件，必是源缺失/robocopy 静默失败——挡在打包前，别让空壳进 APK。
$wwwFiles = @(Get-ChildItem -LiteralPath $WwwDir -Recurse -File -ErrorAction SilentlyContinue)
$sz = if ($wwwFiles.Count -gt 0) { [math]::Round(($wwwFiles | Measure-Object Length -Sum).Sum / 1MB, 1) } else { 0 }
Write-Host "  www = $sz MB · $($wwwFiles.Count) files  ($WwwDir)" -ForegroundColor Gray
if ($wwwFiles.Count -eq 0) { throw "staging 失败·www 为空（$WwwDir）——检查 web/ 源与排除清单" }
