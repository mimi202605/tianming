# 天命 AI 记忆系统研究与架构规划

日期：2026-05-31

范围：AI Agent 记忆机制论文、酒馆/角色扮演记忆插件、天命现有记忆实现盘点、后续优化路线。

## 总结

天命不应该把记忆系统简单替换成“一个向量库”或“更长的 prompt”。现有代码已经有不少好东西：12 张结构化记忆表、事件权重和未来约束、皇命专用表、记忆锚点、L1/L2/L3 分层压缩、回合后自省、SC_RECALL、本地中文语义召回、NPC 识别状态、外部适配器、调试 UI 和烟测。

下一步最值得做的是统一这些能力，形成一条“记忆主干”：用一个通用记忆包络和生命周期，把确定性状态、事件账本、人物/势力信念、承诺、史料、伏笔、语义召回、自省、UI 可视化连起来。

核心原则：记忆不是仓库，而是一条流水线。

```text
观察 -> 写入/抽取 -> 合并/压缩 -> 检索/排序 -> 注入 prompt -> 评估 -> 修订
```

每一阶段都要保留来源、置信度、可见性和修改痕迹。

## 一、论文综述结论

### 1. Agent 记忆必须分类型

当前论文最一致的结论是：不能用一个“长文本记忆”装所有东西。

- 语义记忆：稳定世界事实、人物档案、制度、地图、设定、史实。
- 情景记忆：某回合发生的事件、密谈、承诺、背叛、诏令执行结果。
- 程序记忆：可复用策略、行动模板、外交套路、失败教训。
- 工作记忆：本次推演真正注入 prompt 的小集合。

