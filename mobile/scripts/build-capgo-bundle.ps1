# build-capgo-bundle.ps1 — 打天命安卓热更 bundle（Capgo OTA·移植 Phase 3）
# 从 web/ 源打成 Capgo bundle，剔除运行时不用的垃圾（同 APK 打包规则）。
#   全量模式:  build-capgo-bundle.ps1 -Version 1.0.1          → capgo-dist\1.0.1.zip
#   差量模式:  build-capgo-bundle.ps1 -Version 1.0.2 -Manifest → capgo-dist\1.0.2.zip（兜底全量·永远要有）
#                                                              + 1.0.2-manifest.json + files\<sha256> 内容寻址库
#   差量打包:  … -Manifest -PackFiles [-BaselineManifest 上版manifest或线上latest.json]
#                                                              → capgo-files-1.0.2.zip（只含基线没有的新对象·上 gh release）
#   机器可读:  差量模式同时落 1.0.2-build.json（zip 大小/清单数/新对象数·release.js 拾取）
# 2026-06-11·S8 升级·差量发布打通（客户端 tm-capacitor-boot.js 早已支持 latest.manifest·一直缺发布侧）
param(
  [Parameter(Mandatory=$true)][string]$Version,
  [string]$WebDir  = "$PSScriptRoot\..\..\web",
  [string]$OutDir  = "$PSScriptRoot\..\capgo-dist",
  [string]$BaseUrl = "https://api.themisfitserspeople.top/tianming/capgo",
  [string]$BaselineManifest = '',
  [switch]$Manifest,
  [switch]$PackFiles
)
$ErrorActionPreference = 'Stop'
$WebDir = (Resolve-Path $WebDir).Path
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path

# JSON 一律无 BOM 写（PS5.1 Out-File utf8 带 BOM·会呛死 node JSON.parse / python json.load）
function Write-JsonNoBom([string]$Path, $Obj) {
  $json = $Obj | ConvertTo-Json -Depth 6
  [System.IO.File]::WriteAllText($Path, $json, (New-Object System.Text.UTF8Encoding($false)))
}

# 1) web → staging·剔除垃圾（与 APK 打包一致：.git/godot/playwright 缓存/测试产物/文档/备份）
$stage = Join-Path $OutDir "_stage-$Version"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Write-Host "复制 web → staging（剔垃圾）..." -ForegroundColor Cyan
# 排除清单取自单一真源 scripts/release-excludes.json（四条管线共用·改一处全对齐；旧硬编码 $cruft 已并入 JSON·并补齐 _codex_tmp/.cache/tmp/dist 等缺项）
$exPath = Join-Path $PSScriptRoot '..\..\scripts\release-excludes.json'
if (-not (Test-Path $exPath)) { throw "排除清单缺失: $exPath" }
$cruft   = (Get-Content $exPath -Raw | ConvertFrom-Json).dirs
$cruftXf = @('*.bak*','*.log','*.yml','*.save.json')   # 扩展名过滤·与 JSON globs 对齐·robocopy /XF 就地剔
robocopy $WebDir $stage /E /NFL /NDL /NJH /NJS /NP /XD ($cruft | ForEach-Object { Join-Path $WebDir $_ }) /XF $cruftXf | Out-Null
Get-ChildItem $stage -Recurse -File | Where-Object { $_.Name -match '\.bak' } | Remove-Item -Force -ErrorAction SilentlyContinue
# 剔 preview 子目录的设计稿/验证截图（保留 preview/img、official-scenarios-bundle.js 等运行素材；与 hot 端 isPreviewMockup 对齐，否则 capgo 白夹带 ~157MB 截图）
$pvShots = Join-Path $stage 'preview\shots'
if (Test-Path $pvShots) { Remove-Item $pvShots -Recurse -Force -ErrorAction SilentlyContinue }
Get-ChildItem (Join-Path $stage 'preview') -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'verify.*\.png$' } | Remove-Item -Force -ErrorAction SilentlyContinue
$sz = [math]::Round((Get-ChildItem $stage -Recurse -File | Measure-Object Length -Sum).Sum/1MB,1)
Write-Host "  staging = $sz MB" -ForegroundColor Gray

# 2) 全量 zip·两种模式都打（差量端点 latest.json 也必须保留 url 兜底——旧客户端只认 url）
$zip = Join-Path $OutDir "$Version.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Write-Host "压缩全量 bundle..." -ForegroundColor Cyan
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
$zipBytes = (Get-Item $zip).Length
$zsz = [math]::Round($zipBytes/1MB,1)
Write-Host "✅ 全量 bundle: $zip  ($zsz MB)" -ForegroundColor Green

