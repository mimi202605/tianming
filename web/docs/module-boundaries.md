# tianming Module Boundaries v0.1

date·2026-05-03 · status·**v0.1** (Phase 1 slice 2·Claude draft·Codex §2 feedback incorporated)

> **本 doc 是裁判文档·非愿景文档**·**只写 active 文件当前职责**·**Phase 3+ 拆分 roadmap·见 §28 单独一节+ `architecture-target-final.md` §4**

## 0·用途
> **改功能前·确认 module 边界**
> **新功能加哪·按"新功能加在这里还是别处"决定**

每 module 答 6 questions·

1. **owns**·这个 module 当前负责什么
2. **does not own**·容易误放·但不属于这里
3. **public API**·当前暴露的接口
4. **depends on**·依赖谁
5. **used by**·谁依赖它
6. **新功能加哪**·新需求决策点

依据·`architecture-target-final.md` §4·`architecture-map.md` §1

---

## 1·tm-chaoyi family (朝议·4 文件·P3 done 2026-05-03)

**按朝议三模式分拆**·入口 + 共享 + 三模式各独立·5 → 4 文件 (verify-all 19/19 PASS)·

| 文件 | 行| owns |
|---|---|---|
| `tm-chaoyi.js` | 243 | 入口·频率限制·位置判定·三模式选卡·_cy_pickMode 分发·addCYBubble 共享气泡·_cc2 prompts (changchao 调用) |
| `tm-chaoyi-changchao.js` | 3,843 | 常朝主流程·6 _cc3_* funcs·preview 移植·GM Adapter (rename v3) |
| `tm-chaoyi-tinyi.js` | 789 | 廷议·12 _ty2_* funcs (from v2 _ty2_*) + _cy_suggestBtnHtml |
| `tm-chaoyi-yuqian.js` | 504 | 御前·12 _yq2_* funcs (from v2 _yq2_*) |

| 项 | 内容 |
|---|---|
| does not own | 1v1 私谈 (→ tm-wendui)·弹劾 (→ tm-tinyi-v3)·诗政 (→ tm-shizheng-panel)·官员表(→ tm-office-runtime) |
| public API | `_cc3_open` (常朝) / `_ty2_openSetup` (廷议) / `_yq2_openSetup` (御前) / `addCYBubble` / `startChaoyiSession` / `_cc2_buildAgendaPrompt` |
| depends on | TM.PromptComposer / tm-ai-infra (callAI) / tm-npc-engine / tm-char-* |
| used by | tm-game-loop (朝政中心) / tm-renwu-ui (朝议入口) / tm-tinyi-v3 (fallback _ty2_openSetup) |
| 新功能加哪 | 常朝 → changchao·廷议 → tinyi·御前 → yuqian·共享气泡/_cc2 prompts →chaoyi.js |
| smoke | `cc3-smoke` (56)·`smoke-tinyi-fix` (18)·`smoke-tinyi-impeachment` (149) |

---

## 2·tm-tinyi-v3.js (廷议·弹劾)

| 项 | 内容 |
|---|---|
| owns | 廷议七阶段·议前预审 / 起议站班 / 分轮辩议 / 廷推 / 钦定档位 / 草诏拟旨 / 用印颁行 / 追责回响 |
| does not own | 朝议 (→ tm-chaoyi-changchao)·1v1 (→ tm-wendui)·诏令解析 (→ tm-edict-parser) |
| public API | `_ty3_*` 函数族(内部命名) |
| depends on | TM.PromptComposer / tm-ai-infra / tm-npc-* / tm-edict-parser (草诏) / tm-chaoyi-tinyi (fallback _ty2_openSetup) |
| used by | tm-game-loop / tm-chaoyi.js (_cy_pickMode 'tinyi' 入口·当前调 _ty2_openSetup·_ty3_open 待 future) |
| 新功能加哪 | 弹劾 / 钦定 / 草诏阶段 → 加这里 |
| smoke | `tinyi-fix` (18) + `tinyi-impeach` (149) |

---

## 3·tm-wendui.js (问对·1v1)

| 项 | 内容 |
|---|---|
| owns | 1v1 问对 (正式/密问/独召) 弹窗模式·发起人选择·对话推进·sysP·结算 |
| does not own | 朝议 (→ tm-chaoyi-changchao)·廷议 (→ tm-tinyi-v3)·奏疏 (→ tm-memorials) |
| public API | `openWendui` / `_wdBuildPrompt` |
| depends on | TM.PromptComposer (名 buildAiPersonaText·v6) / tm-ai-infra / tm-npc-* / tm-memorials |
| used by | tm-renwu-ui / tm-game-loop |
| 新功能加哪 | 1v1 私谈 / 密问 / 独召 → 加这里 |
| smoke | (待加 wendui-smoke) |

---

## 4·tm-endturn-core.js (回合·入口/管道)

| 项 | 内容 |
|---|---|
| owns | endTurn 入口·_endTurnInternal·_endTurnCore·谈 prep + ai-infer + 写回 |
| does not own | AI 推演实质 (→ tm-endturn-ai-infer)·结果展示 (→ tm-endturn-render)·省份结算 (→ tm-endturn-province) |
| public API | `endTurn` / `_endTurnInternal` / `_endTurnCore` |
| depends on | tm-endturn-prep / tm-endturn-ai-infer / tm-endturn-systems / tm-utils |
| used by | tm-player-core (endTurn 按钮) / tm-game-loop |
| 新功能加哪 | 回合主管道流程修→ 加这里·新结算引擎 → tm-endturn-systems |

