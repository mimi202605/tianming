# 天命 · 安卓/平板移植设计文档（Capacitor）

> 状态：**设计稿 · 待 owner 过审**（2026-06-03）
> 作者：国师（Claude）·所有架构判断均基于实读代码，非推测
> 决策锚：owner 已锁定的四条「宪法」见 §0

---

## 0. 已锁定的决策（移植宪法）

| # | 决策 | owner 拍板 |
|---|------|-----------|
| 1 | **一套代码库 + 平台抽象层**（不 fork 移动分支） | ✅ 锁 |
| 2 | **横屏锁定**，手机当「又宽又矮的小平板」，只有一个布局目标 | ✅ 锁 |
| 3 | **全功能首发**——含编辑器（地图编辑器触屏化在 Phase 2 一起啃） | ✅ 锁 |
| 4 | **在线功能两端一致**（账号/工坊/热更/BYOK 移动端同样可用） | ✅ 锁 |

目标设备：安卓平板（主）+ 安卓手机（横屏）。iOS 同范式可后续追加（Capacitor 双端，但需 Mac + Apple 开发者账号，本文档不展开）。

---

## 1. 核心架构发现（实读，决定整套方案）

### 1.1 这游戏已经是「双平台」的——Capacitor 是第三个「Web 类」后端，不是从零的新路径

- `tm-env-detect.js` 早已区分 `isElectron / isFile / isGitHub / isLocalhost / isWeb`，并检测浏览器能力（IndexedDB / CompressionStream / structuredClone…）。**环境检测层已存在**，只需加 `isCapacitor / isNative`。
- `tm-electron.js` 整个 IIFE 被 `if(window.tianming && window.tianming.isDesktop){…}` 门住——非桌面**根本不执行**。说明桌面专属代码已经隔离干净。
- 存档已**显式分叉**：`tm-save-lifecycle.js` 桌面走 `window.tianming.saveProject/loadProject`（L509/1083/1215），非桌面走 `localStorage tm_P` + IndexedDB `TM_SaveDB`（L1308）。
- `_loadScenarioWithHotFallback`（tm-electron.js L34）用 `fetch('bundled-scenarios/…')` 取剧本——浏览器路径天然可用。

**结论**：Capacitor 应用 = 一个 WebView 装同一份 `web/` 包。它**继承 Web 路径**（IndexedDB/fetch/localStorage 照跑），只在原生缺口处挂插件。**抽象层不是新建第三条路，而是把「Electron vs Web」这条隐式分叉显式收口成 `TM.platform`。**

### 1.2 平台契约 = `window.tianming`（preload-impl.js contextBridge，约 60 个方法）

前端通过 `window.tianming.xxx()` 调主进程，共 **116 处调用 / 17 文件**。最重的消费者：`tm-content-manager.js`(46)、`tm-electron.js`(15)、`tm-save-lifecycle.js`(14)。方法分 11 类（详见 §3 平台边界目录）。**这套 API 就是抽象层要替换/补齐的全部东西。**

### 1.3 在线功能当前是「桌面独占」——这正是「在线一致」要打通的点

`tm-content-manager.js` 里 `desktop() = !!(window.tianming && window.tianming.isDesktop)`，**每个**在线函数开头都 `if(!desktop())return`（L788/919/961/1029/1170/1346…）。即：Web 路径下账号/工坊/热更/内容状态**全是关的**。

> ⇒ owner 的「在线功能两端一致」= **把 `desktop()` 这道闸从「是不是桌面」改成「有没有原生能力」**（`platform.hasOnline`），并给移动端补 `window.tianming.*` 的 Capacitor 实现。这是 Phase 0 的核心动作之一。

### 1.4 账号是 **token 制**，不是 cookie（之前担心的「会话讲究」已自然消解）

`account-login/register` 返回 `res.token` → `writeAccountSession({token})`；后续 `getOnlineApi('account/me', {token})` 显式带 token（main-impl.js L2025-2055）。**token 制 port 到 `CapacitorHttp` 天然干净**，只需把 session 文件存到 Capacitor Preferences/Filesystem。