if (-not $Manifest) {
  Write-Host "   上传到服务器 $BaseUrl/bundles/$Version.zip · 端点回 {version:'$Version', url:'$BaseUrl/bundles/$Version.zip'}" -ForegroundColor Yellow
} else {
  # 3) 差量: 每文件 sha256 → manifest + 文件落 files\<sha256>（assets 不变→hash 不变→Capgo 跳过不下）
  Write-Host "生成差量 manifest（每文件 sha256）..." -ForegroundColor Cyan
  $filesDir = Join-Path $OutDir 'files'
  New-Item -ItemType Directory -Path $filesDir -Force | Out-Null

  # 基线哈希集·来自线上 latest.json（含 manifest 数组）或上一版 *-manifest.json·没有就空集 = 全新对象
  $baseline = @{}
  if ($BaselineManifest) {
    if (-not (Test-Path $BaselineManifest)) { throw "BaselineManifest 不存在: $BaselineManifest" }
    $bmRaw = Get-Content $BaselineManifest -Raw
    $bm = $bmRaw | ConvertFrom-Json
    $bArr = @()
    if ($bm.PSObject.Properties['manifest']) { $bArr = $bm.manifest }
    elseif ($bm -is [array]) { $bArr = $bm }
    foreach ($e in $bArr) {
      if ($e.file_hash) { $baseline[([string]$e.file_hash).ToLower()] = $true }
    }
    Write-Host "  基线对象 $($baseline.Count) 个（$BaselineManifest）" -ForegroundColor Gray
  }

  $entries = New-Object System.Collections.Generic.List[object]
  $newHashes = New-Object System.Collections.Generic.List[string]
  $newBytes = [long]0
  Get-ChildItem $stage -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($stage.Length).TrimStart('\','/').Replace('\','/')
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
    $dst = Join-Path $filesDir $hash
    if (-not (Test-Path $dst)) { Copy-Item $_.FullName $dst -Force }
    $entries.Add([ordered]@{ file_name = $rel; file_hash = $hash; download_url = "$BaseUrl/files/$hash" })
    if (-not $baseline.ContainsKey($hash) -and -not $newHashes.Contains($hash)) {
      $newHashes.Add($hash)
      $newBytes += $_.Length
    }
  }
  $manifestObj = [ordered]@{ version = $Version; manifest = $entries }
  $mfPath = Join-Path $OutDir "$Version-manifest.json"
  Write-JsonNoBom $mfPath $manifestObj
  Write-Host "✅ 差量 manifest: $mfPath  ($($entries.Count) 文件·相对基线新对象 $($newHashes.Count) 个·$([math]::Round($newBytes/1MB,1)) MB)" -ForegroundColor Green

  # 4) -PackFiles·把「基线没有的新对象」打成一个 zip（条目名=sha256·服务器解到 capgo/files/ 即落位）
  $packPath = Join-Path $OutDir "capgo-files-$Version.zip"
  if (Test-Path $packPath) { Remove-Item $packPath -Force }
  if ($PackFiles) {
    if ($newHashes.Count -gt 0) {
      Write-Host "打包新对象 → capgo-files-$Version.zip ..." -ForegroundColor Cyan
      $packList = $newHashes | ForEach-Object { Join-Path $filesDir $_ }
      Compress-Archive -Path $packList -DestinationPath $packPath -CompressionLevel Optimal
      Write-Host "✅ 新对象包: $packPath  ($([math]::Round((Get-Item $packPath).Length/1MB,1)) MB·$($newHashes.Count) 对象)" -ForegroundColor Green
    } else {
      Write-Host "  相对基线零新对象·不打 capgo-files 包" -ForegroundColor Gray
    }
  }

  # 5) 机器可读构建摘要·release.js 拾取（zip 大小给 latest.json 的 size 字段等）
  $buildInfo = [ordered]@{
    version       = $Version
    zip           = "$Version.zip"
    zipBytes      = $zipBytes
    manifestFile  = "$Version-manifest.json"
    manifestCount = $entries.Count
    packedFile    = $(if ($PackFiles -and $newHashes.Count -gt 0) { "capgo-files-$Version.zip" } else { '' })
    packedCount   = $newHashes.Count
    packedBytes   = $newBytes
    baseUrl       = $BaseUrl
    generatedAt   = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  }
  Write-JsonNoBom (Join-Path $OutDir "$Version-build.json") $buildInfo
  Write-Host "   上传 capgo-files-$Version.zip + $Version.zip + latest.json（release.js 合成）→ gh release" -ForegroundColor Yellow
  Write-Host "   assets 不变的文件 sha 与上版相同 → Capgo 自动跳过 → 只下改动的几 MB" -ForegroundColor Yellow
}
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
