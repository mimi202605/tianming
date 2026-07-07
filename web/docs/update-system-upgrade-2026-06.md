# 更新功能全面升级 · 2026-06-11

> 一句话：更新系统从「邸报驱动手动更新 + 安卓每次 500MB + 每版手写部署脚本」升级为
> 「三端自动发现 + 断点续传/自愈内核 + 安卓差量 + 一条命令发版」，并把更新 UI 全面御案化。
> 本文是总图 + runbook + kill-switch 手册。所有改动均未 ship，等 owner 验收。

---

## 〇、为什么玩家报「更新失败 / 404」（2026-06-11 实测诊断）

实测线上服务器，**根因 = 服务器上的更新源文件全是占位残缺版**（`"..."` 模板从没被真内容覆盖）：

| URL | 状态 | 问题 |
|---|---|---|
| `tianming/releases/win/latest.yml` | **HTTP 404** | 本体安装包通道——玩家旧客户端「自动下载并安装」走这条，日志里的 404 就是它 |
| `tianming/hot/hot-latest.json` | 200 | `size:0`、无 sha256/manifestUrl/filesBaseUrl，增量根本没开 |
| `tianming/capgo/latest.json` | 124 字节 | `url:"https://..."` 占位符，安卓下载必崩 |
| `tianming/changelog.json` | 158 字节 | `title/notes` 全是 `"..."`，邸报空壳 |

玩家日志 `v系统将自动…`（版本号空了）= 玩家机器跑的是 **1.2.8.9 旧热更前端**的更新器 bug。
**治本 = 用新发版管线（release.js 自动盖戳 + deploy.py 三重校验 + 构建器 GATE）重发一版真内容覆盖占位 feed**。
新管线天然杜绝这类残缺 feed（GATE-2 完整性闸 + deploy 完备闸 + 版本戳一致闸），但要 ship 才生效。

---

## 一、玩家侧体验（三端）

| 端 | 之前 | 现在 |
|---|---|---|
| **桌面 Electron** | 邸报有未读才弹窗，玩家点「应用更新」才更新；changelog 没同步或点了已阅就发现不了新版 | 启动 8s 后台**版本驱动**自检（`tm-desktop-update.js`），发现新版弹御案金卡（`tm-update-card.js`）：「立即更新 / 查看更新内容」→ 实时进度（增量按文件数+字节）→「立即重启生效」。6 小时周期复查。邸报照常，只管公告 |
| **安卓 Capacitor** | 自动检查已有（金卡进度）·但每次 OTA 全量 ~500MB | 客户端零改动（纪律：OTA 链路不碰）。服务器端可灰度开**差量**：`latest.json` 带 `manifest` 后只下变动文件（几 MB）。首次差量≈全量体积但逐文件断点可续 |
| **在线版 github.io** | 无任何更新提示，停留旧会话不自知 | `tm-online-update.js` 仅 web 端启用：20s 首查 + 30min 周期 + 切回标签页复查，同源拉 `version.json?t=时间戳`，远端更高弹「线上新版已颁·立即刷新/稍后」横幅。绝不自动刷新（防局中丢进度） |
| **本体安装包** | 代码链路在但服务器 `/releases/win/` 停在 1.2.2 空转 | 热更 feed 可标 `minAppVersion` → 客户端判 `needsInstaller` → 更新卡直接走「下载安装包 → 安装并重启」（electron-updater + blockmap 差量）。发版管线把 `latest.yml+exe+blockmap` 喂到服务器 |

footer 版本号从 `<meta name="tm-version">` 自动同步（`#tm-foot-ver`），发版工具盖戳，从此不再手改。

### 一·补：更新 UI 御案化（2026-06-11·对齐游戏正式 UI）

owner 反馈旧更新 UI「粗糙、没美感、和游戏 UI 不搭」。核实：游戏正式皮肤（`body.tm-phase8-formal` 御案，已 ship 默认）用 **楷体 STKaiti + 朱批(朱红)主按钮 + 圆形朱印 + 宣纸暖纹**；而初版更新卡用的是宋体 + 金色主按钮 + 菱形印，孤立不搭。已四刀对齐御案锚（取自 `phase8-formal-drafts.js` 真实色值）：

