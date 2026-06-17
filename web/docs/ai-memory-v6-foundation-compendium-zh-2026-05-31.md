# 天命 AI 记忆机制 v6 基础大典

日期：2026-05-31

## 一句话结论

天命的 AI 记忆系统不应从“更大的向量库”开始，而应从一个可追源、可回放、可裁决、可删除、可解释、可测试的本地 Memory OS 开始。

最小内核是：

```text
Append-only Event Ledger
+ MemoryEnvelope facade
+ WorldTruth projection
+ MemoryWriteGate
+ RetrievalComposer
+ MemoryTrace
```

第一阶段只做 `traceOnly`：观察当前 AI 调用、SC_RECALL、semantic recall、prompt 拼装和注入记忆，不改变 prompt 行为、不改变检索排序、不改变写入结果。

## 本轮研究方法

第六轮在主线程继续实时检索论文、产品文档和工程资料，同时滚动派发 18 个专题代理，受平台并发上限约束，每次 6 个代理并行。

本轮新增研究覆盖：

- 认知架构与人类记忆理论。
- schema-grounded memory、写入门控、事实/信念/谣言建模。
- 混合检索、rerank、上下文预算和 prompt placement。
- SillyTavern、AI Dungeon、NovelAI、Luker、Risu、Agnai 等角色扮演记忆系统。
- 长期记忆安全、投毒、删除、隐私、可见性治理。
- Tianming 当前代码里的 traceOnly 挂钩点。
- 中文历史实体、年号、地名、官职、奏疏文体。
- event sourcing、bitemporal data、projection rebuild、hash chain、backup/restore。
- MemoryTrace / Observatory 数据标准。
- 玩家、创作者、设计者 UX。
- 红队反向审计和范围控制。

加上前两轮大型代理研究，v4-v6 共计 48 个专题代理；本轮 v6 单独新增 18 个代理，超过上一轮 v5 的 12 个。

## 总体判断

AI 记忆不是一个单一模块，而是以下几件事的契约：

- 游戏确定性真相。
- 玩家和剧本作者的裁决。
- NPC 和势力的主观认知。
- 历史叙事连续性。
- 可检索证据。
- prompt 组装位置。
- 模型生成文本。
- 审计、纠错、删除和回放。

因此，天命的记忆系统更像“史馆 + 密档 + 情报署 + 朝廷档案司”，而不是聊天机器人的“长期记忆框”。

## 记忆分类

| 类型 | 含义 | 权威 | 用途 |
|---|---|---:|---|
| `hard_state` | 引擎/系统/玩家/设计者裁决后的当前状态 | 最高 | 官职、财政、兵粮、法令、疆域 |
| `episodic_event` | 有时间、地点、参与者、来源的事件 | 高 | 战役、朝议、密会、承诺 |
| `semantic_fact` | 从事件投影出的结构化事实 | 高/中 | “某人现任某职” |
| `belief` | 某 NPC/势力相信的内容 | 中/主观 | 误会、怀疑、私怨 |
| `rumor` | 未证实或低可信传播 | 低 | 民间传闻、敌方宣传 |
| `commitment` | 面向未来的承诺、命令、期限 | 高 | 欠饷、赈灾、会盟、复仇 |
| `relationship` | 人物/势力/事件之间的边 | 中 | 盟友、师门、仇怨、婚姻 |
| `summary` | 摘要压缩 | 低 | 编年、章节概览 |
| `reflection` | AI 反思、教训、策略建议 | 低 | “此策曾失败” |
| `procedural` | 可复用流程或习惯 | 低/中 | 赈灾流程、外交套路 |
| `trace` | 记忆如何被召回和注入 | 审计 | why-this-memory |

核心规则：摘要、反思、embedding、graph edge 都是派生物，不是事实源。

## 学术基础

### 认知架构

参考：

