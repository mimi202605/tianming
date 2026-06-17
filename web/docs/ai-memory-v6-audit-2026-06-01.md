# 天命 v6 Memory OS · 源码审计与硬化方案（2026-06-01）

> 背景：v6 记忆系统由 Codex 实现，owner 不放心，要求**直接读源码核实**再设计方案。本文是基于**实读代码**（非 Codex 自述文档）的审计 + 落地方案。
> 审计者读过：tm-memory-context-compiler.js（全）、tm-memory-retrieval.js（全）、tm-memory-turn-inference.js（关键段）、tm-memory-writegate.js（关键段）、tm-memory-envelope/governance/evidence-registry/tables（头部+关键段）、tm-endturn-ai.js（记忆接线）、tm-endturn-apply.js（写回接线），并跑了 4 个核心 smoke（全绿）。

---

## 0. 总体裁定（公允版）

**v6 不是花架子，是真东西**：核心模块（Envelope/Retrieval/Governance/ContextCompiler/WriteGate）都是**实打实、非 stub** 的实现，**真接进了活的演绎脑**（SC_RECALL 与 SC1_PRE_CONTEXT 两处都注入），治理逻辑（safeBody、可见性/时序/supersedes/contradicts 压制、预算编排）货真价实，~40 个 smoke 全绿。

**但它有典型的 Codex 失败模式**：每个模块都"单元自测在合成数据上通过"，而**端到端活闭环存在真实断点**——测试绿 ≠ 游戏里这条记忆真的转起来了。下面 5 条是实读代码挖出的、测试覆盖不到的真问题。

---

## 1. 接线现状（实读确认·非文档自述）

| 路径 | 落点 | 状态 |
|---|---|---|
| 读·结构化记忆注入主推演 | `tm-endturn-ai.js:3321` `MemoryContextCompiler.compileFromGM(GM,…)` → 注入 `tp1`（带 disclaimer） | ✅ 真接 |
| 读·SC_RECALL 召回注入 | `tm-endturn-ai.js:1659` `compileRecall(_recallResults,…)` → 注入 `_recentHistory`（带 recall-disclaimer），回退老 `<recalled-memories>` | ✅ 真接 |
| 读·检索治理 | `MemoryRetrieval.rankHitsDetailed`：controls→suppressionReason(markedFalse/archived/superseded/hidden/audience/readScope/closed/cooldown/expired/temporal/governance)→dedupe→supersedes 边→contradiction 边→打分 | ✅ 真实现 |
| 读·向量 | `tm-endturn-ai.js:1399` `SemanticRecall.searchSyncSafe`（模型未就绪静默跳过） | ✅ 真接·按需 |
| 写·回合后候选 | `tm-endturn-apply.js:4924` `MemoryTurnInference.enqueuePostTurnCandidates(GM,p1,{forceDraft:true})`（已导出 turn-inference.js:506） | ✅ 真接·但见 F1 |
| AI 吐人物记忆 | `tm-endturn-ai.js:2345` prompt 模板要 `character_memory_updates` + schema + validator | ✅ 真要 |
| 老系统并存 | `tm-endturn-prompt.js:687` `getMemoryAnchorsForAI(8)` + `:3320` `_aiMemorySummaries.slice(-3)` + anchors L1/L2/L3 | ⚠️ 见 F3 |

---

## 2. 审计发现（按严重度）

