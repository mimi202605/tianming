# 天命 · 性能审计与优化 (2026-06-02)

> 起因：玩家反映「极其卡顿」。四路并行调研（结算/渲染/增长/加载）+ 落地 Tier-1 安全优化。
> 本文是诊断 + 已做 + backlog 的留档。未 ship、未 commit。

---

## 0. 先取真实数字（强烈建议，零风险）

同步 JS 优化前，先确认卡顿到底是「同步 JS 计算」还是「等 AI 网络返回」。在卡顿存档的浏览器/Electron 控制台跑：

```javascript
GM._lastEndturnTimingSummary      // 6 个 step 哪个 ms 最大（ai step 通常最大=网络等待，非 JS 卡）
GM._lastEndturnSystemsTimings     // systems step 内 5 个粗阶段耗时
TM.perf.print()                   // corruption/guoku/authority 三个 tick 的 p95
TM.perf.downloadJSON()            // 导出
```

- 若 `ai` step 占绝对大头（秒~分钟级）→ 卡顿主要是**等 AI**，属网络 I/O，靠并发/流式/降 token 缓解，非本文同步优化能解。
- 若 `systems`/render step 是毫秒~几百 ms 且累积明显 → 本文同步优化直接有效。

---

## 1. 四大卡顿来源（按玩家可感程度排序）

### A. 启动加载 —— 首屏同步解析 21.4 MB JS（最大单点）
- index.html 同步加载 **288 个本地脚本 ≈ 21.4 MB / 27.5 万行**，仅 10 个 `defer`、**0 个 async / 0 个懒加载**。
- **单文件元凶（当时状态）**：`data/scenario-supplements/tianqi7-official-runtime-snapshot.js` = **7.09 MB（占总量 32%）**，72 行一个巨型字面量；+ `scenarios/tianqi7-1627.js` 904 KB。**两者合计 ~8 MB ≈ 37% 首屏负载，且无论玩家选哪个剧本都被同步加载+解析**。该 snapshot 已于 2026-07-18 退役，官方完整剧本改为选中后按需加载。
- 科举 36 文件 1.25 MB / 2.6 万行、廷议 tm-tinyi-v3.js 333 KB、编辑器 7 文件 240 KB、tm-test* 82 KB（生产仍加载）。

### B. 地图 hover —— 每次 mousemove 全量扫描+重建（已修 ✅）
- `phase8-formal-map.js` mousemove → `regionPathFromPoint` → `findRegion`（对 `map.regions` 做 O(regions×7) 线性 `.find`+`.some`）→ `tip.innerHTML` 重建 + reflow，**无节流、无同省早退**。鼠标在地图上滑动时持续掉帧。

### C. 过回合 —— renderGameState 整树重建被调 2~3 次（部分已修 ✅）
- `renderGameState()`（tm-hongyan-office.js:1615，~613 行）`gc.innerHTML=""` 后**急切重建 15 个标签页全部内容**（绝大多数不可见）+ 末尾无条件跑 renderWendui/Memorials/Biannian/OfficeTree/ShijiList/Jishi/Difang/Tech/Civic/Renwu/SidePanels。
- 过回合时 `tm-endturn-core.js:1185` 与 `tm-endturn-render.js:1309` 又把内部已调的子渲染重复调一遍 → 一个回合内整树重建 **2~3 次**。
- `switchGTab()` 切页只切 `display` 不重建 —— 说明 renderGameState 把所有隐藏页都渲染掉是纯浪费。

### D. 越玩越卡 —— GM 无界增长拖慢 deepClone/序列化/渲染（部分已修 ✅）
- **`GM._turnReport` 从不重置**：每回合几十~上百条 push（applier 40+ 处），长局上万条。渲染只读当回合/上回合（render:954 按 `turn===GM.turn-1`、:1572 fiscal chips），却随存档全量序列化、`_collectFiscalAdjChips` 全量 forEach。
- **`GM._convArchive` 无 cap 且不在 autoSave 白名单** → 每 60s 被 `_autoSaveSnapshotGM` 全量 deepClone（双重伤害：又涨又拷）。
- `jishiRecords` / `qijuHistory` 写入端无 cap（读取端已 slice）。`_memTables` 纯追加表 rows 无统一 cap 且被 deepClone。
- 监听/定时器：**无确凿累积泄漏**（普遍有配对 clear/remove 或 `timer-leak-ok` 标注）。

### E. 每回合同步引擎链（需观测后再动）
- `aggregateRegionsToVariables` **每回合跑 3 次**（pre-AI / systems.tick 6.21 / final），单次内部 ~10× 全省遍历 + 1× 全角色。
- `findDivisionByNameFuzzy` 在 `_tickMinxinMatrix` / 民变里 = **O(省 × 全树 walk × 每节点 9 次 stripSuffix)** —— 唯一随剧本规模平方放大的算法点。
- `systems` step 40+ 引擎串行 tick，目前只 3 个 tick 有 perf 埋点，其余挤在一个总数里无法定位。

---

## 2. 已落地 Tier-1（低风险·已 node 语法校验·均留 .bak-perf-20260602-234542）

| # | 文件 | 改动 | 治 |
|---|------|------|----|
| 1 | tm-endturn-core.js:1184 | 删 5 个冗余 render 调用，缩为单个 `renderGameState()` | C 过回合重建 2~3→1 次 |
| 2 | tm-endturn-render.js:1309 | 删尾部 3 个冗余 render 调用 | C |
| 3 | tm-endturn-render.js:1308 | `_turnReport` > 600 时 `slice(-600)` | D 越玩越卡 |
| 4 | tm-endturn-followup.js:3196 | `_convArchive` > 200 时 `slice(-200)` | D |
| 5 | tm-save-lifecycle.js APPEND_ONLY | 加 `_convArchive:1`（引用不深拷） | D autoSave 冻结 |
| 6 | phase8-formal-map.js findRegion | 按 map 引用+长度缓存的反向索引 Map，O(n×7)→O(1) | B |
| 7 | phase8-formal-map.js mousemove | rAF 节流 + 同省早退（同省只挪位置不重建 innerHTML） | B |

**逻辑不变，只改「何时渲染/渲染多少/如何查找/是否裁剪」。display 文案未动。**

---

## 3. Backlog（需审批/需 live 验证，按 ROI 排序）

