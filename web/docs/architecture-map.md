# tianming Architecture Map v0

date·2026-05-03 · status·**v0 first cut** (Phase 1 slice 1·Claude draft·Codex review 后补充)

## 用法 (强制)

> **改任何功能·先查这表·改 X 看 Y 文件**
> **新增功能·先看是否已有·有则改·无则按 5.2 §命名规约 + 5.5 头注模板新建**
> **每次重构 slice·必同步更新本表**

依据·`web/docs/architecture-target-final.md` §4 边界 + §5 命名 + §11 第一批 slices

---

## 1·总表·业务域 → 一处主文件 (top 30 重点 + 全 22 业务域)

| # | 功能域 | active 主文件 | 次要 / data / UI | 禁改到哪里 | smoke |
|---|---|---|---|---|---|
| 1 | 朝议·常朝/廷议/御前 | `tm-chaoyi-changchao.js` (常朝) + `tm-chaoyi-tinyi.js` + `tm-chaoyi-yuqian.js` + `tm-chaoyi.js` (入口·_cc2 prompts) | - (P3 done·misc 已重分到 office-panel/launch/map-system) | tm-wendui / tm-tinyi-v3 | cc3-smoke |
| 2 | 廷议·弹劾 | `tm-tinyi-v3.js` (P3 → `tm-tinyi.js`) | - | tm-chaoyi-v3 | tinyi-impeach |
| 3 | 问对 (1v1) | `tm-wendui.js` | - | tm-chaoyi-v3 | wendui-smoke |
| 4 | 诗政·御前独召 | `tm-shizheng-panel.js` | - | - | - |
| 5 | 回合·入口/管道 | `tm-endturn-core.js` (P3 →`-pipeline.js`) | tm-endturn-prep / -systems (P3 →-step3-systems) | tm-endturn-ai-infer | smoke |
| 6 | 回合·AI 推演 | **`tm-endturn-ai-infer.js`** (12591·P1 section map + R7 context first split) | tm-endturn-ai-helpers / tm-endturn-ai-context / tm-prompt-composer | tm-endturn-render | endturn-ai smoke |
| 7 | 回合·结果展示 | **`tm-endturn-render.js`** (Claude review at merge) | tm-endturn-helpers | tm-endturn-ai-infer | **render-smoke** (P1 slice 5) |
| 8 | 回合·省份结算 | `tm-endturn-province.js` | - | - | - |
| 9 | 回合·诏令效果 | `tm-endturn-edict.js` | - | - | - |
| 10 | AI·LLM 调度 | `tm-ai-infra.js` | - | tm-ai-change-applier | ai-infra |
| 11 | AI·输出 schema | `tm-ai-schema.js` | - | - | - |
| 12 | AI·输出应用 | `tm-ai-change-applier.js` | tm-ai-output-validator / tm-ai-apply-deaths | tm-ai-infra | applier |
| 13 | AI·prompt 片段复用 | `tm-prompt-composer.js` | - | - | composer-smoke |
| 14 | AI·规划 | `tm-ai-planning.js` | - | - | - |
| 15 | AI·NPC 奏疏 | `tm-ai-npc-memorials.js` | - | - | - |
| 16 | 角色·schema | `tm-char-full-schema.js` | - | tm-char-autogen | - |
| 17 | 角色·autogen | `tm-char-autogen.js` | - | tm-char-historical-profiles* | - |
| 18 | 角色·历史人物 data | `tm-char-historical-profiles.js` (base 27) | `tm-char-historical-wave-{01..12}.js` (P2 split done·~10649 行12 wave) | - | official-scenario-smoke |
| 19 | 角色·经济 | `tm-char-economy-engine.js` | tm-char-economy-ui | - | - |
| 20 | 角色·弧线 | `tm-char-arcs.js` (异步·idle-driven 推演) + `tm-arcs.js` (同步·event-driven 记录) | (互补·非 duplicate·P1 audit done·见 p1-deferred-audits.md §2) | - | - |
| 21 | NPC·engine | `tm-npc-engine.js` | tm-npc-decision | tm-class-engine | npc |
| 22 | NPC·阶级 | `tm-class-engine.js` | tm-class-mobility | - | - |
| 23 | NPC·特质 | `tm-traits-data.js` | - | - | - |
| 24 | NPC·关系 | `tm-relations.js` | tm-rel-graph | - | - |
| 25 | NPC·影响力集团 | `tm-influence-groups.js` | - | - | - |
| 26 | UI·人物志 | `tm-renwu-ui.js` | - | tm-npc-* | renwu-render |
| 27 | 军事 | **`tm-military.js`** (Codex own) | tm-military-ui (薄) | - | military |
| 28 | 财政·级联 + 固定支出 | `tm-fiscal-engine.js` (**P3 done 2026-05-03** F6·后cascade + fixed-expense·rename) | `tm-fiscal-ui.js`·`tm-tax-atomic.js` (R10 已删除；旧 PhaseH/tax-atomic 能力已分配到财政/经济/封建等引擎) | - | official-scenario·smoke |
| 29 | 财政·UI | `tm-fiscal-ui.js` | - | - | - |
| 30 | 经济 + 货币 + 环境承载 | `tm-economy.js` (top-level·留独立) + `tm-economy-engine.js` (P3 done F7 2026-05-03·5 IIFE 合·CurrencyUnit/CurrencyEngine/EnvCapacityEngine/EconomyLinkage/EconomyGapFill) | - | - | official-scenario·smoke |
| 31 | 腐败 | `tm-corruption-engine.js` (engine·-p2/-p4 ACCEPTED LAYERING·R12 deferred·必先 5-8 smoke) | - | - | - |
| 32 | 国库 | `tm-guoku-engine.js` (R9 done·5→1 inline) + `-panel.js` (UI) | **R9 done 2026-05-04·p2/p4/p5/p6 全 inline 入 engine·5→2 文件·121 assertions baseline 全过** | - | 8 smoke-guoku-* (R8) |
| 33 | 内帑 | `tm-neitang-engine.js` (**P3 done 2026-05-03** F2·inline p2·1213 行) + `tm-neitang-panel.js` | - | - | - |
| 34 | 户口 | `tm-huji-engine.js` | tm-huji-deep-fill | - | - |
| 35 | 官制·runtime | **`tm-office-runtime.js`** | tm-office-panel | tm-office-editor | - |
| 36 | 官制·in-game editor | `tm-office-editor.js` | `editor-office-deep.js` (P3 done·rename from tm-editor-office-deep) | - | - |
| 37 | 科举 | **`tm-keju-runtime.js`** (3209) | - | - | - |
| 38 | 信房·letter (R6 carve 后) | **`tm-hongyan-office.js`** (2685·**P3 R6 done**·官制相关 carve 到 tm-office-system) + `tm-office-system.js` (741·**R6 新建**) | - | - | smoke-letter-full / -intercept-react / -office-dynastification |
| 39 | 策命 | `tm-ceming.js` | - | - | - |
| 40 | 皇权 | `tm-authority-complete.js` + `tm-authority-engines.js` (P3 audit cleanup) | -ui / -deep / tm-court-meter | - | - |
| 41 | 行政区划 editor (form) | `editor-administration.js` (P2 done·rename from `administration.js`) | (game runtime → tm-endturn-province / tm-central-local-engine / tm-region-enrich / `editor-division-deep.js` P3 done) | - | - |
| 42 | 地图·system | `tm-map-system.js` | - | - | - |
| 43 | 地图·识别 (5 → 1) | `map-recognition.js` (P3 后-improved/-eu4/-borders/-fast strategy) | - | - | - |
| 44 | 地图·editor | `map-editor-smart.js` (P3 audit 重叠 -pro) | map-editor-pro | - | - |
| 45 | 地图·region editor | `map-region-editor.js` | - | - | - |
| 46 | 地图·显示/转换/集成 | `map-display.js` / `map-converter.js` / `map-integration.js` | - | - | - |
| 47 | 法度·机制 | `tm-mechanics.js` | tm-mechanics-world | - | - |
| 48 | 诏令·解析/阈值/lifecycle | `tm-edict-parser.js` / `-thresholds.js` / `-lifecycle.js` | `tm-edict-complete.js` (active 实质·诏令补完·11 类奏疏触发 + 6 主题问对·P1 audit done) | - | - |
| 49 | 世界 | `tm-world.js` | tm-world-snapshot / -view | - | - |
| 50 | 封建 | **`tm-feudal.js`** (2656) | - | - | - |
| 51 | 预言 | `tm-prophecy.js` | - | - | - |
| 52 | 民族宗教 | `tm-ethnic-religion.js` | - | - | - |
| 53 | 玩家·core | **`tm-player-core.js`** (2873) | tm-player-tools / -settings | - | - |
| 54 | 主循环·朝政中心| **`tm-game-loop.js`** (2223) | - | - | - |
| 55 | 启动 | `tm-launch.js` | - | - | - |
| 56 | 引擎常量 runtime | `tm-engine-constants.js` | - | - | - |
| 57 | Namespaces | `tm-namespaces.js` | - | - | - |
| 58 | Event bus | `tm-event-bus.js` | tm-event-system | - | - |
| 59 | Electron | `tm-electron.js` | - | - | - |
| 60 | 环境 | `tm-env-detect.js` + `tm-env-recovery-fill.js` (P4 名 `tm-env.js`) | - | - | - |
| 61 | 存档·lifecycle | `tm-save-lifecycle.js` + `tm-save-manager.js` (P3 → `tm-save-engine.js`) | tm-storage / tm-state / -snapshot / tm-migration | - | save-smoke |
| 62 | 数据·model | `tm-data-model.js` | tm-data-access | - | - |
| 63 | 数据·历史预设 | `tm-historical-presets.js` | tm-history-events | - | - |
| 64 | 内存·奏疏 | `tm-memorials.js` | - | - | - |
| 65 | 内存·tables/anchors | `tm-memory-tables.js` | -anchors / -adapter / -semantic-recall | - | - |
| 66 | 编辑器·shell | **`editor.js`** (2379) | `editor-core.js` (P1 audit·或 inline) | - | - |
| 67 | 编辑器·CRUD | **`editor-crud.js`** (2026) | - | - | - |
| 68 | 编辑器·schema adapter | `editor-schema-adapter.js` | - | - | - |
| 69 | 编辑器·game systems (top audit) | **`editor-game-systems.js`** (1869·**P1 slice 7 audit·timeline/goals/edicts/offend/influence 已拆**) | - | - | - |
| 89 | 编辑器·timeline form | **`editor-form-timeline.js`** (R6 新建) | - | - | - |
| 70 | 编辑器·fullgen | `editor-fullgen.js` (P3 → `editor-ai-fullgen.js`) | - | - | - |
| 71 | 编辑器·AI 多 pass | `editor-ai-gen.js` + `editor-ai-multipass.js` (P3 后`editor-ai-batch.js`) | editor-ai-validate | - | - |
| 72 | 编辑器·form (政府/财政/军事/腐败/官制/模型) | editor-government / -fiscal / -military / -corruption / -engine-constants / -model-requirements (P3 →`editor-form-*.js`) | - | - | - |
| 73 | 编辑器·map | `editor-map.js` | - | - | - |
| 74 | 编辑器·异常前缀 | `tm-editor-*` 4 文件 (P3 → editor- 前缀统一) | - | - | - |
| 75 | UI·变量 | `tm-var-drawers.js` + `tm-topbar-vars.js` | - | - | - |
| 76 | UI·help/social (含 SAVE migration·跨域) | `tm-help-social.js` (1294·P3 拆) | - | - | - |
| 77 | UI·三系统 | `tm-three-systems-ui.js` + `tm-three-systems-ext.js` | - | - | - |
| 78 | UI·panel | tm-shell-extras / -lizhi-panel / -sidebar-ui / -shizheng-panel / -shiji-qiju-ui / -memory-ui | - | - | - |
| 79 | UI·foundation | `tm-ui-foundation.js` (P4-beta 已合：icons + modal + settings placeholder + cheatsheet) | - | - | - |
| 80 | UI·errors / diag | `tm-diagnostics-foundation.js` / `tm-diagnostics-panel.js` | - | - | - |
| 81 | Test / Diag | tm-test-harness / -test / -integration-bridge / -checklist / -audit / -invariants / -perf / -recall-gate / -onboard-tools | - | - | - |
| 82 | Utils foundation | `tm-utils.js` (993) | tm-time-utils / -diff / -changelog | - | - |
| 83 | Patches·dump 待清理 | `tm-patches.js` (1915·P2-3 inline 6 段) / `tm-phase-c-patches.js` (498·LAYERED·P3+ smoke) / `tm-phase-f1-fixes.js` (247·P1 audit done·LAYERED·与 phase-c 同类) | - | - | - |
| 84 | Phase 文件·dump | tm-guoku-p* / tm-corruption-p* / tm-neitang-p2 / tm-authority-deep (主文档 P3 inline -engine) | - | - | - |
| 85 | Hooks / chronicle | `tm-hooks-tracker.js` / `tm-chronicle-system.js` + -effects / -tracker | - | - | - |
| 86 | 索引 / 队列 / post-turn | `tm-indices.js` / `tm-change-queue.js` / `tm-post-turn-jobs.js` | - | - | - |
| 87 | 音效 / 账本 | `tm-audio-theme.js` / `tm-ledger-paper.js` | - | - | - |
| 88 | Globals dev tool | `scan_globals.js` / `detect_globals.js` (P4 audit·dev tool 留 vs delete) | - | - | - |