| 文件 | 改动 | 备份 |
|---|---|---|
| `tm-update-card.js` | 整卡重皮：楷体字族、暖褐漆木底+宣纸纹+左缘朱砂、**主按钮金→朱红**、菱形印→**圆形朱印「更」**、版本徽朱印、金里透朱进度条 | `.bak-yuan-20260611` |
| `tm-content-manager.js` | 邸报「应用更新」模态 `.tm-update-box/.tm-update-title` 补楷体 + 标题圆朱印「更」（模态本就朱金御案味，这下齐） | `.bak-yuan-20260611` |
| `tm-online-mall.css` | 更新中心 `.uh-ic` 改圆形朱印、可用态 hero 左缘朱砂封条（轻触，不破坏 mall 自有美学） | `.bak-yuan-20260611` |
| `tm-online-update.js` | 在线横幅御案化：楷体、**立即刷新金→朱红**、圆朱印「颁」、左缘朱砂 | （随 S6 改） |

御案锚（所有更新 UI 共用）：字体 `"STKaiti","KaiTi","楷体"`；底 `linear-gradient(rgba(28,21,15,.985),rgba(9,7,6,.99))`；金线 `rgba(201,160,69,.42)`；朱批主按钮 `linear-gradient(rgba(150,59,41,.96),rgba(58,23,18,.97))`+`#ffe7c2`；圆朱印 `radial-gradient(circle,rgba(154,47,34,.55),rgba(64,31,20,.85))`+金边。playwright 实截：更新卡四态 + 在线横幅与御案参照面板**同一视觉家族**（圆朱印 vs 圆印、朱批按钮 vs 朱批按钮）。

## 二、内核鲁棒性（main-impl.js）

- **重试+断点续传**：`downloadRemoteFile` 支持 `{retries, resume}`。大 zip 写 `.part`，断网重试发 `Range: bytes=N-`；服务器无视 Range 回 200 → 自动从头；416 → 删坏 `.part` 重来。哈希流式（大包不再整读进内存）。
- **增量并发**：变动文件 4 路并发下载（feed `flags.maxConcurrency` 可调），单文件重试 3 次，进度事件新增 `bytesDone/fetchBytes`（字节级百分比）。
- **磁盘预检**：下载前 `statfs` 查剩余空间（增量 2×、全量 3×需求），不足给友好错误，不再下到一半 ENOSPC。
- **`__dirname` 锚点病根治**（重要）：热更 `_app_main.js` 下 `__dirname`=热更目录，导致 preload shim/zip 兜底基线/版本读取/stale 回退全指错位置。已统一锚到 `bundledAppRoot()`（=`app.getAppPath()`）。`main.js` shim 加版本闸：安装包升级后旧热更（stale）不再被加载。
- **自基线重建**（2026-07-07·S11）：manifest 增量与全 zip 之间加第二道增量——老安装无 `.hot-update-manifest.json`、本地 manifest 失真、增量中途失败时，不信任何本地账本，对着新 manifest 逐文件现算本地 sha（currentDir 优先·安装包内 web/ 兜底），命中复用、未命中按 sha 仓补下。兜底顺序变为 `manifest 增量 → 自基线重建 → 全 zip`，全 zip 从常见路径降级为灾难兜底。kill-switch：feed `flags.disableRebaseline`。验证 `web/scripts/verify-hotupdate-rebaseline.js`（25 断言）。

## 三、自愈（更新系统是唯一坏了没法用更新修自己的系统）

启动序列（仅 packaged 生效，dev 共用 userData 不碰玩家状态）：

1. **`repairHotUpdateState()`**：状态文件损坏→留尸重建；`currentDir` 失效→promote previous 或回 bundled；stale→清引用。修了什么记 `state.lastRepair`，渲染层一次性 toast「更新已自动恢复至可用版本」。状态写全部原子化（tmp+rename）。
2. **崩溃环自禁**：`boot-attempt.json` 计数，同一热更版本连续 ≥2 次没到健康点（ready-to-show+5s 无渲染层致命事件；干净退出也算健康）→ `enabled:false` 自动停用热更回安装包内置——**所有旧 shim 都认 `enabled:false`**，等于给历史上每个安装包都补了救生圈。
3. **磁盘卫生**：启动 15s 后清 current/previous 之外的旧版本目录、>1h 的 staging 残骸、装完即弃的 zip、>7 天的 `.part`。

## 四、服务器端 kill-switch（`hot-latest.json` 加 `flags`，旧客户端忽略）

```json
"flags": {
  "forceFullZip": true,      // 增量链路出问题 → 全员回 zip 全包
  "maxConcurrency": 1,       // 并发下载出问题 → 降回串行
  "disableAutoCheck": true,  // 自动检查/弹卡出问题 → 全员静默（手动检查仍可用）
  "disableSelfHeal": true,   // 崩溃环误判 → 只记录不自禁
  "disableRebaseline": true  // 2026-07-07·自基线重建出问题 → 跳过·按旧序直落 zip 兜底
}
```
改服务器 JSON 即时生效，无须发版。`minAppVersion` 也提升到 feed 层（下载前即判 needsInstaller）。