| 优先 | 项 | 收益 | 风险 | 说明 |
|------|----|------|------|------|
| ★★★ | 把 7MB 官方快照 + 904KB 剧本**延迟到选中该剧本后**加载 | 首屏砍 ~8MB（37%） | 中 | 改 tm-patches 的 apply 时机到选剧本后；需验证选官方剧本仍正确 seed |
| ★★★ | renderGameState **懒渲染当前 tab**（其余在 switchGTab 首次切入时建）+ 给 Memorials/Biannian/ShijiList/Jishi 加 renderRenwu 式可见性 guard | 过回合/切页大幅变快 | 中 | switchGTab 已是 display 切换，加「首次渲染」钩子 |
| ★★ | `findDivisionByName*` 加反向索引 Map | 治本唯一 O(n²) | 中 | 剧本越大越值得；aggregate 后重建索引 |
| ★★ | `aggregateRegionsToVariables` 每回合 3 次 → 删 systems.tick 6.21 那次 | 砍 ~1/3 聚合开销 | 中 | 需验证 final 仍写定 national |
| ★★ | 给 systems step 40+ 引擎 tick 补 `_markSystemStage` 埋点 | 可精确定位真凶 | 极低 | 纯观测，先加再优化 |
| ★ | renderTopBarVars 改局部更新文本节点 + 事件委托（替代每次整条 innerHTML + 65 内联 handler） | 高频小卡 | 中 | topbar-vars 单文件重构 |
| ★ | `jishiRecords`/`qijuHistory`/`_memTables.rows` 加环形 cap | 越玩越卡 | 低 | 同 Tier-1 范式 |
| ★ | `_renderEdictSuggestions` O(n²) sort 改预存 index Map + 事件委托 | 建议库重渲 | 低 | 单函数内 |
| ☆ | 科举 36 文件整组懒加载（进科举时拉）；生产移除 tm-test*；核实并懒加载/删除死的 canvas 地图 tm-map-system.js(84KB) | 首屏再砍 | 低~中 | 需先补一个轻量动态脚本加载器（当前 0 懒加载基建） |

---

## 4b. 本轮追加已落地（2026-06-03·owner「开始吧」批准后）

| # | 文件 | 改动 | 治 | 风险 |
|---|------|------|----|------|
| 8 | index.html:788 区块 | **7MB 官方快照从首屏同步解析移到 `requestIdleCallback` 空闲注入**（fallback load+600ms）。基础剧本 904KB 仍同步（保证选择列表）。快照 IIFE 自应用+重试+`tm:p-restored` 自愈+幂等去重，唯一消费者 `_tmStartApplyOfficialSnapshot`（启动时按 sid gate，typeof 守卫）→ 时序安全 | A 首屏砍 ~32% | 低-中（需桌面端验官方剧本仍正确 seed） |
| 9 | tm-endturn-render.js:1310 | `jishiRecords` > 400 时 `slice(-400)`（push 尾插·读取端只取近 50） | D | 低 |
| 10 | tm-hongyan-office.js:2302 | `_renderEdictSuggestions` sort 比较器内 `indexOf` → 预存索引 Map，O(n² log n)→O(n log n) | C/E 建议库重渲 | 低 |

**纠正**：`qijuHistory` **已在** `tm-faction-npc-in-turn-driver.js:196` 和 `tm-faction-npc-news-bridge.js:41` 各有 `slice(0,200)` 上限（§1-D 误判其无 cap），本轮不重复裁剪。

### 第二轮 · 纪录类面板懒渲染（复刻 renderRenwu/_renderDifangPanel 已验证范式）

| # | 文件 | 改动 | 治 | 风险 |
|---|------|------|----|------|
| 11 | tm-player-core.js | 新增通用 `_gtTabVisible(panelId)`（与 `_rwIsPanelVisible` 同机制）；switchGTab 加 gt-memorial/biannian/shiji/jishi 切页 `force=true` 触发 | C 过回合 | 低 |
| 11 | tm-memorials.js / tm-office-panel.js / tm-shiji-qiju-ui.js / tm-wendui.js | renderMemorials/Biannian/ShijiList/Jishi 加 `force` 参数 + 隐藏即跳过的 guard | C | 低 |

**原理**：这 4 个面板原由 renderGameState 尾部（2215）**无条件**重渲，即便其 tab 隐藏（`styles.css:1758 .g-tab-panel{display:none}`）。长局 shijiHistory 数百条、每次过回合都全量 reverse+分组纯属浪费。改为隐藏时跳过、切到该页时强制渲染——与 renderRenwu 完全同范式。**安全确认**：4 面板仅由 switchGTab 显示（无其它直接 display 操作），可见时其它调用照常渲染。**需桌面端实跑点开这 4 个 tab 确认内容正常。**

## 5. 第三方面 · 资源 / 绘制 / 字体（2026-06-03·新维度·决定性发现）

### 🔴🔴 assets/ 原 418MB → 现 180.5MB（2026-06-03 立绘压缩后复测）—— 仍是「极其卡顿」+ renderer OOM 黑屏的最大单因
| 资源 | 原体积 | 现状(2026-06-03 复测) | 说明 |
|------|------|------|------|
| `assets/portraits/` 133 张 PNG | **336MB** | **✅ 97.9MB**（均值 753KB·640×640/480×640） | 已降采样到 640px(只缩不放)·解码位图内存随像素²降·配合 #12 懒/异步解码 → 主线程压力已下来 |
| `assets/ui/` *-trial mockup 9 个 | — | **🟢 ~24MB·全树零引用** | 印章 trial×3(1254²)+screen-overall trial×3(1586×992)+yushufang trial×3(1280×800)·均为旧预览导出·**运行时从不加载** → 纯包体死重·安全删 |
| `assets/ui/home/...ambient.gif` | 10.8MB | 10.6MB(1280×720·仍在) | 首页背景(styles.css:401)·GIF **逐帧 CPU 解码合成**(不硬解)·**仅首页/启动·游戏开始后 #launch 隐藏即停**→ 影响菜单非过回合 |
| `assets/fonts/` 4 个 CJK TTF | 25MB | 24.5MB(仍在) | **全有 `font-display:swap`** → 不阻塞首屏文字渲染·非卡源·子集化仅省包体 |
| `assets/audio/` 5 个 MP3 | 22MB | 21.4MB(仍在) | 按需流式·off-main-thread 解码·非卡源·MP3 已压缩 → 不动 |

**已落地（代码侧·低风险·node 过·留 .bak）：**
| # | 文件 | 改动 |
|---|------|------|
| 12 | tm-renwu-ui.js / tm-hongyan-office.js(×3) / phase8-formal-drafts.js(hy-face+edict-sug) | 肖像 `<img>` 全部加 `loading="lazy" decoding="async"`（全库原本 **0 处** lazy/async）→ 只解码视口内可见头像 + 离主线程异步解码 |