### 1.5 工坊「发布」只是 POST 元数据，不上传文件本体

`workshop-publish-pack`（L2186）校验登录后 `postOnlineApi('workshop/publish', {id,title,version,packageUrl,sha256,size})`——`packageUrl` 是玩家自托管的地址。**移动端发布 = 一个 HTTP POST**，无需本地打包大文件。
（注：`workshop-install-from-url` 要下载 .tm-pack(zip) → 解压 → 校 sha → 落盘，移动端需 WebView 内解压，见 §4.4。）

### 1.6 `tm-content://` 自定义协议给资产喂 `<img>/<audio>`

main-impl.js L451 注册 `tm-content` 为 privileged scheme，L667 `protocol.handle` 服务工坊/剧本资产（`assetBase: 'tm-content://workshop/<id>/'`）。**移动端需等价物**：Capacitor 用 `Capacitor.convertFileSrc(filesystemPath)` 把本地文件转成 WebView 可读 URL，或注册自定义 scheme。⇒ 资产 URL 的生成必须走平台感知的 builder（见 §4.5）。

### 1.7 地图编辑器是鼠标事件 → 触屏要改 pointer 事件

- **游戏内简版**（tm-electron.js `renderMapTab`/`bindMapEvents` L451-554）：`canvas.onmousedown/onmouseup/ondblclick` + `getBoundingClientRect` + `clientX/clientY`。改 `onpointerdown/up`（pointer 事件统一鼠标+单指触摸）基本机械。
- **独立重型**（`map-editor-*.js` 套件 ~6264 行，P 社 paradigm，多边形/位图/框选/hover-glow）：触屏化是整个移植**最磨人的单点**，现实目标 = 平板 + 手写笔。

### 1.8 资产体积：web 总 **1.44GB**，立绘 335MB 是大头

`assets/portraits` 335MB、`assets/audio` 21MB、maps 8.9MB、scenarios 0.9MB。**单个 APK 装不下**（Google Play 基座上限 150MB）。⇒ 小基座 + 首启/按需下载（立绘按剧本下），复用现成热更服务器（见 §5）。

---

## 2. 核心策略：Capacitor = 「Web 路径 + 原生补丁」

```
                 ┌─────────────────────────────────────────────┐
                 │            同一份 web/ 代码库                 │
                 │   (DOM 游戏逻辑 / 御案 UI / 编辑器 / AI 演绎) │
                 └───────────────────┬─────────────────────────┘
                                     │ 调用
                       ┌─────────────▼──────────────┐
                       │   TM.platform  抽象层契约   │  ← 新增（收口现有 isDesktop 分叉）
                       │  能力位 + 统一 API          │
                       └──┬───────────┬───────────┬─┘
            ┌─────────────▼─┐  ┌──────▼──────┐  ┌─▼──────────────────┐
            │  electron 后端 │  │  web 后端   │  │  capacitor 后端     │
            │ window.tianming│  │IndexedDB/fetch│ │ web 路径 + 原生插件 │
            │  (现状)        │  │  (现状)      │  │  (新增·复用 web)    │
            └────────────────┘  └─────────────┘  └────────────────────┘
```

**Capacitor 后端 = 复用 web 后端 + 覆盖四个原生缺口**：

| 缺口 | 为什么 web 路径不够 | Capacitor 方案 |
|------|--------------------|----------------|
| ① BYOK / 在线 HTTP | WebView 跨域调第三方 LLM / 自家服务器撞 CORS | `CapacitorHttp`（原生栈，无 CORS） |
| ② 大资产 + 存档存储 | 浏览器配额装不下 1.44GB；IndexedDB 存大存档脆 | `@capacitor/filesystem` + `@capacitor/preferences` |
| ③ 热更新落盘 | 浏览器无法持久化解压后的 web 包 | OTA：Filesystem 落 web 包，复用现服务器（§4.3） |
| ④ 文件导入导出 + tm-content:// | 工坊导包/存档导出/资产协议 | Capacitor 文件选择器 + `convertFileSrc`（§4.5） |

