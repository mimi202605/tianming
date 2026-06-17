# tm-endturn-*.js 数据流审计报告

> **生成**：2026-05-07 · slice 0 audit · 由 sub-agent 通读 16 文件产出
> **状态**：v1 draft · 待 user 复核
> **范围**：`web/tm-endturn-*.js` 16 文件 · 22342 LOC 合计
> **目的**：管道化重构前的现状摸底·非 spec

---

## 1. 文件级清单

### tm-endturn-core.js (943 LOC)
- **入口函数**：`endTurn()` / `_endTurnInternal()` / `_endTurnCore()`，及 14 个 `EndTurnHooks.register('before'/'after', ...)` 钩子
- **职责一句话**：endTurn 主管道 + 14 个全局 prompt 注入/恢复钩子 + 朝会延后调度
- **被谁调**：`endTurn` 是 UI 入口；hooks 通过 `EndTurnHooks.execute('before'/'after')` 间接调
- **GM 读字段**：`GM.busy` / `GM.turn` / `GM.officeTree` / `GM.shijiHistory` / `GM.qijuHistory` / `GM.letters` / `GM.evtLog` / `GM.chars` / `GM.allCharacters` / `GM.facs`
- **GM 写字段**：`GM.busy` / `GM._endTurnBusy` / `GM._turnTyrantActivities` / `GM._aiMemorySummaries` / `GM.monthlyChronicles` / `GM._historicalDeviations` / `GM._chronicle` / `GM._edictTracker`（vacancy push）
- **关键临时字段**：`_origPrompt` / `_origPrompt2` / `_origPrompt3` / `_origPrompt11` / `_origPromptShiji` / `_origPromptSumRule` / `_origPromptHist` / `_origPromptLtr`（共 8 个 prompt 备份，全部本文件 before-写/after-恢复，**未跨文件**）；写 `_pendingShijiModal.deferredPhase5` 让 phase5 延迟跑
- **同步/异步**：`async`；await `_awaitPostTurnJobs` / `EndTurnHooks.execute` / `_endTurn_aiInfer` / `_endTurn_updateSystems` / `aiEdictEfficacyAudit`（降级路径）；后台 enqueue：`edict_efficacy`、`hist_check`；fire-and-forget：`scThreeSystemsAI`、`aiDigestLongTermActions`、`callAI 月度纪事`
- **错误处理**：每 phase 独立 try/catch + `TM.errors.capture`；外层一个 try/catch 兜整个 `_endTurnCore`（吞所有错误，仅 toast）

### tm-endturn-prep.js (512 LOC)
- **入口函数**：`_endTurn_init()` / `_endTurn_collectInput()` / `_reactToEdicts()` / `_generateConsortAudiences()` / `_generateConsortLiterary()`
- **职责一句话**：回合前快照 + 收集 edicts/xinglu/memorials 输入 + 诏令文本→结构化操作意图
- **被谁调**：core.js L142/143 调 `_endTurn_init` / `_endTurn_collectInput`
- **GM 读字段**：`GM.guoku` / `GM.neitang` / `GM.population` / `GM.chars` / `GM.memorials` / `GM.qijuHistory` / `GM.vars` / `GM.edicts` / `GM.facs` / `GM.letters` / `GM._capital`
- **GM 写字段**：`GM._prevGuoku` / `GM._prevNeitang` / `GM._prevPopulation`（结算前快照）；`GM._turnBattleResults=[]` / `_turnRebellionResults` / `_turnSiegeResults` / `_turnSchemeResults`；`_edictTracker.push` / `_pendingAudiences.push` / `qijuHistory.push` / `letters.push` / `_consortPendingLiteraryForEmperor.push`
- **关键临时字段**：所有 `_prev*` 快照（render/follow 消费）、`_turnBattleResults` 等四个 `=[]` 清空（systems/render 后续填）、`_edictTracker` 新增本回合诏令（apply/render/prompt 消费）
- **同步/异步**：纯同步
- **错误处理**：仅一处 try/catch 包 schema 守卫 + 一处包 `_prev*` 快照；其它静默

