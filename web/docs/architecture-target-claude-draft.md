# tianming Architecture Target - Claude Draft

日期·2026-05-03
状态·Claude draft·与 Codex draft 并行·待 align 入 architecture-target-final.md

## 0·用户目标 + 2 critical 诉求

用户原话 (本次重构 mandate)·

> "现在有一个最大的问题·代码混乱·大文件多·小文件杂·功能不明·导致每次修改完善都更杂乱·解决问题改来改去·维护成本极高·我需要你和codex深度合作·彻底解决这个问题·不惜将现有代码全部重构·全盘推翻"

> "新代码要职责分明·之前你经常理解错各板块的功能"

**2 critical 诉求**·

| # | 诉求 | 落地 |
|---|---|---|
| 1 | 职责清晰·改时一眼知改哪·不重复造 | architecture-map.md (功能→文件) + 模块头注 + 命名规约 |
| 2 | 板块命名 explicit·防 Claude/AI 理解错 | rename 模糊命名 (misc/helpers/patches/v2/v3 等) + 头注 explicit + map.md 双锁 |

#1 是·**人**·改代码时一眼知改哪
#2 是·**AI**·读代码时不 confuse 板块职责 (我历史多次理解错·见 §2.10 案例)

二者同根·**命名 explicit + 职责单一 + 文档同步** = 根治。

---

## 1·现状全 inventory

201 文件·190,456 行·按业务域分 ~22 域·

### 1.1 朝议 / 廷议 / 问对 (cha/ti/wen)

| 文件 | 行 | 职责 (头注读得) | 状态 |
|---|---|---|---|
| tm-chaoyi-v3.js | 3,837 | 朝议 v3·常朝/廷议/御前 | **active** |
| tm-chaoyi-v2.js | 1,366 | v2 已 deprecated·仅留 _cc2_buildAgendaPrompt + _cc2_fallbackAgenda (v3 调用) | **legacy·部分留** |
| tm-chaoyi-v2.js.bak | - | v2 备份 | **delete (Phase 3)** |
| tm-chaoyi.js | 161 | 朝议 v1·入口/频率限制/位置判定·**仍 active 入口·未 deprecated** | **active·小** |
| tm-chaoyi-misc.js | 535 | R125 中转 dump·应分到 office-panel/launch/memorials/storage/map-system/audio-theme | **dump·待重分 (Phase 3)** |
| tm-tinyi-v3.js | 3,914 | 廷议 v3 (弹劾) | active |
| tm-wendui.js | 2,224 | 问对 (1v1 私谈) | active |
| tm-shizheng-panel.js | 973 | 诗政/御前独召 panel | active |
| tm-renwu-ui.js | 964 | 人物志 UI (含朝议/廷议入口) | active |
| tm-chaoyi-v3.css | - | (CSS·not js·skip) | - |
| tm-tinyi-v3.css | - | (CSS·not js·skip) | - |

**问题**·
- chaoyi 5 文件 (1+v2+v2.bak+v3+misc)·**改朝议不知去哪**
- v3 active·v1 入口·v2 仍 partial 调用·misc dump·**3 层调用关系不显**
- **rename plan**·见 §3.1

### 1.2 回合结算 endturn (8 .js + 1 helpers·~22K 行)

