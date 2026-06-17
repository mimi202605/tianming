# AI 记忆机制第四轮 Swarm 调研与天命实施方案 v4

日期: 2026-05-31

定位: 本文是前序 v1/v2/v3 调研之后的第四轮扩展版。它综合 18 个滚动并行代理专题、主线程实时检索、论文/产品/插件交叉校验，目标不是再堆一份 bibliography，而是把学术机制、酒馆类插件经验、AI 叙事产品模式和天命当前可实现路线压成一套可执行的记忆系统升级蓝图。

## 0. 执行摘要

第四轮调研后，结论比 v3 更明确:

1. 天命的 AI 记忆不应该被定义成“更大的向量库”。
   它应该是一个带权限、时效、来源、可见性、冲突处理、审计和评测的 Memory Operating Layer。

2. 游戏记忆的第一原则是 authority before similarity。
   检索相似不代表事实有效。有效诏令、官职、地权、财政、军队、秘密信息、NPC 认知边界，必须先由结构化状态和事件账本裁决，再让语义检索补充叙事细节。

3. 酒馆类系统的真实经验是“上下文编排”，不是“模型真的记住”。
   SillyTavern World Info、Data Bank、Vector Storage、Summarize、CharMemory、MemoryBooks、Timeline Memory 等都在做同一件事: 选择哪些信息常驻、哪些由关键词触发、哪些由向量触发、哪些由摘要压缩、哪些需要用户确认。

4. 学术前沿正在从静态召回转向状态更新、隐式冲突、多方对话、经验抽象和安全治理。
   对天命最关键的不是 LoCoMo 式“问一个旧事实”，而是 STALE 式“旧事实何时失效”、GroupMemBench 式“多方谁知道什么”、Memory-Driven Role-Playing 式“长期角色一致性”、以及 memory poisoning 式“坏记忆如何进入和扩散”。

5. 最短可落地路径:
   先做 MemoryTrace 和 MemoryEnvelope 适配层，再做 10 个黄金 smoke tests，然后才扩展图谱、摘要树、多视角 NPC/faction memory。这样能把记忆系统从“感觉变好”变成“可解释、可回归、可调参”。

## 1. 本轮方法

用户要求“比上一次数量多得多，几十上百个一起工作”。平台实际并发上限为 6 个代理线程；第一次尝试一次派发 12 个时触发 `agent thread limit reached`。因此本轮采用滚动六代理波次:

- Wave 1: 6 个代理，覆盖总述分类、认知架构、Memory OS、图/时间/因果记忆、层级摘要、程序/工作流记忆。
- Wave 2: 6 个代理，覆盖多模态/空间、多代理共享记忆、长上下文边界、长期对话/角色扮演评测、stale/structured/state benchmark、安全/隐私/投毒/删除。
- Wave 3: 6 个代理，覆盖 SillyTavern 插件生态、非 SillyTavern 角色扮演产品、生产级框架、记忆可观测 UX、本地优先数据模型、天命 50 个黄金用例库。

同时主线程继续检索最新论文、官方文档、插件仓库和产品资料。最终完成 18 个专题代理，比前一轮 6 个代理扩大 3 倍，并把结果全部并入 `findings.md`。

## 2. v4 相对 v3 的关键增量

### 2.1 Memory OS 视角

v3 已提出 Memory Spine。v4 进一步把它升级为 Memory Operating Layer:

- 每条记忆都有生命周期: draft, active, stale, superseded, archived, quarantined, deleted_tombstone。
- 每条记忆都有权限和可见性: public, faction, npc_private, player_known, gm_hidden, heaven_secret。
- 每条记忆都有来源和权威: engine_state 高于 player_pin，高于 rule_validated_summary，高于 ai_extracted，高于 reflection。
- 每次读取都可追踪: query, candidates, score, rejected_reason, injected_section, token_cost。
- 每次写入都可审查: write_source, extractor_prompt, conflict_check, approval_status, audit_event。