## 五、发布管线（一条命令）

```
1) 写 web/changelog.json 顶条目（module 以版本号开头）          [人]
2) node scripts/release.js --version 1.3.4.0 --notes "..."      [一条命令]
     [--with-installer]  [--min-app-version X]  [--no-delta]  [--no-upload]
   = ①版本闸(单调+versionCode) ②changelog闸 ③线上版本闸
     ④版本扇出盖戳6处(package.json×4/gradle×2/version.json/index.html meta+footer·各留.bak)
     ⑤桌面构建(构建器自带GATE0-6) ⑥首装增量基线刷新(web/.hot-update-manifest.json·治1.3.3.4腐坏沉疴)
     ⑦安卓构建(全量zip+差量manifest+按线上基线只打新对象包)
     ⑧制品独立复验(scripts/lib/verify-artifacts.js·不信构建器)
     ⑨⑩staging+deploy.py按版补丁+runbook生成 ⑪gh release上传+资产审计(漏一个报死)
3) owner 服务器一行：
   curl -sL https://github.com/misfit-user/tianming/releases/download/ship-1.3.4.0/deploy.py -o /tmp/d.py && python3 /tmp/d.py
4) 源码 push GitHub main 照旧（在线版玩家收「线上新版已颁」提示）
```

`scripts/publish-all.ps1` 是兼容 skill 参数的薄包装。`scripts/deploy.py` 取代每版手写 deploy-XXXX.py：
流式下载/sha·sha512·size 三重校验/全原子写+.bak/「内容先 feed 最后」防 404 竞态/版本单调闸/
capgo manifest 完备闸（缺对象拒发）/幂等重跑/`--dry-run`/`--only`/`--force`。

### 构建器闸门（1.3.3.4 假更新事故类全堵死）

- GATE-0：`--files` 部分清单模式默认禁用（事故根源）
- GATE-2：必含文件 + **index.html 引用闭包 ⊆ 清单**
- GATE-3：版本单调 GATE-4：zip↔manifest 双向对账 GATE-5：版本戳一致 GATE-6：体积理智线
- 服务器侧 deploy.py 再验一遍 manifest⊆zip（ABORT_INCOMPLETE）——三道防线

## 六、安卓差量灰度 runbook（owner 配合一次真机验证）

```
第一步（安全态·和今天一样）：正常发版 → latest.json 不带 manifest（deploy 默认剥掉）
第二步（自己设备全量更新确认本版正常后）：
   python3 /tmp/d.py --only capgo --enable-manifest
第三步（试验设备·还停在旧版的）：启动 → 看 OTA 金卡 + adb logcat | grep -iE "capgo|Updater"
   预期：download_manifest 日志·~970 文件逐个下（首次差量≈全量体积·断点可续）
第四步：出任何问题一键回退（即时·不改版本）：
   python3 /tmp/d.py --only capgo --disable-manifest
真差量在下一版兑现：已走差量的设备只下变动文件（logcat 大量 "already cached"·几 MB 流量）
```

护栏：`latest.json` 永远保留 `url+size`（差量前装的客户端只认这俩）；Capgo 自带 20s notifyAppReady 回滚；deploy 完备闸保证 manifest 引用的对象必在服务器。

## 七、验证矩阵（全部本地可跑·不碰生产）

| 脚本 | 覆盖 | 断言 |
|---|---|---|
| `web/scripts/verify-hotdl-resume.js` | 重试/Range 续传/416 自愈/200 降级/并发池/磁盘检查/flags | 23 |
| `web/scripts/verify-hotupdate-selfheal.js` | 状态修复全场景/崩溃环/清理/shim 版本闸 | 29 |
| `web/scripts/verify-update-card.js` | 更新卡组件 API/渲染/按钮/命名空间隔离 | 31 |
| `web/scripts/verify-desktop-update-boot.js` | 自检全链路/避让/dev 静默/kill-switch/本体流程 | 32 |
| `web/scripts/verify-update-decision-tree.js` | minAppVersion→needsInstaller 决策树/构建器 feed 字段 | 8 |
| `web/scripts/verify-online-update.js` | 在线提示平台门/自举/比对/横幅/记账 | 22 |
| `web/scripts/verify-hot-builder-gates.js` | 构建器 GATE0-6（合成树） | 23 |
| `web/scripts/verify-capgo-delta.js` | 差量构建/对象包/基线差分/复验器（真跑 PS 构建器） | 27 |
| `web/scripts/verify-deploy-local.js` | deploy.py 九场景全链路本地模拟 | 32 |
| `node scripts/release.js --self-test` | 版本扇出 6 处 | 10 |