| 文件 | 行 | 职责 | 状态 |
|---|---|---|---|
| tm-endturn-ai-infer.js | 12,591 | endTurn AI 推演·sysP 组装·LLM 调度·应用 | **巨怪·Codex own** |
| tm-endturn-province.js | 2,488 | 省份/地方 panel render | active |
| tm-endturn-render.js | 2,093 | 回合结果展示 (战况/兵备/财政·我刚 #5 加 affectedArmies/militarySystems) | **Claude review before merge** |
| tm-endturn-helpers.js | 1,516 | findOfficeByFunction / 考课 / Chancellor / resolveHeir / Settlement 注册 / NPC 意图 / 成就 | helpers 集合 |
| tm-endturn-core.js | 937 | endTurn 入口·_endTurnInternal·_endTurnCore (主管道) | **entry** |
| tm-endturn-edict.js | 502 | 诏令效果结算 | active |
| tm-endturn-prep.js | 512 | endTurn 前置准备 | active |
| tm-endturn-systems.js | 393 | Step 3 系统更新调度·BattleEngine/SubTickRunner/NpcEngine/FiscalCascade/etc | active |
| tm-endturn-ai-helpers.js | 427 | endTurn AI 子函数 helpers | active |

**问题**·
- 9 文件·**改 endturn 不知去哪**
- core/systems/helpers·**职责重叠模糊**·core 是入口·systems 是 Step 3 调度·helpers 是杂 helper 集合·**命名应 explicit**
- **rename plan**·见 §3.2

### 1.3 AI runtime (8 文件·~12K 行)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-ai-change-applier.js | 3,318 | AI 输出 schema 应用到 GM |
| tm-ai-infra.js | 3,106 | LLM 调度基础设施 / 队列 / hook |
| tm-ai-planning.js | 1,709 | AI 规划层 |
| tm-ai-schema.js | 850 | AI 输出 schema / 字段契约 |
| tm-prompt-composer.js | 215 | 我做·sysP 片段复用·8 builders |
| tm-ai-output-validator.js | 233 | AI 输出 validator |
| tm-ai-npc-memorials.js | 234 | NPC 奏疏 AI |
| tm-ai-apply-deaths.js | 251 | AI 应用死亡事件 |

**问题** (低)·分工较 clear·命名 explicit (infra/applier/planning/schema/composer/validator)·**职责清晰度高**。

### 1.4 角色 / NPC / 关系 (16 文件·~22K 行)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-char-historical-profiles-ext.js | 10,298 | 历史人物数据 ext (拆候选·按朝代切) |
| tm-char-historical-profiles.js | 777 | 历史人物 base data |
| tm-char-economy-engine.js | 980 | 角色经济 engine |
| tm-char-autogen.js | 1,622 | 角色自动生成 |
| tm-char-arcs.js | 317 | 人物弧线 |
| tm-char-full-schema.js | 472 | 角色 schema |
| tm-char-economy-ui.js | 456 | 角色经济 UI |
| tm-npc-engine.js | 2,026 | NPC engine |
| tm-npc-decision.js | 1,484 | NPC 决策 |
| tm-class-engine.js | 956 | 阶级 engine |
| tm-class-mobility.js | 383 | 阶级流动 |
| tm-traits-data.js | 531 | 特质 data |
| tm-relations.js | 428 | 关系 |
| tm-rel-graph.js | 177 | 关系图 |
| tm-arcs.js | 161 | 弧线 (与 char-arcs 区别?) |
| tm-influence-groups.js | 770 | 影响力集团 (R59 Phase 2) |

**问题**·
- arcs vs char-arcs·**同 / 异?·待审**
- influence-groups·跨 npc/class·**归属待定**

### 1.5 军事 / 战争 (2 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-military.js | 3,015 | 军事 engine·armies/battles |
| tm-military-ui.js | 149 | 军事 UI (薄) |

**问题** (低)·边界 clear·**Codex own 区**。

### 1.6 财政 / 经济 / 国库 / 内帑 (15 文件·~10K 行)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-fiscal-cascade.js | 943 | 财政级联结算 |
| tm-fiscal-ui.js | 585 | 财政 UI |
| tm-fiscal-fixed-expense.js | 519 | 固定支出 |
| tm-tax-atomic.js | 680 | 赋税原子 |
| tm-economy.js | 725 | 经济总 |
| tm-economy-gap-fill.js | 839 | 经济缺口填补 (剧本 boot smoke) |
| tm-economy-linkage.js | 464 | 经济联动 |
| tm-currency-engine.js | 790 | 货币 engine |
| tm-currency-unit.js | 129 | 货币单位 (薄) |
| tm-corruption-p2.js | 693 | 腐败 P2 |
| tm-corruption-p4.js | 560 | 腐败 P4 |
| tm-guoku-panel.js | 1,147 | 国库 panel |
| tm-guoku-p2.js | 332 | 国库 P2 |
| tm-guoku-p4.js | 440 | 国库 P4 |
| tm-guoku-p5.js | 344 | 国库 P5 |
| tm-guoku-p6.js | 329 | 国库 P6 |
| tm-neitang-engine.js | 721 | 内帑 engine |
| tm-neitang-p2.js | 500 | 内帑 P2 |
| tm-neitang-panel.js | 491 | 内帑 panel |
| tm-env-capacity-engine.js | 574 | 环境容量 engine (经济相关) |

**问题**·
- guoku 5 文件 (panel + p2/p4/p5/p6)·**phase 文件 dump**·应 inline panel·**Phase 3 合并候选**
- corruption p2 + p4·**phase 文件 dump**·应 inline·**Phase 3 合并**
- neitang 3 文件 (engine + p2 + panel)·**phase 文件 dump**·应 inline

### 1.7 户口 / 人口 (2 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-huji-engine.js | 702 | 户口 engine |
| tm-huji-deep-fill.js | 913 | 户口深度填充 |

**问题** (低)·边界 clear。

### 1.8 官制 / 选官 / 权力 (10 文件·~13K 行)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-office-runtime.js | 2,352 | 官制 runtime |
| tm-office-editor.js | 2,054 | 官制 editor (仅 game?·待审) |
| tm-office-panel.js | 1,477 | 官制 panel |
| tm-keju-runtime.js | 3,209 | 科举 runtime |
| tm-ceming.js | 812 | 策命 |
| tm-hongyan-office.js | 3,378 | 信房·**与 office 关系待审** |
| tm-authority-complete.js | 948 | 皇权 complete |
| tm-authority-engines.js | 665 | 皇权 engines |
| tm-authority-ui.js | 486 | 皇权 UI |
| tm-authority-deep.js | 434 | 皇权 deep |
| tm-court-meter.js | 209 | 朝中势力计 |

**问题**·
- office-editor·**为何在 web/ 不在 editor.html?·待审**·若是 in-game editor 则 OK·若 game-editor 复用应移
- hongyan-office·**3378 行 巨**·与 office 系列关系不清·**待审**
- authority 4 文件·**有 phase 化 dump 嫌疑**·待 audit

### 1.9 地方 / 行政区划 (5 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| administration.js | 1,974 | 行政 (无 tm- 前缀·**异常**) |
| tm-central-local-engine.js | 804 | 中央-地方 engine |
| tm-region-enrich.js | 637 | 地区 enrich |
| tm-editor-division-deep.js | 529 | 行政区划 editor (与 editor- 关系?) |
| tm-influence-groups.js | (已计 1.4) | (跨域) |

**问题**·
- administration.js·**无 tm- 前缀**·**命名异常**·应 rename `tm-administration.js`
- editor-division-deep·**应在 editor- 前缀?·tm- 前缀 + editor-deep?·命名乱**

### 1.10 地图 (12 文件·~6K 行)

| 文件 | 行 | 职责 |
|---|---|---|
| map-editor-smart.js | 2,087 | 地图 editor (smart) |
| tm-map-system.js | 1,955 | 地图 system |
| map-editor-pro.js | 1,119 | 地图 editor (pro) |
| map-recognition-improved.js | 547 | 地图识别 improved |
| map-region-editor.js | 507 | 地图 region editor |
| map-recognition-eu4.js | 478 | EU4 风格识别 |
| map-recognition-borders.js | 471 | 边界识别 |
| map-recognition.js | 463 | 识别 base |
| map-integration.js | 438 | 地图集成 |
| map-converter.js | 381 | 地图转换 |
| map-display.js | 367 | 地图显示 |
| map-recognition-fast.js | 293 | 识别 fast |

**问题**·
- map- 无 tm- 前缀·**命名规约外**
- map-recognition·6 个变体 (improved/eu4/borders/base/fast)·**应合 1 文件 + strategy pattern**
- map-editor·smart vs pro·**重复?·待审**

### 1.11 法度 / 诏令 / 机制 (5 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-mechanics.js | 2,380 | 机制 base |
| tm-mechanics-world.js | 1,776 | 机制 world |
| tm-edict-parser.js | 590 | 诏令解析 |
| tm-edict-thresholds.js | 500 | 诏令阈值 |
| tm-edict-complete.js | 451 | 诏令 complete |
| tm-edict-lifecycle.js | 328 | 诏令生命周期 |

**问题** (低)·edict 4 文件·边界相对 clear·**lifecycle / parser / thresholds / complete**·**complete 是啥·待审**。

### 1.12 世界 / 时局 / 朝代 (6 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-world.js | 1,567 | 世界 |
| tm-world-snapshot.js | 658 | 世界快照 |
| tm-world-view.js | 206 | 世界视图 |
| tm-feudal.js | 2,656 | 封建 |
| tm-prophecy.js | 588 | 预言 |
| tm-ethnic-religion.js | 641 | 民族宗教 |

### 1.13 UI / 界面 (~17 文件·~12K 行)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-var-drawers.js | 1,823 | 变量抽屉 |
| tm-topbar-vars.js | 1,315 | 顶栏变量 |
| tm-help-social.js | 1,294 | help/social·**含 SAVE_VERSION migration·跨域** |
| tm-three-systems-ext.js | 1,135 | 三系统 ext |
| tm-shell-extras.js | 1,089 | shell extras |
| tm-lizhi-panel.js | 1,071 | 礼制 panel |
| tm-sidebar-ui.js | 889 | 侧栏 |
| tm-three-systems-ui.js | 422 | 三系统 UI |
| tm-shiji-qiju-ui.js | 488 | 时机起居 UI |
| tm-memory-ui.js | 508 | 内存 UI |
| tm-ui-foundation.js | ~339 | 图标 + 模态系统 + 速查 overlay + 设置 UI placeholder (P4-beta 合并；**注·tm-patches.js §1 真正 settings**) |
| tm-diagnostics-foundation.js | ~446 | 错误收集 + 错误 panel + 污染防护 (P4-beta 合并) |
| tm-diagnostics-panel.js | 273 | 诊断 panel |

**问题**·
- 17 UI 文件分散·**应分 panel / overlay / shell / topbar / drawer 5 类**
- settings·**tm-settings-ui 68 行 vs tm-patches §1 ~560 行**·**真正 settings 在 patches 里**·**critical**·必 inline 出

### 1.14 持久化 / 存档 (5 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-save-lifecycle.js | 1,059 | 存档生命周期 |
| tm-save-manager.js | 816 | 存档管理器 |
| tm-storage.js | 460 | 存储 |
| tm-state.js | 279 | 状态 |
| tm-state-snapshot.js | 238 | 状态快照 |
| tm-migration.js | 244 | 迁移 |

**问题** (中)·6 文件·**save vs storage vs state vs migration**·边界需 clear。

### 1.15 数据 / 历史 (3 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-data-model.js | 759 | 数据模型 |
| tm-data-access.js | 568 | 数据访问 |
| tm-historical-presets.js | 613 | 历史预设 |
| tm-history-events.js | 409 | 历史事件 |

### 1.16 编辑器 (16 文件·~16K 行)

| 文件 | 行 | 职责 |
|---|---|---|
| editor.js | 2,379 | editor 主入口·navigation·shell |
| editor-game-systems.js | 2,449 | game systems form (??) |
| editor-fullgen.js | 2,212 | 全量 AI 生成 |
| editor-crud.js | 2,026 | 通用 CRUD |
| editor-ai-gen.js | 1,858 | AI 生成 |
| editor-ai-validate.js | 1,255 | AI 校验 |
| editor-map.js | 984 | map editor |
| editor-ai-multipass.js | 979 | AI 多 pass |
| editor-government.js | 785 | 政府 form |
| editor-fiscal.js | 692 | 财政 form |
| editor-core.js | 453 | core (??) |
| editor-military.js | 339 | 军事 form |
| editor-engine-constants.js | 322 | 引擎常量 form (我做) |
| editor-schema-adapter.js | 282 | schema adapter (我做) |
| editor-corruption.js | 181 | 腐败 form |
| editor-model-requirements.js | 78 | 模型要求 form (我做) |

**问题** (高)·
- 16 文件 散乱
- editor.js (2379) vs editor-core.js (453)·**重叠·core 是啥**
- editor-game-systems.js (2449) **最大问**·**game-systems 是哪些 systems·待审**·应拆为 fiscal/military/keju/edict/etc 子文件
- editor-fullgen vs editor-ai-gen vs editor-ai-multipass·**3 个 ai 生成·边界?**
- 拆 plan·见 §3.4

### 1.17 启动 / 引擎 (8 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-launch.js | 1,142 | 启动 |
| tm-game-loop.js | 2,223 | 游戏主循环·朝政中心调度 |
| tm-engine-constants.js | 719 | 引擎常量 (runtime) |
| tm-namespaces.js | 304 | namespaces |
| tm-event-bus.js | 353 | 事件总线 |
| tm-event-system.js | 262 | 事件 system |
| tm-electron.js | 643 | Electron 桌面端 |
| tm-worker.js | 71 | worker (薄) |
| tm-env-detect.js | 93 | 环境检测 (薄) |
| tm-env-recovery-fill.js | 187 | 环境恢复填充 |

### 1.18 内存 / 记忆 (5 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-memorials.js | 983 | 奏疏 |
| tm-memory-tables.js | 1,068 | 内存表 |
| tm-memory-anchors.js | 383 | 内存锚 |
| tm-memory-adapter.js | 192 | 内存 adapter |
| tm-semantic-recall.js | 409 | 语义召回 |

**问题** (低)·命名相对 clear。

### 1.19 玩家 / 工具 (3 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-player-core.js | 2,873 | 玩家核心 (含传记/特质/render·我刚改) |
| tm-player-tools.js | 530 | 玩家工具 |
| tm-player-settings.js | 564 | 玩家设置 |

### 1.20 测试 / 诊断 (10 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-test-harness.js | 1,583 | 测试 harness |
| tm-test.js | 207 | test |
| tm-integration-bridge.js | 737 | 集成桥 |
| tm-checklist.js | 243 | checklist |
| tm-audit.js | 419 | audit |
| tm-invariants.js | 272 | 不变式 |
| tm-diagnostics-foundation.js | ~446 | 污染防护 / 错误收集 |
| tm-perf.js | 456 | 性能 |
| tm-recall-gate.js | 165 | 召回门 |
| tm-onboard-tools.js | 261 | onboard 工具 |
| scan_globals.js | 74 | 扫描全局 |
| detect_globals.js | 120 | 检测全局 |

### 1.21 杂物 / patches / phases / utils (~10 文件)

| 文件 | 行 | 职责 | 状态 |
|---|---|---|---|
| tm-utils.js | 993 | 工具集 | active |
| tm-time-utils.js | 206 | 时间工具 | active |
| tm-diff.js | 193 | diff | active |
| tm-changelog.js | 220 | 变更日志 | active |
| tm-patches.js | 1,915 | **大杂烩 6 段·已分 SELF/APPEND/LAYERED**·见 PATCH_CLASSIFICATION.md | **dump·待清理 (Phase 2-3)** |
| tm-phase-c-patches.js | 498 | C 阶段补丁·**LAYERED 真 monkey patch**·R116b 暂不合 | **legacy·暂留** |
| tm-phase-f1-fixes.js | 247 | F1 fix patches | **待审** |
| tm-feedback-loops.js | 250 | 反馈环 | active |
| tm-hooks-tracker.js | 161 | hooks 跟踪 | active |
| tm-chronicle-system.js | 218 | 编年史 |
| tm-chronicle-effects.js | 392 | 编年史效果 |
| tm-chronicle-tracker.js | 364 | 编年史跟踪 |
| tm-indices.js | 866 | 索引 |
| tm-change-queue.js | 818 | 变更队列 |
| tm-post-turn-jobs.js | 372 | 回合后任务 |
| tm-audio-theme.js | 572 | 音效 |
| tm-ledger-paper.js | 434 | 账本 |

### 1.22 编辑器辅助 / deep / details (3 文件)

| 文件 | 行 | 职责 |
|---|---|---|
| tm-editor-custom-presets.js | 213 | editor 自定义预设 (但在 tm- 前缀·**异常**) |
| tm-editor-details.js | 321 | editor 详情 (tm- 前缀异常) |
| tm-editor-office-deep.js | 426 | editor 官制深 (tm- 前缀异常) |
| tm-editor-division-deep.js | 529 | editor 行政区划深 (tm- 前缀异常) |

**问题** (高)·**tm- 前缀的 editor 文件**·**与 editor- 前缀文件并存**·**前缀策略 confused**·**Phase 3 必统一**·或全 editor- 或全 tm-editor-。

---

## 2·模块边界 proposal·答 Codex 6 align Q + 我加几域

### 2.1 朝议 / 廷议 / 问对 (回 Codex 12.1)

**目标边界**·

| active 唯一文件 | 职责 |
|---|---|
| `tm-chaoyi.js` (重 rename·**包含 v1 入口 + v3 全功能**) | 朝议主流程·常朝/廷议/御前·sysP/NPC/归档 |
| `tm-tinyi.js` (rename from v3) | 廷议·弹劾流程 |
| `tm-wendui.js` | 问对 (1v1) |
| `tm-shizheng-panel.js` | 诗政/御前独召 panel |

**清理**·

| 旧文件 | 行动 |
|---|---|
| tm-chaoyi.js (161 v1 入口) | 内容并入新 tm-chaoyi.js |
| tm-chaoyi-v2.js | _cc2_buildAgendaPrompt + _cc2_fallbackAgenda 移入新 tm-chaoyi.js·其余 delete |
| tm-chaoyi-v2.js.bak | **delete** |
| tm-chaoyi-v3.js | rename 内容 → tm-chaoyi.js·old 文件 delete |
| tm-chaoyi-misc.js | 535 行**逐项重分**·按头注·R125 列出的目标·office-panel/launch/memorials/storage/map-system/audio-theme |
| tm-tinyi-v3.js | rename → tm-tinyi.js |

**Phase 安排**·
- Phase 3·先 audit (chaoyi-misc 内容 / chaoyi v1 入口 / v2 留 prompts)·写 cleanup plan
- Phase 3 末·rename + delete (待 smoke 全绿后)

### 2.2 编辑器 (回 Codex 12.2)

**目标边界**·拆 16 → 重组 ~10-12 文件 (按业务域 + 角色)·

| 角色 | 文件 |
|---|---|
| **shell** | `editor.js` (导航/sidebar/panel switch) |
| **通用 CRUD** | `editor-crud.js` |
| **schema adapter** | `editor-schema-adapter.js` (我做) |
| **AI 单 pass** | `editor-ai-gen.js` |
| **AI 多 pass + validate** | `editor-ai-batch.js` (合并 multipass + validate) |
| **AI 全量** | `editor-ai-fullgen.js` (rename fullgen) |
| **业务 form·政府** | `editor-form-government.js` (rename government) |
| **业务 form·财政** | `editor-form-fiscal.js` (rename fiscal·合并 corruption) |
| **业务 form·军事** | `editor-form-military.js` (rename military) |
| **业务 form·官制 / 引擎常量** | `editor-form-office-engine.js` (合 engine-constants + 现 game-systems 中官制部分) |
| **业务 form·剧本元** | `editor-form-meta.js` (model-requirements + 剧本基础信息) |
| **业务 form·地图** | `editor-form-map.js` (rename map) |

**核心问·`editor-game-systems.js` (2449) + `editor-core.js` (453)**·

- 我建议·先 audit 内容·列 sub-section·按业务域分到 fiscal/military/keju/edict/officeTree/influence-groups/etc·**Phase 3 拆**
- editor-core·若与 editor.js 重叠则**合并 editor.js**·若是底层 utils 则 rename `editor-utils.js`

**异常文件处理**·
- `tm-editor-custom-presets.js` (213) / `tm-editor-details.js` (321) / `tm-editor-office-deep.js` (426) / `tm-editor-division-deep.js` (529)·**前缀异常**
- 行动·**rename `editor-` 前缀·或合入对应 editor-form-***·**Phase 3**

### 2.3 patches (回 Codex 12.3)

**stance·先登记·后清理 (Phase 2-3)**·

- Phase 0·**仅 verify 现 PATCH_CLASSIFICATION.md 分类**·**不动**
- Phase 2·清理已迁段·写 sweep plan
- Phase 3·SELF 改名·APPEND 合并目标·LAYERED 加 smoke 后合

**tm-patches.js (1915 行 6 段)**·按头注·

| 段 | 行数 | 状态 | 行动 |
|---|---|---|---|
| §1 Settings UI | 560 | 高风险·未迁 | Phase 3·placeholder 已并入 tm-ui-foundation.js |
| §2 剧本管理 tab | 20 | 未分类 | Phase 2·拆 tm-scenario-tab.js·或 inline editor.js |
| §3 开局逻辑审查 | 290 | 高风险·未迁 | Phase 3·迁 tm-launch.js |
| §4 散碎补丁 | 640 | 杂 | Phase 2·逐项审 + inline |
| §5-§6 | 待补 | (read 完详细) | Phase 2-3 |

**tm-phase-c-patches.js (498 LAYERED)**·**保留**·R116b 决定·先补 5-8 个 edict-parser smoke·**Phase 3**

**tm-phase-f1-fixes.js (247)**·**待 audit**·若 SELF·Phase 2 改名

### 2.4 Phase 文件 SELF/APPEND (回 Codex 12.4)

**stance·三 tier 分进度**·

| Tier | 行动 | Phase |
|---|---|---|
| SELF (独立逻辑·改名即可) | rename 真实职责名 | Phase 2 |
| APPEND (并入目标 module) | 合并目标 + delete | Phase 3 |
| LAYERED (真 monkey patch) | 必 smoke 5-8 用例后合 | Phase 3+ (高 risk) |

**guoku/neitang/corruption phase 文件** (1.6 节列)·

| 文件 | tier | Phase 行动 |
|---|---|---|
| tm-guoku-p2/p4/p5/p6 (1445 总) | 大概率 APPEND | Phase 3·合 tm-guoku-panel + tm-guoku-engine |
| tm-corruption-p2/p4 (1253 总) | 大概率 APPEND | Phase 3·合 tm-corruption-engine (新建) |
| tm-neitang-p2 (500) | APPEND | Phase 3·合 tm-neitang-engine |

**authority/edict/three-systems-ext** 等 -ext / -deep 文件·**待 audit·同 tier 分配**

### 2.5 endturn-ai-infer 第一刀 (回 Codex 12.5)

**完全同意你·头注 + section map·非抽**

12591 行·先·

1. 写完整 §1-§N 头注 navigation·**section line 标 + 函数名 + 职责**
2. 标注·**未来可抽出的函数群** (你 Phase 2 后段建议)·
   - tm-endturn-ai-orchestrator.js (调度)
   - tm-endturn-ai-prompts.js (sysP 组装)
   - tm-endturn-ai-context.js (snapshot)
   - tm-endturn-ai-parse.js (JSON 解析)
   - tm-endturn-ai-validators.js (validator)
3. 不抽·**Phase 1 完成 + smoke 全绿后**·才启 Phase 3 抽

**你 own·我 review at merge**

### 2.6 namespace (回 Codex 12.6)

**新代码强制·旧 alias 渐进**·**与你一致**·

差异·**namespace 大迁建议放 Phase 5/6** (非你 Phase 4)·

理由·

- namespace 大迁·audit 全 200+ 文件 + 改全调用 + alias 期长·**最 risky**
- 应在·**module 边界稳·头注全·命名规约 lint 跑通后**·**结构稳后**·才 final polish
- Phase 4 我建议留给·**小文件合并** (26 个 <200 行)·**比 namespace 安全**

但**新代码 namespace 规约 Phase 1 起强制** (lint script)·**这与"namespace 大迁"是两件事**·

reconcile·

- **Phase 1 起·新代码强制 TM.X·lint check** (with you)
- **Phase 5/6·旧代码 namespace 大迁 + alias 退役** (与你 Phase 4 内容一致·但放后)

### 2.7 财政 / guoku / neitang / corruption (我加新)

15 文件·**应合并到 ~6 文件**·

| 目标 | 合并源 |
|---|---|
| `tm-fiscal-engine.js` | tm-fiscal-cascade + tm-tax-atomic + tm-fiscal-fixed-expense |
| `tm-fiscal-panel.js` | tm-fiscal-ui |
| `tm-economy-engine.js` | tm-economy + tm-economy-linkage + tm-economy-gap-fill + tm-currency-engine + tm-currency-unit + tm-env-capacity-engine |
| `tm-corruption-engine.js` | tm-corruption-p2 + tm-corruption-p4 |
| `tm-guoku-engine.js` | tm-guoku-p2 + tm-guoku-p4 + tm-guoku-p5 + tm-guoku-p6 |
| `tm-guoku-panel.js` | (保留) |
| `tm-neitang-engine.js` | + tm-neitang-p2 |
| `tm-neitang-panel.js` | (保留) |

**Phase 3** 做。

### 2.8 map 12 文件·分层 (我加新)

12 → ~6 文件·

| 目标 | 合并源 |
|---|---|
| `map-system.js` (rename tm-map-system) | (保留) |
| `map-recognition.js` | + recognition-improved + eu4 + borders + fast (5 → 1·strategy pattern) |
| `map-editor.js` | map-editor-smart + map-editor-pro (审重叠) |
| `map-region-editor.js` | (保留) |
| `map-display.js` + `map-converter.js` + `map-integration.js` | 合并 `map-utils.js`·或保留·**待 Codex 意** |

**前缀**·map- 应否改 tm-·**待 align**·我倾向**保留 map- 前缀·明示子域**·与 editor- 同。

### 2.9 office / hongyan / authority (我加新)

10 文件·**待 deep audit**·

- `tm-office-runtime.js` + `tm-office-panel.js` + `tm-office-editor.js`·**editor 是 in-game 还是 game-editor?**·决定归属
- `tm-keju-runtime.js` (3209)·待 audit 内 section
- `tm-hongyan-office.js` (3378)·**信房·与 office 关系不清**·**critical**·可能·信房是 NPC 信件管理·不在 office 系列
- `tm-ceming.js` (812)·策命·应在 office 系列
- `tm-authority-*` 4 文件 + court-meter·**phase dump 嫌疑**·待 audit

**Phase 3** 深 audit + cleanup。

### 2.10 我历史理解错的板块·**rename 案 (#2 critical 诉求)**

| 模糊命名 | 我曾混淆 | rename → |
|---|---|---|
| tm-chaoyi.js (v1) + v2 + v2.bak + v3 + misc | active version 不确定·改老版 | 唯一 `tm-chaoyi.js`·v2/.bak/v3/misc delete/rename/重分 |
| tm-endturn-core/systems/helpers | core/systems/helpers 谁是 entry/谁是支援 | `tm-endturn-pipeline.js` (主管道) / `tm-endturn-step3-systems.js` (Step 3) / `tm-endturn-shared-utils.js` (helpers) |
| tm-endturn-province vs tm-endturn-render | 地方 panel 在哪 | `tm-endturn-render.js` (展示)·`tm-endturn-province-runtime.js` (rename·若是结算·不是 render) |
| editor-game-systems vs editor-fullgen vs editor-crud vs editor.js | 4 个职责重叠 | `editor.js` (shell)·`editor-crud.js` (通用)·`editor-ai-fullgen.js` (rename)·**game-systems 拆为 form-fiscal/military/keju/edict/etc** |
| tm-patches.js / tm-phase-c-patches.js | patches 修什么 / phase c 是哪 | tm-patches §1-§6 inline 各 area·delete 文件·tm-phase-c-patches Phase 3 后 inline tm-edict-parser-c.js |
| tm-ai-infra vs tm-ai-change-applier vs tm-ai-helpers | 边界模糊 | infra (LLM 调度) / change-applier (schema 应用) / helpers (子调用 utils)·**头注 explicit + map.md 双锁** |
| tm-arcs vs tm-char-arcs | 同 / 异? | audit 后·若同·delete tm-arcs·若异·rename `tm-arcs.js` → `tm-event-arcs.js` (剧本弧线 vs 人物弧线 explicit) |
| administration.js (无 tm- 前缀) | 命名异常 | rename `tm-administration.js` |
| tm-editor-* 4 文件 (前缀异常) | editor- vs tm-editor- 双前缀 | 全 rename `editor-` 前缀 |
| map-* 12 文件 (无 tm- 前缀) | 同 editor·**保留 map- 前缀·明示子域** | (保留·与 editor- 同等地位·但需统一·**align Q·见 §11**) |
| tm-three-systems-ext / -ui | three systems 是哪 3 个 | rename·explicit 业务名·**待 audit** |

---

## 3·Rename mapping table

按 §2.10 + Codex draft §6 模板·

| 现 | 改 | Phase | 风险 |
|---|---|---|---|
| tm-chaoyi-v3.js | tm-chaoyi.js (新·并 v3+v1 入口+v2 留 prompts) | 3 | 中·rename + delete 4 文件 |
| tm-tinyi-v3.js | tm-tinyi.js | 3 | 低·单文件 rename |
| tm-endturn-core.js | tm-endturn-pipeline.js | 3 | 低 |
| tm-endturn-systems.js | tm-endturn-step3-systems.js | 3 | 低 |
| tm-endturn-helpers.js | tm-endturn-shared-utils.js (审分 sub-helpers) | 3 | 中·内容多·需 audit |
| editor-game-systems.js | 拆为 5-6 editor-form-*.js | 3 | 高·2449 行 |
| editor-fullgen.js | editor-ai-fullgen.js | 3 | 低 |
| editor-government.js | editor-form-government.js | 3 | 低 |
| editor-fiscal.js | editor-form-fiscal.js | 3 | 低 |
| editor-military.js | editor-form-military.js | 3 | 低 |
| editor-corruption.js | inline 入 editor-form-fiscal.js | 3 | 低 |
| editor-engine-constants.js | inline 入 editor-form-office-engine.js | 3 | 低·我做 |
| editor-model-requirements.js | inline 入 editor-form-meta.js | 3 | 低·我做 |
| administration.js | tm-administration.js | 2 | 低·前缀统一 |
| tm-editor-custom-presets.js | editor-presets.js | 3 | 低 |
| tm-editor-details.js | editor-details.js | 3 | 低 |
| tm-editor-office-deep.js | editor-office-deep.js | 3 | 低 |
| tm-editor-division-deep.js | editor-division-deep.js | 3 | 低 |
| map-recognition-* (5) | map-recognition.js (合 strategy) | 3 | 中·strategy pattern |
| tm-guoku-p2/p4/p5/p6 | inline tm-guoku-engine.js (新建) | 3 | 中·4 文件合 |
| tm-corruption-p2/p4 | inline tm-corruption-engine.js (新建) | 3 | 中·2 文件合 |
| tm-neitang-p2 | inline tm-neitang-engine.js | 3 | 低 |

---

## 4·Delete / merge list

### 4.1 Phase 2 delete (低 risk)

- `tm-chaoyi-v2.js.bak` (备份污染)
- (若 audit 确认) `scan_globals.js` / `detect_globals.js` (内容是否 dev tool / 纯输出·待审)

### 4.2 Phase 3 delete (中 risk·需 alternative ready)

- `tm-chaoyi-v3.js` → 内容并入新 tm-chaoyi.js
- `tm-chaoyi-v2.js` → 内容部分留 (prompts)·部分 delete
- `tm-chaoyi.js` (v1) → 内容并入新 tm-chaoyi.js
- `tm-chaoyi-misc.js` → 535 行重分各 area
- `tm-tinyi-v3.js` → rename
- `tm-patches.js` → 内容 inline 6 area·delete
- `tm-phase-f1-fixes.js` → audit 后 SELF/APPEND 行动
- `tm-guoku-p2/p4/p5/p6` → inline guoku-engine
- `tm-corruption-p2/p4` → inline corruption-engine

### 4.3 Phase 4 合并 (小文件·26 个 <200 行)

| 合并目标 | 合并源 |
|---|---|
| `tm-ui-foundation.js` | DONE P4-beta: tm-modal-system (50) + tm-icons (90) + tm-cheatsheet-overlay (194) + tm-settings-ui (68·壳) |
| `tm-env.js` | tm-env-detect (93) + tm-env-recovery-fill (187) |
| `tm-globals-tool.js` | scan_globals (74) + detect_globals (120)·或全 delete (dev tool) |
| `tm-currency.js` | tm-currency-unit (129) inline tm-currency-engine |
| `tm-diagnostics-foundation.js` | DONE P4-beta: tm-error-collector (120) + tm-errors-panel (175) + tm-pollution-guard (183) |
| `tm-misc-utils.js` | tm-time-utils (206) + tm-diff (193) + tm-changelog (220) (待审) |

(Phase 4 详 audit·此处 first-cut)

---

## 5·依赖图 high-level

### 5.1 分层

```
┌────────────────────────────────────────────┐
│  Layer 5 (UI/Shell)                         │
│  player-core / game-loop / editor / panel*  │
│  topbar / sidebar / drawer / overlay        │
└────────────────────────────────────────────┘
              ↓ depends on
┌────────────────────────────────────────────┐
│  Layer 4 (Domain Runtime)                   │
│  endturn-* / chaoyi / tinyi / wendui /      │
│  military / fiscal / huji / office / keju / │
│  edict / mechanics / world / NPC            │
└────────────────────────────────────────────┘
              ↓ depends on
┌────────────────────────────────────────────┐
│  Layer 3 (AI / Engine)                      │
│  ai-infra / ai-change-applier /             │
│  prompt-composer / ai-schema /              │
│  *-engine 类                                │
└────────────────────────────────────────────┘
              ↓ depends on
┌────────────────────────────────────────────┐
│  Layer 2 (Data / State)                     │
│  data-model / data-access /                 │
│  state / state-snapshot /                   │
│  storage / save-* / migration               │
└────────────────────────────────────────────┘
              ↓ depends on
┌────────────────────────────────────────────┐
│  Layer 1 (Foundation)                       │
│  utils / time-utils / event-bus /           │
│  namespaces / engine-constants / icons      │
└────────────────────────────────────────────┘
```

### 5.2 禁循环

- Layer N 可依赖 Layer < N
- 同 Layer 间禁循环 (A→B→A)
- 跨 Layer 反向依赖 (低层依高层)·**critical**·必修

---

## 6·Namespace (TM.X) 渐进迁移

### 6.1 已存 (我读得)

- `TM.PromptComposer` (我做·v0-v7)
- `TM.errors` (capture/etc)
- `window.TM = TM || {}` 在 tm-namespaces.js (304 行)

### 6.2 应新增 (Phase 1 起新代码强制·Phase 5/6 旧代码迁移)

| Namespace | 含 |
|---|---|
| `TM.Chaoyi` | 朝议/廷议/御前 公共 API |
| `TM.Wendui` | 问对 |
| `TM.Endturn` | endTurn / pipeline |
| `TM.Endturn.AI` | AI 推演 |
| `TM.Military` | 军事 |
| `TM.Fiscal` | 财政 |
| `TM.Huji` | 户口 |
| `TM.Office` | 官制 |
| `TM.Keju` | 科举 |
| `TM.Edict` | 诏令 |
| `TM.NPC` | NPC engine/decision |
| `TM.Char` | 角色 schema/autogen/data |
| `TM.Map` | 地图 |
| `TM.UI` | UI 公共 (panel/modal/drawer) |
| `TM.Save` | 存档 |
| `TM.Editor` | 编辑器 |
| `TM.Memory` | 记忆 |
| `TM.Player` | 玩家 |

### 6.3 Alias 期·5 phases

| Phase | 状态 |
|---|---|
| 1 | 新代码强制 TM.X·lint check 提示 |
| 2-3 | 重构区域加 alias·`window.oldName = TM.X.newName; // legacy alias` |
| 4 | alias 标 deprecated·头注 explicit |
| 5 | 旧代码大迁·alias 期·verify all 调用方迁完 |
| 6 | alias 退役·delete legacy alias |

---

## 7·Safety gate render-smoke 设计 (我 own)

### 7.1 目的

验证·**Mock GM state + 全 panel render·不 throw**·

### 7.2 Mock state shape

最小 GM·

```js
{
  turn: 1, era: '熹宗·天启', dynasty: '明',
  scenario: 'tianqi', protagonist: 'mock-emperor',
  characters: [/* 10 mock NPC */],
  variables: { base: {帑廪:100,内帑:100,户口:1000,吏治:50,民心:50,皇权:50,皇威:50}, other: {} },
  events: { historical: [], random: [], conditional: [], story: [], chain: [] },
  armies: [/* 3 mock */],
  officeTree: [/* mock */],
  adminHierarchy: [/* mock */]
}
```

### 7.3 Render 列表

| Panel | 函数 |
|---|---|
| 朝政中心 | renderShizhengPanel / openShizhengTab |
| 人物志 | renderRenwu / switchGTab('gt-renwu') |
| 地方 | _renderDifangPanel(true) |
| 国库 | renderGuokuPanel |
| 内帑 | renderNeitangPanel |
| 财政 | renderFiscalPanel |
| 军事 | renderMilitaryUI |
| 编年史 | renderChronicle |
| 礼制 | renderLizhi |
| 时机 | renderShijiQiju |
| endturn report | renderEndTurnReport |
| topbar 变量 | renderTopbarVars |
| 侧栏 | renderSidebar |
| 抽屉 | renderVarDrawers |

### 7.4 PASS criteria

- 全 panel·**不 throw**·**不 mute err**
- DOM 写出·**innerHTML 非空**
- 无 'undefined' / 'null' / '[object Object]' 字面字符串

---

## 8·Claude 区 own first-cut 拆分计划

### 8.1 chaoyi 5 文件 cleanup (Phase 3)

详见 §2.1 + §3·总体·

```
现: 5 文件 (chaoyi/v2/v2.bak/v3/misc) ~6064 行
目标: 1 文件 (chaoyi.js) + chaoyi-misc 535 行重分各 area
ETA: 2-3 day
风险: 中·sysP 调用关系多·需 cc3-smoke 全绿
```

### 8.2 editor 16 文件 reorganize (Phase 3)

详见 §2.2·重点·**editor-game-systems 2449 拆**·

```
Step 1·audit editor-game-systems 内 sub-section (1 day)
Step 2·按业务域分文件 first cut (2 day)
Step 3·verify-all + smoke (0.5 day)
Step 4·delete/rename old (0.5 day)
ETA: 4 day
风险: 高·2449 行·影响 editor.html 调用
```

### 8.3 persistence / migration 边界

```
现: tm-save-lifecycle (1059) + tm-save-manager (816) + tm-storage (460) + tm-state (279) + tm-state-snapshot (238) + tm-migration (244)
目标: 4 文件
  tm-save-engine.js (合 lifecycle + manager)
  tm-storage.js (保留)
  tm-state.js (合 state + state-snapshot)
  tm-migration.js (保留)
ETA: 2 day (Phase 3)
```

---

## 9·新文件命名 lint script

简单 node script·

```js
// scripts/lint-naming.js
var files = listJsFiles('web/');
var violations = [];
files.forEach(f => {
  // 1. 前缀检查
  if (!/^tm-|^editor-|^map-|^administration\.js/.test(basename(f))) violations.push({f, rule: 'unknown-prefix'});
  // 2. 禁词
  if (/-(v2|v3|misc|patches|fixes|final|bak)\.js$/.test(f)) violations.push({f, rule: 'forbidden-suffix'});
  // 3. 头注
  var head = readHead(f, 30);
  if (!/^\/\/ Module:|^\/\/ ============/.test(head)) violations.push({f, rule: 'missing-header'});
  // 4. namespace
  var content = read(f);
  if (/^function [A-Z]/.test(content)) violations.push({f, rule: 'global-fn-uppercase'});
});
process.exit(violations.length ? 1 : 0);
```

加 verify-all·**每提交 verify**·**新文件违规即 fail**。

---

## 10·Phase 0 完成标准·**与 Codex §13 align**

| | Codex § 13 | Claude |
|---|---|---|
| Claude draft 已写 | ✓ | ✓ |
| Codex draft 已写 | ✓ | ✓ |
| 两边差异已讨论 | ✓ | ✓ |
| `architecture-target-final.md` 已落盘 | ✓ | ✓ |
| Phase 1 safety gate 清单已落盘 | ✓ | ✓ (本 doc §7 + Codex §7) |
| 用户确认进入 Phase 1 | ✓ | ✓ |

**完全 align**·无新增。

---

## 11·与 Codex draft 异同·preview align

### 11.1 Agree

- 三高频 docs (architecture-map / module-boundaries / refactor-playbook)
- 模块边界 6 大域 (回合/AI/角色/朝议/编辑器/UI runtime)
- 命名禁列 (-v2/v3/bak/patches/fixes/final/misc)
- 头注模板 12 字段 + Refactor notes
- 安全门 5 + 6 + 4
- Codex/Claude own 区
- 第一批切片 0-5
- ai-infer 第一刀·头注 + section map
- Phase 文件 SELF/APPEND/LAYERED 三 tier
- patches·先登记·后清理
- namespace·新代码强制·旧 alias

### 11.2 Disagree·讨论点

**注·2026-05-03 Codex 后续信** (`2026-05-03-refactor-phase0a-doc-location-and-namespace-ack.md`) **已 ack 我 namespace reconciliation + Phase 4 小文件合并**·**原 #1 #3 disagree 已 align**·**实际仅 1 项真 disagree**·

| | Codex | Claude | 状态 |
|---|---|---|---|
| ~~namespace 大迁阶段~~ | ~~Phase 4~~ | ~~Phase 5/6~~ | **✓ 已 align**·新代码 Phase 1 起·旧代码 Phase 5/6 |
| editor-game-systems 拆 | 单列 (12.2 实为问·待答) | Phase 1 audit-first·根据 audit 结果决定拆 N | **🟡 procedural Q**·待 Codex ack |
| ~~Phase 4 内容~~ | ~~namespace~~ | ~~小文件合并 (26 个 <200 行)~~ | **✓ 已 align**·Phase 4 = 小文件合并 |
| chaoyi v1 (161) 处理 | misc 一并·active 唯一 v3 | v1 入口仍 active·应并入新 chaoyi.js | **✓ 实际 align**·active 唯一·rename 时 v1 入口逻辑保留进新文件 |

### 11.3 Claude 加新 (Codex 未列)

- §2.7·财政 15 文件 → 6 文件合并
- §2.8·map 12 文件 → 6 文件合并
- §2.9·office/hongyan/authority 10 文件待 deep audit
- §2.10·我历史理解错 11 案 (#2 critical 诉求)·rename 案
- §4.3·Phase 4 小文件 26 个合并 first cut
- §5·依赖图 5 层
- §6·TM.X namespace 18 个 sub-namespace 列
- §7·render-smoke 详细设计 (Mock state + Render 列表 + PASS criteria)
- §9·命名 lint script 草稿

---

## 12·Next·待 align

完成本 draft 后·开 align letter·

- diff Codex draft vs Claude draft
- 讨论 §11.2 disagree 4 点
- 决定 Phase 4-6 内容 final
- 决定 editor-game-systems 拆策略 (audit-first vs 直接 propose)
- 写入 `architecture-target-final.md`
- 报用户确认进入 Phase 1

无 commit·无 push·阶段 0 内。

— Claude