**肖像重编码（决定性·移动端最致命）—— 已产出压缩集，待 owner 验质量后替换：**
- **2026-06-03 落地**：本机无 ImageMagick/sharp，改用 **Windows 自带 System.Drawing**（PowerShell·零安装）写了可复用脚本 `scripts/compress-portraits.ps1`。降采样到 ≤640px 长边（只缩不放·HighQualityBicubic·同名 .png 保格式·zero 代码改动）。
- **已替换生效（owner 2026-06-03 批「备份+替换」）**：`assets/portraits/tianqi7/` 现为压缩集 **133 张·97.9MB**（原 334.8MB·省 70.8%）。抽验命名（仁祖李倧 480×640）+ generic（court-woman 640×640）质量清晰，衣纹面容俱在。**原图整目录移出 web 树备份在 `C:\Users\37814\Desktop\tianming\_asset-backups\portraits-tianqi7-orig-20260603\`（334.8MB·可随时还原·在 web 树外不会被打包/热更误带）**。
- **owner 选 PNG 原地降采样方案**（弃 JPEG，因 .png→.jpg 会打断全库 `<img src>` 引用）。PNG 无损只到 70.8%（非 JPEG 的 ~95%），但 336→98MB 对移动端按需下载已够。
- 旧方案备忘（若将来装 ImageMagick 追求 ~10MB）：`magick mogrify -path out -resize 640x640\> -strip -quality 88 ...` 或转 WebP。
- 首页 ambient GIF 10.8MB → `<video>`(WebM/MP4) 或静态 PNG（降 80%+ 且硬解）。
- 4 个 TTF → woff2（25MB→~13MB·改 4 行 `format("woff2")`）+ 按剧本字符集子集化（可降到 1-2MB/字体）。

### CSS 绘制微调（来自专项调查·低风险·待落地）
- `.tmv3-list`（御案中央奏疏流·最常滚动）加 `contain:content`（phase8-formal-bridge.js:2408）。
- `.tmv3-turnhead` 吸顶表头去 `backdrop-filter:blur` 改不透明实色（:2413·sticky+blur 滚动每帧重算）。
- 常驻栏 `.gs-status-bar`/`.gs-turn-fab-bar`/`.toast` 的 `backdrop-filter` 改半透明实色（styles.css:626/646/210）。
- `tmv3-pulse` / `og-group-glow` 的 box-shadow infinite 脉冲改 opacity/transform（box-shadow 动画每帧 paint）。

### 已落地（CSS·零视觉影响·node 过）
| # | 文件 | 改动 |
|---|------|------|
| 13 | phase8-formal-bridge.js:2408 | `.tmv3-feed .tmv3-list` 加 `contain:content`（御案中央奏疏流·最常滚动的容器·隔离重绘） |

### 已查证 · 非问题（不动）
- **Electron 主进程**（`main-impl.js:1160` BrowserWindow）：硬件加速**开启**（无 `disableHardwareAcceleration`/`disable-gpu` 开关）、`show:false` 等 `ready-to-show`（无白屏）、devtools 不默认打开、`backgroundThrottling:false`（故意·让游戏后台续跑）。配置无性能问题——慢在渲染层而非主进程。注：默认 `fullscreen:true`，高分屏(4K)下按原生分辨率渲染会放大绘制量，叠加 336MB 肖像+毛玻璃更明显，但属预期非配置 bug。
- **调试系统**：`diagnostics-foundation` 5s 巡检是 `TM.guard.start()` 手动开启、无代码自动调用；`debug-logger` flush 空队列近乎零成本。生产无开销。
- **记忆子系统（20+ tm-memory-*.js）**：默认路径不是每回合负担。最重的向量召回 `tm-semantic-recall.js`（cosine/embedding）**默认关闭**（`STATE.enabled:false`·玩家开关）+ 模型未就绪即 no-op + 增量索引（只处理 `lastIndexedTurn` 以来新增）；endturn 经 `searchSyncSafe` 调用，禁用时为空操作。`context-compiler` 用 `.slice(0,4)/.slice(0,maxLen)` 有界。仅当玩家手动开启嵌入召回时才有成本，且 `_embed` 异步、不阻塞主线程（首次加载本地 ONNX 模型是一次性开销）。

## 6. 待 owner 动手清单（需本机工具/需实跑·已记录·按收益排序）
1. ~~**🔴 肖像重编码**~~ **已完成**（2026-06-03·owner 批「备份+替换」）：`tianqi7/` 现为压缩集 336MB→98MB（省 70.8%），原图备份在 web 树外 `_asset-backups/portraits-tianqi7-orig-20260603/`。脚本 `scripts/compress-portraits.ps1` 可复用。**桌面端实跑需眼验人物志网格肖像正常显示**（这是唯一剩余验证点）。
1b. ~~**🟢 删 9 个 `-trial` mockup（~24MB·零运行时引用）**~~ **已完成**（2026-06-03·owner 批「确保没用+备份」）：穷尽核查确认 js/html/css **零运行时引用**（仅 docs 设计文档历史 + build 自动生成 `.hot-update-manifest.json` 提及·均非运行时加载），属 Phase 8「12 殿」**已弃案** v2 设计的 Codex 生图 trial。9 文件（seal trial×3 + screen-overall trial×3 + yushufang trial×3）已整体**移出 web 树**到 `_asset-backups/ui-phase8-trial-orphans-20260603/`（保留目录结构+还原 README·可随时还原）。结果：`ui/` 36.8→12.7MB，`assets/` 180.5→**156.4MB**。`rail/`、`scenes/` 现为空目录（无害）。
2. 首页 ambient GIF 10.6MB → `<video>`(WebM/MP4) 或静态 PNG（已有静态 fallback `home-menu-imperial-study-v1.png`·仅 `prefers-reduced-motion` 时用）。仅省菜单/启动开销，非过回合。
3. 4 个 CJK TTF（25MB）→ woff2（改 4 行 `format("woff2")`）+ 按剧本字符集子集化。
4. CSS 视觉相关微调（动毛玻璃观感·需 owner 拍板）：常驻栏 `.gs-status-bar`/`.gs-turn-fab-bar`/`.toast` 去 `backdrop-filter:blur`；`.tmv3-turnhead` sticky 表头去 blur；box-shadow infinite 脉冲改 opacity。
5. **实跑验证全部 13 项代码改动** + 卡顿存档跑 `GM._lastEndturnTimingSummary`/`TM.perf.print()` 给数字校准下一轮。
- **saveP()**：每次 `deepClone(P)`（P 已含合并快照数据）是次要递归开销·归 [[autosave-A]] backlog·本轮不动。

## 7. 第二轮 (2026-06-10)·真存档实测驱动·存档管线 + 社交层 applyPending

> 用 owner 真存档（`__autosave__.json`·**T1 就 113MB**·202 chars/9 classes/7 parties）无头测量定位，按测量结果落 5 刀。
> 全部留 `.bak-perf-20260610-072134`。未 ship、未 commit。

### 实测结论（修复前）
| 热点 | 实测 | 工具 |
|------|------|------|
| `SocialPoliticalSignals.applyPending`（走 MinxinLedger 真实路径·15 个积压信号） | **6.75s 主线程冻结**·`MinxinLedger.recordAndApply` 6.3s/107 次（59ms/次） | `scripts/bench-applypending-profile.js` |
| 存档体积 | **113MB（T1！）**·pretty 缩进占 55%（60MB）·`_socialPoliticalSignalApplications`+`_partyClassActionSchedulerLastRun` 同内容审计深拷 10.4MB·`_facIndex`/`_savedMapData`/`_savedAdminHierarchy` 派生/冗余 5.5MB·`_saveMeta.scenario` 整剧本对象又一份 5.3MB | `scripts/analyze-save-size.js` / `analyze-save-size2.js` |
| 读档 JSON.parse | 877ms | 同上 |
| 社交层其余引擎（relations.run/actors.run/scheduler） | 65~150ms·健康 | `scripts/bench-social-chain-realsave.js` |

**applyPending 6.7s 的病根**＝与 1.3.3.1 rebuildMirrors 同款：「整体级运算放进逐笔循环」——`MinxinLedger.apply()` 每笔都跑 `aggregateTrue`（全树聚合）+ `rebuildMatrix`（全叶×全阶层重建）+ `updatePerception`（内含再一次 aggregateTrue）。

### 已落 5 刀
| # | 文件 | 改动 | 实测效果 |
|---|------|------|---------|
| R1 | tm-social-political-signals.js | applyPending 审计账本摘要化：`total.results` 只存标量摘要（计数+名称+before/after·`digestApplyResult`），不再深拷 coupling/evidence 整树；+ 旧存档账本一次性削平 heal | GM 紧凑序列化 33.1→20.9MB；账本 12.4MB→0.25MB；调度器 lastRun 5MB→~0 |
| R2 | tm-minxin-ledger.js + tm-class-minxin-bridge.js + tm-social-political-signals.js | **批量收口**：`apply({deferFinalize:true})` 跳过逐笔 aggregateTrue/rebuildMatrix/updatePerception·欠账 WeakMap 标脏·`finalizeBatch()` 批末一次（applyPending 末尾调·无欠账 no-op）·flag 经 applyClassImpact→applyClassPressure 线穿 | applyPending **6750→868ms（−87%）**；等价性实证：trueIndex/叶子民心 382/382/sources/阶层/党派**逐位相同**（`scripts/bench-minxin-equivalence.js`·17.6s→1.3s）；唯 376 行矩阵派生缓存有 ≤1.3 分基线时点差（批末取叶更新鲜·每回合本会重 derive） |
| R3 | tm-save-lifecycle.js:1274 | autosave `_saveMeta.scenario` 整对象→名字串（与手动存档 :557/:572 口径一致·读档方只字符串显示） | −5.3MB/档 |
| R4 | tm-save-lifecycle.js | `_autoSaveSnapshotGM` SKIP += `_facIndex`/`_savedMapData`/`_savedAdminHierarchy`（派生索引死拷贝/与工作数据逐字节同·restore 全条件式）+ fullLoadGame 读档后 `TM.FactionIndex.rebuild()`（旧档里的 _facIndex 本就是与 chars 脱钩的死拷贝·重建一并治） | −5.5MB/档 + 少 3 大块 deepClone/IPC |
| R5 | **main-impl.js**:1495/1427 | auto-save + save-project 写盘去 pretty（`JSON.stringify(data)`）| 文件 −55%。**⚠️ main-impl.js 不走热更·随下个完整安装包生效**（R1-R4 是 web/ 可热更） |

### 端到端效果（真存档模拟·`scripts/bench-save-size-after.js`）
- **存档文件 113MB → 28.1MB（−74%）**；gameState 30.5→15.6MB；读档 parse 877→274ms。
- autosave 渲染线程一次卡顿（snapshot deepClone+IPC structuredClone）成本随 GM −12MB 等比例下降。
- 过回合「颁行天下」同步冻结里社交层信号 apply 部分 ~6.7s→~0.9s。

### 回归验证
- 民心全套 13 脚本（six-stage/bridge/live-loop/3dao/commitment/hard-links×2/pressure/responsibility/persist/truevalue/pzv7-relief/pzv7-regularize）全绿。
- 社政全套 8+ smoke（social-political-signals/turn-result/scheduler/closed-loop/ecology/character-action/formal-desk/decay/tuning）全绿。
- save-lifecycle-dead-code、old-save-compat 全绿；verify-all 其余 247/250 绿。
- **4 个预存在红（非本轮造成·`.bak` 换回同样红已实证）**：①`smoke-start-game-data-integrity`（06-06 快照改内联注入器+CDN 兜底后·无头 harness 只执行 `<script src>` 标签拿不到地图=harness 局限·真浏览器不受影响）②`smoke-endturn-public-contract`（tm-endturn-ai.js 4549 行超守卫上限 4520）③`smoke-endturn-section-boundary`（同文件分节标记漂移）④`smoke-editor-reset-inventory`（重置蓝图缺新顶层 key）——②③④疑似并行实例改 tm-endturn-ai.js/编辑器所致·待 owner/另一实例认领。

### 本轮新 backlog
- ★★ autosave payload P 层 `map`+`mapData` 与 `gameState.mapData` 三份同内容（fullLoadGame :838 本就多源回退绑定）→ 有 gameState.mapData 时 P 层两份可不入 autosave（再 −4.8MB·中险·涉多 load 路径需细验）。
- ★ `scenarios[]` 每个剧本内嵌 `map`+`mapData` 两份（2.14MB×2）→ 剧本库去重（动剧本数据语义·缓做）。
- ★ `facs[].members.chars` 存整人物对象引用→序列化即复制（~0.8-1.6MB）→ 改存名字/ID 是数据模型手术·缓做。
- ★ 手动存档 `desktopDoSave` 用裸 `deepClone(GM)`（不走 SKIP/APPEND_ONLY）→ 可复用 `_autoSaveSnapshotGM`（restore 已兼容两态）。
- 观察项：`_changeQueue` T1 即 1.59MB（179 条剧本人物 entry·有界非病态）；`ClassCharacterRelations.run` ~110-150ms/回合（可接受）。
- `MinxinLedger.recordAndApply` 其余 6 个调用方（authority-engines/huji×2/commitment/hard-links/pressure-actions）多为单笔事件·若将来出现成批调用·`deferFinalize`+`finalizeBatch` API 已就绪。

## 8. 第三轮 (2026-06-10)·UI 交互卡顿:开/关页面 + 人物对话

> owner 报「UI 页面点击关闭、打开/关闭人物对话、对话进行中都特别卡」。静态溯源定位三类机理，落 5 刀。
> 备份 `.bak-uilag-20260610`(styles.css / phase8-formal-bridge / phase8-formal-drafts / tm-wendui / tm-player-core / tm-shizheng-panel / tm-office-panel / tm-office-runtime / tm-content-manager / tm-launch)。未 ship。

### 三类机理
1. **全屏遮罩 backdrop-filter:blur ×26 处**——开/关任何 UI 页面都整屏在「blur↔非 blur」间重栅格化；更糟的是御案上一堆 infinite 脉冲动画(奏疏流警示点 tmv3-pulse 1.4s/颁行天下按钮 glow 3s/各处 vacant 红点)在遮罩底下**每帧改变 backdrop→浏览器每帧重模糊整个视口**·贯穿整场对话/整个面板停留期。
2. **问对名册无 lazy 肖像 + 隐藏时也整列重建**——Tier-3 #12 的 `loading=lazy decoding=async` 修了人物志/鸿雁/御案草拟但**漏了 tm-wendui**(6 处 `<img>`)·且 renderGameState 尾部(tm-hongyan-office:2296)无条件调 renderWenduiChars(数百卡+肖像)·关对话窗也同步全量重建名册+左栏。
3. **流式逐 chunk 重排 + 开窗全量历史**——onChunk 每包都「全文重提取+textContent 重排+scrollTop 强制布局」(快流 20-60 包/s)·开窗渲染全部历史气泡(长期君臣可达数百条)。

### 已落 5 刀
| # | 改动 | 文件 |
|---|------|------|
| U1 | **26 处全屏交互遮罩去 blur**·alpha +0.03~0.07 补偿(modal-bg/turn-modal/pause/settings/all-vars/var-drawer/notify-urgent/ai-gen/generic-modal/renwu-page/rice-paper/tm-cl/tmf-module-overlay/tmf-records/tmf-event/tmf-module-overlay-renwu×2/tm-desk-overlay/tm-bridge-overlay/时政×5/官制×2/联机中枢 shell+detail/开局×3)+ 御案奏疏流吸顶表头 .tmv3-turnhead 去 sticky-blur 改实底渐变(滚动每帧重算·audit §5 既定项)。**保留**:登基/终局/联机更新仪式三个一次性戏剧遮罩 + 小面积常驻 chrome(toast/#bar/状态栏/fab·owner 拍板项) | styles.css·phase8-formal-bridge.js·phase8-formal-drafts.js·tm-shizheng-panel.js·tm-office-panel.js·tm-office-runtime.js·tm-content-manager.js·tm-launch.js |
| U2 | 问对 6 处肖像 `<img>` 补 `loading="lazy" decoding="async"`(名册卡×2/挑人弹窗/求见列/气泡头像×2) | tm-wendui.js |
| U3 | renderWenduiChars 加 `force` 参数+gt-wendui 隐藏即跳过(与 #11 纪录类面板同范式)·switchGTab 切入时 `renderWenduiChars(true)`·关对话窗的名册+左栏刷新推迟两帧 rAF(弹窗移除先上屏·关闭手感即时) | tm-wendui.js·tm-player-core.js |
| U4 | 两条流式路径(sendWendui+求见开场白)onChunk 改 **rAF 合帧**:每帧至多一次 DOM 写·仅玩家贴近底部才跟滚·流尾 flush 兜底 | tm-wendui.js |
| U5 | 开窗历史渲染窗口化:只渲最近 60 条+「更早 N 条已收起」(数据不裁·AI 上下文照常 slice(-10)) | tm-wendui.js |

### 验证
- 问对全套 8 脚本(active-audience/edict-draft/json-leak-guard/prison/counsel/commit-context/envoy/slice6)全绿——json-leak-guard 曾红:守卫数 `_wdVisibleReplyPreview(txt)` 字面≥2·U4 重构后改回 `txt` 命名+给第二条流式路径同款合帧后绿(守卫意图「流式文本必过消毒」始终满足)。
- 时政/官制/联机中枢/开局/史册 7 面板 smoke 全绿;boot/render/headless(227 基线)全绿。
- **待 owner live 验**:开关问对/页面手感+无 blur 后的视觉观感(alpha 已小幅补偿·若嫌遮罩太「平」可只回滚 styles.css 对应行)。

### 本轮未动(顺延 backlog)
- 小面积常驻 chrome blur(toast 12px/#bar 12px/状态栏/fab/turn-summary/bar-time-pop/home-foot)——视觉影响大于收益·owner 拍板。
- `tmv3-pulse`/`og-group-glow` 等 box-shadow infinite 脉冲改 opacity/transform——遮罩 blur 移除后其放大效应已消·剩小区域每帧重绘·收益小。
- renderGameState 尾部(tm-hongyan-office:2296)`renderOfficeTree()` 仍无条件渲染(隐藏 tab 也建 SVG 树)——同范式可治·下轮。

## 9. 第四轮 (2026-06-10)·renderGameState 急切重建清尾 + 高频小卡

> 「继续清查」轮。盘点 renderGameState(tm-hongyan-office.js:1746) 全部 15+ tab 构建方式后清尾。
> 备份 `.bak-perf4-20260610`(tm-office-runtime / tm-hongyan-office / tm-topbar-vars / tm-wendui / phase8-formal-rightrail)。未 ship。

### 盘点结论（★★★「懒渲染当前 tab」收口）
- 经 #11/三轮 U3 的逐步 guard 后，renderGameState 的 tab 们已全是「骨架 shell + 受 guard 的渲染器」——除了三处：
  ① 尾部 `renderOfficeTree()` 无 guard（隐藏 tab 也整棵 SVG 衙门树+摘要）；
  ② gt-edict 内联构建中的「往期诏令档案」(全量 `_edictTracker` 循环×每条嵌 `letters.find`·随回合**无界增长**·藏在默认折叠的 `<details>` 里)；
  ③ gt-edict 其余静态结构(textarea 卡)——**不可懒化**：御案起草台经 formal-drafts bridge 把草稿写进这些 textarea 供 endturn 拾取(smoke-formal-edict-endturn-bridge 锁定该契约)·textarea 必须常驻。
- 至此 ★★★ 项以「增量 guard」方式收口·不再需要 big-bang builder 重构。

### 已落 4 刀
| # | 改动 | 文件 |
|---|------|------|
| V1 | `renderOfficeTree(force)` 加 gt-office 隐藏跳过(同 #11 范式)·switchGTab 切入钩/官制 standalone 都先显后调不受影响·endturn 期间隐藏态刷新改由切页钩子补齐 | tm-office-runtime.js |
| V2 | 「往期诏令档案」改 `<details>` **展开时才构建**(`_renderEdictArchiveBody`·循环体原样迁出·每次展开重建保新鲜)·renderGameState 内只算条数 | tm-hongyan-office.js |
| V3 | `renderTopBarVars` 输出串未变则不动 DOM(20+ 调用点·含每次 renderGameState/applier 逐条变更·渲染器照跑只省 innerHTML+reflow) | tm-topbar-vars.js |
| V4 | `wenduiHistory` 写入端封顶 400 条/人(两条落账主路径·AI 上下文 slice(-10)/UI 渲 60 不受影响·治长局存档膨胀) | tm-wendui.js·phase8-formal-rightrail.js |

### 验证
- 官制 standalone/问对×3/顶栏财政一致性/formal-edict-endturn-bridge(③的契约锁)/bridge-state/perf-guards/nearcauses/minxin-pressure 10 项全绿；boot/render/headless(227) 全绿；old-save-compat 绿。
- `ed-archive` 样式类继续由懒构建体产出·无其它消费者；editor-government.js 的同名 renderOfficeTree 是编辑器独立函数不受影响。

### 评估未做
- gt-edict 整面板懒化——被 formal 起草台 bridge 依赖挡死（见上 ③）·收益已被 V2 拿走大半。
- 右栏 gr 30 人卡内联构建(calculateWuchang/EnYuanSystem 逐人调)——常显面板·属合法工作·若再报卡可做输出 memo。
- `aggregateRegionsToVariables` ×3/回合——维持撤回结论(民心/吏治真相源·删调用风险高)。

## 4. 备注
- 测真实数字（§0）应在 ROI 排序前做一次，校准 A vs E 的权重。
- Tier-1 全部 node 语法过，但**端到端验证需在桌面端实跑游戏**（过几个回合、地图悬停、长局存档）——这步只有 owner 能做。
- 所有改动留 `.bak-perf-*`，可一键还原。未 ship、未 commit。

---

## §10 第五轮（2026-06-10·「几乎点击所有 UI 按键都会卡顿一下」）

### 症状与测法
owner 报**所有按钮**点击都卡一下——指向全局公共开销而非单面板。本轮全程真浏览器实测定位（不再静态猜）：
- playwright(msedge headless) 开真游戏·注入 `PerformanceObserver(longtask + event)`(Event Timing=点击→下帧真实耗时) + CDP `Profiler`(函数级归因·200µs 采样)
- 点击矩阵：右栏 8 面板/左 dock/御案模块/设置 ×2 轮·另设「游戏内发呆 12s」对照相位排除周期任务
- DOM 普查：`querySelectorAll('*')` 计数 + 最肥容器 top14 + 各容器 computed 隐藏方式

### 三个根因（全部实锤）
**① 语义召回(bge-small-zh)在主线程跑 WASM**——`tm-semantic-recall.js` 游戏开始 +5s 自动加载模型：
- 初始化 21.3s 墙钟·其中**主线程长任务 10.4s(8 大块·秒级整段冻结)**；每条嵌入 ~160ms 主线程占用
- 回合末 `buildIndex` 把新增史册逐句×30/编年/伏笔/事件表成批嵌入；且 `loadIndex/persistIndex` **无任何调用方**→索引从不持久化→**每个会话 lastIndexedTurn=0·老存档第一次过回合全量重嵌整个历史**(数百至上千条×160ms)
- 连带发现：`vendor/transformers/onnxruntime-common.esm.js` 被 jsDelivr 构建成 `export default null;` 而 ort-web 恰恰只吃 default import→**本地 vendor 链从来就是死的**·运行时一直静默回退 jsDelivr CDN(国内网络再赌一次)
- ort `env.wasm.proxy=true` 旗标实测**无效**(该 ESM 构建下 init 仍 8.3s 主线程长任务)

**② 面板开合用 `transition:width`**——`#rpanel`/`#drawerRight`(formal bridge 内联样式) 0↔390px 过渡 180ms·**每帧对刚 innerHTML 重建的整面板子树重新布局+绘制(~11 趟)**·事件 feed 同病。点面板固定卡 250-500ms·js≈0 全在原生渲染管线——与实测完全吻合。