### F1【高·开环·已动态实测坐实】AI 人物记忆写回是开环，正常游玩永不生效
**V3 实测（临时 node 探针复刻 apply.js:4924 的真实入参跑通）结论：**
- 喂一条正常 AI 记忆「毕自严记得皇帝许诺三日内复核辽饷加派」(带 source_refs) → 返回 `{drafts:0, quarantined:1, accepted:0}`，**直接进隔离区、不是 draft**。
- 隔离原因（实测打印）：`{code:'too_short', message:'character memory is too short to review safely'}`。
- 根因在 `tm-memory-turn-inference.js:182 evaluateCharacterMemoryUpdate`：质量门 **`body.length < minBodyChars(默认 24)` → too_short**；外加 `confidence < minConfidence(默认 0.55) → low_confidence`、missing_actor/body/confidence/source_refs。命中任一即在 `characterMemoryCandidates`(:262-266) 把候选**预标 `status:'quarantined'`**。
- **24 字符阈值过严**：中文里 24 字 ≈ 一整句长句，而绝大多数真实 NPC 记忆（「X 念皇帝复核辽饷之恩」≈12 字）都 <24 → **大批正常记忆被隔离**。
- 即便 ≥24 字且高置信通过质量门：仍走 `forceDraft:true` → 进 draft；而 `acceptDraft`(:419) **只被手动 workshop UI 调**(workshop.js:801)、`enqueue` 仅在候选已 accepted 时 flush(:404) → **正常游玩无任何自动接受路径**。
- **双重死亡**：短/低置信记忆 → 隔离卡死；长/高置信记忆 → draft 卡死。两路都进不了 `_memoryAccepted` → 投影不出 → **永不回注**。
- **读路已证可用**：探针第 3 步手动 `acceptDraft` 后，`_memoryAccepted` +1，`compileFromGM` 立即把该记忆注入(实测 true)。**唯一缺口 = 接受步 + 质量门调坏**，管线其余部分是通的。
- 性质：符合宪法 #6"AI 写入默认 draft"的安全初衷，但缺契约写明的"可信系统接受"lane + 质量门阈值过严 → **安全到把功能做没了**。
- **实施时追加发现(2026-06-01)**：Codex 写了**三个独立测试专门钉死"AI 记忆永不自动接受"**(smoke-memory-turn-writeback:92 / turn-quality-gate:88 / turn-archive:168)。→ "沉睡"有相当部分是**故意的、三重测试背书的安全契约**，真缺口实为"正常游玩无审核 UI 入口(只 workshop)"。**修法选择因此升级为理念级**：自动接受 = 让游戏自动信任 AI 写入，与 owner distrust 立场冲突。已把 C1b prototype 回退到绿，待 owner 用全信息重新拍。

### F2【高·空源】`_npcRelationEvents` 无活写入者
- 全活代码（排除 scripts/docs）grep `_npcRelationEvents`：**只在文档与投影读取里出现，无任何写入者**。
- 而 `_courtRecords` 到处在写（常朝/朝议/科举/廷议），是活源。
- 后果：Codex 为 `relationship_event` 建了投影+分区+测试，但游戏**根本不填这个 store** → 该源在活局里为空；关系记忆实际仍靠老的 AffinityMap/_courtRecords。
- **F2 ✅ 已查实=非问题(2026-06-01·owner「继续 F2」)**：读 `tm-memory-turn-archive.js` 确认 `archiveTurn`(每回合 apply.js:4928 跑)**全面捕获关系记忆为 relationship_event**：`npc_actions`(:233)+ `affinity_changes`/`relations`(:278·显式信任/恩怨增量·factStatus relationship_delta)；加 F1 的 character_memory(favor/grudge 类)→ 关系/恩德记忆三路齐备、都进 characterMemory 区。`GM._npcRelationEvents` 仅为**无害可选外部/剧本输入槽**，正常游玩为空属正常；**去 wire 它反而与 archive 重复(制造 drift)**，故不改行为、仅加澄清注释(envelope:556)防后人误解。

### F3【中·双系统并存】老记忆系统与 v6 同回合双注入
- 同一回合 prompt 同时被注入：老 `getMemoryAnchorsForAI(8)`（prompt:687）+ 老 `_aiMemorySummaries.slice(-3)`（:3320）+ anchors L1/L2/L3 + chronicleAfterwords **以及** 新 v6 `compileFromGM`/`compileRecall`。
- 后果：冗余、潜在自相矛盾、token 浪费；没有证据显示老路已退役或被 v6 取代。需裁决：退役老路 / 还是明确分工。
- **F3 测量结果(2026-06-01·只读)**：查 `tm-memory-envelope.js` collect 的 push* 源——v6 `pushNarrativeEnvelopes`(:786) **已投影 `memoryAnchors`(:830) + `_aiMemorySummaries`(:850) + `shijiHistory`(:789)**，正是老路注入的核心。
  - **重叠(冗余双注入·governed vs raw 同数据)**：memoryAnchors、_aiMemorySummaries、shijiHistory。
  - **老路独有(v6 push* 清单无·退役会丢)**：`memoryArchive`(年代纪要【历史纪要】)、`playerDecisions`(getPlayerDecisionContext 玩家决策轨迹)、character arcs(getAllCharacterArcContext 角色弧线)。
  - **裁决路径**：①**方案A(干净·中等工作量)**：给 v6 Envelope 补 memoryArchive/playerDecisions/character-arc 三个 push，然后退役老路 → 单一 governed 路径。②**方案B(快·低风险)**：保留双路，但从老路删掉已冗余的 memoryAnchors+_aiMemorySummaries 注入(v6 已投影)，只留老路独有的 3 项 → 立即去冗余/省 token/降矛盾。**改动落在 tm-endturn-prompt.js 活 prompt 路径(每回合全量)·高 blast radius·须 owner 拍 A/B 后再动。**