### tm-endturn-prompt.js (3268 LOC)
- **入口函数**：`TM.Endturn.AI.prompt.build(ctx)`
- **职责一句话**：构建 sysP/tp 巨型 prompt 字符串，写入 ctx.prompt（原 ai-infer §1 共 3203 行 verbatim 搬出）
- **被谁调**：ai-infer.js L79 `await TM.Endturn.AI.prompt.build(ctx)`
- **GM 读字段**：~100 多个，最多见的：`GM.chars` / `GM.facs` / `GM.officeTree` / `GM.guoku` / `GM.neitang` / `GM.vars` / `GM.evtLog` / `GM.shijiHistory` / `GM.memorials` / `GM.edicts` / `GM._edictTracker` / `GM._achievements` / `GM._capital` / `GM._chronicle` / `GM._turnTyrantActivities`
- **GM 写字段**：基本只读（罕见 lazy 初始化 `GM._approvedMemorials = GM._approvedMemorials || []`）；主要副作用全部写入 `ctx.prompt.sysP/tp`
- **关键临时字段**：消费 30+ `GM._*` 报告字段（`_couplingReport` / `_decisionAlerts` / `_healthAlerts` / `_buildingOutputReport` / `_edictExecutionReport` / `_eraProgressReport` / `_courtRecords` / `_npcCommitments` / `_factionUndercurrents` 等），上回合 systems/followup 产出
- **同步/异步**：声明 `async` 但函数体无 await（保留以备未来）
- **错误处理**：~18 处 try/catch，每段 lifecycle 块独立兜底

### tm-endturn-ai.js (2686 LOC)
- **入口函数**：`TM.Endturn.AI.subcalls.setupInfra(ctx)` / `TM.Endturn.AI.subcalls.runMain(ctx, afterSc1)`
- **职责一句话**：AI 子调用基础设施（fetch body 构建/截断检测/重试/post-turn 队列）+ sc0/sc05/sc1/sc1b/sc1c 主推演
- **被谁调**：ai-infer.js L93/114
- **GM 读字段**：`GM.chars` / `GM.facs` / `GM._edictTracker` / `GM._capital` / `GM._aiMemory` / `GM._consolidatedMemory` / `GM._memoryLayers` / `GM._epitaphs` / `GM._npcCommitments` / `GM._postTurnJobs`
- **GM 写字段**：`GM._turnAiResults`（**核心**：sc0/sc1/sc1b/sc1c 全部塞这里供 followup 读）、`_postTurnJobs`、`_aiDispatchStats`、`_consortFormalAudiences`、`_pendingOvernight`、`_aiMemory`、`_epitaphs`、`_npcCommitments`、`_stateBoard` 等 30+
- **关键临时字段**：`_turnAiResults`（sc1/sc2/subcall15-28 全部归集，**最关键的隐式管道枢纽**）；`_postTurnJobs` 后台 job 队列
- **同步/异步**：高度异步；25 处 await；2 处 `Promise.all`；`_runSubcallBatch` 内部并发=3；`_queuePostTurnSubcall` 推入 post-turn 队列
- **错误处理**：97 处 try/catch；每个 sub-call 独立兜底；`_runSubcall` 内含重试

### tm-endturn-ai-context.js (233 LOC)
- **入口函数**：`TM.EndTurnAIContext.appendPromptPolicyContext(sysP, ctx)`
- **职责一句话**：基于 GM.facs/partyState/armies 等给 sysP 追加运行时态注入段
- **被谁调**：prompt.js Region 1 调（sysP 构建期间）
- **GM 读字段**：`GM.facs` / `GM.partyState` / `GM.armies` / `GM.chars` / `GM._aiInferencePlan` / `GM._aiFactionMatrix`
- **GM 写字段**：基本只读
- **同步/异步**：纯同步
- **错误处理**：15 个 try/catch

### tm-endturn-ai-helpers.js (427 LOC)
- **入口函数**：`aiPlanFirstTurnEvents` / `aiDigestLongTermActions` / `aiEdictEfficacyAudit` / `buildEdictEfficacyFollowUp`
- **职责一句话**：4 个独立 AI 调用工具函数（首回合规划/长期摘要/御批回听/诏令执行追踪 prompt 拼装）
- **被谁调**：core.js L170/207；`buildEdictEfficacyFollowUp` 被 prompt.js 间接调
- **GM 读字段**：`GM.edicts` / `GM._chronicle` / `GM._edictTracker` / `GM._gameDate` / `GM.allCharacters`
- **GM 写字段**：`GM._candidateEvents`（首回合）、`_candidateEventMeta`、`_longTermDigest`、`_edictEfficacyReport`、`_edictEfficacyHistory.push`
- **关键临时字段**：`_edictEfficacyReport` 异步写后被 followup/render 消费
- **同步/异步**：3 个 async（`callAISmart` await）
- **错误处理**：8 处 try/catch