**③ formal 御案浮在一个完整渲染的经典 UI 上**——DOM 普查：整页 22,368 节点·`#drawerRight` 藏着 **13,688**(`.gs-cd-scroll` 199 张人物卡)·`#drawerLeft` 4,070(#gl 布局高 20,201px)·均为「width:0/translateX 藏」=**照常 style+layout**·每次任何点击的全局样式失效都拖 1.8 万隐藏节点陪跑。(#gc 经典子元素已 display:none 自然豁免·且内含活的 formal 主壳——**不可**对 #gc 加 c-v·差点误伤)

另：`AudioSystem.playSfx` 每次播音效 `new AudioContext()`(Windows 10-100ms 级+并发上限 ~6 泄漏)。

### 六刀（备份 `.bak-perf5-20260610`·未 ship）
| # | 改动 | 文件 |
|---|------|------|
| S1 | vendored ort-common `export default null` → 命名空间对象(一行)·本地离线链复活 | vendor/transformers/onnxruntime-common.esm.js |
| S2 | **模型加载+嵌入推理整体挪进专用 module Worker**(`tm-semantic-worker.js` 新文件·协议 init/embedBatch/progress)·主线程只收发消息·worker 启动失败(如 Electron file:// 环境异常)无缝回退原主线程路径(smoke 字面量保留) | tm-semantic-recall.js + tm-semantic-worker.js(新) |
| S3 | `loadIndex/persistIndex` 接线·按 campaign(`GM._runId`·与科举 v7.1 同字段)隔离防跨存档污染·buildIndex 首次先吃上会话索引·有新增才落盘 | tm-semantic-recall.js |
| S4 | 面板开合 `transition:width` → **宽度恒定+`transform:translateX` 滑入**(合成器动画·零布局)·feed 去 width 过渡(瞬时) | phase8-formal-bridge.js(codemod-panel-slide-transform.js) |
| S5 | 闭合抽屉 `.gs-drawer-body` 加 **`content-visibility:auto`**(移出视口即跳过渲染管线·DOM 读取不受影响·`.open` 滑入自动恢复) | phase8-formal-bridge.js(codemod-drawer-content-visibility.js) |
| S6 | `playSfx` AudioContext 共享单例(+suspended resume) | tm-audio-theme.js |

### 实测数字
- 模型初始化主线程长任务：**10,376ms → 0ms**；10 次嵌入主线程长任务：**~1.6s(每条160ms) → 0ms**(worker 内 ~123ms/条·主线程零感)
- 持久化 round-trip(playwright 三会话)：同 campaign 复吃 added=0·异 campaign 拒吃·语义命中正确(「辽东战事边防」→袁崇焕宁远条)
- 点击(fresh T1·同机同法三轮对比·±30% 噪声)：政务问对 173→78ms·户部财计 169→85ms·纲纪总览 240→181ms·百官人事 323→226ms·鸿雁/问对/人物 51→**0ms**·设置 158→80ms
- 游戏内发呆 12s 对照：0 长任务(周期定时器全部洗清·卡顿全为点击自身工作)
- 真存档(本机 118MB autosave)注入复测：与 fresh 同量级·无数据放大

### 验证
- 功能 e2e 5/5：右抽屉 `]` 开(199 卡渲染·杨鹤卡文本在)/关·左抽屉 `[` 开/关·rpanel 开(内容在·进视口)/关(出视口)·截图肉眼核对
- 烟测：audio-bgm/formal-edict-endturn-bridge/formal-ui-bridge-state/old-save-compat(15)/performance-optimization-guards/phase8-office-standalone/endturn-console-regressions(10) 全绿
- 全局：boot 283/283·render 17/0·headless **227/0** 基线保持
- 打包核对：build-hot-update-package 全目录扫描制·新 worker 文件/vendor 修复自动入包·`.bak-*` 被 ALLOWED_EXTS 排除

### Backlog（按价值排序）
- **奏疏/诏书御案模块开启 ~1.3s**(zhao-btn-2·自身仅+165 节点·开销在全页样式重算/整屏 overlay 绘制·二次开启同贵→非一次性 decode)——单点非「所有按钮」类·下轮专攻
- **fullLoadGame 后 3.4s 渲染爆发**(载档 UX·与轮二载入链路 backlog 合并)
- Electron file:// 下 module worker 可用性待 owner 实跑确认：游戏内 console 查 `SemanticRecall.status().workerActive`·false=走了回退(行为同旧版·不劣化)
- vendor 仅含 lib·ort 的 .wasm 文件仍从 CDN 拉(~10-30MB)·要完全离线需 vendor 进安装包——**owner 拍板**(安装包体积 +30MB)
- 右栏面板渲染器输出 memo(同 V3 范式)·真后期大档如再报卡再做

---

## §11 第六轮（2026-06-10·owner「再优化一次，之后我再试」）

### 测法升级
CDP **Tracing**(devtools.timeline) 拆渲染管线（Layerize/UpdateLayoutTree/Paint/Layout 时长+失效元素数）+ `document.getAnimations()` 活体动画普查 + 归因实验（发呆 6s trace：基线 vs 注入 `*{animation-play-state:paused}`）。

### 两个新根因（实锤）
**④ 常驻 CSS 动画把主线程烧掉 ~60%**：发呆 6s 基线 Layerize **2545ms**×468 + UpdateLayoutTree **987ms**×566；动画全停后 6ms/0ms——churn 100% 来自动画。活体普查：主力=**`tmv3-flash` ×74**（事件 feed 每条 is-new 的 ::before 金线无限闪·T1 全 74 条命中 `turn>=currentTurn`·每条提独立合成层→~97 层逐帧重组）。且 renderEventFeed 每次重建 innerHTML 动画重播——活跃操作期闪烁永续。平时 5-8ms/帧潜伏在 longtask 雷达下·点击一叠加就破 50-300ms。
**⑤ findLiveAdminDivision 每地块全树深走**（phase8-formal-map.js）：载档后单个 **12.7s 长任务**（профиль：walk 6.4s + regionKeyNorm 3.2s）——每个地块对 GM+P 两棵 adminHierarchy 全递归（seen 还是数组 indexOf=节点级 O(n²)）×每节点 14 字段 regex 归一化；`ownerKey()` 逐地块调它→**载档和回合末地图刷新都在烧**。

另：9 个 `install*Styles` 每次调用无条件重写 `st.textContent`（内容没变也整张样式表重解析+全文档样式重算）——模块开启链上的固定税。

### 五刀（`.bak-perf6-20260610`·未 ship）
| # | 改动 | 文件 |
|---|------|------|
| E1+E2 | tmv3-flash 无限闪→**仅最新4条·闪3次**(7.2s 注意力提示·is-new 全员保留静态金线+新徽章·语义不变)；闭合抽屉内动画 `animation-play-state:paused` | phase8-formal-bridge.js (codemod-anim-churn.js + codemod-flash-cap.js) |
| E3 | 9 个样式安装器幂等化（`__tmCss` 串比对·没变不碰 DOM）·⚠️教训：初版终点正则把 css 里 `content:"";` 的「双引号+分号」当语句尾截在字符串中间·语法碰巧合法 node --check 拦不住·已回滚重做（修正版=只认单引号+分号·断言语句长>3000） | bridge/drafts/records (codemod-anim-churn2/3.js) |
| E4 | `regionKeyNorm` 结果 memo（Map 缓存·20k 上限） | phase8-formal-map.js |
| E5 | `findLiveAdminDivision` 改**一次建索引**(同遍历序 normKey→{node,seq}·查询取 seq 最小=原版「walk 序首命中」语义·按 GM根/P根/回合失效)·测试柄 `bridge.map.__findLiveAdminDivision` | phase8-formal-map.js |

### 实测数字
- 发呆 6s 渲染churn：Layerize 2545→**3ms**·UpdateLayoutTree 987→**0ms**（动画停等效值）
- 奏疏模块开启 worstEvent：1296-1568 → **496ms**；样式重算元素数（两开一关窗口）44,841→**5,094**(-89%)
- 点击矩阵（fresh T1·与五轮起点比）：百官人事 416-504→**264**·纲纪总览 352→**168**·政务问对 240-296→**200**·舆图/户部 144-248→**120**·鸿雁/问对/人物→**0**(worst 32-40ms)·设置→**104**·点击全程长任务仅 **9 个**·(program) 17s→6.2s(主线程 11.2s 空闲)
- findLiveAdminDivision：43 地块旧 1079ms→新 **0ms**·**等价性 43/43 零分歧**（真档·旧实现 verbatim 对照）
- 载档 settle 期长任务：**24.3s→1.5s**（12.7s 巨兽消失·余 656+607+238ms=合法载入渲染）

### 验证
- 等价性：probe-admidx-equiv 43/43 PASS；功能 e2e 5/5（抽屉/面板开合·199 卡渲染）；地图配色由 ownerKey 等价性背书
- 烟测 10 项：map-live-panels/p5-zeta-map-ui(54)/formal-edict-endturn-bridge/formal-ui-bridge-state/old-save-compat(15)/perf-guards/office-standalone/endturn-console-regressions(10)/audio-bgm 绿；**smoke-tianqi-map-runtime 红=pre-existing**（换 .bak 对照同红·`fac_mp9rsc3f4r9co` vs `fac-later-jin` 期望=天启键空间漂移债·非本轮引入）
- 全局：boot 283/283·render 17/0·headless **227/0**

### 评估后不做
- isGameVisible 快路径——六轮后自耗已降到 13-34ms·噪声级·风险>收益
- fullLoadGame 残余 1.5s——renderGameState×2/officeTree×3 等合法载入渲染·暂留
- 奏疏模块残余 496ms——overlay 构建+整屏绘制的真实成本·可接受

### Backlog 更新
- 玩家实跑确认 `SemanticRecall.status().workerActive`（Electron file:// worker 可用性）
- ort .wasm vendor 进安装包（完全离线·+30MB owner 拍板）
- smoke-tianqi-map-runtime 键空间漂移修复（pre-existing·归 bug 巡检线）

---

## 第七轮（2026-06-10/11·owner 三具体场景投诉：问天卡 / 关人物对话卡 / 滑动浏览卡）

六轮测的是按钮点击矩阵·没覆盖这三个具体交互。场景化探针逐个实测 + profile 定位，揪出一个**系统级总根**。

### 病根（profile 实证·非猜）
**① 人物图志（renwu-tuzhi）开 = 1561ms 冻结**：开任何人物都把**整张 201 张花名册卡片**渲进 DOM（27,674 节点）·每张含一个 SVG 忠诚环。profile：`(program)` 2000ms（HTML解析+样式+布局+绘制）·`renderRoster` JS 仅 **32ms**·`pcard` 1ms——**渲染绑定·非 JS 绑定**（=content-visibility 教科书场景）。

**② 问对（wendui）开/关各 ~460ms**：表面 syncMs 仅 2-8ms（弹窗即移除），但 2 帧后一个 **~460ms 长任务**砸下。profile 真凶**不是 wendui 卡片（才25张）**而是**地图重渲**——开问对对后妃会 `addEB`→`scheduleFormalRuntimeRefresh`→`showHome`→`renderFormalMap` 全量重建地图 SVG·其中 `findLiveProvinceStats` 176ms + `liveRegionOwner` 111ms = **逐省全扫 GM.provinceStats(210项)+GM._provinceToFaction(210项)**（round6 没碰的另两条未索引扫描）。**根本不改地图却每次全量重渲**——这也是六轮「点啥都卡」的总根（每次 renderGameState/addEB 都重建地图）。

**③ 滑动浏览**：真滚轮 + mousemove 悬停风暴在 .main-scroll/.gs-drawer-body 上 headless **0 长任务**=合成器/光栅绑定·桌面扛得住·弱机才显。

### 四刀（`.bak-perf7-20260610`·未 ship）
| # | 改动 | 文件 |
|---|------|------|
| F1 | `.pcard` 加 `content-visibility:auto;contain-intrinsic-size:auto 64px`（离屏花名册卡片跳过布局/绘制·节点数不变） | tm-renwu-tuzhi.js |
| F2 | `findLiveProvinceStats` 改**索引**（同 round6 法·Phase2 字段扫一次建 normKey→{行键,seq}·查询取 seq 最小=原「scan 序首命中行」·Phase1 直命 O(1) 现读·值经 stats[key] 现读·按 (ref,回合) 失效） | phase8-formal-map.js |
| F3 | `liveOwnerFromProvinceMap` 改**索引**（同法·normKey→{key,seq} 首现胜·值 map[key] 现读） | phase8-formal-map.js |
| F4 | `renderFormalMap` 加 **dirty-guard**：`formalMapSignature()` = mapId + mapMode + mapScale + 逐区(canonicalOwnerKey+regionColor)·与上次相同则只刷廉价 chrome（图例/警示/检索/transform）跳过昂贵 SVG 重建·`invalidateFormalMap()` 逃生阀 | phase8-formal-map.js |

### 实测数字
- 人物图志开：**1561 → 138ms**（warm 116ms·c-v `auto` 生效·201 卡 27,674 节点不变·只跳离屏渲染）
- 问对开：**468 → 52ms**；关：**458 → 149ms**（早先的「延迟 2 帧刷新」只是把冻结挪到点击之后·守卫才真消除）
- 省份函数（43 地块）：旧逐省全扫 176+111ms → 新 **1ms**·**等价 0 分歧**（provinceStats 210·provinceToFaction 210·其中仅 1 键匹配 43 个省级地图区·其余 209 是府级不上图——所以旧版「扫 210 项即使没命中」纯浪费）
- 点击矩阵复测：profile top self-time **地图函数全消失**（renderFormalMap/findLiveProvinceStats/liveRegionOwner 不再出现）·小按钮（鸿雁/问对/人物/设置）**0 长任务**·奏疏 496→**246**·百官人事 264→**93**（户部/舆图 653ms 是冷开建面板 DOM·非地图归属·pre-existing）

### 验证
- 省份索引等价性：probe-prov-equiv **0 分歧**（43 区·新旧 verbatim 对照·暴露 `__findLiveProvinceStats/__liveOwnerFromProvinceMap/__regionKeyNorm/__regionMatchFields` 测试柄）
- 地图守卫：无变化→**跳过**（G1 标记存活）·invalidate→**重建**（43 区·标记清）·真色变→重建**靠检查证明**（factionLabelLayer→ownerGroups 按 canonicalOwnerKey 分组·regionColor 输出整个进 sig·故 SVG=纯函数(sig+静态几何)·不可能误跳过）；运行时凑不出第二势力因该存档**全 43 区归明朝廷一家**（天启明朝局·distinctVal=1）
- 烟测：map-live-panels/p5-zeta-map-ui/perf-guards/ui-lag/right-panel-lag/typing-lag/army-panel-lag **7 绿**·**smoke-tianqi-map-runtime 红=pre-existing**（换 `.bak-perf7` 对照同红 `fac_mp9rsc3f4r9co`·非本轮引入）
- 全局：boot **283/283**·render **17**·headless **301/301**

### 评估后不做
- 盲目给 .gs-drawer-body 子节点加 c-v——headless 测不出收益（已 0 长任务）+ 部分模块含活内容（#gc 活壳教训）·风险>证据·改走「owner 指认具体卡的列表再 c-v 其行」
- wendui 卡片 c-v——地图修掉后只剩 25 张·边际
- 人物图志冷开 555ms（首开·暖 116ms）——可加「先渲 dossier·roster 推迟一帧」但暖路径已够·暂留

### 给 owner 实测的话
- 三投诉对应：人物详情开/关（F1）·问对开/关（F4 地图守卫·**也是六轮「点啥都卡」的总根**）·滑动（守卫消除滑动时背景 renderGameState 的地图重渲 hitch + 最重的花名册列表已 c-v）
- 滑动若仍卡：多半弱机光栅/合成（headless 测不出）·指认具体哪个长列表·我 c-v 其行