- **快赢 ✅ 已落+验(2026-06-01·owner「按你的来」)**：摘掉 tm-endturn-prompt.js:3318 的 `_aiMemorySummaries.slice(-3)` 老路 raw sysP 注入(留注释)，改由 v6 `pushNarrativeEnvelopes`(envelope:850)governed 投影独家接管(已实读确认其投成 type=summary/authority=ai_summary envelope·数据不丢、只是从 sysP 高位降为低权威受治理)。无测试断言旧块(grep 确认)。验证 node --check + verify-all 全量 exit0(smoke 227/0)。备份 tm-endturn-prompt.js.bak-f3dedup-20260601。
- **F3 方案A ✅ 已落+全面验证(2026-06-01·owner「1·继续」)**：①给 v6 Envelope 加 3 个投影 `pushMemoryArchiveEnvelopes`(memoryArchive→historiography_summary/chronology)、`pushPlayerDecisionEnvelopes`(playerDecisions→player_action_record/recentEvents)、`pushCharacterArcEnvelopes`(characterArcs→character_memory/characterMemory，内联摘要不依赖 tm-arcs 全局)，注册进 collect()；②退役 tm-endturn-prompt.js:687 `getMemoryAnchorsForAI(8)` 老路注入(留注释·chronicleAfterwords 保留·archiveOldMemories 副作用由 createMemoryAnchor over-limit 仍触发)。③加守护 smoke `smoke-memory-legacy-source-migration.js` + 注册 verify-all。**验证**：探针确认三源投影进正确分区 + 新 smoke + manifest + verify-all 全量 exit0。**至此老/新双注入消除，v6 = 这些源进 prompt 的单一 governed 路径。** 备份 tm-endturn-prompt.js.bak-f3dedup-20260601。

### F4【中·跨模块漂移】AUTHORITY_RANK 两张表数值不一致
- `tm-memory-evidence-registry.js`（canonical）：player_pin:90 / rule_validated:80 / court_report:66 / structured_chronicle:60 / event_log:58。
- `tm-memory-context-compiler.js`（本地副本）：player_pin:96 / rule_validated:92 / court_report:82 / structured_chronicle:76 / event_log:70。
- compiler 的 `authorityRank()` 用**本地表**，不走 registry → 编排排序与治理/registry 不同口径。典型 Codex 跨模块常量漂移。
- **细查修正(2026-06-01)**：两表不只数值不同、**键集也不同**——compiler 有 `vector:36`，ER 表无 `vector` 键(getAuthorityRank 对未知键返回 unknown=0)。故"compiler 直接改走 ER"**非安全 drop-in**：会让 vector 记忆 rank 36→0。F4 实为"对齐两表键集+值、定 canonical"的调和任务，需谨慎，不可盲改。
- **F4 ✅ 已落+验(2026-06-01·owner「继续 F4」)**：①给 ER 补 `vector: 28`(介于 ai_summary:30 与 procedural:26)；②compiler `authorityRank()` 改 prefer `ER.getAuthorityRank`(ER 识别 key 返回>0 则用 ER·否则回退本地表) → **ER 成权威等级单一真相源**。关键判断：authorityRank 仅喂 normalizedScore 的 *4 分量、且 sectionFor 不看数值，故切源只影响区内细排序、不改分区归属/顺序。验证 node --check + verify-all 全量 exit0(无 golden 因 court/official 序差而破·证实低影响)。备份 .bak-f4-20260601。

### F5【中·测试自欺风险】goldens 多为合成 fixture·绕过活闭环
- turn-inference 系列 smoke（如 plan 里 line 240/490）**手塞 `_memoryAccepted`** 合成数据再断言 → 只证模块在理想输入下的行为，**不证游戏真会产生那些输入、不证 write→accept→read 闭环**。F1/F2 正是这种"单测绿、活闭环断"的盲区。
- 4 个核心 smoke 实跑全绿（已验），但绿的是合成层。

---

## 3. 硬化方案（验证→闭环→收敛→测试加固）