---

## 2·Top 30 大文件·当前+ Phase 行动

| 行 | 文件 | Phase 行动 |
|---|---|---|
| 12,591 | `tm-endturn-ai-infer.js` | P1·section map·P3 报 5 sub; **R7 active partial**: `tm-endturn-ai-context.js` first Region 1 policy/context split |
| ~~10,298~~ | ~~`tm-char-historical-profiles-ext.js`~~ | **P2 split done·12 wave 文件 (~10649 行·按时间波次)** |
| 3,914 | `tm-tinyi-v3.js` | P3·rename `tm-tinyi.js` |
| 3,843 | `tm-chaoyi-changchao.js` | **P3 done (2026-05-03)** rename from v3·合 chaoyi.js (243 入口+_cc2)·tinyi (789)·yuqian (504)·delete v1/v2/v2.bak/misc·verify-all 19/19 PASS |
| 2,685 | `tm-hongyan-office.js` | **P3 R6 done (2026-05-03)** carve out 官制相关 carve 到 `tm-office-system.js` (~700 行)·剩 letter/render/edict 3 类混合，后续 slice 处理 |
| ~~3,378~~ | ~~`tm-hongyan-office.js` (R6 前)~~ | superseded |
| 741 | `tm-office-system.js` | **P3 R6 新建 (2026-05-03)** 官制 system·从 hongyan-office L46-380/L1953-3229 carve out·24 fns + RANK_HIERARCHY |
| 3,318 | `tm-ai-change-applier.js` | (Codex own·P3 audit) |
| 3,209 | `tm-keju-runtime.js` | P3 写 audit |
| 3,106 | `tm-ai-infra.js` | (Codex own·P3 audit) |
| 3,015 | `tm-military.js` | (Codex own·边界 clear) |
| 2,873 | `tm-player-core.js` | P3 audit (含传记/特质·跨域) |
| 2,656 | `tm-feudal.js` | P3 audit |
| 2,229 | `tm-endturn-province.js` | **P3 R7 done (2026-05-04)** carve out 乔治/地方处置到 `tm-endturn-qiaozhi.js` (~270 行)·删除 dead 9 行·剩 region B UI panel，R8/R9 处理 |
| 269 | `tm-endturn-qiaozhi.js` | **P3 R7 新建 (2026-05-04)** 地方处置 system·从 endturn-province L2230-2479 carve out·3 fns (openQiaozhiPanel / doQiaozhi / restoreQiaozhiDivision) |
| 1,869 | **`editor-game-systems.js`** | **P1 slice 7 audit·timeline/goals/edicts/offend/influence 已拆** |
| 2,380 | `tm-mechanics.js` | (边界 clear) |
| 2,379 | `editor.js` | P1 audit·shell vs core |
| 2,352 | `tm-office-runtime.js` | (边界 clear) |
| 2,224 | `tm-wendui.js` | (边界 clear) |
| 2,223 | `tm-game-loop.js` | (边界 clear·朝政中心调度) |
| 2,212 | `editor-fullgen.js` | P3 → `editor-ai-fullgen.js` |
| 2,093 | `tm-endturn-render.js` | (Claude review at merge·P1 slice 5 render-smoke 基础) |
| 2,087 | `map-editor-smart.js` | P3 audit 重叠 -pro |
| 2,054 | `tm-office-editor.js` | (in-game editor·P3 audit·不editor.html 关系) |
| 2,026 | `tm-npc-engine.js` | (边界 clear) |
| 2,026 | `editor-crud.js` | (边界 clear) |
| 1,974 | `editor-administration.js` (P2 done·rename from administration.js) | (前缀已统一·editor-) |
| 1,955 | `tm-map-system.js` | (边界 clear) |
| 1,915 | **`tm-patches.js`** | **P2-3·按 6 段 inline 各 area·delete** |
| 1,858 | `editor-ai-gen.js` | (P3 audit·不-fullgen / -multipass 边界) |
| 1,823 | `tm-var-drawers.js` | (边界 clear) |
| 1,776 | `tm-mechanics-world.js` | (边界 clear) |