---

## 5·tm-endturn-ai-infer.js (回合·AI 推演·12,591 行·按 region 分层)

| 项 | 内容 |
|---|---|
| 内部 5 Region | 见 `web/docs/ai-infer-section-map.md` (Codex slice 8) |

### Region 1·Prompt/Context Assembly (L25-L3230)

| owns | 初始 output buffers (shizhengji / zhengwen / playerStatus / 等)·tp 和 sysP 主串·world/memory/court/faction/chronicle 注入·token 预算 |
| does not own | LLM 实际调用 (见 Region 3)·prompt 通用片段 (→ TM.PromptComposer·已部分桥接 L1668-1740)·first extracted policy/context slice (→ tm-endturn-ai-context.js) |
| 新功能加哪 | prompt 内容·**优先走 TM.PromptComposer 通用化**·见 specialty / Region 1 内 sub-block |

### Region 2·Sub-Call Infrastructure (L3235-L3390)

| owns | 共享状态(_aiDepth / aiThinking / memoryReview / p1 / p2 / p1Summary / GM._turnAiResults / GM._subcallTimings)·_subcallMeta 注册表·_runSubcall / _runSubcallBatch / _maybeCacheSys |
| 16 subcalls 注册 | sc0 / sc05 / sc1 / sc1b / sc1c / sc15 / sc_memwrite / sc16 / sc17 / sc18 / sc_audit / sc2 / sc25 / sc27 / sc07 / sc28 |
| does not own | 业务 prompt (见 Region 1)·业务 schema 应用 (见 Region 4) |
| 新功能加哪 | 新 subcall 见 Region 2 _subcallMeta 注册·新调度wrapper 见 Region 2 |

### Region 3·Core AI Calls (L3391-L5767)

| owns | sc0 / sc05 / sc1 / sc1b / sc1c·核心 LLM 调用·schema-heavy JSON·world snapshots·token budget·Call A 压缩 fallback |
| 关键产物 | p1 / p2 / p1Summary / aiThinking / memoryReview |
| does not own | sub-call infra (见 Region 2)·writeback (见 Region 4) |
| 新功能加哪 | 新 core AI prompt + 调用 见 Region 3·需 Region 2 注册 + Region 1 sysP context |

### Region 4·sc1 Writeback (L5767-L10361·**最 risky**)

| owns | 应用 AI 输出到 GM/P/runtime systems·delegate applyAITurnChanges·reconciliation·field-family reducers (角色/关系/官制/势力/党派/政策/地图/军事/事件/文化/lifecycle) |
| 内部 hot helpers | _findDiv (L8790) / _findAdminNode (L8999) / _removeChildPS (L9196) / _dispatchNpcActionToPlayer (L9856) / _dispatchFactionActionToPlayer (L10009) |
| does not own | Region 3 LLM 调用·Region 5 post-call·tm-ai-change-applier 内部 (delegate to it) |
| 新功能加哪 | 新 field-family writeback 见 Region 4 (谨慎·加 narrow smoke)·**禁直接动 Region 4·必先加 fixture** |

### Region 5·Post-sc1 Fanout And Wrap-Up (L10362-L12591)

| owns | sc15 / sc_memwrite / sc16 / sc17 / sc18 / sc_audit / sc1.9 enrichment / sc2 / sc25 / sc27 / sc07 / sc28 / 内存巩固 / 内存压缩 / E13 一致性/ timing 摘要 |
| 分支模式 | A·sc15 → sc_memwrite (post-turn queue) / B·sc16+sc17+sc18 (concurrent batch) / C·sc2 → sc27 (narrative) |
| does not own | render (→ tm-endturn-render)·且 sc1 (见 Region 3) |
| 新功能加哪 | 文 post-call 见 Region 5·按A/B/C 分支选合适位置|

### 整文件 public API

**no direct export·used via `tm-endturn-core.js` (`_endTurnInternal` 调用)**·**全inline·无独立entry point**

### 整文件 used by