一键全跑：依次 node 以上脚本（`web/scripts/test-update-server.js` 为共享故障注入服务器）。

### 发版前 dress rehearsal（建议每次大版本前过一遍）

1. 全部 verify 脚本绿。
2. `node web/tools/build-hot-update-package.js --version <V+1> --out %TEMP%\rehearsal --skip-stamp-check`（真树过闸）。
3. `node web/scripts/test-update-server.js --root <rehearsal输出> --port 8123` + `npm start` →
   联网中枢 hot feed 填 `http://127.0.0.1:8123/hot-latest.json` → 检查/安装 → 断网重连验续传。
4. 真机演练（packaged）：`npx electron-builder --dir` 跑 win-unpacked 走一遍卡片流程。

## 八、已知边界 / backlog

- **生产 Range 支持**：OpenResty+Cloudflare 对静态文件支持 Range 是常态，但未在生产实测——首次发版后用真实下载断点验证一次（代码对「不支持」有 200 降级，最坏=不续传只重试）。
- **安卓差量真机验**：见第六节，需 owner 一次真机会话（backlog 既有项）。
- **首次差量 OTA 体积≈全量**：Capgo 内置文件不进缓存，第一次 manifest 更新逐文件全下；第二版起真差量。邸报里建议提示玩家用 WiFi。
- **4 段尾号版本不触发本体通道**：latest.yml 是 3 段语义，纯热更版本（x.y.z.N）不会提示本体更新（设计如此，热更覆盖）。
- **资产瘦身**（Phase 3 旧 backlog）：安卓包里 335MB 立绘 + 21MB 音频拆分后，差量/全量都会显著变小。
- 旧 release-hot/deploy-*.py 一批一次性脚本可归档（保留作考古）。

---

## 九、2026-07-07 更新方法与机制升级（owner 拍板两主线：发版「便捷+不弄错内容」·玩家「便捷+下载稳定」）

**玩家侧：**
- **自基线重建**（第二节新条·S11）：兜底顺序变 `manifest 增量 → 自基线重建 → 全 zip`——老安装/损坏状态/增量失败不再掉 800MB 整包，最多多花几秒本地 hash 后只补 ~11MB 差量（1.3.4.5→1.3.4.6 实测真实变化 11MB/928MB=1.2%）。
- **zip 整包多源镜像**：feed 新增 `packageUrlMirrors`（构建器自动带 gh release 源），主源（自服/CDN）失败客户端逐个换源，`.part` 跨源续传、装前 sha 终检。S11-H。
- **更新中心实时进度条**：创意工坊 hero 卡新增金里透朱进度条（下载整包/增量下载/校验本地三态）；`hotStatusText` 补全增量/自基线/换源全事件文案；邸报「应用更新」模态同步支持增量与自基线进度（此前增量安装时卡在 18% 无反馈）。

**发版侧：**
- **⑧½ 预检对账**（`RELEASE-REPORT-<V>.txt` 随发版存档）：vs 上版 manifest 的增/改/删摘要+按顶层目录分桶（堵 1.3.3.4「改 30 打进 3」假更新类）；**双端同树闸**=hot↔capgo 共有路径 sha 必须全等，不等即 die（两端不同树）；零变更大警告（打错树）。
- **⑨⑩ 直传改造**：staging 只收小合成件（<5MB），三大 zip 从构建位直传（basename 即资产名），exe ASCII 别名改同卷硬链接零拷贝——发版不再复制 3.4GB，双盘满 ENOSPC 事故绝根。
- **⑫ 自动部署指针**：固定 release `autodeploy` 的 `latest-ship.txt`，release.js 在⑪上传+审计**全部通过后**才更新（poller 永远看不到半成品发版）。
- **服务器 poller** `scripts/server-autodeploy.py`：cron 5 分钟一轮，读指针→新 tag→拉该版 deploy.py 执行；文件锁防重入、同 tag 连败 5 次挂起、`/etc/tianming-autodeploy.off` 暂停开关。owner 一次安装（命令见 OWNER-RUNBOOK）后发版零人工。

**安卓差量转正**：真机灰度一页清单 `web/docs/capgo-delta-graying-2026-07.md`·验收后 deploy.py 默认携 manifest。

**验证**：S11 自基线重建+镜像 29 断言（`verify-hotupdate-rebaseline.js`）、S10 发版扇出+别名+预检 17 断言；`verify-update-system-all.js` 11/11 套件 263 断言全绿；boot-smoke 361 脚本全载。