---

## 3·历史堆叠·待清理 (P2-P3)

### 3.1 chaoyi 5 (P3 done·2026-05-03)

**按朝议三模式分拆 → 4 文件**·verify-all 19/19 PASS·

| 新文件 | 行 | 内容 |
|---|---|---|
| `tm-chaoyi.js` | 243 | 入口·共享气泡·_cc2 prompts |
| `tm-chaoyi-changchao.js` | 3,843 | 常朝 (rename v3) |
| `tm-chaoyi-tinyi.js` | 789 | 廷议 (from v2 _ty2_*) |
| `tm-chaoyi-yuqian.js` | 504 | 御前 (from v2 _yq2_*) |

**delete 5**·v1·v2·v2.bak·v3·misc·**misc 535 行重分**·~124 → office-panel (renderOfficeDeptV2)·~20 → launch (继续游戏 IIFE+GameHooks)·~344 → map-system (drawMinimap+InteractiveMap+open/close)·**dead 3 block drop ~47 行** (奏议批复 R125·Electron R126·音效音乐 R131·全已迁完只剩注释)

### 3.2 patches dump (P2-3)

| 文件 | tier | 行动 |
|---|---|---|
| tm-patches.js | 6 段 SELF/APPEND/LAYERED 已分 (PATCH_CLASSIFICATION.md) | P2 已迁段清理·P3 高风险段 inline |
| tm-phase-c-patches.js | LAYERED 真monkey patch | P3+·必5-8 smoke 后合 |
| ~~tm-phase-f1-fixes.js·待 audit~~ | **P1 audit done·LAYERED** | 与 tm-phase-c-patches 同·P3+ smoke 后合·~15-25h·解 phase-f1-fixes-audit.md |