### tm-endturn-ai-infer.js (244 LOC)
- **入口函数**：`async function _endTurn_aiInfer(edicts, xinglu, memRes, oldVars)`
- **职责一句话**：AI 推演协调器（构建 ctx → call prompt.build → call subcalls.runMain → call followup.run → call record.finalize）；过去 11000 行的"上帝函数"现已 stub 化
- **被谁调**：core.js L180
- **GM 读字段**：基本只通过 ctx 间接读
- **GM 写字段**：`GM._turnContext`（保存本回合摘要供 NPC 引擎用）
- **关键临时字段**：构建并维护 ctx 对象 ({input, prompt, subcalls, results, apply, followup, record, meta})；output 经 sanitize 后塞回 ctx.record
- **同步/异步**：async；4 处 await（prompt.build/subcalls.runMain/followup.run 都是 await）
- **错误处理**：1 处 try/catch 兜整个 AI 路径

### tm-endturn-apply.js (4677 LOC)
- **入口函数**：`TM.Endturn.AI.apply.writeBack(ctx)`
- **职责一句话**：sc1 返回写回（applyAITurnChanges + reconciliation 二审 + 各字段族 GM 落地）
- **被谁调**：ai.js runMain 内部回调里 L135 `await TM.Endturn.AI.apply.writeBack(ctx)`
- **GM 读字段**：`GM.chars` / `GM.facs` / `GM.officeTree` / `GM._needsReconcile` / `GM._capital` / `GM._edictTracker` / `GM._activeRevolts` / `GM._lostTerritories`
- **GM 写字段**：`GM._needsReconcile=null` / `_reconcilePatchLog.push` / `_activeRevolts` / `_foreshadowings.push` / `_marriageBirthHistory.push` / `_capitalHistory.push` / `_lostTerritories` / `_pendingAudiences.push` / `_pendingNpcLetters.push` / `_conspiracies` / `_gameOverPending` / `_routeDisruptions` / `_npcCommitments`
- **关键临时字段**：`_needsReconcile`（applyAITurnChanges validator 设，本文件取走调二审 AI）；`_reconcilePatchLog` 仅本文件写
- **同步/异步**：async（reconciliation 路径 await callAIWithTools）
- **错误处理**：30 处 try/catch；reconciliation 失败 fallback 到 schema-prompt

### tm-endturn-followup.js (2279 LOC)
- **入口函数**：`TM.Endturn.AI.followup.run(ctx)`
- **职责一句话**：sc1 后扇出 sc15/sc_memwrite/sc16/sc17/sc18/sc_audit/sc2/sc25/sc27/sc28/sc_consolidate（含三路并行分支）
- **被谁调**：ai-infer.js L153
- **GM 读字段**：通过 `copyResultsFromTurnState` **从 `GM._turnAiResults` 读** subcall15/Memwrite/16/17/18/Audit/2/25/27/28/Consolidate；`_postTurnJobs` / `_npcCognition` / `_aiMemory` / `_consolidatedMemory`
- **GM 写字段**：`_foreshadows` / `_plotThreads` / `_consolidatedMemory` / `_aiMemory` / `_convArchive.push` / `_courtRecords` / `_currentTrend` / `_decisionEchoes` / `_edictEfficacyReport` / `_edictEfficacyHistory` / `_factionMilitaryLog` / `_factionNarrative` / `_factionUndercurrents` / `_fengwenRecord` / `_kejuPendingAssignment` / `_stateBoard` / `_successionEvent` / `_turnReport` / `_subcallTimings` / `_causalGraph`
- **关键临时字段**：从 `_turnAiResults` 读 sc1/sc15/sc16/sc17/sc18/sc25/sc27/sc28；写 `ctx.followup._changeSummary` 及大量 `GM._*` narrative/memory 字段；通过 `_queuePostTurnSubcall` 把 sc_memwrite/sc19/sc25/sc28/sc_consolidate 推到 post-turn
- **同步/异步**：极度异步；40 处 await；2 处 `Promise.all`（branchA/B/C 并行；最终 settled gather）；5 处 `_queuePostTurnSubcall` enqueue
- **错误处理**：66 处 try/catch；每个 subcall 独立兜底