tm-endturn-core (调 / 间接·tm-player-core (endTurn 按钮)

### 整文件 smoke

`boot-smoke` 验脚本加载·`render-smoke` 验mock GM 上crash·**Region 4 / 5 待加 narrow fixture (Codex slice 8 推荐)**

---

## 6·tm-endturn-render.js (回合·结果展示)

| 项 | 内容 |
|---|---|
| owns | _endTurn_render 主入口·财务报表·宰辅进言·主角状态·朝野反应·Delta 面板·起居→ 编年史时政记 panel·affectedArmies expanded details·militarySystems 总览（R5 添加） |
| does not own | AI 推演 (→ tm-endturn-ai-infer)·业务结算 (→ tm-endturn-systems)·battle 数据 (→ tm-military) |
| public API | `_endTurn_render` (内部由 ai-infer 末尾调用) |
| depends on | tm-endturn-helpers / tm-utils·间接·tm-military.armies / GM.affectedArmies |
| used by | tm-endturn-ai-infer (Region 5 末尾·由 core 末尾) |
| 新功能加哪 | 战况 / 兵备 / 财政 / 起居 等结果展示 → 加这里·**Codex own·Claude review at merge**（R5 添加 affectedArmies + militarySystems） |
| smoke | `render-smoke` (7 targets·13 pass) |

---

## 7·tm-endturn-province.js (回合·省份结算)

| 项 | 内容 |
|---|---|
| owns | 省份/地方结算·adminHierarchy 渲染·province card·_renderDivisionNode |
| does not own | 行政区划 schema (→editor-administration.js)·中央-地方逻辑 (→ tm-central-local-engine) |
| public API | `_renderDivisionNode` 等 |
| depends on | tm-administration / tm-central-local-engine |
| used by | tm-player-core._renderDifangPanel / tm-game-loop |
| 新功能加哪 | 省份结算 / 地方 panel 渲染 → 加这里 |

---

## 8·tm-endturn-systems.js (回合·Step 3 系统更新调度)

| 项 | 内容 |
|---|---|
| owns | _endTurn_updateSystems·Step 3 机械层结算调度·BattleEngine / SubTickRunner / executeNpcBehaviors / NpcEngine / FiscalCascade / CharEconomyEngine / HujiEngine / EnvCapacityEngine / advanceKejuByDays / AuthorityEngines / CorruptionEngine / GuokuEngine |
| does not own | 各 engine 实质 (主文档)各业务 module)·结果展示 (→ tm-endturn-render) |
| public API | `_endTurn_updateSystems(timeRatio, zhengwen)` |
| depends on | 大量 engine·党window 全局 |
| used by | tm-endturn-core._endTurnCore |
| 新功能加哪 | 各 engine 调度 → 加这里·新 engine 实质 → 对应业务 module |

---

## 9·tm-endturn-helpers.js (回合·辅助 cluster)

| 项 | 内容 |
|---|---|
| owns | findOfficeByFunction·_computeOfficeHash·议程模板·考课·Chancellor 宰辅决策·resolveHeir·SettlementPipeline 注册·NPC 意图 / 太史公·成效 / 议程执行 |
| does not own | endTurn 主管道(→ -core)·结果展示 (→ -render) |
| public API | `findOfficeByFunction` / `_computeOfficeHash` / etc（内部） |
| depends on | tm-utils / tm-mechanics |
| used by | tm-endturn-core / tm-endturn-systems |

---

## 10·tm-endturn-prep / -edict / -ai-helpers / -ai-context (回合·辅助 4 文件)

| 文件 | owns |
|---|---|
| `tm-endturn-prep.js` | endTurn 前置准备 |
| `tm-endturn-edict.js` | 诏令效果结算 |
| `tm-endturn-ai-helpers.js` | endTurn AI 子函数helpers |
| `tm-endturn-ai-context.js` | endTurn AI Region 1 first policy/context sysP injection split; infer keeps inline fallback |

---

## 11·tm-ai-infra.js (LLM 调度基础设施)

| 项 | 内容 |
|---|---|
| owns | LLM 调用基础设施·队列·hook·1.1 prompt 分层压缩·1.2 模型适配·1.6 成本监控·1.7 模板化引擎·.7.4 请求队列·1.7.46 Provider 检测·1.7.47 XML Prompt·1.7.5 重试/超时/429·GameHooks·月结流水线·子回合调度·事件总线·原子操作·变更日志·Balance 配置 |
| does not own | 业务 prompt 内容（见 specialty 自定义）·业务 schema 应用 (→ tm-ai-change-applier) |
| public API | `callAI` / `extractJSON` / `GameHooks.X` / `TM.events.X` |
| depends on | tm-utils / tm-namespaces |
| used by | **几乎全 module**·tm-endturn-ai-infer / tm-chaoyi-changchao / tm-chaoyi-tinyi / tm-chaoyi-yuqian / tm-tinyi-v3 / tm-wendui / tm-npc-* / etc |
| 新功能加哪 | LLM provider / 队列 / 重试 → 加这里 |

---

## 12·tm-ai-change-applier.js (AI 输出应用)

| 项 | 内容 |
|---|---|
| owns | applyAITurnChanges·schema 应用 GM·field-family writeback·validator |
| does not own | LLM 调用 (→ tm-ai-infra)·prompt (→ tm-prompt-composer) |
| public API | `applyAITurnChanges` |
| depends on | tm-ai-schema / tm-ai-output-validator·业务 module reducers |
| used by | tm-endturn-ai-infer (Region 4 sc1 writeback delegate) |
| 新功能加哪 | 新 schema 字段应用 → 加这里·先 tm-ai-schema 注册 |

---

## 13·tm-prompt-composer.js (sysP 片段复用)

| 项 | 内容 |
|---|---|
| owns | 8 builders·buildBase / buildPersonaExtra / buildBookExtra / buildNarrativeGuide / buildChronicleStyle / buildTemporalGranularity / buildAiPersonaText (v6 同 batchPersonaMaxLen 截断) / buildRecognitionState / buildSystemPrefix / buildCommon / getBatchPersonaMaxLen |
| does not own | LLM 调用 (→ tm-ai-infra)·业务 prompt 内容 |
| public API | `TM.PromptComposer.*` |
| depends on | none (pure builder) |
| used by | tm-wendui / tm-chaoyi-changchao / tm-endturn-ai-infer (L1668-1740) / tm-tinyi-v3 |
| 新功能加哪 | 新通用 prompt 片段 → 新 builder·**禁复制人格 prompt 入业务文件* |

