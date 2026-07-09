# verify-staging-dryrun.ps1 — 只读·不复制·预演 stage-web-for-cap.ps1 会排除什么、www 多大、有没有误伤运行时。
#
# 三问（纯只读·不写任何文件·不动 www）：
#   (a) 哪些顶层目录会被剔、各多大；
#   (b) staging 后 www 预估体积（逐文件套 stage 同款排除规则求存活合计·并按类给出剔除明细）；
#   (c) 反向安全检查：web/index.html 的 <script src>/<link href> 引用，有没有落进排除清单
#       （= 会漏拷运行时文件·APK 白屏）——红牌逐条列出。这条最关键：防排除清单误伤运行时。
#
# 与 stage-web-for-cap.ps1 / scripts/release-excludes.json 同源同规则。跑法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-staging-dryrun.ps1
# 退出码：有红牌=2（可供发版脚本 gate）；干净=0。
param(
  [string]$WebDir    = "$PSScriptRoot\..\..\web",
  [string]$IndexHtml = "$PSScriptRoot\..\..\web\index.html"
)
$ErrorActionPreference = 'Stop'
$WebDir = (Resolve-Path -LiteralPath $WebDir).Path

# 单一真源排除清单
$exPath = Join-Path $PSScriptRoot '..\..\scripts\release-excludes.json'
if (-not (Test-Path -LiteralPath $exPath)) { throw "排除清单缺失: $exPath" }
$ex = Get-Content -LiteralPath $exPath -Raw | ConvertFrom-Json
$exDirs     = @($ex.dirs)
$exPrefixes = @($ex.prefixes | Where-Object { $_ })

# —— 与 stage 脚本同款「单个文件是否会被排除」判定（rel = 相对 web/ 的路径）——
# 规则镜像 stage：顶层命名目录(/XD 顶层) · 任意层级前缀(/XD 顶层+ www 递归兜底) · 扩展名垃圾(/XF) · preview shots+verify(复制后剔)。
function Test-Excluded([string]$rel) {
  $r = $rel -replace '\\', '/'
  $segs  = $r -split '/'
  $fname = $segs[-1]
  # 顶层命名目录
  if ($segs.Count -gt 1 -and ($exDirs -contains $segs[0])) { return "顶层排除目录:$($segs[0])" }
  # 任意层级：目录名或文件名前缀
  foreach ($seg in $segs) { foreach ($p in $exPrefixes) { if ($seg.StartsWith($p)) { return "前缀排除:$p" } } }
  # 扩展名垃圾
  if ($fname -like '*.bak*' -or $fname -like '*.log' -or $fname -like '*.yml' -or $fname -like '*.save.json') { return '扩展名垃圾' }
  # preview 设计稿 / 验证截图（stage 复制后剔·与 hot 端 isPreviewMockup 对齐）
  if ($r -like 'preview/shots/*') { return 'preview/shots' }
  if ($segs[0] -eq 'preview' -and $fname -match 'verify.*\.png$') { return 'preview/verify.png' }
  return $null
}

Write-Host ""
Write-Host "════════ staging dry-run（只读）· web = $WebDir ════════" -ForegroundColor Cyan

# ───────────── (a) 顶层目录 · 排除/保留 · 体积 ─────────────
Write-Host ""
Write-Host "── (a) 顶层目录 · 判定 · 体积 ──" -ForegroundColor Yellow
$rowsA = foreach ($d in (Get-ChildItem -LiteralPath $WebDir -Directory -Force -ErrorAction SilentlyContinue)) {
  $nm = $d.Name
  $ff = @(Get-ChildItem -LiteralPath $d.FullName -Recurse -File -Force -ErrorAction SilentlyContinue)
  $mb = if ($ff.Count -gt 0) { [math]::Round(($ff | Measure-Object Length -Sum).Sum / 1MB, 2) } else { 0 }
  $isEx = ($exDirs -contains $nm) -or (@($exPrefixes | Where-Object { $nm.StartsWith($_) }).Count -gt 0)
  [pscustomobject]@{ Dir = $nm; MB = $mb; Files = $ff.Count; Verdict = $(if ($isEx) { 'X EXCLUDE' } else { 'keep' }) }
}
$rowsA | Sort-Object Verdict, @{Expression = 'MB'; Descending = $true } | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
$exDirMB = ($rowsA | Where-Object { $_.Verdict -like '*EXCLUDE*' } | Measure-Object MB -Sum).Sum
Write-Host ("  顶层被排除目录合计 ≈ {0} MB" -f [math]::Round($exDirMB, 1)) -ForegroundColor Gray

