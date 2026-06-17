# 天命 AI 记忆系统 · SillyTavern 调研落地实施方案（2026-06-03）

> 前置：本方案 grounding 全部来自 **2026-06-03 当天对 v6 Memory OS 的源码审计**（6 个 agent 实读 19 模块当前源码 + 把 ST 调研发现逐条判 have/gap/trap），**非复述旧诊断**。配套：ST 源码级调研 `ai-memory-sillytavern-source-dive-2026-06-03.md`、v6 审计 `ai-memory-v6-audit-2026-06-01.md`、契约 `ai-memory-system-contract-2026-06-01.md`。
> 纪律：不推倒 v6；一刀一事；每刀 node 验 + 关键刀实存档端到端；未经 owner 拍不 ship。

---

## 0. 基线裁定（实查，非文档自述）

今日实查交叉印证：v6 **真接进活演绎脑**（`tm-endturn-ai.js:3338 compileFromGM`→SC1 前置 / `:1662 compileRecall`→SC 召回 / `apply.js:5037 enqueuePostTurnCandidates(autoAcceptTrusted:true)`→写回），F1/F3/F4 修复今天仍在、未被并发实例冲掉。22 个投影函数（含 F3-A 3 投影 + E1 焦点relevance + E2 立场 + E3 失败诏令教训）全部 present + wired。

**核心结论：ST 的"借鉴项"天命多数已有、且更强。** 本方案**不重复天命已有的**，只打实锤 gap 与 trap-risk。

---

## 1. ST 借鉴项 × 天命现状 速查表

