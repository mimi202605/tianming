# 天命 · 安卓热更新（Capgo OTA）服务器配套 + 部署指南

> 移植 Phase 3 · 2026-06-03 修订（对齐**实际落地的实现**）。
> 客户端（APK）已接好 `@capgo/capacitor-updater`；本文是**服务器端要做的部分** + 发版流程。
> 服务器没部署之前，APK 用自带版照常能跑，只是收不到 OTA。

## 一、实际怎么工作（**手动 + 静态 latest.json**·非 autoUpdate/PHP）

APK 里的真实配置（`capacitor.config.json`）是 **`autoUpdate:false`（手动模式）**，OTA 检查由
`web/tm-capacitor-boot.js` 自己做——**不需要服务器端任何代码/PHP 端点**，只要托管几个静态文件：

启动流程：
1. 游戏界面起来后调 `CapacitorUpdater.notifyAppReady()` 报「本版健康」（不报 → 20s 后 Capgo 判坏更新自动回滚上一可用版·防变砖）。
2. boot 后约 5s **GET** 静态文件 `https://api.themisfitserspeople.top/tianming/capgo/latest.json`（`cache:no-store`）。
3. 读到 `{ version, url, manifest? }`：若 `version` ≠ 当前版本（新装机=native 版本 `1.0`）→ 下载；
   - 带 `manifest` → 差量（Capgo 按文件 hash 比对·只下没见过的文件）；否则按 `url` 下全量 zip。
4. 下完 `set({id})` → **下次启动切过去生效**。

> ⚠️ `latest.json` 的 `url` 字段必须非空（boot 里 `if(!latest.url) return` 会拦掉）；差量也要给个占位/全量兜底 url。

## 二、部署落点 + 通道（SSH 从开发会话被封 → 走 GitHub 中转·服务器自拉）

桌面会话出口封了裸 SSH，**Claude 这边推不动服务器**。沿用桌面热更同款通道：
**Claude `gh release` 上传 → owner 在服务器（1Panel 终端/VNC）跑一条 `curl` 拉下来落位**。

服务器落位（api.themisfitserspeople.top 这个站的 web 根下）：
```
.../tianming/capgo/latest.json            ← 版本清单（小文件）
.../tianming/capgo/files/<sha256>         ← 按 sha 寻址的文件仓（差量复用·改动文件才新增）
.../tianming/capgo/bundles/<ver>.zip      ← （可选）全量兜底 zip
```
（具体绝对路径以服务器 1Panel 站点根为准·见 `~/.tianming-server-secret.json` / reference_tianming_server_endpoint。）

## 三、发版流程（2026-06-11 起·并入一键发版管线）

> 旧的「手改 latest.json + 手传」流程已被 `scripts/release.js` + `scripts/deploy.py` 取代。
> 总文档见 `web/docs/update-system-upgrade-2026-06.md`。

```powershell
# 一条命令（双端一起·版本盖戳/构建/复验/上传全自动）：
node scripts\release.js --version 1.3.4.0 --notes "..."
#   安卓侧自动产出：<V>.zip（全量兜底）+ <V>-manifest.json + capgo-files-<V>.zip（按线上基线只含新对象）
#   + latest.json（带 manifest 内联·deploy 默认剥掉=安全全量态）
```
owner 服务器一行（runbook 会打出来）：
```
curl -sL https://github.com/misfit-user/tianming/releases/download/ship-<V>/deploy.py -o /tmp/d.py && python3 /tmp/d.py
```
**差量灰度**（自己设备全量验过本版后）：
```
python3 /tmp/d.py --only capgo --enable-manifest      # latest.json 开始带差量清单
python3 /tmp/d.py --only capgo --disable-manifest     # 出问题即时回退（不改版本）
```
deploy.py 自带完备闸：manifest 引用的对象 hash 不全在 `capgo/files/` 时拒发 latest.json。
单独打包（不走 release.js 时）：`build-capgo-bundle.ps1 -Version V -Manifest -PackFiles [-BaselineManifest 上版或线上latest.json]`。

## 四、⚠️ 首更全量的现实（重要）

Capgo 的差量去重是**「OTA 包之间」**比 hash——**自带版(builtin)的文件没进 Capgo 的差量缓存**。
所以**第一次 OTA 大概率会全量拉（~460MB）**，之后 OTA→OTA 才是真差量（改几个 .js = 几 MB）。

含义：
- 首更对玩家是一次性大流量（建议 wifi）。**没有真改动时别为了「激活」而推首更**——白下 460MB 无变化。
- 正确姿势：**有真改动时再触发首更**（那 460MB 顺带把真改动带上·之后就轻了）。
- 彻底治本（OTA 只下代码不下 335MB 立绘/preview）= **资产分发拆分**（Phase 3 未做）：
  把大资产留在 APK / 走独立 CDN·web bundle 只含代码 → OTA 包瘦到几十 MB。建议做完再大规模用 OTA。

## 五、在线功能（已在 APK·**服务器无需额外部署**）

APK 已开 `CapacitorHttp`（原生 HTTP 绕 CORS）。账号登录/注册、工坊浏览走
`TM.OnlineClient` → 原生 fetch → 现有的 `api.themisfitserspeople.top/tianming-api/`。
**沿用现有账号/工坊 API·服务器端零改动**；真机首测确认连得上即可。
工坊**磁盘装包**（下载解压剧本包到 Filesystem）属后续（S1.4·需 capacitor Filesystem 落地）。

## 六、检查清单
- [ ] 真机验在线：账号登录/工坊浏览能否连上 `tianming-api`（**无需服务器动作·现在就能测**）
- [ ] （首个 OTA 测试·可选）打 1.0.1 manifest → gh release → owner 服务器落位 latest.json+files → 真机重启验更新链
- [ ] （目标态·Phase 3）资产分发拆分 → OTA 只下代码（几十 MB）·再切差量常态化