主要来源：[Generative Agents](https://arxiv.org/abs/2304.03442)、[Memory Matters](https://ojs.aaai.org/index.php/AAAI-SS/article/view/27688)、[A Survey on the Memory Mechanism of LLM Agents](https://arxiv.org/abs/2404.13501)、[From Human Memory to AI Memory](https://arxiv.org/abs/2504.15965)。

映射到天命：

- `tm-memory-tables.js` 已经覆盖大量语义记忆和当前状态记忆。
- `eventHistory`、ChronicleTracker、shijiHistory、foreshadows 是情景记忆。
- `_aiReflections`、势力弧线、未来可以抽出的政策模板可成为程序记忆。
- `buildTablesInjection`、`SC_RECALL`、prompt composer 构成工作记忆。

### 2. 长上下文不能替代记忆系统

长上下文模型仍然会漏掉埋在中间的信息，也不擅长处理时间更新、多跳关系和互相矛盾的旧事实。天命的历史模拟恰好全是这类问题：旧诏令、后续影响、势力旧怨、隐藏承诺、政策反转。

主要来源：[Lost in the Middle](https://arxiv.org/abs/2307.03172)、[RULER](https://arxiv.org/abs/2404.06654)、[U-NIAH](https://arxiv.org/abs/2503.00353)、[LongMemEval](https://arxiv.org/abs/2410.10813)、[LoCoMo](https://arxiv.org/abs/2402.17753)。

设计含义：

- 当前事实和硬约束要放在模型最可靠的 prompt 位置。
- 旧证据通过检索进入，但不能盲信 top-k。
- prompt 内部必须有按记忆类型划分的预算。

### 3. 写入时就要组织记忆

MemGPT、MemoryBank、Zep、Mem0、A-MEM 都指向同一件事：记忆不能等到检索时才临时整理。事件发生时就应记录类型、主体、时间、重要性、可见性、置信度和关联对象。

主要来源：[MemGPT](https://arxiv.org/abs/2310.08560)、[MemoryBank](https://arxiv.org/abs/2305.10250)、[Zep](https://arxiv.org/abs/2501.13956)、[Mem0](https://arxiv.org/abs/2504.19413)、[A-MEM](https://arxiv.org/abs/2502.12110)。

映射到天命：

- `sc1q` 已经在主推演前抽取对话承诺。
- `MemTables.applyAIOps` 已经能接收结构化 AI 表格编辑。
- post-turn jobs 已经能做摘要、自省和势力弧线。

下一步是把这些写入统一到 `MemoryWriteQueue` 或等价的门面，而不是让各系统各写各的。

### 4. 策略游戏需要图结构，不只是向量相似度

天命需要处理的是关系链：

- 官员 -> 势力 -> 政策 -> 省份 -> 民变
- 诏令 -> 执行者 -> 截止期 -> 失败 -> 处罚
- 私下承诺 -> NPC 信念 -> 阵营反应 -> 后续背叛

主要来源：[HippoRAG](https://arxiv.org/abs/2405.14831)、[Zep](https://arxiv.org/abs/2501.13956)、[A-MEM](https://arxiv.org/abs/2502.12110)、[StructMemEval](https://arxiv.org/abs/2602.11243)。

天命表格系统里已经有 supersedes、contradicts、continues、elaborates 这类关系辅助逻辑。优化方向不是推倒重来，而是把这些关系提升为可检索、可展示、可测试的一等记忆图。

### 5. 酒馆生态最重要的启发是“可控”和“可看见”

SillyTavern 及其插件不一定有学术形式化，但非常接近真实角色扮演玩家的需求。

- World Info/Lorebook：关键词、正则或向量触发的动态 prompt 插入。
- Data Bank：按全局、角色、聊天作用域组织的文档 RAG。
- Chat Vectorization：召回旧消息，但官方也提醒不保证更好。
- Summarize：摘要有价值，但会遗漏和幻觉，需要用户监控。
- CharMemory：定期抽取关系、事件、事实、情绪，写入可编辑 markdown，再由向量检索注入。
- MemoryBooks：把场景和事件转成 chat-bound lorebook 记忆。
- MessageSummarize：逐消息摘要，区分短期和长期，审计性更好。

主要来源：[SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)、[Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/)、[Chat Vectorization](https://docs.sillytavern.app/extensions/chat-vectorization/)、[Summarize](https://docs.sillytavern.app/extensions/summarize/)、[CharMemory](https://github.com/bal-spec/sillytavern-character-memory)、[MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/blob/main/readme.md)、[MessageSummarize](https://github.com/qvink/SillyTavern-MessageSummarize)。

对天命的启发：

- 必须展示“本次注入了哪些记忆、为什么注入、消耗多少 token”。
- 必须支持钉住、编辑、隐藏、归档、标记错误、设为覆盖旧记忆。
- 玩家/作者锁定的事实要和 AI 摘要严格分开。

## 二、天命现有实现盘点

### 已经很有价值的部分

- `web/tm-memory-tables.js`：12 张结构化记忆表，包含当前局势、在朝 NPC、角色档案、进行中诏令、特殊手段、重要物品、组织、地点、重大事件简表、加权事件历史、关系网、皇命专用表。
- `eventHistory`：append-only，包含回合、事件描述、权重、维度标签、关联人物、未来约束，可通过 `buildFutureConstraints()` 注入后续推演。
- `imperialEdict`：玩家钉住的皇命专用记忆，支持隐藏天机和只读约束。
- `tm-memory-anchors.js`：记忆锚点、执行约束、玩家决策、角色弧线、记忆归档、L1/L2/L3 新鲜度维护。
- `tm-post-turn-jobs.js`：每 5 回合 L2 AI 摘要、约 30 回合 L3 压缩、预测与实际对照自省、势力长期弧线。
- `tm-endturn-ai.js`：`sc0.memoryQueries` 规划召回，`SC_RECALL` 从 NPC、编年、史记、伏笔、语义索引检索，`sc05` 做记忆回顾，`sc1q` 抽取对话承诺。
- `tm-semantic-recall.js`：使用 `bge-small-zh-v1.5` 做本地中文语义召回，索引 shijiHistory、ChronicleTracker、foreshadows、12 表 eventHistory。
- `tm-recall-gate.js`：默认全量召回，只有 `P.conf.recallGateEnabled === true` 时才节流。
- `tm-memory-ui.js`：已有记忆表调试 UI、皇命编辑、行锁、语义检索开关。
- `tm-memory-adapter.js`：外部读写统一走 `MemTables.applyAIOps`，这是未来插件/工具接入的好入口。
- `tm-prompt-composer.js`：NPC recognitionState 注入，能表达熟悉度、最近事件、情绪、来源和历史。
- Godot 外交层：`diplomacy_memory` 已记录续约、毁约等记忆，测试证明毁约会影响后续势力策略。
- 现有烟测：覆盖 memory read contract、召回兼容、诊断 UI、Phase 4 memory merge 等关键面。

### 主要缺口

- 记忆源很多，但没有统一包络：表格、锚点、NPC 记忆、语义索引、编年、史记、伏笔、Godot 外交记忆仍像多个孤岛。
- 检索有诊断，但还不够产品化：需要展示来源、分数、原因、prompt lane、token 成本、冲突状态、模型是否使用。
- 关系图还没有成为主要检索通道，更多还是辅助逻辑。
- AI 摘要需要保留来源链接，否则 L2/L3 久了会漂移。
- prompt 预算还应按记忆类型细分，避免低价值旧记忆挤掉硬约束。
- 隐藏信息需要成为记忆字段：玩家可见、GM 可见、NPC 已知、势力已知、公开、天机隐藏不能混在一起。

## 三、推荐架构：Memory Spine

### 1. 统一记忆包络

先不迁移物理存储，只做投影层。每个记忆项都投影成统一结构：

```ts
type MemoryKind =
  | "canon"
  | "state"
  | "event"
  | "commitment"
  | "belief"
  | "relationship"
  | "foreshadow"
  | "reflection"
  | "procedure"
  | "resource";

type MemoryEnvelope = {
  id: string;
  kind: MemoryKind;
  text: string;
  entities: string[];
  factions: string[];
  places: string[];
  turn?: number;
  year?: number;
  month?: number;
  source: {
    system: "table" | "anchor" | "chronicle" | "shiji" | "npc" | "semantic" | "godot" | "manual";
    ref: string;
  };
  visibility: "public" | "player_only" | "gm_only" | "npc_known" | "faction_known" | "hidden";
  confidence: number;
  importance: number;
  recency: number;
  polarity?: number;
  expiresAtTurn?: number;
  status: "active" | "archived" | "superseded" | "contradicted" | "deleted";
  links: Array<{
    type: "supersedes" | "contradicts" | "continues" | "elaborates" | "causes" | "mentions";
    targetId: string;
    confidence: number;
  }>;
  audit: {
    createdBy: "engine" | "ai" | "player" | "import";
    createdAt: number;
    promptId?: string;
    checksum?: string;
  };
};
```

第一阶段只需做“投影”，不需要把旧 save 全迁移。

### 2. 记忆分道

把记忆按用途分 lane，每个 lane 单独预算、排序、注入。

- 硬状态：当前游戏状态、活跃诏令、活跃承诺、引擎确定事实。
- 设定/锁定事实：场景 lore、玩家锁定设定、皇命、只读表格项。
- 事件账本：eventHistory、史记、编年、NPC 对话、势力行动。
- 信念层：每个 NPC/势力知道什么、误会什么、怨恨什么、期待什么。
- 关系图：人物、势力、地点、政策、事件之间的边。
- 自省层：失败教训、预测偏差、策略反思。
- 程序层：可复用政策模板、外交策略、危机处理套路。

硬状态和锁定事实永远高于 AI 摘要和向量召回。

### 3. 写入流水线

每回合建议按这个顺序写记忆：

1. 从引擎和 UI 输入确定性捕获。
2. 从对话、奏疏、朝议、密召抽取结构化承诺。
3. 用 AI 补充软事实：情绪、信念、暗线、伏笔、人物关系变化。
4. 和现有记忆做冲突检测。
5. 建立人物/势力/地点/政策/事件链接。
6. 生成带来源的 L2/L3 摘要。
7. 更新语义索引和关系图索引。

优先落地点：

- 增加 `MemoryWriteQueue.enqueue(envelopeDraft)` 和 `MemoryWriteQueue.flush()`。
- 先让 `sc1q`、`MemTables.applyAIOps`、post-turn summaries、Godot diplomacy memory 通过这个门面。
- 旧存储继续保留，降低风险。

### 4. 检索流水线

建议的读取顺序：

1. 查询规划：沿用 `sc0.memoryQueries`，但规范化成实体、时间范围、目标、记忆类型、可见性范围。
2. 确定性读取：活跃诏令、活跃承诺、当前状态、锁定事实、相关 NPC/势力状态。
3. 词法/实体检索：精确人名、别名、事件编码、地点、官职。
4. 图扩展：一跳为主，必要时二跳。
5. 语义召回：中文 embedding top-k，适合旧事件和模糊描述。
6. 重排：综合来源权威、相关性、重要性、时效、置信度、目标贴合、冲突状态。
7. 去重与冲突处理。
8. 按 lane 和 token 预算打包注入。

第一版可用的重排权重：

- 来源权威：0.25
- 查询/实体相关性：0.25
- 重要性/未来约束：0.18
- 时效/时间范围匹配：0.12
- 语义相似度：0.10
- 置信度：0.07
- 多样性/冲突覆盖：0.03

后续用天命自己的黄金用例调参。

### 5. Prompt 注入格式

建议稳定成分区 XML 风格：

```text
<memoryWorkingSet turn="T123">
  <hardState budget="...">...</hardState>
  <activeCommitments budget="...">...</activeCommitments>
  <canonAndLocks budget="...">...</canonAndLocks>
  <retrievedEvents budget="...">...</retrievedEvents>
  <npcFactionBeliefs budget="...">...</npcFactionBeliefs>
  <reflections budget="...">...</reflections>
  <conflictsAndSuperseded budget="...">...</conflictsAndSuperseded>
</memoryWorkingSet>
```

每条注入项携带紧凑来源 ID：

```text
[M:event:T87:eh-023 score=0.81 src=eventHistory why=edict_deadline]
```

这样后续诊断和模型输出检查能知道“这条记忆从哪来、为什么进来、模型有没有用”。

### 6. Memory Inspector

在现有 `MemoryUI` 基础上增加面向设计者/高级玩家的检查器：

- Query：AI 本轮问了哪些记忆问题。
- Retrieved：候选记忆、来源、类型、分数、原因、年龄、置信度、可见性。
- Injected：进入了哪个 prompt lane、token 估算、最终文本。
- Used：模型输出是否引用了记忆 ID 或相关实体。
- Actions：钉住、编辑、隐藏、归档、覆盖旧记忆、标记错误、提升为设定。

这会让记忆系统从黑箱变成可维护系统。

## 四、评测计划

### 黄金场景

建议先做小而稳的 fixtures：

- 旧诏令召回：20 回合前的诏令必须约束新事件。
- 政策反转：后来的诏令覆盖旧政策，AI 不应继续执行旧政策。
- 破约记忆：NPC/势力因旧承诺破裂产生后续反应。
- 隐藏信息：NPC prompt 不应看到玩家专属或天机隐藏记忆。
- 矛盾事实：两条记录冲突时，AI 应说明不确定或偏向高权威来源。
- 无证据：没有记忆支撑时，AI 应拒绝编造。
- 多跳关系：官员 -> 势力 -> 省份 -> 民变必须能连起来。

### 指标

- 召回精度：注入的记忆是否真的相关。
- 召回覆盖：黄金记忆是否被找回。
- prompt 成本：各 lane token 消耗。
- 摘要漂移：L2/L3 说法是否仍由原事件支撑。
- 冲突安全：被覆盖/矛盾事实是否没有当成活跃事实。
- 延迟：post-turn jobs 和检索阶段增加了多少时间。
- 用户修正率：玩家/设计者编辑、删除、钉住记忆的频率。

### 回归测试

保留并扩展现有测试：

- `web/scripts/smoke-memory-read-contract.js`
- `web/scripts/smoke-phase4-memory-merge.js`
- Godot diplomacy commitment memory tests

新增测试方向：

- 各存储源投影成统一 envelope。
- 可见性过滤。
- 检索 trace 生成。
- prompt budget packing。
- supersede/contradict 选择。
- semantic recall 模型未加载时不阻塞。

## 五、路线图

### Phase 0：基线和不变量

- 固化当前记忆行为烟测。
- 增加 save 级记忆盘点：按 source/type/visibility 统计。
- 记录当前 prompt 中记忆 token 用量。

### Phase 1：Envelope Facade

- 实现 `MemoryEnvelope` 投影层。
- 映射 12 表、anchors、chronicle、shiji、foreshadows、semantic chunks、NPC memories、Godot diplomacy memory。
- 为每条投影生成稳定 id 和 source ref。

### Phase 2：Write Queue

- 增加 `MemoryWriteQueue`。
- 将 post-turn summaries、`sc1q` commitments、table AI ops、diplomacy memories 接入。
- 写入时补齐 provenance、confidence、visibility、link hints。

### Phase 3：Retrieval Composer

- 将 `SC_RECALL` 包成 composer，输出 envelope、分数和原因。
- 语义检索前先读确定性事实。
- 增加图一跳扩展。
- 加入 lane 预算和去重。

### Phase 4：Inspector 和人工修订

- 扩展 `MemoryUI`。
- 展示 query、candidates、injected、used。
- 支持 pin、hide、archive、supersede、mark false。

### Phase 5：压缩和冲突控制

- L2/L3 摘要保留来源链接。
- 将 supersedes、contradicts、continues、elaborates 作为一等关系。
- 增加记忆衰减和强化规则。

### Phase 6：评测闭环

- 建立黄金 save fixtures。
- 增加自动 recall 和 prompt packing 测试。
- 做长跑模拟，检查记忆漂移和势力一致性。

## 六、最近最值得做的 6 件事

1. 先做 envelope 投影层，不迁移旧存储。
2. 在 `GM._turnAiResults` 增加 retrieval trace：query、候选、分数组成、选中项、注入 lane、token 估算。
3. 先写 5 到 7 个黄金记忆场景，再重构深层检索。
4. 活跃诏令和确定性承诺永远排在向量召回前。
5. 每条 prompt 注入路径都先做 visibility filter。
6. 继续保留本地中文语义召回，但把它定位为证据发现器，不是事实真源。

## 七、暂不建议做的事

- 不要推翻 12 表系统。
- 不要把向量库当唯一真相源。
- 不要马上迁移所有旧 save。
- 不要让 AI 摘要覆盖玩家锁定事实或引擎确定事实。
- 不要把记忆自动化藏成黑箱。

## 北极星

优化后的天命记忆系统应该像一位谨慎的史官和档案官：记得硬命令，知道谁知道什么，追踪恩怨和义务，能把漫长过去压缩成可靠证据，并且能向设计者解释 AI 为什么这样行动。