### tm-endturn-record.js (52 LOC)
- **入口函数**：`TM.Endturn.AI.record.finalize(ctx)`
- **职责一句话**：从 ctx.record/input 装配 12 字段返回对象给 core
- **被谁调**：ai-infer.js L227（return）
- **GM 读字段**：无（只读 ctx）
- **GM 写字段**：无
- **关键临时字段**：无
- **同步/异步**：纯同步
- **错误处理**：无（trivial 装配函数）

### tm-endturn-render.js (2099 LOC)
- **入口函数**：`_endTurn_render(shizhengji, zhengwen, ..., 17 个参数)`
- **职责一句话**：渲染史记面板 + Delta 面板 + 角色高亮 + 触发自动存档
- **被谁调**：core.js L230 直接调；deferredPhase5 不调（phase4 渲染已经过了）
- **GM 读字段**：`GM.chars` / `GM.vars` / `GM.guoku` / `GM.neitang` / `GM.population` / `GM._prevGuoku` / `GM._prevNeitang` / `GM._prevPopulation` / `GM._prevVars` / `GM._turnBattleResults` / `GM._turnTyrantActivities` / `GM._tyrantHistory` / `GM._yearlyDigest` / `GM._reconcilePatchLog` / `GM._fengwenRecord` / `GM._edictEfficacyReport` / `GM._fiscalDeficitStreak` / `GM._metricHistory` / `GM._turnAiResults`
- **GM 写字段**：`GM.shijiHistory.push` / `GM.eraName` / `GM._pendingToasts` / `GM._tyrantDecadence` / `GM._lastFixedExpense` / `GM._reconcileLog`
- **关键临时字段**：消费所有 `_prev*` snapshots 算 delta；消费 `_turnAiResults`/`_turnTyrantActivities`/`_turnBattleResults` 渲染
- **同步/异步**：函数本身同步；存档分支内部 2 处 await
- **错误处理**：19 处 try/catch

### tm-endturn-province.js (2236 LOC)
- **入口函数**：`initProvinceEconomy()` / `updateProvinceEconomy()` / `appointGovernor()` + 省级面板 UI
- **职责一句话**：省级经济初始化/回合更新/总督任命；与 endturn 主线交集仅 systems.js 调一次 `updateProvinceEconomy`
- **被谁调**：systems.js L269
- **GM 读字段**：`GM.provinceStats` / `GM.facs`
- **GM 写字段**：`GM.provinceStats` / `_lastCascadeSummary` / `_lastCascadeTurn` / `_prevProvinceStats` / `_resourceProvinces`
- **同步/异步**：纯同步
- **错误处理**：9 处 try/catch

### tm-endturn-qiaozhi.js (269 LOC)
- **入口函数**：`openQiaozhiPanel` / `doQiaozhi` / `restoreQiaozhiDivision`
- **职责一句话**：侨置（领土丢失/收复）UI；事件驱动·**不在 endturn 主管道**
- **被谁调**：memorials/事件触发；endturn 主路径**不直接调**
- **GM 读字段**：`GM._lostTerritories`（apply.js 写入后 UI 消费）
- **GM 写字段**：`GM._lostTerritories`（删除条目）
- **同步/异步**：纯同步
- **判定**：本文件可视为 endturn 路径外的 sibling，重构时可暂不动

### tm-endturn-systems.js (399 LOC)
- **入口函数**：`async function _endTurn_updateSystems(timeRatio, zhengwen)`
- **职责一句话**：50+ 引擎 tick 调度器（BattleEngine/SubTickRunner/HujiEngine/GuokuEngine/NeitangEngine/CurrencyEngine/AuthorityEngines/PhaseA-G/IntegrationBridge…）
- **被谁调**：core.js L199
- **GM 读字段**：`GM.turn` / `GM.chars` / `GM.culturalWorks` / `GM._energy` / `GM._energyMax`
- **GM 写字段**：`GM.turn++`（**唯一 turn 推进点**）/ `_hujiEarlyTicked` / `_forgottenWorks` / `_energy`
- **同步/异步**：async；1 处 await（`executeNpcBehaviors`）
- **错误处理**：78 处 try/catch（每个 engine.tick 独立兜底——典型"恐惧驱动"防御代码）