> 关键收益：御案 UI、编辑器、AI 演绎、廷议/科举/财政等**所有游戏逻辑零改动**——它们本来就跑在 WebView 里。移植工作全部集中在「平台抽象层 + 四个缺口 + 触屏 + 分发」。

---

## 3. 平台边界目录（`window.tianming` 全表）

> 这是抽象层的完整契约。每行：方法 → 干什么 → 三后端实现策略。
> Electron=现状；Web=现状（多为「不可用/降级」）；Capacitor=本移植要补。

### 3.1 存档（saves）
| 方法 | 作用 | Electron | Web 现状 | Capacitor |
|------|------|----------|----------|-----------|
| saveProject / loadProject / listSaves / deleteSave | 命名存档 CRUD | fs `SAVE_DIR` | IndexedDB/localStorage | **Filesystem**（JSON 落 app 数据目录） |
| autoSave / loadAutoSave | 自动存档 | fs `__autosave__` | IndexedDB | Filesystem |

### 3.2 对话框 / 文件（dialogs）
| dialogExport / dialogImport | 存档导出/导入 | 原生 save/open 对话框 | 浏览器下载/`<input file>` | **Capacitor 文件选择器 + 分享** |
| dialogLoadImage / dialogLoadGeoJSON | 编辑器读图/地理 | 原生 open | `<input file>` | Capacitor 文件选择器 |

### 3.3 剧本（scenarios）
| listScenarios / saveScenario / loadScenario / deleteScenario | 用户剧本 CRUD | fs `SCENARIOS_DIR` | fetch bundled / IndexedDB | **Filesystem + 内置 fetch** |

### 3.4 每回合数据（turn-data，AI 演绎落盘）
| writeTurnData / readTurnData / listTurnData / readTurnsSummary | 演绎脑回合快照 | fs `TURN_DATA_DIR` | IndexedDB | **Filesystem**（注意体积，见 §7 性能） |

### 3.5 在线服务 + 账号（online + account）★在线一致核心
| onlineServiceStatus | 服务健康 | HTTP | 关 | **CapacitorHttp** |
| accountSession / Register / Login / Me / Logout | token 制账号 | HTTP + session 文件 | 关 | **CapacitorHttp + Preferences** |

### 3.6 桌面安装包更新（installer auto-update）
| checkForUpdate / downloadUpdate / installUpdate / onUpdateStatus | electron-updater 换 .exe | autoUpdater | 关 | **N/A**（安卓走商店/APK；该类整体禁用） |

### 3.7 Web 包热更新（hot-update）★在线一致核心
| hotUpdateStatus / checkHotUpdate / installHotUpdate / setHotUpdateEnabled / rollbackHotUpdate / reloadAfterHotUpdate / openHotUpdateDir / onHotUpdateStatus | web 包 OTA（manifest+sha 增量） | fs + 自家服务器 | 关 | **Filesystem 重实现 + 复用同服务器**（§4.3） |

### 3.8 内容/创意工坊（workshop）★在线一致核心
| contentStatus / listWorkshopPacks / loadWorkshopCatalog / installWorkshopPackFromUrl / importWorkshopPack / publishWorkshopPack / setWorkshopPackEnabled / uninstallWorkshopPack / openWorkshopDir / loadEnabledWorkshopScenarios | 内容包装/发/启用 | fs + HTTP + 解压 | 关 | **CapacitorHttp + Filesystem + WebView 解压**（§4.4） |

### 3.9 工具 / 调试 / 事件
| openSaveDir / openLogDir / openScenariosDir / openTurnDataDir / openWorkshopDir / openHotUpdateDir | 打开目录 | shell.openPath | 无 | **降级**（移动端无文件管理器概念→隐藏入口或「分享」） |
| quitApp | 退出 | app.quit | 无 | `App.exitApp()`（一般隐藏） |
| getAppInfo / contentStatus | 版本/路径信息 | 真路径 | 假 | **虚拟路径**（Filesystem 目录） |
| debugLog / debugLogInfo | 日志 | fs LOG_DIR | console | Filesystem 日志 |
| onMenuAction / onImportData | 主进程→渲染器消息 | ipc | 无 | **N/A / 自定义事件** |