### 3.3 phase 文件 dump (P3·inline -engine)

| 文件 | 合并目标 | 状态 |
|---|---|---|
| ~~tm-guoku-p2/p4/p5/p6~~ | tm-guoku-engine.js (existing) | **deferred·LAYERED 5 层链·R116c ACCEPTED·必先 5-8 行为快照 smoke** |
| ~~tm-corruption-p2/p4~~ | tm-corruption-engine.js (existing) | **R9 done·LAYERED OVERRIDE chain inline·35/35 PASS** |
| ~~tm-neitang-p2~~ | tm-neitang-engine.js | **P3 done 2026-05-03 F2·APPEND only·SAFE inline·-1 文件** |
| tm-authority-deep | 合 tm-authority-engines.js | pending |

### 3.4 命名异常 (P2-3 rename)

| 现 | 改| Phase | 原因 |
|---|---|---|---|
| ~~administration.js →tm-administration.js~~ | **editor-administration.js** | P2 done | 实际是editor 用(scriptData·及 editor.html 加载)·应 editor- 前缀 |
| ~~tm-editor-custom-presets.js~~ | **editor-presets.js** | **P3 done (2026-05-03)** | tm-editor-* 前缀异常·已统一 |
| ~~tm-editor-details.js~~ | **editor-details.js** | **P3 done (2026-05-03)** | 同上 |
| ~~tm-editor-office-deep.js~~ | **editor-office-deep.js** | **P3 done (2026-05-03)** | 同上 |
| ~~tm-editor-division-deep.js~~ | **editor-division-deep.js** | **P3 done (2026-05-03)** | 同上 |