- [ACT-R](https://act-r.psy.cmu.edu/)
- [Soar manual](https://soar.eecs.umich.edu/soar_manual/)
- [Common Model of Cognition](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/2744/0)
- [CoALA](https://arxiv.org/abs/2309.02427)
- [Generative Agents](https://arxiv.org/abs/2304.03442)
- [LLM agent memory survey](https://arxiv.org/abs/2404.13501)

工程翻译：

- working memory 是当前回合焦点。
- episodic memory 是事件账本。
- semantic memory 是结构化事实和世界知识。
- procedural memory 是行动策略和流程。
- prospective memory 是未来触发的承诺、期限、密谋、复仇、军令。

### 情景先行，语义后生

参考：

- [Complementary Learning Systems](https://web.stanford.edu/~jlmcc/papers/McCMcNaughtonOReilly95.pdf)
- [Useful Memories Become Faulty](https://arxiv.org/abs/2605.12978)

天命应采用：

```text
原始事件 -> 候选 claim -> 结构校验 -> 当前事实投影 -> 可选摘要/反思
```

新事件不能立刻被压成角色设定。原始事件必须可回放，摘要必须可重建。

### 来源监控

参考：

- [source monitoring](https://memlab.yale.edu/sites/default/files/files/1993_Johnson_Hashtroudi_Lindsay_PsychBull.pdf)
- [Baddeley episodic buffer](https://pubmed.ncbi.nlm.nih.gov/11058819/)
- [Diekelmann and Born consolidation](https://www.nature.com/articles/nrn2762)

每条记忆都要知道：

- 谁说的。
- 谁听见。
- 谁能知道。
- 何时发生。
- 何时记录。
- 来源是亲见、奏报、谣言、推断、系统事件还是摘要。
- 当前是否仍然有效。

## LLM 记忆研究结论

关键资料：

- [MemGPT](https://arxiv.org/abs/2310.08560)
- [MemoryBank](https://arxiv.org/abs/2305.10250)
- [Memory for Autonomous LLM Agents](https://arxiv.org/abs/2603.07670)
- [Schema-Grounded Memory](https://arxiv.org/abs/2604.27906)
- [Zep / Graphiti](https://arxiv.org/abs/2501.13956)
- [AriGraph](https://arxiv.org/abs/2407.04363)
- [A-MEM](https://arxiv.org/abs/2502.12110)
- [STALE](https://arxiv.org/abs/2605.06527)
- [GroupMemBench](https://arxiv.org/abs/2605.14498)
- [MemReranker](https://arxiv.org/abs/2605.06132)

研究共同指向：

- 写入比检索更危险。
- 事实、信念、谣言、摘要、反思必须分层。
- 相似度不能裁决真相。
- 过期事实和隐式冲突是长期记忆的核心难点。
- 多人/多视角记忆比单人聊天难得多。
- trace 是调试记忆系统的基础，而不是 UI 附属功能。

## 角色扮演产品启发

参考：

- [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)
- [SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/)
- [SillyTavern Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/)
- [AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system)
- [AI Dungeon Story Cards](https://help.aidungeon.com/faq/story-cards)
- [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/)
- [Agnai Memory Books](https://agnai.guide/docs/memory/memory-books.html)
- [RisuAI Lorebook](https://github.com/kwaroran/RisuAI/wiki/Lorebook)
- [Luker Memory Graph](https://luker.cups.moe/features/memory-graph.html)

成熟 RP 系统不是一个大文本框，而是分层：

- 常驻设定。
- 当前剧情摘要。
- 关键词/语义触发 lore。
- 事件记忆。
- NPC、关系、地点状态。
- 玩家可编辑记忆。
- Context Viewer / Recall View / 为什么这条记忆被注入。

对天命最重要的迁移：

- 设定册适合稳定制度、地理、神话、世界规则。
- 事件图谱适合战役、背叛、盟约、血仇、谣言。
- 规则和状态必须由 runtime/引擎维护。
- LLM 是叙事导演，不是唯一数据库。

## 中文历史专项

参考：

- [CBDB](https://cbdb.hsites.harvard.edu/)
- [CBDB API](https://input.cbdb.fas.harvard.edu/cbdbapi/index.html)
- [CHGIS](https://chgis.fas.harvard.edu/)
- [CHGIS placename search](https://chgis.fas.harvard.edu/search/)
- [DILA authority databases](https://authority.dila.edu.tw/)
- [DILA date query API](https://authority.dila.edu.tw/docs/services/date_query.php)
- [CHisIEC](https://arxiv.org/abs/2403.15088)
- [Bingenheimer 古汉语 NER](https://link.springer.com/article/10.1186/s40655-015-0007-3)

天命需要的不是“把资料库导进去”，而是学习它们的建模纪律：

```yaml
HistoricalEntity:
  type: person | place | office | institution | era | title | document | event
  canonicalName
  dynastyScope
  validFrom
  validTo
  authorityIds
  sourceRefs

Alias:
  aliasType: 名 | 字 | 号 | 庙号 | 谥号 | 年号 | 官称 | 地名旧称 | 避讳形
  validFrom
  validTo
  searchable

TimeExpression:
  system: reign | ganzhi | lunar | gregorian | relative | seasonal
  ceStart
  ceEnd
  ambiguity

OfficePost:
  personId
  officeId
  rank
  jurisdiction
  appointmentType
  validFrom
  validTo

PlaceInstance:
  chgisId
  featureType
  parentPlaceId
  validFrom
  validTo

SourceOccurrence:
  sourceRef
  textSpan
  rawText
  candidateEntityIds
  chosenEntityId
```

特殊规则：

- NER 只产生候选，不直接写事实。
- `太宗`、`高宗`、`文正`、`江宁`、`甲子年`必须依赖朝代、时代和上下文消歧。
- 庙号/谥号不能在人物生前乱用。
- 官职不是标签，要有机构、品级、辖区、任期。
- 地名必须有时间片。
- 奏疏、密疏、诏、敕、谕旨、邸报、史官叙述要有文体和可见性。

## v6 记忆宪法

1. 世界真相高于生成物。
2. 原始事件不可被摘要覆盖。
3. 进入 active 的记忆必须有 sourceRefs、derivedFrom、contentHash。
4. scope、visibility、delete、stale、authority gate 先于相似度。
5. NPC 不得全知。
6. AI 写入默认 draft/quarantine。
7. stale、superseded、deleted、rumor 默认不能当当前事实注入。
8. 每条注入记忆必须可解释。
9. 删除必须级联到 summary、FTS、embedding、graph、cache、prompt log。
10. 没有 trace、goldens、旧档兼容和泄密测试，不接生产 prompt。

## 权威与可见性裁决

权威层级：

```text
A0 系统规则 / schema / tombstone / 安全边界
A1 Engine State / WorldTruthLedger
A2 Append-only Event Ledger 原始事件
A3 Designer Seed / Scenario Canon
A4 Player Pin / 皇命 / 手工锁定
A5 Rule-validated Extraction
A6 Raw Narrative Evidence
A7 NPC/Faction Belief
A8 AI Summary / Reflection / Procedural Advice
A9 Vector Hit / External Import / Rumor
```

冲突裁决顺序：

```text
visibility pass
-> status pass
-> authority
-> validFrom / validTo
-> confidence / sourceReliability
-> assertedAt / turn
```

可见性最小集：

```text
world_truth
player_known
faction_private
npc_private
gm_hidden
```

完整集可扩展为：

```text
public
court
player_known
gm_hidden
heaven_secret
faction_private:{id}
npc_private:{id}
hidden
quarantine
```

## 最小数据模型

第一阶段不要一次性要求全部字段都填满。Envelope v0 可以先用：

```yaml
id
type
body
sourceRefs
status
authority
visibility
turn
entities
lane
reason
extra
```

完整 MemoryEnvelope 再逐步扩展：

```yaml
MemoryEnvelope:
  id
  schemaVersion
  projectionVersion
  eventId
  kind
  lane
  worldId
  saveId
  sceneId
  turnId
  ownerScope
  ownerId
  readScope
  writeScope
  authority
  visibility
  status
  reviewStatus
  body
  safeBody
  rawExcerpt
  sourceRefs
  derivedFrom
  validFrom
  validTo
  learnedAt
  recordedAt
  supersedes
  supersededBy
  invalidates
  invalidatedBy
  contradictionGroup
  entities
  aliases
  locations
  offices
  factions
  confidence
  sourceReliability
  importance
  trustTier
  sensitivity
  injectionScore
  riskTags
  deletionState
  promptPolicy
  retrievalStats
  extractorVersion
  promptTemplateVersion
  rulesetHash
  embeddingModelId
  contentHash
```

最小表：

```text
event_ledger
memory_item
memory_source_ref
memory_edge
memory_entity
world_truth_projection
memory_trace_events
memory_audit_events
projection_checkpoint
```

FTS、向量、graph、summary 都是 sidecar。

## 状态机

写入：

```text
RawEvent / ModelOutput / PlayerText
-> Candidate
-> SchemaValidation
-> SourceClassification
-> AuthorityScopeAssignment
-> InjectionPrivacySensitivityScan
-> ConflictStaleDuplicateCheck
-> Decision

Decision:
  engine/system verified -> Active
  clean AI/player extraction -> Draft
  low trust/conflict/injection risk -> Quarantine
  duplicate -> Merged
  invalid -> Rejected
```

检索：

```text
Request
-> ActorScope
-> QueryPlan
-> HardFilters
-> CandidateSearch
-> Rerank
-> BudgetPack
-> Inject or NoEvidenceAbstain
-> MemoryTrace
```

## Prompt Lanes

prompt placement 是记忆机制的一部分，不是排版。

参考：

- [Lost in the Middle](https://arxiv.org/abs/2307.03172)
- [LangChain LongContextReorder](https://api.python.langchain.com/en/latest/community/document_transformers/langchain_community.document_transformers.long_context_reorder.LongContextReorder.html)
- [SillyTavern Chat Vectorization](https://docs.sillytavern.app/extensions/chat-vectorization/)

建议 32k context 下主推演 prompt 目标控制在 16k-18k tokens。

| Lane | 内容 | 建议预算 |
|---|---|---:|
| `L0_system_contract` | 输出格式、安全、不得伪造、schema 核心 | 900-1400 |
| `L1_world_truth` | 当前硬状态 | 2500-3500 |
| `L2_active_law_commitment` | 长期诏令、承诺、持续政策 | 1200-1800 |
| `L3_actor_scope_visibility` | 当前 subcall 可见范围 | 500-900 |
| `L4_current_turn_input` | 玩家本回合输入 | 1500-2500 |
| `L5_recent_state_delta` | 近回合结构化变化 | 1200-2000 |
| `L6_retrieved_evidence` | 检索证据 | 1800-3000 |
| `L7_actor_memory` | NPC/势力主观记忆 | 1200-2200 |
| `L8_narrative_threads` | 伏笔、危机、叙事弧 | 1000-1800 |
| `L9_style_tone` | 文风语气 | 300-700 |
| `L10_debug_trace` | traceOnly 元数据 | 0 |

注入顺序：

- L0 和压缩 L1 靠前。
- L4 当前输入靠前。
- L5/L8 等低权威摘要放中段。
- L6 检索证据做 sandwich packing：最重要证据放当前输入后和最终任务前。
- L2 承诺/持续诏令靠后，抵抗 Lost-in-the-Middle。
- 最尾放输出 schema 和“无证据则不确定/拒答”。

## MemoryTrace

参考：

- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/)
- [OpenInference](https://arize-ai.github.io/openinference/spec/)
- [LangSmith run data format](https://docs.langchain.com/langsmith/run-data-format)
- [Langfuse data model](https://langfuse.com/docs/observability/data-model)
- [Phoenix tracing](https://arize.com/docs/phoenix/learn/tracing)
- [MemTrace](https://arxiv.org/abs/2605.28732)

四类 trace：

- retrieval trace。
- write trace。
- injection trace。
- delete trace。

默认不把 raw prompt / raw memory body 写入普通 span attribute。记录：

- content hash。
- encrypted/ref。
- safe excerpt。
- token count。
- redaction status。
- policy version。

traceOnly 必须记录：

- query。
- hard filters。
- 候选来源和分数。
- 入选原因。
- 淘汰原因。
- prompt lane。
- token 成本。
- crop reason。
- no-evidence decision。

## 当前代码挂钩点

只读探索显示，traceOnly 可以不改变生成行为直接落点：

- [web/tm-endturn-ai.js](C:/Users/37814/Desktop/tianming/web/tm-endturn-ai.js:330)：`_callEndturnAI` 主出口。
- [web/tm-endturn-ai.js](C:/Users/37814/Desktop/tianming/web/tm-endturn-ai.js:1241)：SC_RECALL 数据路径。
- [web/tm-endturn-ai.js](C:/Users/37814/Desktop/tianming/web/tm-endturn-ai.js:1558)：`<recalled-memories>` 注入。
- [web/tm-endturn-prompt.js](C:/Users/37814/Desktop/tianming/web/tm-endturn-prompt.js:4)：主 prompt builder。
- [web/tm-prompt-composer.js](C:/Users/37814/Desktop/tianming/web/tm-prompt-composer.js:1)：共享 prompt 片段。
- [web/tm-recall-gate.js](C:/Users/37814/Desktop/tianming/web/tm-recall-gate.js:3)：recall gate。
- [web/tm-semantic-recall.js](C:/Users/37814/Desktop/tianming/web/tm-semantic-recall.js:3)：semantic recall。
- [web/tm-memory-tables.js](C:/Users/37814/Desktop/tianming/web/tm-memory-tables.js:3)：12 表记忆系统。
- [web/tm-ai-infra.js](C:/Users/37814/Desktop/tianming/web/tm-ai-infra.js:121)：TokenUsageTracker 和诊断。
- [main-impl.js](C:/Users/37814/Desktop/tianming/main-impl.js:1680)：turn-data 落盘。

最小插桩：

1. 每回合创建 `GM._turnAiResults.memoryTrace/traceId`。
2. 包住 `_callEndturnAI`，记录 subcall、model/provider、prompt hash、response hash、token、latency、错误。
3. SC_RECALL 记录 gate、query、source 候选数、top hits、score、skip reason。
4. semantic recall 保留内部 item id。
5. `<recalled-memories>` 记录 lane、source、hash、长度。
6. prompt assembly 记录段落、长度、hash、crop reason。
7. memory table ops 用 sheet key + code 追踪，不只用 rowIdx。
8. 写入 `ai-results.json`，不要只放在有容量上限的 diagnostics。

## 安全治理

参考：

- [AgentPoison](https://arxiv.org/abs/2407.12784)
- [MINJA](https://arxiv.org/abs/2503.03704)
- [Hidden in Memory](https://arxiv.org/abs/2605.15338)
- [AgentSys](https://huggingface.co/papers/2602.07398)
- [AgentSentry](https://arxiv.org/abs/2602.22724)
- [Tensor Trust](https://huggingface.co/papers/2311.01011)
- [OWASP LLM Top 10 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)

必须防：

- 记忆投毒。
- sleeper memory。
- 间接 prompt injection。
- 谣言洗白成事实。
- 旧事实复活。
- NPC 全知。
- 跨存档污染。
- 删除残留。
- AI reflection 覆盖 hard state。

## 评测体系

参考：

- [LongMemEval](https://github.com/xiaowu0162/LongMemEval)
- [LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2)
- [LoCoMo](https://github.com/snap-research/locomo)
- [STALE](https://arxiv.org/abs/2605.06527)
- [GroupMemBench](https://arxiv.org/abs/2605.14498)
- [StructMemEval](https://arxiv.org/abs/2602.11243)
- [MemoryAgentBench](https://github.com/HUST-AI-HYZ/MemoryAgentBench)
- [MRBench / MREval](https://arxiv.org/abs/2603.19313)
- [ConStory-Bench](https://picrew.github.io/constory-bench.github.io/)

10 个 smoke goldens：

1. 新诏覆盖旧诏。
2. 隐藏信息不泄露。
3. NPC 私有知识正确隔离。
4. 谣言不升事实。
5. 删除后无残留召回。
6. 错误前提抵抗。
7. 承诺召回。
8. 摘要不改数字/因果。
9. 奏疏里的 prompt injection 不变系统指令。
10. 每条注入记忆都有 source/lane/reason。

发布门禁：

- P0 失败即阻断：隐藏泄漏、跨存档污染、删除残留、旧事实当现事实、硬状态编造。
- 10 条 smoke goldens 100% 通过。
- 完整 50 条 goldens 总通过率 >= 92%，安全/边界类 >= 98%，泄漏率 0。
- hard fact trace hit >= 95%。
- no-evidence abstention >= 95%。
- stale rejection >= 95%。
- 关键数字/身份/因果摘要漂移 <= 1%。
- rumor -> fact 漂移 = 0。

## 玩家与设计者工作台

最小 IA：

- 总览。
- 待审箱。
- 记忆库。
- 设定册 / Lorebook。
- 事件账本。
- 冲突审查。
- 可见性审查。
- 注入追踪。
- 局部图谱。
- 归档/回收站。

MVP 控件：

- Accept。
- Edit。
- Merge。
- Reject。
- Pin。
- Freeze。
- Archive。
- Delete。
- Mark false。
- Supersede。
- Why-this-memory。
- Context Preview。
- Spoiler Preview。

关键 UX 原则：不要让玩家被迫当档案管理员。默认后台收集，只在高风险冲突、泄密风险、canon 变更、删除残留等场景提示。

## 本地优先实现

参考：

- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [SQLite Backup API](https://www.sqlite.org/backup.html)
- [SQLite WAL](https://www.sqlite.org/wal.html)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
- [JSON Lines](https://jsonlines.org/)
- [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [LanceDB](https://docs.lancedb.com/quickstart)
- [Qdrant local mode](https://github.com/qdrant/qdrant-client)

MVP 技术栈：

- SQLite。
- FTS5。
- JSONL。
- manifest。
- embedding worker。
- 可选 sqlite-vec。

不要第一天绑定 Qdrant、LanceDB、GraphRAG 或云 memory service。它们是规模升级，不是地基。

备份格式：

```text
memory-backup-YYYY-MM-DD.zip
  manifest.json
  memory.sqlite
  events.jsonl.gz
  blobs/
  checksums.sha256
```

## 借鉴而不绑定

参考：

- [Letta / MemGPT](https://docs.letta.com/guides/agents/architectures/memgpt)
- [Mem0](https://docs.mem0.ai/core-concepts/memory-operations)
- [OpenMemory](https://mem0.ai/openmemory)
- [Zep / Graphiti](https://www.getzep.com/platform/graphiti/)
- [LangMem](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/)
- [LlamaIndex Memory](https://docs.llamaindex.ai/en/stable/module_guides/deploying/agents/memory/)
- [CrewAI Memory](https://docs.crewai.com/concepts/memory)
- [Cognee](https://www.cognee.ai/)
- [Honcho](https://docs.honcho.dev/)
- [Supermemory](https://docs.supermemory.ai/memory-api/overview)

可借鉴：

- Letta/MemGPT 的 working context 与 archive 分层。
- Zep/Graphiti 的时态事实、事实失效、provenance、hybrid retrieval。
- LangMem 的 duration/type/scope/update/retrieval/permission 分类。
- Mem0/OpenMemory 的 add/search/update/delete UX。
- Honcho 的 peer/session 多主体边界。

不应绑定：

- hosted memory service 作为核心。
- 图数据库作为唯一真相库。
- agent framework runtime 作为游戏引擎架构根。
- 纯向量 memory。
- LLM 摘要作为 canon truth。

## 范围控制

v6 Constitution 是方向性架构约束，不应被理解为第一阶段必须完整实现的工程清单。

首轮目标：

1. 盘点当前所有 prompt 注入路径。
2. traceOnly 记录实际注入项、SC_RECALL、semantic recall。
3. 建 10 个 smoke fixtures 并捕获 baseline。
4. 做只读 Envelope facade。
5. 记录 visibility/stale/deleted/authority 的 `wouldReject`。
6. 先实装一个真实 gate：隐藏信息不得进入 NPC prompt。
7. AI 新写入先统一进 draft/quarantine。
8. 做最小 why-this-memory 面板。

如果某个治理字段无法稳定填充，就把它降级为诊断字段。半完整 metadata 不应制造虚假的安全感。

## 最终路线

推荐顺序：

1. MemoryTrace traceOnly。
2. 只读 MemoryEnvelope facade。
3. 10 个 smoke goldens 和红队基线。
4. observe-only 的 authority/visibility/stale/delete gate。
5. 最小 Memory Workshop：Injection Trace、Draft Inbox、Conflict Review。
6. 新记忆操作的 append-only event ledger。
7. WorldTruth projection 与中文历史实体/时间/官职建模。
8. MemoryWriteGate enforce。
9. RetrievalComposer enforce。
10. 最后再考虑图谱、embedding、reranker 升级。

最终目标不是“更多记忆”，而是可靠因果：系统知道发生了什么，谁知道，凭什么知道，现在还是否有效，为什么注入，以及如何纠正和删除。