---

## 14·tm-ai-* 辅助 (3 文件)

| 文件 | owns |
|---|---|
| `tm-ai-schema.js` | AI 输出 schema / 字段契约 |
| `tm-ai-planning.js` | AI 规划层|
| `tm-ai-output-validator.js` | AI 输出 validator |
| `tm-ai-npc-memorials.js` | NPC 奏疏 AI |
| `tm-ai-apply-deaths.js` | AI 应用死亡事件 |

---

## 15·tm-npc-* + tm-char-* + tm-class-* + tm-relations.js (NPC / 角色 / 阶级 / 关系)

| 文件群| owns |
|---|---|
| `tm-npc-engine.js` / `tm-npc-decision.js` | NPC engine·decision 决策 |
| `tm-char-full-schema.js` / `tm-char-autogen.js` | 角色 schema·autogen |
| `tm-char-historical-profiles.js` / `tm-char-historical-profiles-ext.js` | 历史人物 data·base 27 + ext 479 = 506 条 |
| `tm-char-economy-engine.js` / `tm-char-economy-ui.js` | 角色经济 / UI |
| `tm-char-arcs.js` | 人物弧线（异步·idle-driven 推演） / `tm-arcs.js`（同步·event-driven 记录）|
| `tm-class-engine.js` / `tm-class-mobility.js` | 阶级 / 流动 |
| `tm-traits-data.js` | 特质 data |
| `tm-relations.js` / `tm-rel-graph.js` | 关系 / 关系图 |
| `tm-influence-groups.js` | 影响力集团|
| `tm-arcs.js` (同步·event-driven 记录) | `tm-char-arcs.js`（异步·idle-driven 推演）|

| does not own | 朝议 NPC 发言 (→ tm-chaoyi-changchao)·人物志 UI (→ tm-renwu-ui) |
| smoke | `class-engine` (78) / `class-party-bidi` (34) / `influence-groups` (91) |

---

## 16·tm-military.js (军事 / 战争·Codex own)

| 项 | 内容 |
|---|---|
| owns | armies·battles·围城·行军·casus belli·停战·BattleEngine·MilitarySystems |
| does not own | 战况展示 (→ tm-endturn-render)·军事 panel UI (→ tm-military-ui·薄) |
| public API | `BattleEngine.resolveAllBattles` / `MilitarySystems.applyBattleResult` |
| depends on | tm-utils / tm-map-system (battle location) |
| used by | tm-endturn-systems (Step 3 战斗结算) / tm-endturn-render (战况展示) |
| 新功能加哪 | 战斗 / 行军 / 围城 → 加这里·**战况 UI → tm-endturn-render (Claude review)** |
| smoke | `military-systems` (83) |

---

## 17·tm-fiscal-* + tm-economy-* + tm-currency-* + tm-corruption-* + tm-guoku-* + tm-neitang-*