### 3.5 小文件合并候选(P4)

26 个 <200 行·合 ~5 文件·

| 目标 | 源 |
|---|---|
| tm-ui-foundation.js | DONE P4-beta: tm-modal-system (50) + tm-icons (90) + tm-cheatsheet-overlay (194) + tm-settings-ui (68) |
| tm-env.js | tm-env-detect (93) + tm-env-recovery-fill (187) |
| tm-globals-tool.js | scan_globals (74) + detect_globals (120)·或delete dev tool |
| tm-currency.js | tm-currency-unit (129) inline tm-currency-engine |
| tm-diagnostics-foundation.js | DONE P4-beta: tm-error-collector (120) + tm-errors-panel (175) + tm-pollution-guard (183) |

---

## 4·新增 / 修改功能流程 (强制)

### 4.1 修改现有功能

1. **查§1 总表**·定位主文件
2. **检查禁改到哪里**·避边界越界
3. **改主文件**·**不要在 tm-patches/misc/v2/v3 中**
4. **跑 smoke** (本表对应)·verify-all 必绿
5. 如改动跨域 / 影响主文件公共 API·**更新本表**·**更新模块头注**

### 4.2 新增功能

1. **查§1 总表**·**搜索功能关键词**·**已有则改·不重复造**
2. 若 active 主文件已涵盖该 area·**inline 入主文件**
3. 若新 area·**按 final §5 命名规约新建**·头注 12 字段·`tm-` 前缀
4. **更新本表**·新功能域加行
5. **更新模块头注**