| ST 发现 | 天命现状 | 判定 | 证据 |
|---|---|---|---|
| ★ WI×Vectors "一条管线+可插拔激活器" | 向量 hit 进**同一** allHits→rankHitsDetailed→packForInjection，是一等 source | **have（最强项）** | `tm-endturn-ai.js:1408` / `tm-memory-retrieval.js:27,299` |
| 统一注入原语 setExtensionPrompt | Envelope + MemoryContextCompiler（带 authority/lane/scope/safeBody 治理，**远强于裸注入**） | **have+** | 契约 §1/§6 |
| 单一权威文本（避免三视图分叉） | safeBody 单一净化文本 + 注入短语 redact + clamp | **have+** | `envelope.js:23,143` |
| authority 冲突解决 | 五级 authority，F4 后 ER 单一真相源 | **have** | `evidence-registry.js` |
| supersedes/contradicts 边 | Edges 全实现 + 检索 suppression | **have** | `retrieval.js`、契约 §5 |
| per-event 叶子 + 稳定 id + source ref | 每 Envelope 带 id+contentHash+sourceRefs | **have** | `envelope.js:129,95,169` |
| 焦点 relevance（Gen-Agents） | E1 已写，但**只接进 compiler 路、漏接 SC_RECALL 活路** | **have-weaker** | `context-compiler.js:367` 有 / `ai.js:1438` 无 |
| mem0 ADD/**UPDATE/DELETE** 事实合并 | 只有 content-dedup + 调用方供 supersedes；**character_memory 无 same-actor 自动 UPDATE**；无 DELETE | **gap（病根）** | `writegate.js:294,347` |
| 两段预算预留（必含永不裁） | 高权威/hard_state **无 mustKeep**，紧预算可被全裁；per-zone cap 是死配置 | **gap** | `tm-context-zones.js:63,111` |
| 位置强度（重要放末尾·LITM） | memory-context 在 LSR 块之上、区内 coreFacts→warnings 顶强 | **have-weaker** | compiler 渲染序 |
| 向量库耐久（原子写/分片/可重建） | IndexedDB·whole-index in RAM·persist 全量 clear+putAll **无原子 swap**·O(n) 扫描无上限 | **trap-risk** | `tm-semantic-recall.js:330,405` |
| 向量调参（阈值 0.3·retrieve 2-3·按记录分块） | 阈值 **0.55 硬编码两处**（偏严）·按记录分块 ✓ | **have-weaker** | `semantic-recall.js:30` + `ai.js:1405` |
| salience 衰减（sticky/cooldown/half-life） | 5 桶阶梯 recency（权重 0.15）·有 cooldownUntilTurn·**无连续 half-life** | **have-weaker** | `retrieval.js:374` |
| 分层压缩（arc/chapter·RAPTOR·金字塔） | v6 仅 turn→year 单层；3 层金字塔只在**legacy anchors**（喂 sc05 非 sc1） | **have-weaker** | `turn-rollup.js` / `anchors.js:301` |
| 滚动 recap O(新增) | v6 rollup **每回合全量重derive**（确定性·有 cap·无 AI 成本） | **have-weaker** | `turn-rollup.js:332` |
| 状态 tracker 独立成层 | 势力健康/关系本就是结构化 state（非记忆）·archiveTurn 捕关系事件 | **have** | `turn-archive.js:229,274` |
| group per-actor 过滤切片 | 切片 plumbing 完整+测试·但活 sc1 用 audience='system'（全知演绎脑·按设计） | **have（按设计未用）** | `ai.js:3332` |
| 陈旧注入 TTL/eviction | 容量裁剪有·但**FIFO 非 importance/pin-aware** | **have-weaker** | `writegate.js:172` |

---

## 2. 实施项（按价值排序）

### P1 ★ 恩德/关系 netting —— 治本项（直击 sprint 原始病根）

**病灶（实锤）**：`character_memory` **无 same-actor 自动 UPDATE**——`findAcceptedDuplicate`（`writegate.js:294`）只归档**精确 factKey 重复**；语义等价的"毕自严念辽饷之恩""毕自严记复核之诺"作为**独立 accepted 事实各自堆积**。审计原话："这是'恩德 piles up instead of netting out'在记忆侧的结构性根因"。而 issue 流**已有** `acceptedRefsByFactKey` 自动 supersede 路径，**没应用到 character_memory**。另：无 DELETE（schema 支持 `deleted_tombstone` 但 turn-inference 从不吐 delete 候选）。

**改法**（确定性·零 AI·守 BYOK/distrust）：
- **P1a** 给 character_memory 接 same-actor+same-topic 自动 UPDATE：新事实按 `(actor, memoryType, topicKey)` 归一键，命中既有 active accepted 则 supersede 旧的（archive 旧 + 写 supersedesRef），而非并存。复用 issue 流的 acceptedRefsByFactKey 机制。落点 `writegate.js:294/347` 邻近 `governAcceptedMemory`。
- **P1b** 加 DELETE/forget 候选类型：turn-inference 可吐 `forget`/`recant` 候选 → 把目标 accepted 翻 `deleted_tombstone`（schema 已支持 `envelope.js:111`）。治"AI 说某恩怨已了/某承诺作废"。
- **关系**：E2 立场综述（read-time）保留，P1 治的是**底层叶子净账**，二者互补（叶子净 → 立场综述更准、原始事件 store 不再无界堆积）。

**ST 出处**：mem0 ADD/UPDATE/DELETE；MemoryBooks upsert-by-stable-key（一条 tracker 反复重写）。**风险**：中（动 accepted 写路·须不破已有 supersede/contradict 测试）。**验证**：探针喂同 actor 多条恩德 → 净成一条；node + 全量 smoke + verify-all。

### P2 预算鲁棒性 —— 必含永不裁 + 防 rank 倒挂（compiler）

**病灶（实锤）**：① per-zone `maxTokens` 是**死配置**（`normalizeZone` 读了、`packZones` 从不 enforce·`tm-context-zones.js:63,111`）→ 一个胖区饿死其余；② **无内容级 mustKeep**——`coreFacts`/engine_state/player_pin hit 紧预算下**可被全裁**（与 ST"必含记忆永不裁"相反·`gaps`）；③ **rank 倒挂**：高 rank 区溢出后小的低 rank 区仍被收（无 reserved-tier break）→ 低权威碎片挤掉高权威；④ compiler 本地 `AUTHORITY_RANK`（`:31`）F4 后仍残留为 unknown-key 回退·latent drift footgun。

**改法**：① 把 zone.maxTokens 接进 `canFit`；② 给 engine_state/player_pin/hard_state 暴露 `mustKeep/ignoreBudget`（照 ST world_info `ignoreBudget` 逃生口）；③ 预算填充改**按 authority tier 预留**（高 tier 先占、不被低 tier 挤）；④ 删 compiler 本地表残留、unknown 回退也走 ER。**ST 出处**：reserveBudget/freeBudget 两段预留 + per-source budget cap + ignoreBudget。**风险**：中（动活注入预算·可能改 golden）。**验证**：构造紧预算探针断言 hard_state 必留 + 无 rank 倒挂。

### P3 向量耐久 + 调参 + E1 补接 —— 低风险高收益（semantic-recall / ai）

- **P3a【易赢】E1 补接活路**：`applyFocusRelevance(allHits, turnFocusTerms(GM,{sc1q}))` 已在 compiler 路、**漏在 SC_RECALL 活 loop**——在 `ai.js:1438` rankHitsDetailed 前补一遍。lane 安全已对、不碰 hard_state。**风险**：低。
- **P3b 阈值统一+放松**：0.55 硬编码两处（`semantic-recall.js:30` + `ai.js:1405`）统一到一个 config，并据 ST 实证降到 **0.45-0.50**（bge-small-zh 下 0.55 偏严、饿召回），实测 hit 数再定。
- **P3c 原子持久**：`persistIndex` 全量 `clear()+putAll` **无原子 swap**（`:405`）→ 标签页中途关 = 截断（ST 的 corruption 陷阱）。改 temp store/version key + swap，或只 persist `lastIndexedTurn` 之后的 delta（buildIndex 本就增量）。
- **P3d 上限/剪枝**：O(n) 扫描无上限·RecallGate 默认 OFF（`recall-gate.js:57`）。加滑窗/重要度剪枝，或长局开 gate。
- **P3e 清理**：删死的第二套 5 维 `_scoreHit`（`ai.js:1420`），单一真相源走 canonical `scoreHit`。

**ST 出处**：Vectra 落盘告诫（分片/原子写/可重建/有上限）+ 社区调参值（0.3-0.5）+ E1。**风险**：低-中。**验证**：node + recall smoke + 实存档 trace 看召回数。

### P4 分层压缩进 v6 主路 —— 长局可扩展（turn-rollup）

**病灶**：v6 只有 turn→year **单层** rollup（`turn-rollup.js:332` 还是每回合全量 re-derive）；真正的 **3 层金字塔只在 legacy anchors**（`anchors.js:301`）、且只喂 **sc05 非 sc1 主路**。

**改法**：把分层 consolidation 搬进 v6——加 era/dynasty rollup（折叠 year-rollups，镜像 L2→L3 over `GM._memoryChronicleRollups`），governed + 经 compileFromGM 注 sc1 主路。顺带把 rollup 改增量（保 per-group cursor，追加新 bundle 行而非全量 regroup）。**ST 出处**：MemoryBooks tier（Scene→Arc→Chapter→Book）、Summaryception 金字塔、RAPTOR/MemTree。**风险**：中（新投影 + 注入）。**验证**：多年存档跑出二层 recap 进 sc1。

### P5 salience 衰减 + pin/容量保护 —— 防重要记忆被 FIFO 误删（retrieval / writegate / controls）

**病灶（实锤·有隐患）**：① **pin/resident 仅在 ranking 受保护、storage retention 不保护**——80 cap 下**pinned accepted 记忆会被 FIFO 淘汰**（`writegate.js:172` 按 _seq 删最老）；`_memoryAccepted` 硬顶 80、读投影 `slice(-80)`，长局**静默丢最老 accepted 事实、无晋升进编年**；② recency 是 5 桶阶梯（权重 0.15）·无连续 half-life。

**改法**：① 容量淘汰改 **importance/pin-aware**（pinned/resident/高 authority 不被 age 淘汰；超 cap 的高价值事实**晋升进 chronicle/rollup** 而非丢弃）；② 加连续 salience half-life（exp 衰减）平滑老化。**ST 出处**：ST timed effects（sticky/cooldown/decay）+ 避免陈旧污染需 importance-aware eviction。**风险**：中（动容量/淘汰·须保 id/sourceRefs 不破）。**验证**：长局探针断言 pinned 不丢 + 超 cap 走晋升。

### P6 收敛/清理 —— 低优先（cross-cutting）

- **P6a** 双注入 trap-risk 复验（`ai.js` v6→sc1 vs legacy L2/L3+compileRecall→sc05·同史可能跨子调用到模型两次）：playtest dump sc05/sc1 diff，重叠则定 canonical lane per content type 或 compileFromGM 对 sc05 已注入去重。
- **P6b** 老 anchors **写侧仍活**（`createMemoryAnchor`/`archiveOldMemories` 仍 mutate memoryAnchors/memoryArchive·读侧已退役）——确认 memoryArchive 增长有界即可。
- **P6c** 向量 chunk 无 sourceRefs/稳定 id → 无法被 supersedes/contradicts 边治理（governance-light）。给每 chunk 回指 origin record 的 sourceRef，则向量也能进 lineage 治理。
- **P6d** qvink 式上游失效未接：schema 有 `invalidationRefs/contentHash` 但无 sweep 消费——可加"上游 turn/message 编辑→失效派生 accepted 事实"的扫描（可选）。

---

## 3. 切片排期（一刀一事·建议序）

| 刀 | 内容 | 工作量 | 风险 | 依赖 |
|---|---|---|---|---|
| S1 | **P3a** E1 补接 SC_RECALL + **P3b** 阈值统一 | 0.5d | 低 | 无（先做·热身+即时收益）|
| S2 | **P1a** character_memory same-actor 自动 UPDATE（治本） | 2-3d | 中 | 无 |
| S3 | **P1b** DELETE/forget 候选 | 1d | 中 | S2 |
| S4 | **P2** 预算 mustKeep + per-zone cap + 防倒挂 + 删本地表 | 2d | 中 | 无 |
| S5 | **P3c/P3d** 向量原子持久 + 上限剪枝 + **P3e** 清理 | 1.5d | 低-中 | S1 |
| S6 | **P5** importance/pin-aware 容量 + half-life | 2d | 中 | 无 |
| S7 | **P4** 分层压缩进 v6 主路 | 3d | 中 | 无 |
| S8 | **P6** 收敛/清理（双注入复验 + 向量 sourceRef + 可选 invalidation sweep） | 2d | 低 | playtest |

**核心闭环（S1-S4）≈ 6-7 天**：先补 E1+调参（即时召回质量），再治恩德 netting（病根），再固预算（防关键记忆被裁）。S5-S8 为加固/扩展。

---

## 4. owner 决策点（动手前须拍）

1. **首刀**：建议 S1（E1 补接·低风险热身）还是直奔 S2（恩德 netting 治本）？
2. **P1a 归一键粒度**：恩德/关系按 `(actor, memoryType)` 净账，还是更细 `(actor, memoryType, topicKey)`？净账是"同类覆盖"还是"加权累积净额"（如受恩 +3/恩怨 -1 → 净 +2）？
3. **P1b DELETE**：允许 AI 吐 forget 候选吗（与"不信 AI 写入"立场的边界——建议 forget 也走 draft/可信门，不直接 tombstone）？
4. **P3b 阈值**：0.55→0.45-0.50 由我实测 hit 数定，还是你直接拍一个值？
5. **P3d/P5 容量**：长局向量与 _memoryAccepted 上限策略——滑窗剪枝 vs 重要度晋升进编年，倾向哪个？
6. **P4 分层**：era/dynasty 二层 recap 现在做，还是等核心闭环 ship 后再排？

---

## 5. 暂缓 / 不做（避免过度工程）

- **per-actor 记忆切片接活 sc1**：plumbing 完整但按设计未用（全知演绎脑应见全部）。仅当未来加"每 NPC 独立子推演"时启用（call-site 改 `audience:'npc',actorId` 即可·`ai.js:3330`）。
- **MemTree 全量动态树**：当前无写时向量路由·收益被 P1a 的 same-actor auto-UPDATE 更便宜地覆盖。除非上重向量库，否则 out-of-scope。
- **mem0 的 LLM-merge 合并**：刻意避开（BYOK + 不信 AI 写入）·P1 全走确定性归一键。
- **coverage cursor 进 collect()**：当前 stateless 全 re-derive 是有意为之（廉价失效·无 cursor drift）·仅当 perf 审计显示投影成本高时再在消费/写store 边界加·不动 collect() 纯函数性。

---
*2026-06-03 · grounding=当天 v6 源码审计（6 agent 实读 19 模块）+ ST 源码级调研 · 结论：v6 成熟且 ST 多数借鉴已有更强，本方案只打 8 个实锤项、治本项 = 恩德/关系 same-actor 自动 netting · 未 ship 待 owner 逐刀拍。*