| 文件群| owns |
|---|---|
| **`tm-fiscal-engine.js`** (P3 done F6 2026-05-03·合 cascade + fixed-expense·1438 行 / `tm-fiscal-ui.js` / `tm-tax-atomic.js` (R12 SELF·F3 audit done·真 redistribute 留patches slice) | 财政引擎 (CascadeTax + FixedExpense·税收级联+固定支出)·UI·赋税原子 (待 patches slice 真 redistribute) |
| `tm-economy.js` (top-level non-IIFE·留独立·core game runtime) + **`tm-economy-engine.js`** (**P3 done F7 2026-05-03**·5 IIFE 合·linkage/gap-fill/currency-engine/currency-unit/env-capacity) | 经济·联动·缺口填补·货币 (engine + unit)·环境承载 |
| `tm-corruption-engine.js` (active) | corruption engine + p2/p4 inline (R9 done·35/35 PASS) |
| `tm-guoku-engine.js` + `tm-guoku-panel.js` + `tm-guoku-p2/p4/p5/p6` (**LAYERED ACCEPTED·R116c deferred·5 层链·必先 smoke·50h+**) | 国库 engine + panel + 4 phase override chain·deferred |
| **`tm-neitang-engine.js`** (P3 done F2 2026-05-03·inline p2·1213 行) + `tm-neitang-panel.js` | 内帑 engine + panel·~~p2~~ inline done |
| ~~tm-env-capacity-engine.js~~ | 环境容量·**P3 done F7·已 inline economy-engine §C** |

| does not own | 户口 (→ tm-huji-engine)·官俸 (→ tm-office-runtime) |
| 新功能加哪 | 财政 → fiscal-engine·国库收入/支出 → guoku-engine/panel + 对应 -p* (transitional)·内帑 → neitang-engine·腐败 → corruption-p*·**禁加新 -p2/-p4/-p5 文件** |

---

## 18·tm-huji-engine + -deep-fill (户口 / 人口)

| 项 | 内容 |
|---|---|
| owns | 户口 engine·人口·户籍·朝代户口·深度填充 |
| does not own | 财政 (→ tm-fiscal-*)·NPC (→ tm-npc-*) |
| public API | HujiEngine·`huji_engine.X` |
| used by | tm-endturn-systems (Step 3·HujiEngine) / tm-fiscal-* |

---

## 19·tm-office-* + tm-keju-runtime + tm-ceming + tm-hongyan-office + tm-authority-*

| 文件群| owns |
|---|---|
| `tm-office-runtime.js` / `tm-office-panel.js` / `tm-office-editor.js` | 官制 runtime·panel·in-game editor |
| `tm-keju-runtime.js` (3209) | 科举 runtime |
| `tm-ceming.js` | 策命 |
| `tm-hongyan-office.js` (3378·待 audit·不office 关系) | 信房 |
| `tm-authority-complete.js` / `-engines.js` / `-ui.js` / `-deep.js` | 皇权 4 文件 |
| `tm-court-meter.js` | 朝中势力计|

| does not own | 朝议 NPC 任命 (→ tm-chaoyi-changchao)·官员决策 (→ tm-npc-*) |
| smoke | `office-dynastification` (33) |

---

## 20·tm-edict-* + tm-mechanics-* (诏令 / 机制)

| 文件 | owns |
|---|---|
| `tm-edict-parser.js` | 诏令解析 |
| `tm-edict-thresholds.js` | 阈值 |
| `tm-edict-complete.js` (active·诏令补完) | 11 类奏疏反向触发+ 6 主题问对 + tryExecute 自动分流 |
| `tm-edict-lifecycle.js` | 生命周期 |
| `tm-mechanics.js` / `tm-mechanics-world.js` | 机制 base / world |

| does not own | 诏令 UI 起草 (→ tm-tinyi-v3 / tm-chaoyi-changchao)·诏令效果结算 (→ tm-endturn-edict) |

---

## 21·tm-world.js + tm-feudal + tm-prophecy + tm-ethnic-religion + -world-snapshot + -world-view

| 文件 | owns |
|---|---|
| `tm-world.js` | 世界状态 |
| `tm-feudal.js` (2656) | 封建 |
| `tm-world-snapshot.js` | 世界快照 |
| `tm-world-view.js` | 世界视图 |
| `tm-prophecy.js` | 预言 |
| `tm-ethnic-religion.js` | 民族宗教 |

---

## 22·tm-map-system + map-* (地图)

| 文件 | owns |
|---|---|
| `tm-map-system.js` (1955) | 地图 system 层(renderMap / renderPolygons / renderEdges / renderCities / renderArmies / renderBattles) |
| `map-editor-smart.js` (2087) / `map-editor-pro.js` (1119) | 地图 editor |
| `map-recognition.js` / `-improved` / `-eu4` / `-borders` / `-fast` (5 文件) | 地图识别 |
| `map-region-editor.js` | region editor |
| `map-display.js` / `map-converter.js` / `map-integration.js` | 显示 / 转换 / 集成 |

---

## 23·editor-administration.js + tm-central-local-engine + tm-region-enrich + tm-editor-division-deep

| 文件 | owns |
|---|---|
| `editor-administration.js` (editor- 前缀·editor.html 只加轮) | 行政区划 editor 表单|
| `tm-central-local-engine.js` | 中央-地方 engine |
| `tm-region-enrich.js` | 地区 enrich |
| `tm-editor-division-deep.js` | 行政区划 editor 混(前缀异常·tm-editor-) |

---

## 24·UI 文件群(panel / topbar / drawer / sidebar / overlay)

| 文件 | owns |
|---|---|
| `tm-shizheng-panel.js` | 诗政 panel |
| `tm-renwu-ui.js` (启 renderRenwu) | 人物志 UI |
| `tm-sidebar-ui.js` (启 renderSidePanels / renderGameTech / renderGameCivic) | 侧栏 |
| `tm-shell-extras.js` | shell extras |
| `tm-lizhi-panel.js` (启 renderCorruptionPanel) | 礼制 panel |
| `tm-shiji-qiju-ui.js` (启 renderShijiList / renderQiju) | 时机起居 UI |
| `tm-topbar-vars.js` (含 _renderGuoku / _renderNeitang / _renderHukou) | topbar 变量 |
| `tm-var-drawers.js` | 变量抽屉 |
| `tm-three-systems-ui.js` / `tm-three-systems-ext.js` | 三系统 UI / ext |
| `tm-memory-ui.js` | 内存 UI |
| `tm-ui-foundation.js` | foundation 薄文件合集：icons / modal / settings placeholder / cheatsheet |
| `tm-diagnostics-foundation.js` / `tm-diagnostics-panel.js` | 错误 / 诊断 panel |

| 注 | settings 真实实现在 tm-patches.js §1 (~560 行·tm-ui-foundation.js 内保留 R22 placeholder) |
| smoke | `render-smoke` (17 targets) |

---

## 25·tm-save-* + tm-storage + tm-state* + tm-migration (持久化)

| 文件 | owns |
|---|---|
| `tm-save-lifecycle.js` (1059) / `tm-save-manager.js` (816) | 存档生命周期 / manager |
| `tm-storage.js` | 存储抽象 (browser / Electron) |
| `tm-state.js` / `tm-state-snapshot.js` | state / snapshot |
| `tm-migration.js` | migration |
| `tm-help-social.js` (1294·跨域) | 含 SAVE_VERSION migration (v5→v6) |

---

## 26·tm-memorials + tm-memory-* + tm-semantic-recall

| 文件 | owns |
|---|---|
| `tm-memorials.js` | 奏疏 |
| `tm-memory-tables.js` / `-anchors.js` / `-adapter.js` | 内存 tables / anchors / adapter |
| `tm-semantic-recall.js` | 语义召回 |

---

## 27·editor.js + editor-* (编辑器·26 文件)

| 文件 | owns |
|---|---|
| `editor.js` (2379) | shell / 导航 |
| `editor-core.js` (453) | (待P1 audit·不editor.js 重叠?) |
| `editor-crud.js` (2026) | 通用 CRUD |
| `editor-schema-adapter.js` (我做) | schema 转换 (scriptData → scenario.json) |
| `editor-ai-gen.js` / `editor-ai-multipass.js` / `editor-ai-validate.js` / `editor-fullgen.js` | AI 多 pass / validate / 全量 |
| `editor-game-systems.js` (1869·**18 sub-section**) | audited form bundle·timeline/goals/edicts/offend/influence 已拆为 `editor-form-*.js`·see `editor-game-systems-audit.md` |
| `editor-government.js` / `editor-fiscal.js` / `editor-military.js` / `editor-corruption.js` | 业务 form (政府 / 财政 / 军事 / 腐败) |
| `editor-engine-constants.js` (我做) / `editor-model-requirements.js` (我做) | 引擎常量 form / 模型要求 form |
| `editor-map.js` | map editor |
| `tm-editor-custom-presets.js` / `tm-editor-details.js` / `tm-editor-office-deep.js` / `tm-editor-division-deep.js` | (前缀异常·tm-editor-) |

---

## §28·**未来拆分候选(Phase 3+ Roadmap·独立)**

> **以下为 Phase 3+ 拆分 / rename / 合并候选**·**单独一节·非主表的当前职责**
> **single source of truth·`web/docs/architecture-target-final.md` §4**

| 当前文件 | 候选 | Phase |
|---|---|---|
| ~~tm-chaoyi-v3 + v1 + v2 + v2.bak + misc~~ | **chaoyi family 4 文件** (P3 done 2026-05-03·见 §1) | 3 ✓ done |
| tm-tinyi-v3.js | `tm-tinyi.js` | 3 |
| tm-endturn-core.js | `tm-endturn-pipeline.js` | 3 |
| tm-endturn-systems.js | `tm-endturn-step3-systems.js` | 3 |
| tm-endturn-helpers.js | `tm-endturn-shared-utils.js` | 3 |
| tm-endturn-ai-infer.js (5 Region) | tm-endturn-ai-context (R7 active partial) / -subcalls / -core-calls / -sc1-applier / -postcalls (future candidates) | 3+·必先 narrow smoke |
| tm-fiscal-cascade.js + tax + fixed-expense | `tm-fiscal-engine.js` | 3 |
| ~~tm-economy + linkage + gap-fill + currency-* + env-capacity~~ | **`tm-economy-engine.js`** (P3 done F7 2026-05-03·5 IIFE 合·tm-economy.js 留top-level) | 3 ✓ done |
| tm-corruption-p2 + p4 | `tm-corruption-engine.js` | 3 (merged into engine) |
| tm-guoku-p2/p4/p5/p6 | inline `tm-guoku-engine.js` (新建) | 3 |
| tm-neitang-p2 | inline `tm-neitang-engine.js` | 3 |
| editor-game-systems.js (1869·18 sub) | 13 files·see `editor-game-systems-audit.md` | 3 |
| editor-fullgen.js | `editor-ai-fullgen.js` | 3 |
| editor-government / -fiscal / -military / -corruption | `editor-form-*.js` | 3 |
| tm-editor-* 4 | `editor-*` (前缀统一) | 3 |
| map-recognition + improved + eu4 + borders + fast | 单`map-recognition.js` (strategy pattern) | 3 |
| 26 个 <200 行小文件 | 合~5 文件 (tm-ui-foundation / tm-env / tm-error-system / tm-currency / tm-globals-tool) | 4 |
| char-historical-profiles-ext.js (10298) | 按朝代/ 来源切分 (低 risk·data) | 2 |
| tm-patches.js (1915·6 段) | 各段 inline 各 area·delete | 2-3 |
| tm-phase-c-patches.js | inline 后 delete (LAYERED·必先 5-8 smoke) | 3+ |
| tm-phase-f1-fixes.js | tier audit·SELF/APPEND 决定 | 1 |

---

## §29·横切 concerns (cross-cutting)

### 29.1 Hooks / chronicle (跑 module)

- `tm-hooks-tracker.js` (161) → hooks 跟踪
- `tm-chronicle-system.js` / `-effects` / `-tracker` → 编年史
→ endturn / world / NPC / UI

### 29.2 索引 / 队列 / post-turn

- `tm-indices.js` / `tm-change-queue.js` / `tm-post-turn-jobs.js`

→ endturn / NPC

### 29.3 audio / 账本

- `tm-audio-theme.js` / `tm-ledger-paper.js`

→ UI / fiscal·**留独立**

---

## §30·Engine / Foundation / Test

| 文件 | owns |
|---|---|
| `tm-launch.js` | 启动 |
| `tm-game-loop.js` (含 _renderZhaozhengCenter) | 游戏主循环/ 朝政中心调度 |
| `tm-engine-constants.js` | 运行时引擎常量|
| `tm-namespaces.js` | namespaces |
| `tm-event-bus.js` / `tm-event-system.js` | 事件总线 / system |
| `tm-electron.js` | Electron 桌面端|
| `tm-worker.js` (71) | worker (薄) |
| `tm-env-detect.js` (93) / `tm-env-recovery-fill.js` | 环境检测/ 恢复 |
| `tm-utils.js` (993) | 通用工具 (Foundation) |
| `tm-time-utils.js` / `tm-diff.js` / `tm-changelog.js` | 时间 / diff / changelog |
| `tm-data-model.js` / `tm-data-access.js` | 数据 model / access |
| `tm-historical-presets.js` / `tm-history-events.js` | 历史预设 / 事件 |
| `tm-test-harness.js` (1583) | 测试 harness |
| `tm-integration-bridge.js` / `tm-checklist.js` / `tm-audit.js` / `tm-invariants.js` | 集成 / checklist / audit / invariants |
| `tm-diagnostics-foundation.js` | 错误收集 / 错误 panel / 污染防护 |
| `tm-perf.js` / `tm-recall-gate.js` / `tm-onboard-tools.js` | 性能 / 召回门/ onboard |
| `scan_globals.js` / `detect_globals.js` (无 tm- 前缀·dev tool) | 扫描 / 检测全局 |
| `tm-player-core.js` (跨域·含传记/特质 render) | 玩家核心 |
| `tm-player-tools.js` / `tm-player-settings.js` | 玩家工具 / 设置 |

---

## §31·Patches / Phase 文件 (transitional·待清理)

| 文件 | tier | 状态|
|---|---|---|
| `tm-patches.js` (1915·6 段) | SELF/APPEND/LAYERED 已分 | dump·待清理 |
| `tm-phase-c-patches.js` (498) | LAYERED 真monkey patch·R116b 暂留 | dump·待清理|
| `tm-phase-f1-fixes.js` (247) | 待audit | (P1 audit) |

> **禁加新-patches / -fixes / -phase-X 文件**

---

## §32·新增功能流程 (强制·#1 大原则落地)

1. **查§1-31 行**·**确定功能在哪个文件 (active)**·**owns 列出 → 改主文件**
2. **检查 "does not own"**·**避边界越界**
3. **检查 "新功能加哪"**·**按指向**
4. **更新本表**·**add new entry 我 expand owns**
5. **更新 architecture-map.md §1 总表**·**双向 ground truth**
6. **跑 verify-all + 相关 smoke**·**全绿**

### §32.1·禁止 (Codex review slice 2 v0.1)

- **不得在 `does not own` 区里加功能** (违·边界越界·issue 提交前必 reject)
- **不得用 §28 未来拆分路线替代当前职责判断** (本 doc 是裁判·非愿景·当前 active 状态优先)
- **不得新增 `-p*` / `-v*` 文件**·除非 §28 或当前entry 明确允许 (transitional 限定·新代码禁)

---

## §33·与其他 doc 关系

- **`architecture-map.md`**·**功能 → 文件** (改 X 看 Y) → fast lookup
- **`module-boundaries.md` (主文档)**·**当前 active 文件职责 + 边界** → 裁判文档
- **`architecture-target-final.md`**·**Phase 0-6 plan + 命名 + namespace + 安全门 + roadmap** → 最高规约
- **editor-game-systems-audit.md**·**editor-game-systems.js 内部 18 sub** — slice 7
- **`ai-infer-section-map.md`**·**tm-endturn-ai-infer.js 内部 5 Region** — slice 8

---

## §34·Phase 5+6 close·24 canonical namespace boundary 锁 (R200-R208·2026-05-04)

> **Phase 5 完 + Phase 6 P6-α alias 退役**·24 canonical 全建·R87 facade 顶层留·new code 强制走 TM.X·

### 34.1·boundary 原则

| 原则 | 说明 |
|---|---|
| **24 canonical**·非 18 | target §6.2 列 18·实际扩 4 (Authority/Corruption/Diagnostics/Economy) |
| **R87 facade 留 顶层 (Economy/Lizhi/Guoku/Neitang)** | 调用方 50+·删了等于回退·Phase 7 不动 |
| **R208 P6-α·rename alias 退役** | TM.MapSystem→TM.Map·TM.Storage→TM.Save·删别名·改 production call site |
| **HTML inline·Phase 6 P6-β/γ 改** | 412 处跨 12 文件·~230 处实改 (index/editor.html)·~180 留 (map editors / preview·by design) |
| **slice 4/4 平衡** | Claude α·γ·δ·ε / Codex β·ζ·η·θ |

### 34.2·跨域 fn 归属决议

| fn / 对象 | 物理 file | domain 归属 | round |
|---|---|---|---|
| `CentralizationSystem` | tm-npc-engine.js | TM.Fiscal (待·Phase 7)·**非 NPC** | R201 |
| `TerritoryProductionSystem` | tm-npc-engine.js | TM.Fiscal/Map.integration·**非 NPC** | R201 |
| `aiGenChr` / `aiGenFac` / `aiGenFullScenario` / `execFullGen` | tm-office-editor.js | TM.Office.legacy·**非 Editor** | R204 |
| `_charConfiscate` / `_charInspect` | tm-char-economy-ui.js | window 留 (HTML inline) + TM.Char.ui alias | R201 |
| `_checkProjectCompletion` / `_checkHuangceCycle` / `_checkGaituEscalation` | tm-edict-complete.js | TM.Edict.complete·**非 TM.Endturn** (虽 tick 路径) | R202 |
| `enhanceOfficeReformDraft` | tm-edict-parser.js | TM.Edict.parser·**非 Office** (虽跨域) | R202 |
| `editor-map.js` | editor-map.js | TM.Editor.map·**非 TM.Map** (game runtime)·by design split | R207 |
| 12 wave (`tm-char-historical-wave-01..12.js`) | 12 文件 | data extension·只 profiles 共享表·**无独 facade** | R201 |
| `_miFindPath` | map-integration.js | window 留·internal helper·**不入 TM.Map.integration** | R205 |

### 34.3·命名冲突·sub-ns 强隔离

| name | 出现 | 隔离方式 |
|---|---|---|
| **`tick`** | 11+ 个 engine | sub-ns 各自·`TM.Fiscal.engine.tick !== TM.Corruption.engine.tick` |
| **`init`** | 多处 | sub-ns 各自 |
| **`EDICT_TYPES`** | parser 17 详 + lifecycle 11 大类·**含义不同** | **强隔离**·smoke 显式 assert·永远不可合 |
| **`Sources`/`Expenses`/`Actions`** | Guoku + Neitang | sub-ns 各自 |

### 34.4·R10 dead code rescue (P5-δ 关键修)

```js
// 旧·tm-fiscal-engine.js L1746-1751 (R203 已删)
global.TM.Economy.sum = sumEconomyBase;
// load 顺序问题·tm-namespaces.js 后 load·R87 facade overwrite·dead code

// 新·tm-namespaces.js R203
Object.defineProperty(TM.Economy, 'sum', {
  get: function() { return window.CascadeTax && window.CascadeTax.sumEconomyBase; },
  enumerable: true, configurable: true
});
```

### 34.5·R208 P6-α alias 退役实测

| call site | 改动 |
|---|---|
| `tm-game-loop.js:1339` | `'TM.MapSystem.open("regions")'` → `'TM.Map.open("regions")'` |
| `tm-hongyan-office.js:1846` | `onclick="TM.MapSystem.open('terrain')"` → `onclick="TM.Map.open('terrain')"` |
| `scripts/headless-smoke.js:316-317` | TM.Storage / TM.MapSystem missing 检查 → TM.Save / TM.Map |
| `scripts/smoke-p5-alpha-namespaces.js` Test 5/6/8/11 | alias assertion → canonical assertion + alias === undefined |
| `scripts/smoke-p5-zeta-map-ui.js` 行 120/121 | TM.Map === TM.MapSystem → TM.Map facade exists + TM.MapSystem === undefined |
| `tm-test-harness.js:1223/1532-1542/1562/1574` | TM.Storage/MapSystem → TM.Save/Map |

### 34.6·新功能加哪·Phase 5+6 后

| 新功能类型 | 加哪 |
|---|---|
| 新税种 / 财政机制 | TM.Fiscal.cascade 扩 + tm-fiscal-engine 实现 |
| 新国库行为 | TM.Guoku.engine 扩 + tm-guoku-engine 实现 |
| 新 NPC 决策路径 | TM.NPC.decision 扩 + tm-npc-decision |
| 新角色字段 | TM.Char.schema 扩 + tm-char-full-schema |
| 新诏令类型 | TM.Edict.parser/complete 扩 |
| 新 UI panel | TM.UI.{newPanel} sub + tm-{newPanel}-panel |
| 新 editor form | TM.Editor.forms 扩 + editor-form-{X} |
| 新 diagnostic | TM.Diagnostics.{newKind} + tm-{newKind}-monitor |

### 34.7·Phase 6 sub-slice 进度

| sub | scope | 状态 | owner |
|---|---|---|---|
| **P6-α** | R208·rename alias 退役·改 production call site + smoke + test-harness 8+ 处 | **done** | Claude |
| P6-β | HTML inline·index.html ~150 处 | 待 | Codex |
| P6-γ | HTML inline·editor.html ~80 处 | 待 | Codex |
| **P6-δ** | architecture-map.md / module-boundaries.md / refactor-playbook.md / changelog.json finalize | **done** | Claude |
| **P6-ε** | encoding fix·verify-all.js R205-R207 注释行 P5-味/畏/胃 → P5-ζ/η/θ | **done** | Claude |
| P6-ζ | lint-namespace.js (optional) | 待 | 任一 |

---

— end of module-boundaries.md v1 (Phase 6 close·2026-05-04)