### tm-endturn-edict.js (502 LOC)
- **入口函数**：`extractEdictActions` / `applyEdictActions` / `extractCustomPolicies` / `applyCustomPolicies` / `getCustomPolicyContext` / `computeExecutionPipeline` / `processEdictEffects`
- **职责一句话**：诏令文本→操作意图提取 + 执行管线特征注入
- **被谁调**：prep.js（提取系列）；core.js L189（`applyEdictActions` 在 phase 2.5）；prompt.js（`getCustomPolicyContext`）
- **GM 读字段**：`GM.chars` / `GM.officeTree` / `GM._capital` / `GM._chronicle` / `GM._edictExecutionReport`
- **GM 写字段**：`GM._lastEdictClassification` / `_edictMechanicalReport` / `_edictExecutionReport`
- **关键临时字段**：`_edictMechanicalReport` 写后由 prompt 下回合消费
- **同步/异步**：纯同步
- **错误处理**：6 处 try/catch

### tm-endturn-helpers.js (1516 LOC)
- **入口函数**：`findOfficeByFunction` / `OfficeFunctionSummary` / 考课 / `generateChancellorSuggestions` / `resolveHeir` / Settlement 注册表 / NPC 意图 / 成就 / 议程
- **职责一句话**：endturn 各 phase 调用的辅助查询/规则评估器集合
- **被谁调**：prep.js（`generateChancellorSuggestions`）；prompt.js / followup.js / 多处直接函数调用
- **GM 读字段**：`GM.officeTree` / `GM.chars` / `GM.facs` / `GM._edictTracker` / `GM._chronicle` / `GM._achievements`
- **GM 写字段**：`_achievements.push` / `_npcIntents` / `_npcEventProposals` / `_partyDynamics` / `_issueEffects` / `_mutableFacts` / `_varFormulas` / `_historyIndex` / `_tradeReport` / `_diplomaticMissions` / `_tensionHistory` / `_metricHistory` / `_eraProgressReport` / `_couplingReport`
- **关键临时字段**：`_couplingReport` `_metricHistory` `_eraProgressReport` 都被 prompt.js 下回合消费；`_tradeReport`/`_diplomaticMissions` 同理
- **同步/异步**：纯同步（无 await）
- **错误处理**：16 处 try/catch

---

## 2. 隐式耦合矩阵（writer→reader 字段名）

按耦合强度排序：

| 字段 | 写者文件 | 读者文件 | 耦合性质 |
|---|---|---|---|
| **`_turnAiResults`** | ai.js (sc1/sc1b/sc1c→塞 22 处) | followup.js (23 处读 subcall15/Memwrite/16/17/18/Audit/2/25/27/28/Consolidate) + render.js + core.js (delete) | **管道枢纽**：sc1 → followup 全部子调用 → render，跨 4 文件 |
| `_turnContext` | ai-infer.js (单写) | core.js (delete) | 暂存供 NPC 引擎；本目录外消费 |
| `_turnTyrantActivities` | core.js (赋值) + prep.js (collectInput 实际产出) | core.js (apply phase 2.6) + prompt.js (3 处) + render.js | core 写后 prompt 立刻读+apply 读+render 读 |
| `_turnBattleResults` | prep.js `=[]` (清空) | helpers.js + render.js | prep 清空 → systems.js 内 BattleEngine push 填 → render/helpers 读 |
| `_prevGuoku` / `_prevNeitang` / `_prevPopulation` | prep.js (`_endTurn_init` 快照) | render.js (Delta 计算) | prep→render 单写单读·相对干净 |
| `_edictTracker` | prep.js (push 4) + core.js (vacancy push) + helpers.js (push 2) | apply.js (6) + ai.js (4) + prompt.js (1) | **跨 6 文件**写读·最难管道化 |
| `_pendingShijiModal` | core.js | core.js (7 处分支) + render.js | 控制 phase 4 渲染/phase 5 hooks 是否延后；"全局 latch" |
| `_postTurnJobs` | ai.js + 其它 enqueue | core.js + followup.js (3) | 后台 job 队列；core 在下回合开头 `_awaitPostTurnJobs` |
| `_historicalDeviations` | core.js (after-hook 9 写) | core.js (before-hook 9b 读注入 prompt) | **跨回合**：本回合 after 写 → 下回合 before 读 |
| `_origPrompt*` (8 个) | core.js (before-hook 写) | core.js (after-hook 恢复) | 同文件 before/after 配对·**未跨文件** |
| `_capital` | （早于 endturn 创建） | apply.js (7) + prompt.js + edict.js + ai.js + followup.js + prep.js | 准全局只读·相当于"全局常量" |
| `_pendingAudiences` | prep.js + apply.js | apply.js + prep.js | 双向写入；apply 期间 AI 决策可新增；prep 下回合也写 |
| `_consortPendingLiteraryForEmperor` | prep.js + ai.js | ai.js (3) + prep.js (2) | 双文件双向 |
| `_lostTerritories` | apply.js | qiaozhi.js (7 处) | apply 写→qiaozhi UI 读 |
| `_needsReconcile` | applyAITurnChanges (validator·非本目录) | apply.js (取走+置 null) | 跨 module 信号 |
| `_couplingReport` `_decisionAlerts` `_healthAlerts` `_metricHistory` `_eraProgressReport` `_tradeReport` `_diplomaticMissions` `_buildingOutputReport` `_edictExecutionReport` | helpers.js / edict.js / followup.js / external engines | prompt.js (下回合) | "上回合产出→本回合 prompt"跨回合 channel·**8 个** |
| `_foreshadows` `_plotThreads` `_aiMemory` `_consolidatedMemory` `_courtRecords` `_factionUndercurrents` `_factionNarrative` `_decisionEchoes` `_currentTrend` `_npcCognition` `_stateBoard` `_causalGraph` `_subcallTimings` | followup.js (sc15/sc18/sc25/sc28 后写) | prompt.js (下回合) + ai.js + ai-context.js | followup 是这些 narrative/memory 字段的主写入端·prompt 跨回合读 |
| `_edictEfficacyReport` | followup.js (sc audit) + ai-helpers.js (aiEdictEfficacyAudit) | core.js (clear) + render.js (面板) + prompt.js | 多写单读·有竞态风险（同回合 followup 与 post-turn enqueue 都写） |
| `_chronicle` | core.js (npc-appoint push) + helpers.js + edict.js | prompt.js + ai-helpers.js | 准日志类 |