---

## 4. 抽象层 + 四缺口设计

### 4.1 `TM.platform` 抽象层规格

新增 `web/tm-platform.js`（紧邻 `tm-env-detect.js`），导出 `TM.platform`：

```js
TM.platform = {
  kind: 'electron' | 'capacitor' | 'web',   // 单一真相
  // 能力位（取代散落的 isDesktop 判断）
  caps: {
    fs:          bool,   // 有原生文件系统（electron / capacitor）
    nativeHttp:  bool,   // 跨域 HTTP（electron / capacitor）
    hotUpdate:   bool,   // web 包 OTA（electron / capacitor）
    online:      bool,   // 账号/工坊（= nativeHttp）
    installerUpdate: bool, // 换 .exe（仅 electron）
    filePicker:  bool,
  },
  // 统一 API（内部按 kind dispatch 到三后端实现）
  saves: { save, load, list, delete, autoSave, loadAutoSave },
  scenarios: { list, save, load, delete },
  turnData: { write, read, list, summary },
  account: { session, register, login, me, logout },
  workshop: { list, catalog, installFromUrl, import, publish, setEnabled, uninstall, loadEnabledScenarios },
  hot: { status, check, install, setEnabled, rollback, reload },
  files: { exportSave, importSave, pickImage, pickGeoJSON },
  asset: { url(logicalPath) },   // tm-content:// 等价物，平台感知
  info: { getAppInfo, contentStatus },
};
```

**迁移策略（保守、可增量）**：
1. `TM.platform` 的 `electron` 后端 = 直接转发到现有 `window.tianming.*`（零行为变化）。
2. `web` 后端 = 收编现有 IndexedDB/localStorage 路径。
3. **把 `desktop()` / `isDesktop` 这道能力闸，逐文件改成 `TM.platform.caps.*` 检查**（§1.3）。一刀一文件，先 `tm-content-manager.js`（最重）。
4. `capacitor` 后端最后加，复用 `web` 后端 + 覆盖四缺口。

> 不强求一次性重写 116 处调用：先让 `electron`/`web` 后端等价转发（桌面零回归），再渐进把直连 `window.tianming` 的散调用收编进 `TM.platform`。

### 4.2 ① BYOK / 在线 HTTP — `CapacitorHttp`

- 装 `@capacitor/core`，配置 `CapacitorHttp` 插件（原生 HTTP，绕 WebView CORS）。
- `postOnlineApi/getOnlineApi/fetchJsonRemote/downloadRemoteFile`（现 main-impl.js 的 Node 实现）→ 抽象成 `TM.platform` 的 http 原语，Capacitor 后端用 `CapacitorHttp.request`。
- **BYOK 演绎脑**：玩家自接的第三方 LLM 调用同样走该原语 → 移动端不再受 CORS 限制（桌面本就无限制）。

### 4.3 ② 存储 + ③ 热更 — Filesystem

- 存档/剧本/回合数据/工坊包/热更 web 包，全部落 `Filesystem`（`Directory.Data`）。
- **热更 OTA**：现有 `hot-latest.json + manifests/<ver>.json + /files/<sha>/` + 增量 diff 逻辑**整套可移植**（已是平台无关的 sha 寻址）；只把「下载 + 落盘 + 校验 + 切换当前 web 包」从 Node fs 换成 Filesystem。**复用同一台服务器、同一份 changelog/邸报**。
  - 注意：移动端「重载到新 web 包」= WebView 重新指向新解压目录（Capacitor 的 `server.url` 或本地路径切换），需验证；保留「失败回退上一个好包」(已有 rollback 概念)。

### 4.4 ④ 工坊导包解压 — WebView 内解压

- `installWorkshopPackFromUrl`：`CapacitorHttp` 下载 .tm-pack → 用纯 JS 解压库（`fflate`，轻、快）在 WebView 内解 zip → 校 sha → `Filesystem` 写入 `WORKSHOP_PACKS_DIR` 等价目录 → 写 index。
- `validateWorkshopPack` 的安全校验（禁 `.js/.exe` 等、250MB 上限、符号链接、路径越界）**必须原样移植**——这是安全边界，不能省。
- `importWorkshopPack`（本地选文件）→ Capacitor 文件选择器选 .tm-pack/.json → 同上。

