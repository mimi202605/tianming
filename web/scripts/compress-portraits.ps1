# compress-portraits.ps1
# 肖像降采样工具（移植 Phase 0 / perf §6 决定性项·2026-06-03）
# 用 Windows 自带 System.Drawing（无需 ImageMagick/sharp）把肖像 PNG 降到 max 640px。
# 非破坏：读 -SrcDir，写 -OutDir（默认 *-min），原图零触碰。只缩不放，镜像子目录。
# 用法：powershell -ExecutionPolicy Bypass -File scripts\compress-portraits.ps1
#   可选：-SrcDir <路径> -OutDir <路径> -MaxEdge 640
param(
  [string]$SrcDir = "$PSScriptRoot\..\assets\portraits\tianqi7",
  [string]$OutDir = "$PSScriptRoot\..\assets\portraits\tianqi7-min",
  [int]$MaxEdge = 640
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$SrcDir = (Resolve-Path $SrcDir).Path
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path

$files = Get-ChildItem -Path $SrcDir -Recurse -Filter *.png -File
$totBefore = 0L; $totAfter = 0L; $n = 0; $copied = 0; $resized = 0

foreach ($f in $files) {
  $rel = $f.FullName.Substring($SrcDir.Length).TrimStart('\','/')
  $dst = Join-Path $OutDir $rel
  $dstParent = Split-Path $dst -Parent
  if (-not (Test-Path $dstParent)) { New-Item -ItemType Directory -Path $dstParent -Force | Out-Null }

  $img = [System.Drawing.Image]::FromFile($f.FullName)
  try {
    $scale = [math]::Min($MaxEdge / $img.Width, $MaxEdge / $img.Height)
    if ($scale -ge 1) {
      # 已经够小：原样复制（不放大、不重压）
      $img.Dispose(); $img = $null
      Copy-Item $f.FullName $dst -Force
      $copied++
    } else {
      $nw = [int][math]::Round($img.Width * $scale)
      $nh = [int][math]::Round($img.Height * $scale)
      $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.DrawImage($img, 0, 0, $nw, $nh)
      $g.Dispose()
      $img.Dispose(); $img = $null
      $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
      $bmp.Dispose()
      $resized++
    }
  } finally {
    if ($img) { $img.Dispose() }
  }
  $totBefore += $f.Length
  $totAfter += (Get-Item $dst).Length
  $n++
}

"==== compress-portraits ===="
"源目录 : $SrcDir"
"出目录 : $OutDir"
"处理   : $n 张  (降采样 $resized · 原样复制 $copied)"
"压前   : $([math]::Round($totBefore/1MB,1)) MB"
"压后   : $([math]::Round($totAfter/1MB,1)) MB"
if ($totBefore -gt 0) { "节省   : $([math]::Round((1 - $totAfter/$totBefore)*100,1)) %" }