**关键观察**：上面 17 个跨文件字段加上 ~30 个 followup→prompt 跨回合字段，总计 **~50 个隐式 channel**。其中 `_turnAiResults` 是最难解的"管道枢纽"——sc1 写→followup 23 次读→render 也读→core 在 phase4 后视情况 delete；任何重构必须先把它显式化为 `ctx.results.*`。

---

## 3. 异步执行模式统计

| 模式 | 处数 | 主要文件 |
|---|---|---|
| `await` 顶层（同步链式）| 90 余处 | followup.js (40)、ai.js (25)、core.js (14)、ai-infer.js (5) |
| `Promise.all` 并行收束 | 5 处 | ai.js (3·sc1b+sc1c) + followup.js (2·三路分支 + 最终 settle) |
| `Promise.race` | **0 处** |  |
| `_runSubcallBatch`（内部并发=3）| 1 定义 + ~5 调用 | ai.js / followup.js |
| `_enqueuePostTurnJob` 后台化 | 2 处直接 | core.js (`edict_efficacy`, `hist_check`) |
| `_queuePostTurnSubcall` 子调用后台化 | 5 处 | followup.js |
| `deferredPhase5` 朝会延后 | 1 定义 | core.js |
| Fire-and-forget | ~5 处 | core.js 月度纪事 / `scThreeSystemsAI` / `aiDigestLongTermActions` |
| `await _awaitPostTurnJobs()` | 2 处 | core.js（下回合开头）+ render.js（存档前）|

---

## 4. 管道步骤切分建议

按数据依赖最小割推荐切成 **6 个粗粒度 step**（不是当前 15+ sub-phase）：

1. **prep**（同步）：`_endTurn_init` + `_endTurn_collectInput` + memorial decisions + 三系统更新 (1.7) + ghost sweep + npc auto-appoint
   - 输出：`{npcContext, input{edicts,xinglu,memRes,oldVars,edictActions,tyrantActivities}, snapshots:{prevGuoku,prevNeitang,prevPopulation}, edictTrackerNew}`