### 4.5 `tm-content://` → `asset.url()` 平台感知 builder

- 现状：`assetBase = 'tm-content://workshop/<id>/'`，资产 URL 散在渲染处。
- 抽象成 `TM.platform.asset.url(logicalPath)`：
  - electron → `tm-content://…`
  - capacitor → `Capacitor.convertFileSrc(filesystemAbsPath)`
  - web → 相对 `fetch` 路径
- **实读修正（S0.5 调研结论）**：资产解析的正确 chokepoint 在**剧本数据载入/重写时**，不在渲染点。
  - 立绘 `<img src=ch.portrait>` 散在 20+ 处（tm-wendui / tm-hongyan-office / tm-player-core / tm-office-runtime …），**无中心渲染入口**；逐处包 `asset.url()` 是无收益的 20 文件散改（electron/web 下纯 passthrough），违反保守拆分。
  - 已有成例：`rewriteWorkshopAssets`（tm-content-manager.js:1295）在剧本载入时把 `pack.assetBase` 拼进 pack-relative 资产路径、**一次性改数据**；渲染点拿到的已是成品 URL。
  - ⇒ capacitor 资产解析**仿此在 load 时做**：① 工坊资产——capacitor 后端把 `assetBase` 设为 `convertFileSrc` 后的本地基址（`rewriteWorkshopAssets` 不动）；② 官方立绘（Phase 3 下载到 Filesystem 后）——加**一个** load 时重写把 `assets/portraits/…` → `convertFileSrc(本地路径)`。两个 chokepoint，渲染点零改动。
  - `TM.platform.asset.url()` 作为这两个重写内部调用的 builder（已在 S0.2 立好）。**属 Phase 1/3，不在 Phase 0 扫。**

---

## 5. 资产分发（1.44GB 问题）

| 资产 | 体积 | 策略 |
|------|------|------|
| 代码（js/css/html，去 backups/dev-tools） | 远小于 72MB | **打进基座 APK** |
| 2 官方剧本 + maps | ~10MB | 打进基座 |
| 立绘 `assets/portraits` | 335MB | **首启/按需下载**（按剧本分包：天启/绍宋各一包） |
| 音频 `assets/audio` | 21MB | 可选下载（设置里开关） |
| 语义检索包 | （需测量） | 可选下载（仅严格史实模式需要） |

- 下载源**复用现有热更服务器**（sha 寻址 + manifest），首启走「资产引导」流程，断点续传、可校验。
- Play Asset Delivery（最高 ~1.5GB）是另一选项，但绑死 Google Play；中文受众优先**自家服务器按需下载**更灵活。

---

## 6. 触屏适配（横屏锁定下）

1. **方向锁定**：Capacitor `android` 配置 `orientation: landscape`（或 manifest `screenOrientation`）。手机=小平板，单一布局目标。
2. **hover → pointer**：地图 hover、tooltip 改 tap/long-press；全局加 `@media (pointer: coarse)` 分支放大热区（≥44px）、去掉纯 hover 依赖。
3. **响应式缩放**：御案范式从平板宽平滑缩到手机横屏「矮」（~400dp 高）；顶栏 + 中央御案 + 右 rail 的垂直挤压用 rem/vh 缩放 + 折叠次要 slot。
4. **地图编辑器触屏化**（Phase 2 重头）：
   - 简版（tm-electron.js canvas）：`onmouse*` → `onpointer*`（单指即得），机械改动。
   - 重型（map-editor-*.js）：pinch 缩放/平移、长按出菜单、点击落顶点、hover-glow 改 active 态；**主攻平板+手写笔**，手机标注「建议平板」。
5. **软键盘**：剧本编辑/authoring agent NL 输入靠系统软键盘；注意输入框聚焦时布局上移（已有 Electron focus-fix，移动端需重验）。

---

## 7. 性能（硬前提，不是优化项）

