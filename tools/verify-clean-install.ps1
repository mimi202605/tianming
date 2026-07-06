<#
  verify-clean-install.ps1 — 天命"旧版是否清除干净"验证程序（2026-07-04·owner；codex 审后加固）

  用途：在测试机上装完新安装包后运行·核实
    ① 机器上同 productName 的安装只剩「一份」（旧版已被 electron-builder 卸载逻辑卸干净）；
    ② 剩下这份的 DisplayVersion = 预期新版本（没被旧版覆盖/共存误导）；
    ③ 各注册项的 InstallLocation 目录真实存在（没有"注册表残留但目录已删"的幽灵）。

  ★codex 审后修正：
    - ExpectedVersion 缺省时自动从 package.json 的 `version`（三段 semver）读取——electron-builder
      写进卸载注册表的 DisplayVersion 就是它（非四段 buildVersion）。故不传参也会校版本，不再"有一份就过"。
    - DisplayName 实际是 `${productName} ${version}`（如"天命 1.3.405"），故按「等于 productName 或以 'productName ' 开头」精确匹配，不再靠 *模糊*。
    - HKLM 用 OpenBaseKey 显式枚举 Registry64 + Registry32 两视图·避免 32 位 PowerShell 的注册表重定向漏 64 位卸载项。

  用法：
    powershell -ExecutionPolicy Bypass -File tools\verify-clean-install.ps1
    powershell -ExecutionPolicy Bypass -File tools\verify-clean-install.ps1 -ProductName "天命" -ExpectedVersion "1.3.405"

  退出码：0 = 干净（恰好一份·且版本匹配·目录存在）；1 = 不干净（多份/幽灵/版本不符/未安装）。
#>

param(
  [string]$ProductName = "天命",
  [string]$ExpectedVersion = ""
)

$ErrorActionPreference = "Stop"

# ExpectedVersion 缺省 → 从 package.json 的三段 semver 读（= 注册表 DisplayVersion）
if ([string]::IsNullOrWhiteSpace($ExpectedVersion)) {
  try {
    $pkgPath = Join-Path (Split-Path -Parent $PSScriptRoot) "package.json"
    if (Test-Path $pkgPath) {
      $pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($pkg.version) { $ExpectedVersion = [string]$pkg.version }
    }
  } catch { }
}

$UNINSTALL_SUB = "Software\Microsoft\Windows\CurrentVersion\Uninstall"
$found = New-Object System.Collections.Generic.List[object]

function Scan-Root([Microsoft.Win32.RegistryHive]$hive, [Microsoft.Win32.RegistryView]$view, [string]$label) {
  $base = $null; $sub = $null
  try {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, $view)
    $sub  = $base.OpenSubKey($UNINSTALL_SUB)
    if ($null -eq $sub) { return }
    foreach ($name in $sub.GetSubKeyNames()) {
      $k = $null
      try {
        $k = $sub.OpenSubKey($name)
        if ($null -eq $k) { continue }
        $dn = [string]$k.GetValue("DisplayName")
        if ([string]::IsNullOrEmpty($dn)) { continue }
        # 精确：等于 productName·或以 "productName " 开头（electron-builder = "天命 1.3.405"）
        if ($dn -eq $ProductName -or $dn.StartsWith($ProductName + " ")) {
          $loc = [string]$k.GetValue("InstallLocation")
          $found.Add([pscustomobject]@{
            DisplayName     = $dn
            DisplayVersion  = [string]$k.GetValue("DisplayVersion")
            InstallLocation = $loc
            View            = $label
            RegKey          = $name
            UninstallString = [string]$k.GetValue("UninstallString")
            LocationExists  = ($loc) -and (Test-Path $loc)
          })
        }
      } finally { if ($k) { $k.Close() } }
    }
  } finally { if ($sub) { $sub.Close() }; if ($base) { $base.Close() } }
}

Scan-Root ([Microsoft.Win32.RegistryHive]::CurrentUser)  ([Microsoft.Win32.RegistryView]::Registry64) "HKCU"
Scan-Root ([Microsoft.Win32.RegistryHive]::LocalMachine) ([Microsoft.Win32.RegistryView]::Registry64) "HKLM64"
Scan-Root ([Microsoft.Win32.RegistryHive]::LocalMachine) ([Microsoft.Win32.RegistryView]::Registry32) "HKLM32"

Write-Host "===== 天命·旧版清除验证 =====" -ForegroundColor Cyan
Write-Host ("productName = {0}   expectedVersion = {1}" -f $ProductName, ($(if($ExpectedVersion){$ExpectedVersion}else{"(未取到)"})))
Write-Host ("匹配到的安装条目：{0} 份" -f $found.Count)
Write-Host ""

$idx = 0
foreach ($f in $found) {
  $idx++
  $ghost = if ($f.LocationExists) { "" } else { "  (!) InstallLocation 不存在(注册表幽灵)" }
  Write-Host ("[{0}] {1}  版本={2}  [{3}]" -f $idx, $f.DisplayName, ($(if($f.DisplayVersion){$f.DisplayVersion}else{"?"})), $f.View)
  Write-Host ("     位置={0}{1}" -f ($(if($f.InstallLocation){$f.InstallLocation}else{"(空)"})), $ghost)
}
Write-Host ""

# ── 判定 ──
$problems = New-Object System.Collections.Generic.List[string]

if ($found.Count -eq 0) {
  $problems.Add("未找到任何安装条目 → 未安装，或 productName 不符（当前查的是 '$ProductName'）。")
}
elseif ($found.Count -gt 1) {
  $problems.Add("检测到 $($found.Count) 份安装 → 旧版未清除干净（新旧共存）。这正是'装新版打开是旧版'的元凶：旧版卸载没生效，或装到了不同目录/不同注册视图。")
}

$ghosts = @($found | Where-Object { -not $_.LocationExists })
if ($ghosts.Count -gt 0) {
  $problems.Add("$($ghosts.Count) 个注册表幽灵条目（InstallLocation 不存在）→ 卸载没清干净注册表。")
}

if (-not [string]::IsNullOrWhiteSpace($ExpectedVersion) -and $found.Count -ge 1) {
  $verMatch = @($found | Where-Object { $_.DisplayVersion -eq $ExpectedVersion })
  if ($verMatch.Count -eq 0) {
    $vers = ($found | ForEach-Object { $_.DisplayVersion }) -join ", "
    $problems.Add("没有任何一份的版本 = 预期 '$ExpectedVersion'（实际见到：$vers）→ 装上的不是新版本，或版本号没随发版 bump。")
  }
} elseif ([string]::IsNullOrWhiteSpace($ExpectedVersion)) {
  $problems.Add("未能确定预期版本（既没传 -ExpectedVersion 也没从 package.json 读到）→ 无法核验装的是不是新版·请显式传 -ExpectedVersion。")
}

if ($problems.Count -eq 0) {
  Write-Host "结果：✔ 干净 —— 恰好一份安装·版本 $ExpectedVersion 匹配·InstallLocation 存在。" -ForegroundColor Green
  exit 0
} else {
  Write-Host "结果：✘ 不干净" -ForegroundColor Red
  foreach ($pb in $problems) { Write-Host ("  - " + $pb) -ForegroundColor Red }
  exit 1
}