2. **plan-prefetch**（并行）：`scThreeSystemsAI` ‖ `aiDigestLongTermActions` ‖ before-hooks 注入 → await Promise.all
3. **ai**（顺序流水线）：prompt.build → subcalls.runMain (sc0/sc05/sc1) → apply.writeBack → followup.run（含三路并行 + 后台化分支）
4. **post-ai-edict**（同步）：`applyEdictActions` (phase 2.5) + `TyrantActivitySystem.applyEffects` (2.6) + `aiEdictEfficacyAudit`（已后台化）
5. **systems**（同步串联）：`_endTurn_updateSystems` 50+ engine.tick·**已经是 in-process pipeline**·作为单 step 不再拆
6. **render-and-finalize**（同步 + 朝会分支）：`_endTurn_render` + after hooks + 科举/角色路程/勤政 streak·若 `_pendingShijiModal.courtDone===false` 则将 phase5 打包成 `deferredPhase5` 等待朝会回调

每 step 内部并行/顺序与当前一致；step 之间 boundary 严格走 ctx 显式字段。

---

## 5. 障碍清单

1. **`GM._turnAiResults` 是 22-write/23-read 隐式枢纽**·`copyResultsFromTurnState` 已半显式化成 ctx.results·但 ai.js 写入路径仍通过 GM 中介。重构需所有写者直写 ctx.results·保留 GM 镜像供 post-turn job 读。

2. **跨回合 prompt-channel 30+ 字段**·上回合 followup/helpers/engines 写、本回合 prompt.js 注入。`prep.js:398` 注释写"此处不清空"——**有意设计**·非 refactor 对象。但所有字段无类型保证。

3. **`_pendingShijiModal` 控制 phase 4/5 是否延后**·core.js L223-231 + L241-251 共 2 个分支·`deferredPhase5 = async function() {...}` 把 step 5 做成闭包推给外部回调。

4. **`_endTurnCore` 整体一个外层 try/catch（L27-448）吞所有错误**·17 个 phase 失败都被同一个 catch 接住·只 toast 一次。重构要决定：每 step 失败 abort 流水线还是 record-and-continue。

5. **`_edictTracker` 跨 6 文件写读**·prep push 4 次 + core push（vacancy）+ helpers push 2 次 + apply 读 6 次 + ai 读 4 次 + prompt 读 1 次。push 顺序若变，下游消费可能错。

6. **`_origPrompt*` 8 变量纯靠命名约定 before/after 配对**·任何 hook 顺序变了或 before 抛错跳过·prompt 状态泄漏到下回合。第一步应该是把 P.ai.prompt 改成 immutable 输入·hooks 返回 fragments 由编排层 join。

---

## 6. 总判定

- **能管道化**：input (prep) 与 systems 几乎已经显式 in/out·重构主要是抽 ctx 接口
- **改动可控**：ai 三步（prompt/subcalls/apply/followup/record）已用 ctx 半显式化·但 `_turnAiResults`/`_pendingShijiModal`/`_origPrompt*` 三个隐式 channel 必须先消除
- **真正难解**：跨回合 `GM._*` channel（30+ 字段）和 `_edictTracker` 多写多读·是设计问题不是代码风格问题；管道化时要明确"上回合产出→本回合 prompt"是否纳入显式 ctx

**预算更新**：4-5 周 → **3 周**（ctx 半显式化已节省 1 周量级）；若决定 1 选"跨回合迁 ctx"·+1-2 周。

---

## 7. 设计决定（2026-05-07 user 拍板）

3 个 audit 后必答的 paradigm 问题，user 全选最重构的方向：

| # | 问题 | 决定 | 影响 |
|---|---|---|---|
| 1 | 跨回合 30+ `GM._*` 字段怎么走 | **迁移到 `ctx.crossTurn.*` 类型化容器** | +1.5 周·所有跨回合 channel 显式化·无类型→有 schema |
| 2 | `deferredPhase5` 朝会回调怎么管 | **改为 `ctx.deferredSteps.push({when, fn})`** | +2-3 天·延后步骤显式登记·可清单·可观测·可 dry-run |
| 3 | 错误策略 | **每 step 声明 `onError = abort \| continue \| retry`** | +1 周·写 per-step error policy·核心 step 失败 abort 防 GM 写坏·非核心可继续 |

**总预算**：~5-6 周（基础 3 周 + 决定 1/2/3 累计 ~2.5 周）。

**slice 拆分原则**：
- 小步快跑·每 slice 独立可回滚·结束时新旧并行 diff=0 才推进
- slice 之间动手前都备份（per user "改前都先备份"）
- 永远不动跨回合 channel 的语义（决定 1 是把 GM._* 镜像到 ctx.crossTurn·并非删 GM._*；GM 兜底保留以防其它代码漏迁）

