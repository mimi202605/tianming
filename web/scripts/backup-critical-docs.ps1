# tianming·关键 doc 备份脚本
# 用途·防 C 盘满 truncate 时 Edit 操作清零文件
# 触发·手动跑 / Claude Code Stop hook / scheduled task
#
# 备份范围·
#   web/docs/*.md           (sprint plan / spec)
#   scenarios/*.json        (剧本数据)
#   web/manifests/*.json    (热更 manifest)
#   memory/*.md             (Claude memory)
#   主要游戏 JS·tm-tinyi-v3.js / tm-chaoyi-tinyi.js / tm-chaoyi.js / tm-patches.js
#
# 备份目的地·
#   主·D:\tianming-backups\YYYY-MM-DD\
#   fallback·C:\Users\37814\Desktop\tianming-backups\YYYY-MM-DD\
#
# 保留策略·30 天滚动·过期 backup 自动清

$ErrorActionPreference = 'Stop'
$today = Get-Date -Format 'yyyy-MM-dd'
$srcRoot = 'C:\Users\37814\Desktop\tianming'
$memSrc  = 'C:\Users\37814\.claude\projects\C--Users-37814\memory'

# 选择主备份盘
$bakRoot = if (Test-Path 'D:\') { 'D:\tianming-backups' } else { 'C:\Users\37814\Desktop\tianming-backups' }
$dstDir  = Join-Path $bakRoot $today
if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }

# 关键 doc·web/docs/*.md
$docs = Get-ChildItem -Path (Join-Path $srcRoot 'web\docs') -Filter '*.md' -ErrorAction SilentlyContinue
if ($docs) {
    $dstDocs = Join-Path $dstDir 'web-docs'
    if (-not (Test-Path $dstDocs)) { New-Item -ItemType Directory -Force -Path $dstDocs | Out-Null }
    foreach ($d in $docs) { Copy-Item $d.FullName $dstDocs -Force }
    Write-Output ('docs backed up: ' + $docs.Count + ' files')
}

# scenarios·json
$sc = Get-ChildItem -Path (Join-Path $srcRoot 'scenarios') -Filter '*.json' -ErrorAction SilentlyContinue
if ($sc) {
    $dstSc = Join-Path $dstDir 'scenarios'
    if (-not (Test-Path $dstSc)) { New-Item -ItemType Directory -Force -Path $dstSc | Out-Null }
    foreach ($s in $sc) { Copy-Item $s.FullName $dstSc -Force }
    Write-Output ('scenarios backed up: ' + $sc.Count + ' files')
}

# 主要游戏 JS (sprint 主改 file)
$jsFiles = @(
    'web\tm-tinyi-v3.js',
    'web\tm-chaoyi-tinyi.js',
    'web\tm-chaoyi.js',
    'web\tm-chaoyi-changchao.js',
    'web\tm-patches.js'
)
$dstJs = Join-Path $dstDir 'web-js'
if (-not (Test-Path $dstJs)) { New-Item -ItemType Directory -Force -Path $dstJs | Out-Null }
foreach ($jp in $jsFiles) {
    $full = Join-Path $srcRoot $jp
    if (Test-Path $full) { Copy-Item $full $dstJs -Force }
}
Write-Output ('JS backed up: ' + (Get-ChildItem $dstJs).Count + ' files')

# memory·md
$mem = Get-ChildItem -Path $memSrc -Filter '*.md' -ErrorAction SilentlyContinue
if ($mem) {
    $dstMem = Join-Path $dstDir 'memory'
    if (-not (Test-Path $dstMem)) { New-Item -ItemType Directory -Force -Path $dstMem | Out-Null }
    foreach ($m in $mem) { Copy-Item $m.FullName $dstMem -Force }
    Write-Output ('memory backed up: ' + $mem.Count + ' files')
}

# 滚动清·删 30 天前 backup
$cutoff = (Get-Date).AddDays(-30)
$old = Get-ChildItem $bakRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.CreationTime -lt $cutoff }
if ($old) {
    foreach ($o in $old) { Remove-Item $o.FullName -Recurse -Force }
    Write-Output ('old backups cleaned: ' + $old.Count + ' dirs')
}

Write-Output ('backup OK: ' + $dstDir)