6-02 性能审计：桌面已报极卡——7MB 快照同步加载、地图 hover、**过回合整树重建 2~3 次**、turnReport 无界。**移动端 CPU/内存更紧，必更炸**，尤其整树重建。

- **Phase 0 必须先落 Tier-1 性能修**（已在 backlog：`web/docs/perf-audit-2026-06-02.md`）。
- `autoSave` deepClone 拆分（A 方案 backlog）从「可做」升「必做」——移动端内存更易 OOM。
- turn-data 体积（§3.4）在 Filesystem 上要控量 + 清理策略。

---

## 8. 分发渠道

- **首选**：TapTap / 直接 APK（中文受众 + BYOK 自接 LLM，比 Google Play 现实）。
- 签名：自建 keystore；APK 直装需引导「允许未知来源」。
- 内容分级：游戏含 LLM 生成内容 + BYOK，过审需说明（尤其 Play）。
- BYOK key 录入 UX：移动端设置页输入 + 安全存储（Preferences/Keystore）。

---

## 9. 分阶段实施（保守 slice，一刀一件事）

> 每阶段「先读再设计」，落地后 node/真机验，关键改动留 .bak。预算量级 **~6–10 周**专注开发（出文档后随 slice 细化）。

### Phase 0 · 解耦 + 性能（桌面上做，零移动依赖）
- **S0.1** 落 Tier-1 性能修（过回合整树重建 / 快照同步加载 / hover）。
- **S0.2** 新增 `tm-platform.js`：`TM.platform` 骨架 + `electron`/`web` 两后端等价转发（桌面**零回归**验证）。
- **S0.3** 把 `tm-content-manager.js` 的 `desktop()` 闸改成 `TM.platform.caps.*`（在线一致的地基，先这一文件）。
- **S0.4** 把 `tm-save-lifecycle.js` 的 `isDesktop` 分叉收编进 `TM.platform.saves`。
- **S0.5** `asset.url()` builder（S0.2 已立）+ 定准资产 chokepoint = load 时重写（仿 `rewriteWorkshopAssets`），**非渲染点散改**；实际重写落 Phase 1/3。

### Phase 1 · Capacitor 壳 + 平台实现（平板横屏先跑起来）
- **S1.1** 建 Capacitor 工程，包 `web/`，安卓平板横屏启动空跑。
- **S1.2** `capacitor` 后端：saves/scenarios/turnData → Filesystem。
- **S1.3** `capacitor` 后端：account/online/workshop HTTP → CapacitorHttp（**在线一致打通**）。
- **S1.4** 工坊导包：CapacitorHttp 下载 + fflate 解压 + 安全校验移植。
- **S1.5** 资产 `convertFileSrc` 接通，立绘/音频在真机显示。
- 里程碑：**平板横屏「真机能玩」**（御案范式基本可用）。

### Phase 2 · 触屏适配 + 响应式 + 编辑器触屏化
- **S2.1** 全局 pointer/hover/热区 `@media (pointer: coarse)`。
- **S2.2** 御案范式响应式缩放（平板宽 → 手机矮）。
- **S2.3** 简版地图编辑器 canvas `onmouse*→onpointer*`。
- **S2.4** 重型地图编辑器触屏化（pinch/长按/落顶点；主攻平板+笔）——**最重单刀，可能再拆子刀**。
- **S2.5** 剧本编辑器 / authoring agent 移动布局 + 软键盘适配。