> 原则：**不推倒 v6**（它大体可靠），只补活闭环断点 + 收敛漂移 + 加固测试到能抓活闭环。一刀一事、各刀 node 验 + 关键刀 天启/绍宋实存档端到端跑。

### Phase V · 验证（先做·近零成本）
- **V1** 跑全量 `node web/scripts/verify-all.js` 取 ground truth（记忆子集已验绿）。
- **V2** 判测试成色：逐一标注哪些 golden 是合成 fixture、哪些真跑活路径（F5）。
- **V3【决定性】** 天启/绍宋实存档跑 1 回合，导出 `MemoryTrace`：① compileFromGM/compileRecall 注入的 memory-context **是否非空**；② 写回 draft 了几条；③ `_memoryAccepted` 是否始终为空（坐实 F1）；④ `_npcRelationEvents` 是否为空（坐实 F2）。

### Phase C · 闭环（治 F1/F2）
- **C1 ✅ 已实施+全面验证（2026-06-01·owner 选 B「不信 codex 但信你」）**：C1a too_short 24→10；C1b `autoAcceptLowRiskDrafts`（opt-in `autoAcceptTrusted`·仅 public character_memory+conf≥0.7·不绕过注入/hard_state 门）；apply.js:4924 传 flag。3 个守"不自动接受"安全测试升级为守"自动接受不越界"新契约。验证：70/70 记忆 smoke + verify-all 全量 exit0 + 探针实测闭环自动通。私密 belief/低置信/摘要/hard_state 仍待审。
- **C1（原方案·治 F1·两层）**：
  - **C1a 质量门重调**（turn-inference.js:182）：`minBodyChars` 24→8~12（中文短句友好）；复核 `minConfidence` 0.55 是否过严；missing_source_refs 已有 aiTurnResult 兜底 ref，不应再因此隔离（确认逻辑）。
  - **C1b 可信自动接受 lane**（writegate.js evaluateCandidate/enqueue）：低风险 AI 人物记忆（非 hard_state + 非私密/readScope public + confidence≥阈值 + 无注入命中 + 通过质量门）**自动 accept + cooldown**，其余仍 draft/quarantine。让宪法 #6 与契约"可信系统接受"lane 并存，唤醒沉睡功能。
  - （owner 拍：阈值、是否要"玩家一键全接受"UI、私密 belief 是否也自动接受）
- **C2** 裁决关系记忆 canonical 源：要么**真写 `_npcRelationEvents`**（施恩/恩怨/背叛/结盟时 push），要么**退役该投影**、关系记忆统一走 AffinityMap/_courtRecords。二选一，别留空源。
- **C3**（若保留人审）把 draft 审核搬进**正常 UI**（非仅 workshop），否则玩家不会用。

### Phase R · 收敛（治 F3/F4）
- **R1** compiler 的 `authorityRank()` 改走 `MemoryEvidenceRegistry.getAuthorityRank`（已有 ER 引用模式），消灭本地副本漂移。
- **R2** 裁决老/新双系统：退役 `getMemoryAnchorsForAI(8)` + `_aiMemorySummaries.slice(-3)` 等老注入，或明确分工边界，消除同回合双注入的冗余/矛盾/token 浪费。
- **R3** 清理 `relation_event` vs `relationship_event` 两个近义 source/section 的重复路由。

### Phase H · 测试加固（让测试能抓活闭环）
- **H1** 加**端到端活闭环 golden**：模拟一回合 AI 吐 `character_memory_updates` → 经真实 enqueue + C1 接受策略 → 投影 → **下一回合 compileFromGM 真把它注入**。补上 F5 缺的那段。
- **H2** 加"投影源活性"检查：断言投影读取的 store 确有 gameplay 写入者，否则标记"未喂投影"（防再出 F2）。

---

## 4. 待 owner 决策点
1. **F1 闭环方式**：加可信自动接受（推荐·唤醒功能）还是坚持纯人审 + 搬 UI？自动接受的阈值/范围？
2. **F2 关系源**：补写 `_npcRelationEvents`，还是退役它走 AffinityMap？
3. **F3 老系统**：退役老注入，还是保留并明确分工？
4. 先做哪个 Phase：建议 **V3 实存档 trace** 先跑（最便宜、直接坐实 F1/F2 是否真断），再按结果决定 C/R/H。

---
*2026-06-01 · 基于实读源码（非 Codex 自述）· 4 核心 smoke 已实跑全绿 · 结论：v6 真实可靠但活闭环有断点，需验证+闭环+收敛+测试加固，不推倒重建。*