### 4.3 禁止

- 在 tm-patches.js / -misc.js / -v2.js / -bak 中加新逻辑
- 新建文件 -patches/-fixes/-misc/-final/-v2/-v3 命名
- 新增不进 §1 总表的全局函数
- pull request 不更新本表·**视为不完整提交**

---

## 5·**改 X 看 Y 案例** (常用 lookup·#2 critical 诉求落地)

| 我想改| 省 |
|---|---|
| 朝议·常朝主流程 / NPC 发言 / sysP | tm-chaoyi-changchao.js (P3 done·rename v3) |
| 朝议·廷议 _ty2_* | tm-chaoyi-tinyi.js (P3 done·from v2 _ty2_*·active 入口路由) |
| 朝议·御前 _yq2_* | tm-chaoyi-yuqian.js (P3 done·from v2 _yq2_*) |
| 朝议·入口 / 频率限制 / 位置判定 / addCYBubble / _cc2 prompts | tm-chaoyi.js (P3 done·入口·共享·_cc2) |
| 廷议·七阶段重构/ 弹劾 (_ty3_*) | tm-tinyi-v3.js (P3 →tm-tinyi.js·待) |
| 1v1 问对 | tm-wendui.js |
| 回合 AI 推演逻辑 | tm-endturn-ai-infer.js + tm-endturn-ai-context.js (R7 Region 1 first split; deeper split later) |
| 回合战况 / 兵备 / 财政展示 | tm-endturn-render.js |
| 地方 panel 渲染 | tm-endturn-province.js (P1 audit·后续可拆 -render) |
| AI 输出 schema | tm-ai-schema.js |
| 应用 AI 输出到 GM | tm-ai-change-applier.js |
| 复用 prompt 片段 | tm-prompt-composer.js (8 builders) |
| NPC 决策 | tm-npc-decision.js·非 tm-npc-engine |
| 角色传记 / 特质 / 渲染 | tm-player-core.js (跨域·P3 audit) |
| 朝政中心调度 | tm-game-loop.js |
| 编辑器·官制 form | editor-engine-constants.js (我做)·P3 → editor-form-office-engine.js |
| 编辑器·模型要求| editor-model-requirements.js (我做)·P3 → editor-form-meta.js |
| 编辑器·schema 转换 (scriptData → scenario.json) | editor-schema-adapter.js (我做) |
| 存档版本 / migration | tm-help-social.js (含 SAVE_VERSION migration·跨域·P3 拆) |
| officeTree 渲染 | tm-chaoyi-misc.js renderOfficeDeptV2 (P3 → tm-office-panel.js) |