对应学术参照:

- [Memory for Autonomous LLM Agents](https://arxiv.org/abs/2603.07670): 将 agent memory 视为 write/manage/read loop，并强调 contradiction handling、latency budget、privacy governance。
- [From Storage to Experience](https://arxiv.org/abs/2605.06716): 将记忆演进分为 Storage, Reflection, Experience，提示不要停留在轨迹保存。
- [Memory OS of AI Agent](https://arxiv.org/abs/2506.06326): 以短期、中期、长期层级存储和动态更新为核心。
- [Is Agent Memory a Database?](https://arxiv.org/abs/2605.26252): 提醒 agent memory 不是普通 record store，需要处理动态解释和行为耦合。

### 2.2 stale memory 成为一等问题

v3 已有“不要让旧摘要复活”。v4 将它提升为核心评测维度:

- 旧诏令被新诏令取代。
- 临时代理官职被正式任命覆盖。
- 传言被证据推翻。
- 私下怨恨因多次赏赐衰减或转化。
- 战报旧结论被后续兵败/捷报修正。

核心来源:

- [STALE](https://arxiv.org/abs/2605.06527): 重点不只是检索更新证据，而是能否识别旧状态已失效，并拒绝带有过时前提的问题。
- [LongMemEval](https://arxiv.org/abs/2410.10813) 与 [LongMemEval-V2](https://arxiv.org/abs/2602.14283): 长期对话评测开始关注跨会话一致性和更新。
- [StructMemEval](https://arxiv.org/abs/2501.11821): 结构化记忆能否维护复杂状态。

### 2.3 多视角记忆取代单一全知记忆

天命是策略/叙事游戏，不是单人聊天机器人。一个事实至少有五种视角:

- WorldTruthLedger: 规则层真实状态。
- PublicChronicle: 朝野公开史。
- FactionMemory: 阵营知道、相信、隐瞒、传播的内容。
- NpcPrivateMemory: 个人经历、恩怨、秘密、误解。
- RumorGraph: 来源链、传播范围、可信度、被反证记录。

对应来源:

- [GroupMemBench](https://arxiv.org/abs/2605.14498): 多方对话记忆暴露“谁说过、谁知道、群体状态如何变化”等问题。
- [Generative Agents](https://arxiv.org/abs/2304.03442): NPC 需要观察、记忆、反思和计划。
- [Memory-Driven Role-Playing](https://arxiv.org/abs/2603.19313): 角色扮演记忆不只是事实召回，还要维持角色身份、经历和关系。

### 2.4 酒馆生态的工程教训

SillyTavern 官方与插件生态给出的经验非常直接:

- [World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) 是动态 prompt dictionary，支持全局、角色、persona、chat 作用域，关键词/正则/向量激活，插入顺序和预算就是记忆行为。
- [Summarize](https://docs.sillytavern.app/extensions/summarize/) 是滚动摘要，但摘要漂移和手动编辑是常态，而不是异常。
- [CharMemory](https://github.com/bal-spec/sillytavern-character-memory) 强调结构化角色记忆、plain editable files、Injection Viewer 和 Prompt Breakdown。
- [MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/) 的价值在于“从聊天生成可检查的 lorebook memory”，不是无审查自动写入。
- [SillyTavern World Info extension index](https://sillytavern.diy/extensions/worldinfo/) 展示了排序、锁定、推荐、可视化等治理插件需求。

天命应借鉴这些“玩家可看、可改、可禁用、可追踪”的产品原则，但不能照搬“关键词触发 lorebook”作为核心事实系统。

## 3. 文献与产品证据地图

### 3.1 总述与分类

| 来源 | 对天命的价值 | 设计启发 |
|---|---|---|
| [Memory for Autonomous LLM Agents](https://arxiv.org/abs/2603.07670) | 2026 综述，覆盖机制、评测、前沿 | 用 write/manage/read loop 组织系统 |
| [From Storage to Experience](https://arxiv.org/abs/2605.06716) | 将记忆从保存推进到经验抽象 | Tianming 不止存事件，还要抽象政策/程序经验 |
| [Memory in the LLM Era](https://arxiv.org/abs/2604.01707) | 模块化统一框架 | 把记忆分成表示、管理、检索、更新 |
| [Survey on the Memory Mechanism of LLM-based Agents](https://arxiv.org/abs/2404.13501) | 较早系统综述 | 术语基线: short-term, long-term, episodic, semantic |

### 3.2 Memory OS 与生产框架

| 来源 | 对天命的价值 | 不宜照搬处 |
|---|---|---|
| [MemGPT / Letta](https://arxiv.org/abs/2310.08560) | 工作记忆 vs archival memory，工具化读写 | Tianming hard state 不能由 LLM 自由编辑 |
| [MemoryOS](https://arxiv.org/abs/2506.06326) | 短中长期层级更新 | 对游戏 authority/visibility 不够 |
| [MemOS](https://arxiv.org/abs/2506.21605) | memory as OS resource | 可借鉴资源管理，不直接替代 game state |
| [Mem0 / OpenMemory](https://mem0.ai/openmemory) | 用户可见的记忆、访问日志、MCP 接口 | SaaS/个人助手模型不是游戏核心 |
| [Zep / Graphiti](https://www.getzep.com/platform/graphiti/) | temporal knowledge graph，旧事实失效但保留 | 图谱可借鉴，但需本地优先 |
| [Cognee](https://www.cognee.ai/) | graph/vector/relational + provenance | 可作为本地控制面参考 |
| [CrewAI Memory](https://docs.crewai.com/en/concepts/memory) | unified memory API, adaptive recall | 适合 API 形态，不够游戏规则权威 |
| [LlamaIndex Memory](https://docs.llamaindex.ai/en/stable/module_guides/deploying/agents/memory/) | FIFO flushing into long-term blocks | 可借鉴 L1/L2 刷新，不够多视角 |

### 3.3 图、时间、因果与空间

| 来源 | 对天命的价值 | 设计启发 |
|---|---|---|
| [HippoRAG](https://arxiv.org/abs/2405.14831) / [HippoRAG 2](https://arxiv.org/abs/2502.14802) | 图检索与关联传播 | 事件、人物、地域、派系多跳 |
| [AriGraph](https://arxiv.org/abs/2407.04363) | text adventure 记忆图 | NPC 行动和环境变化可图化 |
| [MAGMA](https://arxiv.org/abs/2601.03236) | multi-graph memory | 多图适合天命: state/event/belief/rumor |
| [Timeline Memory](https://arxiv.org/abs/2406.10996) | 时间线章节化 | 战役、朝代、政策阶段摘要 |
| [BOOKMARKS](https://arxiv.org/abs/2605.14169) | active storyline anchors | 主线、伏笔、未决承诺应被锚定 |
| [MemEye](https://arxiv.org/abs/2605.15128) | 多模态长期记忆 | 暂作为地图/截图证据，不做第一期核心 |

### 3.4 摘要、压缩与经验抽象

| 来源 | 对天命的价值 | 风险 |
|---|---|---|
| [ReadAgent](https://arxiv.org/abs/2402.09727) | 分段阅读和记忆压缩 | 摘要不能覆盖源事件 |
| [MemoRAG](https://arxiv.org/abs/2409.05591) | memory-augmented RAG | 仍需 authority gate |
| [PlugMem](https://arxiv.org/abs/2603.03296) | 从 episodic 经验抽象 propositional/prescriptive memory | 适合程序性经验 |
| [EvolveMem](https://huggingface.co/papers/2605.13941) | 记忆自演化 | 天命需先有 goldens 再允许自动演化 |
| [FORGE](https://papers.cool/arxiv/2605.16233) | 从失败中提炼工作流 | 可做低权威策略建议 |

### 3.5 评测与安全

| 来源 | 对天命的价值 | 需要转化成的测试 |
|---|---|---|
| [GroupMemBench](https://arxiv.org/abs/2605.14498) | 多人/多方会话记忆 | 谁知道什么、何时知道、能否泄密 |
| [Memory-Driven Role-Playing](https://arxiv.org/abs/2603.19313) | 角色扮演长期记忆 | NPC 人设、关系、经历、行为适配 |
| [STALE](https://arxiv.org/abs/2605.06527) | stale memory 识别 | 新诏令覆盖旧诏令、谣言被证伪 |
| [MemoryAgentBench](https://openreview.net/pdf?id=DT7JyQC3MR) | 分块多轮 agent memory 评测 | 不把全历史塞进 prompt |
| [Hidden in Memory](https://arxiv.org/abs/2605.15338) | sleeper memory poisoning | 低信任来源不得写入高权威记忆 |
| [Unveiling Privacy Risks in LLM Agent Memory](https://aclanthology.org/2025.acl-long.1227/) | memory extraction/privacy | NPC 私密、天机、跨存档隔离 |

## 4. 天命 Memory Operating Layer v4

### 4.1 记忆宪法

天命记忆系统应遵守以下规则:

1. 结构化状态优先于生成式摘要。
2. 新的有效状态可以使旧记忆失效，但不得抹掉源事件。
3. 每条记忆必须有 sourceRefs，可追溯到事件、消息、诏令、战报、系统状态或人工钉选。
4. NPC 只能读取其视角可见的记忆。
5. AI 生成记忆默认是 draft，不能直接成为 hard state。
6. 高影响行动必须输出引用过的 memoryId 和 stateId。
7. 删除不是只删文本，还要处理摘要、向量、图边、缓存和 prompt 注入残留。
8. 检索结果必须有 rejected_reason，否则无法调试。
9. 任何“经验/策略记忆”都是建议，不得覆盖规则裁决。
10. 记忆系统必须先通过 goldens，再扩展自动反思、自演化和复杂图推理。

### 4.2 MemoryEnvelope v4

建议所有记忆都经过统一 envelope，即使底层仍保留现有表。

```yaml
MemoryEnvelope:
  id: mem_...
  runId: save_or_campaign_id
  worldId: world_or_scenario_id
  turn: 128
  sceneId: optional_scene

  kind:
    - hard_state
    - canon
    - episodic
    - commitment
    - belief
    - relationship
    - faction
    - public_chronicle
    - rumor
    - foreshadow
    - reflection
    - procedural
    - spatial_resource
    - quarantine

  lane: prompt_budget_lane
  scope: global | save | faction | npc | party | scene | player
  ownerKind: world | faction | npc | player | system
  ownerId: optional_entity_id

  authority: engine_state | system_rule | player_pin | designer_seed | rule_validated_summary | ai_extracted | reflection | external_import
  visibility: public | faction_private | npc_private | player_known | gm_hidden | heaven_secret
  audience: [entity_or_role_ids]
  accessPolicy: policy_id
  sensitivity: normal | private | secret | heaven

  status: draft | active | stale | superseded | archived | quarantined | deleted_tombstone
  validFromTurn: optional
  validToTurn: optional
  learnedAtTurn: optional
  expiredAtTurn: optional
  systemTime: optional_calendar_time

  sourceRefs:
    - type: event | message | edict | battle_report | table_row | summary | player_edit
      id: source_id
      span: optional
      hash: content_hash

  confidence: 0.0_to_1.0
  trust: 0.0_to_1.0
  importance: 0.0_to_1.0
  salience: dynamic_score
  decay: policy_or_score
  reinforcement: count_or_score

  entities: [entity_ids]
  locations: [location_ids]
  factions: [faction_ids]
  tags: [strings]
  graphEdges:
    - src: entity_id
      type: relation_type
      dst: entity_id
      status: active_or_stale

  promptPolicy:
    defaultInject: never | query_only | pinned | always
    maxTokens: optional
    section: hard_state | memory | author_note | evidence | hidden
    priority: number

  lifecyclePolicy:
    canAutoWrite: boolean
    requiresReview: boolean
    canSupersede: boolean
    retention: keep | archive | ttl | delete_on_request

  audit:
    createdBy: system | player | npc_ai | summarizer | extractor
    createdAt: timestamp
    updatedAt: timestamp
    lastInjectedAt: optional
    lastDecision: optional
```

### 4.3 记忆分层

| 层 | 内容 | 写入方式 | 检索方式 | prompt 权限 |
|---|---|---|---|---|
| L0 Current State | 当前有效诏令、官职、资源、地权、军队 | 规则系统 | 直接查询 | 最高 |
| L1 Event Ledger | 逐回合事件、消息、战报、命令 | append-only | 时间/实体/FTS | 证据 |
| L2 Derived Facts | 从事件抽取的事实、关系、承诺 | 规则+审核 | FTS+graph+semantic | 中高 |
| L3 Summaries | 场景/战役/朝代/人物摘要 | AI draft -> 审核 | hierarchical | 中 |
| L4 Beliefs | NPC/派系知道或相信什么 | 视角传播 | scope+graph | 视角限定 |
| L5 Reflections | 低权威反思、策略经验、程序记忆 | AI draft | query+rerank | 建议 |
| L6 Quarantine | 冲突、投毒、低信任来源 | 自动隔离 | 默认不注入 | 禁止 |

### 4.4 多视角模型

```text
WorldTruthLedger
  -> PublicChronicle
  -> FactionMemory[factionId]
  -> NpcPrivateMemory[npcId]
  -> RumorGraph
  -> PlayerNotebook
```

同一事件的不同派生:

- 真实事件: 皇帝秘密下诏免除某地三年赋税。
- 公开史: 朝廷未公布具体原因，只说“体恤灾民”。
- 地方官私记: 知道诏令，但不知道皇帝和户部争执。
- 敌对派系: 听到风声，认为这是收买边军。
- 民间谣言: “某王将反，所以朝廷让税”。
- 玩家笔记: 认为这是后续财政危机伏笔。

这要求检索阶段先回答: asker 是谁、可见范围是什么、当前问题是否允许泄露隐层。

## 5. Retrieval Composer v4

### 5.1 查询流程

建议流程:

1. Build actor scope:
   确定当前 AI 子调用是谁在说话、代表谁、可访问哪些记忆。

2. Resolve hard state:
   先查当前有效状态和规则约束，例如诏令、官职、地权、资源、关系硬约束。

3. Query plan:
   根据任务类型选择检索路线: edict, relationship, rumor, spatial, procedural, narrative, hidden_guard。

4. Exact/entity retrieval:
   用 entityId、locationId、edictId、officeId、factionId 等精确索引。

5. Temporal/graph retrieval:
   查因果链、前后状态、谁传播给谁、谁见证过。

6. FTS/BM25 retrieval:
   用关键词和中文分词/bi-gram 搜索旧事件、摘要、表项。

7. Semantic retrieval:
   仅作为补充候选，不可越过 authority/status/visibility gate。

8. Rerank:
   综合 authority, recency, validity, importance, salience, entity match, graph distance, source trust。

9. Budget composer:
   按 lane 组装 prompt: hard constraints, active commitments, evidence snippets, optional narrative memory。

10. Trace:
   输出 MemoryTrace，包括命中、拒绝、注入、token、最终 prompt section。

### 5.2 评分建议

```text
score =
  authority_weight
  + validity_weight
  + entity_match
  + temporal_relevance
  + graph_distance_bonus
  + semantic_similarity
  + importance
  + reinforcement
  - stale_penalty
  - low_trust_penalty
  - leakage_penalty
  - token_cost_penalty
```

硬规则:

- `status in [stale, superseded, deleted_tombstone]` 默认不能作为当前事实注入，只能作为历史证据。
- `visibility` 不满足时不能注入，即使 similarity 很高。
- `authority=ai_extracted` 且未审核时不能覆盖 `engine_state`。
- `rumor` 不能升级成 `hard_state`，除非有规则事件或人工确认。

## 6. Memory Observatory

天命已经有 Ctrl+M 记忆面板基础。v4 建议升级成 Memory Observatory。

### 6.1 面板模块

| 模块 | 用户看到什么 | 设计价值 |
|---|---|---|
| Injection Viewer | 本轮到底哪些记忆进了 prompt | 解决“AI 为什么知道/不知道” |
| Prompt Itemization | 各 lane token 占用 | 解决预算失控 |
| Retrieval Trace | 候选、评分、拒绝原因 | 解决调参黑箱 |
| Memory Inspector | 按 kind/status/visibility/authority/source 过滤 | 解决手动修正 |
| Draft Inbox | AI 新提取记忆待批准 | 防止自动污染 |
| Graph Visualizer | 人物/派系/事件/承诺关系图 | 解决多跳和视角 |
| Audit Log | 读写改删、注入、隔离、删除证明 | 解决回归和信任 |

### 6.2 MemoryTrace JSON

第一期最值得先做的是 Trace，而不是立刻大改检索算法。

```json
{
  "requestId": "recall_20260531_001",
  "turn": 128,
  "subcall": "npc_advice",
  "actorScope": {
    "speaker": "npc_zhang",
    "faction": "faction_hubu",
    "visibility": ["public", "faction_private"]
  },
  "queryPlan": ["hard_state", "edict", "relationship", "semantic"],
  "candidates": [
    {
      "memoryId": "mem_001",
      "kind": "edict",
      "status": "active",
      "score": 0.92,
      "reasons": ["entity_match", "active_state", "high_authority"]
    }
  ],
  "rejected": [
    {
      "memoryId": "mem_077",
      "reason": "visibility_denied"
    }
  ],
  "injected": [
    {
      "memoryId": "mem_001",
      "section": "hard_state",
      "tokens": 74
    }
  ],
  "budget": {
    "total": 1800,
    "used": 914,
    "byLane": {
      "hard_state": 210,
      "evidence": 420,
      "narrative": 284
    }
  }
}
```

## 7. 本地优先数据模型

Agent 17 的结论很实用: 天命不要把核心记忆托管到 SaaS。推荐:

- SQLite + FTS5 作为桌面/本地权威存储。
- IndexedDB 作为 Web/hot-update 环境的大对象和缓存层。
- JSONL append-only ledger 作为审计、回放、恢复和 debug 证据。
- 向量、FTS、RTree、图边都是 derived artifacts，可重建，不应是唯一真相。

核心表建议:

```sql
schema_migrations
save_slots
event_log
command_log
snapshots
entities
relations
memory_items
memory_edges
memory_entities
embeddings
geo_maps
geo_regions
geo_edges
memory_audit_events
memory_trace_events
```

关键索引:

- `event_log(run_id, turn, seq)` 唯一。
- `memory_items(run_id, kind, status, visibility, valid_from_turn, valid_to_turn)`。
- `memory_entities(entity_id, memory_id)`。
- `relations(src_id, relation_type, dst_id, status)`。
- FTS5 对 memory/event/lore 的中文 search_text。
- RTree 对地域、路线、战区、资源点。
- embedding 表按 model_id/text_hash 去重。

## 8. 50 个黄金用例库

第四轮代理已给出 50 个黄金场景。v4 建议先实现 10 个 smoke cases，再扩到 50 个。

### 8.1 统一格式

```yaml
GoldenCase:
  id: tm_mem_g02
  category: edict
  setup_turns:
    - turn: 1
      event: old_edict
      visibility: public
    - turn: 5
      event: new_edict_supersedes_old
      visibility: public
  actor: npc_minister
  query_or_action: advise_tax_policy
  expected:
    - uses_new_edict
    - mentions_old_edict_only_as_history
    - cites_memory_ids
  forbidden:
    - treats_old_edict_as_current
    - leaks_hidden_reason
  metrics:
    - CSA
    - SR
    - TR
    - LEAK
```

### 8.2 第一批 10 个 smoke cases

| ID | 类型 | 测什么 |
|---|---|---|
| G02 | 诏令更新 | 新诏令覆盖旧诏令，旧诏令只能作为历史 |
| G06 | 代理官职 | acting office 与正式官职区别 |
| G11 | 地权转移 | de jure / de facto 控制分离 |
| G16 | 阵营联盟 | 旧联盟因背叛失效 |
| G22 | 秘密会议缺席 | NPC 不知道未参加的密议 |
| G27 | 谣言证伪 | 谣言可追溯但不能当事实 |
| G33 | 程序记忆 | 成功流程可作为低权威建议 |
| G36 | 隐藏状态 | 天机/GM truth 不泄露给 NPC |
| G42 | 删除残留 | 删除后摘要/向量/图边不再注入 |
| G50 | L1/L2/L3 冲突 | 源事件、派生事实、摘要冲突时源事件优先 |

### 8.3 指标

- CSA: current state accuracy，当前状态是否正确。
- SR: stale rejection，能否拒绝过时前提。
- KB: knowledge boundary，角色是否只知道该知道的。
- TR: traceability，输出是否能引用 memoryId/sourceRef。
- LEAK: 机密泄露率。
- ADAPT: 行为是否因记忆变化而调整。
- SUM: 摘要保真度。
- SAFE: 投毒、越权、删除、跨存档隔离。
- LAT/TOK: 延迟和 token 成本。

## 9. 实施路线

### Phase A: 观测先行

目标: 不改变 AI 行为，只记录。

- 增加 MemoryTrace JSON。
- 在现有 recall/composer 入口记录候选、拒绝、注入和 token。
- Ctrl+M 面板增加“本轮 prompt 记忆”视图。
- 输出 10 个 smoke cases 的当前 baseline。

完成标准:

- 每个 AI 子调用都有 requestId。
- 能看到“为什么这个记忆进了 prompt”。
- 能看到“为什么某条记忆被拒绝”。

### Phase B: Envelope 适配层

目标: 不重写现有表，先把现有记忆包装成统一 envelope。

- 为事件、摘要、锚点、承诺、semantic recall 结果生成 envelope view。
- 添加 status/authority/visibility/sourceRefs 字段。
- 对 AI 生成摘要默认标为 draft 或 rule_validated_summary。
- 对 hard state 显式标 engine_state。

完成标准:

- 检索 composer 不再直接消费裸字符串。
- 所有注入项都有 memoryId/sourceRefs/authority/visibility。

### Phase C: 黄金测试

目标: 把记忆优化变成可回归工程。

- 实现 G02/G06/G11/G16/G22/G27/G33/G36/G42/G50。
- 禁止 full-history prompt stuffing。
- 输出 trace 和 expected/forbidden 对比。

完成标准:

- 每次改检索、摘要、prompt 预算都能跑 smoke。
- 至少覆盖 stale、visibility、source trace、summary drift。

### Phase D: 写入治理

目标: 防止 AI 自己污染记忆。

- 增加 MemoryWriteQueue。
- AI extracted/reflection 默认进入 Draft Inbox。
- hard-state conflict、低 trust、隐藏权限不明、疑似 prompt injection 进入 Quarantine。
- 玩家/设计者可 accept/edit/merge/demote/delete。

完成标准:

- 任何自动提取记忆都不能直接变成高权威事实。
- 所有写入都有审计事件。

### Phase E: 图谱与多视角

目标: 让事件、人物、派系、地点、资源、谣言可以多跳追溯。

- Event-Actor-Faction-Location-Item-Resource graph。
- WorldTruthLedger/PublicChronicle/FactionMemory/NpcPrivateMemory/RumorGraph。
- learned_at、valid_from、valid_to、source chain、propagation path。

完成标准:

- 能回答 whoKnows / whoBelieves / whyBelieves / whatChanged / whatIsCurrent。
- NPC 不再全知，也不再无记忆。

### Phase F: L1/L2/L3 档案树

目标: 长期剧情不靠一条滚动摘要撑住。

- L1: 原始事件。
- L2: 场景/章节摘要。
- L3: 战役/朝代/人物长期档案。
- 每个摘要必须链接源事件和 invalidation notes。
- 主线/伏笔用 BOOKMARKS 式 active storyline anchors 固定。

完成标准:

- 摘要可展开到源事件。
- 摘要过期不会覆盖当前状态。

### Phase G: 本地存储升级

目标: 性能、回放、隐私和离线稳定。

- SQLite/FTS5 或现有存储上的等价封装。
- JSONL hash chain event ledger。
- 向量缓存可重建。
- 删除流程覆盖 text/summary/vector/graph/cache。

完成标准:

- 记忆存储可备份、迁移、回放、审计。
- 本地运行不依赖外部记忆 SaaS。

## 10. 设计红线

不要做:

- 不要把所有东西丢进一个向量库，然后相信 similarity。
- 不要让 AI 摘要覆盖规则状态。
- 不要让 NPC 读取全局上帝视角。
- 不要让自动反思直接写高权威记忆。
- 不要在没有 trace 的情况下调 prompt。
- 不要在没有 goldens 的情况下引入自演化记忆。
- 不要把删除理解为删除一条文本。
- 不要把“用户觉得更会记”当成唯一评测。

可以做:

- 先做 MemoryTrace。
- 先做 envelope view。
- 先做 10 个 smoke goldens。
- 先把 AI 写入变成 draft。
- 先让玩家/设计者看见注入内容。
- 先把 stale/visibility/sourceRefs 放进每条记忆。

## 11. 最终建议

天命下一步不应直接进入“换一个记忆算法”。正确顺序是:

1. 给现有系统装上 MemoryTrace。
2. 用 MemoryEnvelope 统一现有事件、摘要、锚点、承诺和语义召回。
3. 跑 10 个黄金用例，量化当前失败点。
4. 引入 Draft Inbox/Quarantine，阻止自动写入污染。
5. 再扩展多视角图谱、摘要树、程序记忆和空间资源记忆。

这一顺序能最大程度保留天命现有 AI 管线，同时把未来的记忆优化从“凭感觉”变成可观测、可回归、可审计、可玩家修正的系统工程。

## 12. 参考入口

- [Memory for Autonomous LLM Agents](https://arxiv.org/abs/2603.07670)
- [From Storage to Experience](https://arxiv.org/abs/2605.06716)
- [Memory OS of AI Agent](https://arxiv.org/abs/2506.06326)
- [STALE](https://arxiv.org/abs/2605.06527)
- [GroupMemBench](https://arxiv.org/abs/2605.14498)
- [Memory-Driven Role-Playing](https://arxiv.org/abs/2603.19313)
- [Hidden in Memory](https://arxiv.org/abs/2605.15338)
- [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)
- [SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/)
- [SillyTavern MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/)
- [CharMemory](https://github.com/bal-spec/sillytavern-character-memory)
- [NovelAI Story Settings](https://docs.novelai.net/en/text/editor/storysettings/)
- [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/)
- [KoboldAI Memory / Author's Note / World Info](https://github-wiki-see.page/m/KoboldAI/KoboldAI-Client/wiki/Memory%2C-Author%27s-Note-and-World-Info)
- [CrewAI Memory](https://docs.crewai.com/en/concepts/memory)
- [Cognee](https://www.cognee.ai/)
- [Zep Graphiti](https://www.getzep.com/platform/graphiti/)