**Phase 2 实读细化（2026-06-03·先读再设计·验证非推测）**：
- viewport 已 `width=device-width, initial-scale=1.0`（mobile-ready）。
- ⚠️ styles.css 的「2.7 响应式布局适配」整套（≤1024/768/480 折叠底栏 + `#mobile-nav` 底部导航 + `hover:none`，L4337-4404）**是给旧 `ngui-left/right/center` UI 写的死代码**——御案范式下旧 ngui 已 hidden。**Phase 2 不以它为基**，可后续清理（先确认 ngui 全死）。
- ✅ **当前御案 UI（phase8-formal）自带 24 条 @media**（inline 在 phase8-formal-bridge.js×20 / drafts.js×4·断点 1500/1280/1180/1080/980），是「桌面变窄」式响应。平板横屏 1024–1366px **正落在既有断点内 → 布局多半能撑**（待视口截图/真机确认御案各元件无塌）。
- ❌ **真缺口 = 触屏工效，不是布局重写**：御案 UI **无 `hover:none`/`pointer:coarse` 层、无 44px tap 目标、无手势、无 sub-980 处理**。
- ⇒ **slice 优先级调整**：**S2.1（触屏工效·御案 `@media(pointer:coarse)` 层：禁 hover 粘滞 + tap 目标 ≥44px + 滚动惯性）= 第一刀，最高优先**；**S2.2 降级**为「验证御案既有 980-1500 断点 + 补御案专属元件缺口」（非重写）；S2.3-S2.4 地图编辑器触屏不变（仍最重单点）；S2.5 不变。
- 验证法（每 slice）：浏览器 1280×800 / 1024×768 横屏视口截图 + 真机触屏（owner）。

### Phase 3 · 移动热更 + 资产分发
- **S3.1** 热更 OTA 移植（Filesystem 下载/落盘/切包/回退，复用同服务器）。
- **S3.2** 首启资产引导（立绘按剧本下、音频/语义包可选）。

### Phase 4 · 分发
- **S4.1** 签名 + APK 产出 + BYOK key 录入 UX。
- **S4.2** TapTap / 直装引导 + 内容分级材料。

---

## 10. 风险与未决

| 项 | 风险 | 缓解 |
|----|------|------|
| 性能 | 移动端整树重建可能卡死 | Phase 0 先修，真机早测 |
| 重型地图编辑器触屏 | UX 难达鼠标水平 | 主攻平板+笔，手机降级标注 |
| 热更切包重载 | WebView 切本地包机制需验证 | Phase 3 早做 spike，保留 rollback |
| 资产托管 | 1.44GB 下载带宽/续传 | 复用 sha 服务器 + 断点续传 |
| 存档跨端 | 移动/桌面存档互通（云存档）未列入 | v1 仅本地；云存档作 v2（账号已 token 制，有基础） |
| 商店过审 | LLM 内容 + BYOK | 优先 TapTap/APK，Play 后置 |

---

## 11. 验证策略（每阶段）

- Phase 0：桌面 `npm start` 跑全流程，确认 `TM.platform` 收编后**桌面零回归**（存档/在线/工坊/热更行为不变）；grep 中文 token 数前后比对（防顺手翻译）。
- Phase 1：安卓平板真机——新建剧本/存读档/账号登录/工坊装包/立绘显示逐项过。
- Phase 2：真机触屏逐面板验（含两个编辑器）；手机横屏布局截图验。
- Phase 3：真机热更端到端（发一个测试增量包，验下载/切包/回退）。
- Phase 4：APK 真机全新安装 + 资产首启下载 + BYOK 录入。

---

## 附录 A · 关键文件落点（实读索引）

| 文件 | 角色 | 移植动作 |
|------|------|----------|
| `preload-impl.js` | `window.tianming` 契约（~60 方法） | 抽象层契约的真相来源 |
| `main-impl.js` | 主进程 IPC 实现（L1420-2330）+ tm-content 协议(L451/667) | 行为参照，逐项搬到 Capacitor 后端 |
| `web/tm-env-detect.js` | `TM.env` 环境检测 | 加 `isCapacitor/isNative` |
| `web/tm-platform.js` | **新增**·`TM.platform` 抽象层 | Phase 0 S0.2 |
| `web/tm-electron.js` | 桌面专属 UI/存档（`isDesktop` 门住） | 简版地图编辑器在此（S2.3） |
| `web/tm-save-lifecycle.js` | 存档分叉（桌面/web） | 收编进 `TM.platform.saves` |
| `web/tm-content-manager.js` | 在线/工坊/热更（`desktop()` 闸 46 处） | 闸改能力位（S0.3）·在线一致核心 |
| `web/map-editor-*.js` | 重型地图编辑器 ~6264 行 | 触屏化（S2.4，最重） |