---

## 6·P1 audit 完结 (历史记录)

- editor-game-systems.js (1869)·**slice 7**·timeline/goals/edicts/offend/influence 已拆
- editor-core.js (453)·**与 editor.js 重叠?·decide inline vs carve**
- tm-arcs.js (161) vs tm-char-arcs.js (317)·**同步记录 / 异步推演·互补·done**
- tm-edict-complete.js (451)·**诏令补完·active·done**·见 p1-deferred-audits.md §1
- ~~tm-phase-f1-fixes.js (247)·**SELF / APPEND tier?**~~ → P1 audit done·LAYERED·与 phase-c 同类
---

## 7·待P3 deep audit

- tm-hongyan-office.js (2685·R6 carve 后) + tm-office-system.js (741·R6 新建)·**官制已拆·剩 letter+render+edict 3 类混合，后续 slice**
- tm-keju-runtime.js (3209)·**内部 sub-section**
- map-editor-smart vs map-editor-pro·**重叠?**
- tm-authority-* 4 文件·**phase dump 嫌疑**
- tm-help-social.js (1294)·**跨域 (含 SAVE migration)·应拆**
- tm-three-systems-ui / -ext·**three systems 是哪 3 个**

---

## 8·Codex / Claude 协作

| 区 | Codex own | Claude own | coordinated |
|---|---|---|---|
| chaoyi / wendui / NPC | review | own | - |
| editor | review | own | - |
| persistence / save | review | own | - |
| **endturn-ai-infer** | **own** | review | - |
| military / battle | review | own | - |
| AI infra / change-applier | own | review | - |
| **endturn-render / battle 显示** | **own** | **review at merge** | **must coordinate** |
| docs (本表 / boundaries / playbook) | mixed | mixed | **共做** |
| index.html 加载顺序 | mixed | mixed | **共做** |

---

## 9·Phase 5+6 close·24 canonical namespaces (R200-R208·2026-05-04)

> **Phase 5 完成 + Phase 6 P6-α alias 退役**·散落 1000+ globals 收口到 24 canonical TM.X·R87 facade 顶层留 + sub-ns 上挂·alias-then-rename ladder stage 3 完结·

### 9.1·24 ns 终表 (round 编号)

