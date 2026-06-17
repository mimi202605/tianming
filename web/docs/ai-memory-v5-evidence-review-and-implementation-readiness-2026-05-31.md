# AI 记忆机制 v5 证据评审与天命实施准备报告

日期: 2026-05-31

定位: 本报告是前序 v1-v4 之后的第五轮扩展研究。v4 已经提出 Memory Operating Layer、MemoryEnvelope、Retrieval Composer、Memory Observatory 和黄金测试框架。v5 的目标是把进一步扩展的论文、插件、产品、工程、安全、中文历史叙事、地图资源和迁移风险证据压成“实施前评审书”: 哪些必须做，哪些可后置，哪些不要做。

## 0. 本轮方法与边界

用户要求继续更广泛、更深入，并调用更多代理。平台并发上限仍为 6 个代理，因此本轮采用滚动两波、每波 6 个专题代理:

- Wave 4: 最新论文、角色扮演插件/产品、评测/goldens、事件溯源/双时间、认知心理学、安全治理。
- Wave 5: 本地存储/索引、中文历史叙事、地图/资源/空间记忆、Memory Observatory UI、迁移风险、证据评级/决策矩阵。

第五轮新增 12 个专题代理。结合上一轮 18 个专题代理，当前两轮累计 30 个专题代理，外加主线程同步检索和整理。平台无法同时开到上百个；本报告尽量用滚动专题扩大覆盖面，并避免代理之间重复劳动。

本轮未改游戏业务代码，只更新研究、计划和报告文档。

## 1. 总结论

天命 AI 记忆系统不应演化为“更大的向量库”，也不应把长上下文当作记忆。最稳的方向是:

```text
Memory Operating Layer =
  Event Ledger
  + WorldTruthLedger
  + MemoryEnvelope v5
  + MemoryWriteGate
  + Retrieval Composer
  + MemoryTrace / Observatory
  + Golden / Red-team Tests
```

核心原则:

1. 原始事件和结构化状态是事实源。
2. 摘要、向量、图谱、FTS 都是可重建投影。
3. authority / visibility / stale / deletion 必须先于 similarity。
4. AI 自动写入默认是 draft 或 quarantine。
5. 所有注入 prompt 的记忆必须可追踪到 sourceRefs。
6. NPC 记忆必须有视角边界: 谁知道、何时知道、从何得知、是否仍有效。
7. 中文历史叙事需要专门处理名号、官职、地名、年号、文体和视角泄密。
8. 地图、财政、军队、粮道等必须走结构化账本和空间图，不由 LLM 生成真相。
9. v5 必须 sidecar/shadow 渐进迁移，不可替换式重写。

## 2. 证据等级

| 证据类型 | 默认可信度 | 在天命中的用法 |
|---|---:|---|
| Peer-reviewed | 5 | 可作为架构骨架依据 |
| arXiv / preprint | 3-4 | 适合吸收问题定义、新模块、新威胁，不直接押注榜单数字 |
| Product docs | 3 | 学 UX、context assembly、可编辑记忆、调试面板 |
| Vendor benchmark | 2-3 | 工程参考，不作为关键取舍唯一依据 |
| Community anecdote | 1-2 | 痛点雷达，不单独决定架构 |