# ───────────── (b) www 预估体积（逐文件求存活）─────────────
Write-Host ""
Write-Host "── (b) staging 后 www 预估体积 ──" -ForegroundColor Yellow
$allFiles   = @(Get-ChildItem -LiteralPath $WebDir -Recurse -File -Force -ErrorAction SilentlyContinue)
$totalBytes = [long]0; $keepBytes = [long]0; $keepCount = 0; $dropCount = 0
$dropByReason = @{}
foreach ($f in $allFiles) {
  $rel = $f.FullName.Substring($WebDir.Length).TrimStart('\', '/')
  $totalBytes += $f.Length
  $why = Test-Excluded $rel
  if ($why) {
    $dropCount++
    if (-not $dropByReason.ContainsKey($why)) { $dropByReason[$why] = @{ n = 0; b = [long]0 } }
    $dropByReason[$why].n++; $dropByReason[$why].b += $f.Length
  } else {
    $keepBytes += $f.Length; $keepCount++
  }
}
Write-Host ("  web 总计      : {0,8:N1} MB · {1} files" -f ($totalBytes / 1MB), $allFiles.Count)
Write-Host ("  预估 www 保留 : {0,8:N1} MB · {1} files   （剔除 {2} files）" -f ($keepBytes / 1MB), $keepCount, $dropCount) -ForegroundColor Green
if ($dropByReason.Count -gt 0) {
  Write-Host "  剔除分类（按体积降序）："
  foreach ($k in ($dropByReason.Keys | Sort-Object { $dropByReason[$_].b } -Descending)) {
    Write-Host ("    {0,-26} {1,8:N1} MB · {2} files" -f $k, ($dropByReason[$k].b / 1MB), $dropByReason[$k].n) -ForegroundColor Gray
  }
}

# ───────────── (c) 反向安全检查 · index.html 运行时引用 vs 排除清单 ─────────────
Write-Host ""
Write-Host "── (c) 反向安全检查 · index.html <script src>/<link href> 是否被误排 ──" -ForegroundColor Yellow
if (-not (Test-Path -LiteralPath $IndexHtml)) { throw "index.html 缺失: $IndexHtml" }
$html = Get-Content -LiteralPath $IndexHtml -Raw
$refs = New-Object System.Collections.Generic.List[string]
foreach ($m in [regex]::Matches($html, '(?:\s)(?:src|href)\s*=\s*["'']([^"''#]+)["'']')) {
  $refs.Add($m.Groups[1].Value)
}
$red = @(); $subCount = 0; $checked = @{}
foreach ($ref0 in $refs) {
  $ref = ($ref0 -split '[?#]')[0].Trim()
  if ($ref -eq '') { continue }
  if ($ref -match '^(?:[a-zA-Z][a-zA-Z0-9+.\-]*:|//)') { continue }   # http(s): / data: / //cdn 等绝对引用·跳过
  $rel = ($ref -replace '\\', '/')
  $rel = $rel -replace '^\./', ''
  $rel = $rel.TrimStart('/')
  if ($rel -eq '' -or $checked.ContainsKey($rel)) { continue }
  $checked[$rel] = $true
  if ($rel -match '/') { $subCount++ }
  $why = Test-Excluded $rel
  $onDisk = Test-Path -LiteralPath (Join-Path $WebDir ($rel -replace '/', '\'))
  if ($why) {
    $red += [pscustomobject]@{ Ref = $rel; Reason = $why; OnDisk = $(if ($onDisk) { 'exists' } else { 'MISSING' }) }
  } elseif (-not $onDisk) {
    Write-Host ("  ⚠ 引用存活但磁盘缺文件（非排除问题·或动态生成）: {0}" -f $rel) -ForegroundColor DarkYellow
  }
}
Write-Host ("  已核 index.html 运行时引用 {0} 条（其中子目录型 {1} 条·顶层裸文件不受目录排除影响）" -f $checked.Count, $subCount)
if ($red.Count -eq 0) {
  Write-Host "  绿牌 OK：无任何 index.html 运行时引用落入排除清单——排除规则未误伤运行时。" -ForegroundColor Green
} else {
  Write-Host "  红牌 !!! 以下运行时引用会被 staging 剔除 → APK 将缺文件/白屏，必须修排除清单或改引用：" -ForegroundColor Red
  $red | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
}

Write-Host ""
Write-Host "════════ dry-run 完 · 未改动任何文件 / 未动 www ════════" -ForegroundColor Cyan
if ($red.Count -gt 0) { exit 2 } else { exit 0 }