| # | namespace | 含义 | round | sub-ns 主要 |
|---|---|---|---|---|
| 1 | `TM.Chaoyi` | 朝议/廷议/御前 | R204 | (空容器·主入口待 Phase 7) |
| 2 | `TM.Wendui` | 问对·1v1 | R200 容器 | (空·Phase 7 fill) |
| 3 | `TM.Endturn` | endTurn pipeline | R206 | run.endTurn·province·qiaozhi |
| 4 | `TM.Endturn.AI` | AI 推演 (sub) | R206 | (entrypoint·12602 行 ai-infer 黑盒) |
| 5 | `TM.Military` | 军事 | R200 容器 | (空·Phase 7 fill) |
| 6 | `TM.Fiscal` | 财政·R10 redistribute 后聚集 | R203 | engine·cascade(v2)·fixedExpense(v2)·legacy{PhaseH} |
| 7 | `TM.Economy` | 经济·与 Fiscal 交叉 | R203 | core·linkage·currency·currencyUnit·envCapacity·eventBus·gapFill + R10 alias rescue |
| 8 | `TM.Guoku` | 国库 panel + engine | R203 | engine + R87 panel facade 21 fn |
| 9 | `TM.Neitang` | 内堂 panel + engine | R203 | engine + R87 panel facade 11 fn |
| 10 | `TM.Huji` | 户口 | R87 | HujiEngine engine proxy |
| 11 | `TM.Office` | 官制 | R204 | system·legacy(4 aiGen) |
| 12 | `TM.Authority` | 权威·R12c phase-f1 inline | R204 | engines(v1)·complete·legacy{PhaseF1/F4/G1} |
| 13 | `TM.Corruption` | 腐败·R9 p2/p4 merged | R204 | engine(v1·16 keys) |
| 14 | `TM.Keju` | 科举 | R204 | runtime(9 主入口) |
| 15 | `TM.Edict` | 诏令·R12 inline 后 | R202 | parser(v2)·complete(v1)·lifecycle·thresholds(PhaseG3 alias)·legacy{PhaseC} |
| 16 | `TM.NPC` | NPC engine/decision | R201 | engine·interactions·decision·behaviors·personality·legacy |
| 17 | `TM.Char` | 角色 schema/data | R201 | schema·economy·arcs·autogen·historical·ui |
| 18 | `TM.Map` | 地图·R208 P6-α rename in-place from TM.MapSystem | R205+R208 | system(self)·converter·integration·display·recognition |
| 19 | `TM.UI` | UI 公共 | R205 | foundation·cheatsheet·shell·topbar·varDrawers |
| 20 | `TM.Save` | 存档·R208 P6-α rename in-place from TM.Storage | R200+R208 | (R113 storage facade 顶层) |
| 21 | `TM.Editor` | 编辑器 | R207 | core·crud·ai·forms·domain·schema·map |
| 22 | `TM.Memory` | 记忆 | R200 容器 | (空·Phase 7 vs Char.historical) |
| 23 | `TM.Player` | 玩家 | R200 容器 | (空·Phase 7 fill) |
| 24 | `TM.Diagnostics` | errors/perf/pollution | P4-β-2+R200 meta | errors·guard·report |

**legacy facade (Phase 7 决定)**·

- `TM.Lizhi` (R87 22 fn whitelist·非 24 canonical·Codex Q1)·Phase 7 决定移到 .Office.Lizhi 或 .UI.Lizhi
- `TM.MapSystem` / `TM.Storage`·**R208 P6-α 已删** (production call site 改 TM.Map / TM.Save)
- `TM.GuokuEngine` / `TM.HujiEngine` / `TM.ChangeQueue` (R87 engine proxy)·留·内部 utility

### 9.2·R200-R208 段在 tm-namespaces.js 内位置

```
L1-90    head note·R87/R200-R208 doc
L91-191  helpers·_buildFacade / _buildEngineFacade / _buildWindowRefGroup / _defineWindowAlias
L213-323 R87 facade·Economy/Map(R208 rename)/Lizhi/Guoku/Neitang/HujiEngine/GuokuEngine/ChangeQueue/Save(R208 rename)
L325-348 R200·24 canonical 容器
L350-...  R201-R207 sub-ns fill (β/γ/δ/ε/ζ/η/θ)
L850+    _verify() + TM.namespaces meta + auto-verify
```

### 9.3·alias-then-rename ladder 完成

| 阶段 | round | 状态 |
|---|---|---|
| Stage 1·getter 门面 | R87 | done (5 facade·~91 fn) |
| Stage 2·sub-ns 上挂·alias 留 | R200-R207 | done (Phase 5) |
| Stage 3·rename alias 退役 | R208 P6-α | done (Phase 6·MapSystem/Storage 删) |

**R87 设计 3 阶段终结**·新代码强制走 `TM.X.X`·调用方与定义统一·

---

## 10·Phase 5+6 letter 链

详见 `docs/phase5-final-audit.md` §7 (~14-16 letters)·`docs/phase6-prep.md`·`docs/refactor-playbook.md` (实操指南·Phase 1-5 经验提炼)·

— end of architecture-map.md v1 (Phase 6 close·2026-05-04)