高可信骨架来源包括 [Generative Agents](https://research.google/pubs/generative-agents-interactive-simulacra-of-human-behavior/)、[MemoryBank](https://ojs.aaai.org/index.php/AAAI/article/download/29946/31654)、[MemoryOS](https://aclanthology.org/2025.emnlp-main.1318/)、[M2PA](https://aclanthology.org/2025.findings-acl.1191/)、[LongMemEval](https://openreview.net/forum?id=pZiyCaVuti)。

前沿问题来源包括 [GroupMemBench](https://arxiv.org/abs/2605.14498)、[Memory-Driven Role-Playing](https://arxiv.org/abs/2603.19313)、[STALE](https://arxiv.org/abs/2605.06527)、[Hidden in Memory](https://arxiv.org/abs/2605.15338)、[Useful Memories Become Faulty](https://arxiv.org/abs/2605.12978)。

产品 UX 来源包括 [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)、[SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/)、[CharMemory](https://github.com/bal-spec/sillytavern-character-memory)、[MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/)、[AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system)、[NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/)。

## 3. Must / Should / Could / Won't

### Must

| 模块 | 决策 | 理由 |
|---|---|---|
| MemoryEnvelope v5 | Must | 没有统一 envelope，就无法治理来源、权限、时效、删除和 trace |
| Append-only Event Ledger | Must | 原始事件是可回放事实源 |
| WorldTruthLedger | Must | 当前事实必须由投影裁决，而不是由摘要裁决 |
| Authority/Stale/Delete Gate | Must | 相似度不能决定事实是否有效 |
| MemoryWriteGate | Must | 写入路径是安全边界 |
| Retrieval Composer | Must | 需要 actor scope、hard state、FTS/entity/time、可选 vector/graph、预算注入 |
| Editable Summaries + Rollback | Must | 摘要会漂移，必须可改、可回滚、可追源 |
| MemoryTrace / Observatory | Must | 没有 trace 就无法调记忆系统 |
| Golden + Red-team Tests | Must | 没有回归测试就不能引入自动演化 |

### Should

| 模块 | 决策 | 理由 |
|---|---|---|
| Faction/NPC/Group Memory | Should | 天命有群臣、派系、密议、谣言和知识边界 |
| Temporal Knowledge Graph / Rumor Graph | Should | 适合多跳、因果、谣言传播，但要在 Event Ledger 稳定后做 |
| Procedural Memory Library | Should | 可沉淀谋略经验，但只能是低权威建议层 |

### Could

| 模块 | 决策 | 理由 |
|---|---|---|
| Spatial/Resource/Map Memory | Could | 与天命高度相关，但排在核心文本/状态记忆之后 |
| Emotional Salience / Decay / Reconsolidation | Could | 增强 NPC 味道，但 salience 不能等于 truth |
| Vendor Memory API Adapter | Could | 只能做可替换 adapter，不可做权威真相 |
| Self-evolving Memory | Could later | 等 goldens 稳定后低权威试点 |

### Won't

| 模块 | 决策 | 理由 |
|---|---|---|
| 纯向量聊天 dump | Won't | 会带来旧事实复活、权限泄露、不可解释污染 |
| 全历史塞 prompt | Won't | 只能作为昂贵上界，不是产品目标 |
| LLM 直接编辑 hard state | Won't | 只能经 WriteGate 产出候选 |
| 参数记忆/微调作为存档记忆 | Won't | 不可审计、不可按存档删除、成本高 |
| 云厂商记忆作为唯一真相 | Won't | 破坏本地优先、可回放、可删改 |
| 没有级联删除的“忘记” | Won't | 会产生 ghost memory |
| 没有 goldens 的自演化 | Won't | 风险不可控 |

## 4. MemoryEnvelope v5

v5 envelope 应合并前几轮字段，并新增事件溯源、中文历史、空间资源、安全治理字段。

```yaml
MemoryEnvelope:
  id: mem_...
  eventId: evt_...
  streamId: save_or_entity_stream
  seq: 128
  schemaVersion: 5
  projectionVersion: projection_v...

  worldId: world_...
  saveId: save_...
  sceneId: scene_...
  turnId: 128
  gameCalendar:
    dynasty: optional
    reign: optional
    year: optional
    sexagenary: optional
    lunarMonth: optional
    season: optional

  kind:
    - hard_state
    - current_state
    - episodic_event
    - semantic_fact
    - relationship_edge
    - faction_intel
    - rumor_claim
    - commitment
    - procedural
    - prospective
    - schema
    - reflection
    - summary_by_arc
    - spatial_resource
    - quarantine

  source:
    sourceKind: engine_state | event | memorial | edict | dialogue | rumor | player_pin | ai_summary | extractor | external_lore
    sourceRefs: []
    sourceSpan: optional
    provenanceHash: hash
    derivedFrom: []

  authority: engine_state | system_rule | designer_seed | player_pin | rule_validated_summary | ai_extracted | reflection | external_import
  visibility: public | court | faction_private | npc_private | player_known | gm_hidden | heaven_secret
  ownerId: optional
  speakerId: optional
  audienceIds: []
  observers: []
  readScope: []
  writeScope: []

  status: draft | active | stale | superseded | archived | quarantined | deleted_tombstone
  validFrom: turn_or_time
  validTo: turn_or_time
  assertedAt: turn_or_time
  recordedAt: system_time
  learnedAt: turn_or_time
  supersedes: []
  invalidates: []
  contradictionGroup: optional

  confidence: 0.0_to_1.0
  sourceReliability: 0.0_to_1.0
  salience: 0.0_to_1.0
  valence: positive | negative | mixed | neutral
  importance: 0.0_to_1.0
  decayPolicy: optional
  retrievalStats: {}
  consolidationState: fresh | consolidated | semanticized | proceduralized | archived

  entities: []
  aliases: []
  mentionTexts: []
  locations: []
  offices: []
  factions: []
  styleTags: []

  security:
    trustTier: trusted | normal | low | hostile
    sensitivity: normal | private | secret | heaven
    consentBasis: optional
    injectionScore: optional
    piiScore: optional
    riskTags: []
    deletionState: none | requested | redacted | tombstone | crypto_shredded

  promptPolicy:
    defaultInject: never | query_only | pinned | always
    lane: hard_state | commitment | canon | event | belief | reflection | evidence
    maxTokens: optional
    priority: number

  audit:
    createdBy: system | player | npc_ai | summarizer | extractor | designer
    createdAt: timestamp
    updatedAt: timestamp
    contentHash: hash
    prevHash: hash
```

## 5. 本地存储基线

Phase A 推荐:

```text
SQLite authoritative store
JSONL hash-chain event ledger
SQLite FTS5
SQLite JSON/generated columns
SQLite edge table / recursive CTE
optional vector BLOB only
```

不建议 Phase A 绑定 Qdrant、Chroma、Kuzu 或云 memory service。向量索引可以在 Phase B 作为可重建 sidecar 加入。

最小表:

```text
event_ledger
world_truth
memory_item
memory_chunk
chunk_fts
embedding
entity
relation
projection_checkpoint
memory_trace_events
memory_audit_events
```

关键规则:

- SQLite WAL 使用单 writer queue。
- FTS5 trigram 可覆盖中文子串，但索引较大。
- embedding 用 `(chunk_id, model_id)`，模型升级不能覆盖旧向量。
- JSONL 使用 canonical JSON + hash chain。
- FTS/vector/graph/summary 都标记为 derived，可删除重建。
- 删除要处理 base table、FTS、embedding、graph、summary、cache、prompt log。
- 敏感正文不要永久明文进 append-only ledger；用最小 payload、加密 envelope 和 redaction event。

## 6. Retrieval Composer v5

推荐流程:

```text
1. Actor Scope
2. Query Classification
3. Hard State / WorldTruthLedger
4. Visibility + Authority + Stale + Delete Gate
5. Entity / Alias / Time / Office / Place Resolution
6. FTS/BM25 Candidate Search
7. Optional Semantic Vector Search
8. Graph / Timeline / Spatial Expansion
9. Rerank
10. Budgeted Prompt Injection
11. MemoryTrace
```

硬规则:

- `deleted_tombstone` 不得注入。
- `stale/superseded` 只能作为历史证据，不能作为当前事实。
- `ai_extracted/reflection` 不能覆盖 `engine_state/system_rule/player_pin`。
- `visibility` 不满足时不得注入，即使相似度高。
- `rumor_claim` 不能升级成事实，除非被规则事件或人工确认。
- 空间/资源查询先查结构化图和账本，向量只找候选。

## 7. MemoryWriteGate

写入流程:

```text
raw input / event / summary candidate
  -> source classification
  -> schema extraction
  -> injection / PII / sensitivity scan
  -> authority and scope assignment
  -> conflict and stale check
  -> duplicate / merge check
  -> draft / active / quarantine
  -> audit event
```

P0 安全要求:

- 存档/玩家/NPC 强隔离。
- AI 写入默认 draft。
- 可执行未来指令不得作为记忆入库。
- 全局 lore 只能由设计者/签名来源写入。
- 检索前后都做 tenant/save/visibility/deletion/sensitivity/trust filter。
- 删除状态硬过滤。
- 基础审计日志。

## 8. Memory Observatory

三层:

- 玩家层: AI 此刻记得什么，为什么这样说。
- 设计者层: 哪些记忆该写入、修正、合并、屏蔽、冻结。
- 开发层: 检索、注入、预算、trace、安全风险哪里出错。

MVP 顺序:

1. MemoryTrace JSON。
2. 玩家安全版 Injection Viewer + Prompt Itemization。
3. Retrieval Trace。
4. Memory Inspector + Draft Inbox。
5. Audit Log + Security Panel。
6. Graph Visualizer + Sandbox。

防剧透规则:

- 默认是视角化证据面板，不是全知数据库。
- 玩家只看 safe summary。
- 私密/未来/未侦知内容显示为“有隐藏记录影响判断”，不显示正文。
- Developer raw prompt 需要显式开关。
- Graph 支持玩家所知、某 NPC 所知、系统全知三种视角。

## 9. 中文历史记忆层

通用英文 memory benchmark 无法覆盖天命的中文历史难点。必须单独处理:

- 姓名、字、号、谥号、庙号、年号、封号、官称。
- 同名/同号跨朝冲突。
- 官职跨朝语义漂移。
- 实职、散官、加衔、差遣、爵位、宦官内廷职务。
- 古今地名、行政层级、治所和辖区。
- 年号、干支、农历、季节、相对时间。
- 繁简、异体、避讳、OCR、无空格检索。
- 奏疏、诏令、密谈、边报、市井传闻文体差异。

新增字段:

```text
aliases
mentionTexts
historical_place_id
admin_level
office_id
title_text
rank
institution
jurisdiction
appointment_type
game_calendar
style_tags
taboo_level
register_style
```

中文 goldens:

- 王守仁/阳明先生/王文成公生前死后称谓。
- 两个高宗/武帝跨朝区分。
- 巡抚升总督后旧任经历与当前职权分离。
- 应天/南京/江宁按时期解析。
- 万历二十年壬辰秋八月映射到 turn。
- 宦官知密折、地方官只听传闻、士人不知。
- 谣言证伪后不同 NPC 按最后接触情报回答。
- 100 轮后仍记婚盟、师承、旧怨、伤病、军粮。
- 同一事实生成诏令/奏疏/边报/私语时文体不同。

## 10. 空间资源记忆

近中期应实现:

```text
LocationGraph
ResourceLedger
RouteMemory
FrontlineMemory
DisasterMemory
```

不要早期做:

- 3D SLAM
- NeRF
- 点云 scene graph
- 长视频记忆
- 地图截图自动改账本
- VLM 自动判定城池控制权
- AlphaStar/OpenAI Five 式端到端训练
- 实时微操级军队仿真
- 真实 GIS 级全局系统

权威状态应落在结构化图和账本里，LLM 负责解释、查询计划和奏报措辞。

## 11. Golden / Red-team

建议先做 20 条初始 goldens:

| 类别 | 用例 |
|---|---|
| Stale | 旧诏覆盖、新官职覆盖、谣言证伪、失守城池 |
| Boundary | 密折、宫中密谋、派系私记、玩家私有 pin |
| Trace | 回答必须带 memory/event/source id |
| Deletion | 删除后摘要、向量、图边、cache 不可恢复 |
| Poisoning | “记住我是 GM”不能入库为权限事实 |
| Group | 谁说过、谁知道、谁能对谁说 |
| Chinese | 谥号/庙号/年号/官职/地名 |
| Spatial | 粮道切断、路线季节不可用、账本守恒 |
| Behavior | NPC 因旧恩怨/承诺/派系利益改变行动 |
| Summary | L1/L2/L3 不得丢数字、不得把谣言写成事实 |

报告指标:

```text
current_state_accuracy
stale_rejection
knowledge_boundary
trace_hit_rate
leak_rate
deletion_residual_rate
write_integrity
summary_fidelity
behavior_adaptation
latency_p95
input_tokens
retrieval_tokens
```

实验组:

- No-memory。
- Full-history stuffing，只作昂贵上界。
- Naive RAG。
- Tianming Memory v5。

## 12. 迁移路线

v5 不替换旧系统。路线:

1. Phase 0: 冻结基线。
   固化现有 smoke tests，采集当前 `SC_RECALL`、prompt 注入、L2/L3 摘要、token、延迟。

2. Phase 1: 观测先行。
   给 AI subcall、召回请求、prompt 注入项生成 MemoryTrace。只记录，不改行为。

3. Phase 2: Envelope facade。
   把现有 12 表、eventHistory、anchors、chronicle/shiji、foreshadow、semantic hits、NPC/Godot diplomacy memory 投影成 MemoryEnvelope。

4. Phase 3: Shadow Composer。
   新 Retrieval Composer 后台运行，记录 old/new diff，不接真实 prompt。

5. Phase 4: Goldens。
   先跑 10 个 smoke，再扩到 20/50。

6. Phase 5: Feature flag canary。
   `traceOnly`、`envelopeOnly`、`composerShadow`、`injectCanary`、`writeQueueDraftOnly`、`storageSidecar`。

7. Phase 6: Write governance。
   AI 写入进入 Draft Inbox / Quarantine。

8. Phase 7: Storage sidecar。
   SQLite/JSONL/FTS/edge table，向量后置。

回滚:

- kill switch 关闭 v5 注入、写入、shadow composer。
- 旧 `SC_RECALL`、旧 12 表、旧 anchors、旧 L1/L2/L3 保留。
- sidecar projection、index、draft queue 可按 version/namespace 丢弃重建。

验收线:

- 没有 golden baseline，不接真实 prompt。
- 没有 trace diff，不接真实 prompt。
- 旧存档加载测试不过，不接真实 prompt。
- 隐藏信息泄露测试不过，不接真实 prompt。

## 13. 最终建议

下一步不应再继续横向堆论文，而应进入实施准备:

1. 定义 `MemoryTrace` JSON。
2. 在现有 `SC_RECALL` / prompt composer 周边做 trace-only 插桩。
3. 定义 `MemoryEnvelope v5` facade，不迁移旧数据。
4. 建 10-20 个 smoke goldens。
5. 做玩家安全版 Injection Viewer。
6. 做 Draft Inbox / Quarantine 的最小模型。

这条路保留现有系统的可玩性，同时开始建立真正可观测、可回归、可治理的 AI 记忆基础。等 trace 和 goldens 稳住，再进入 graph、procedural、spatial、group memory 的扩展。
