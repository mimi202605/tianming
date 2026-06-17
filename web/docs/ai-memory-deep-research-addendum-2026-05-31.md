# 天命 AI 记忆系统深度研究补编

日期：2026-05-31

用途：补充第一版研究报告，扩大论文和酒馆生态调研范围，并把新增资料转化为天命二版记忆系统的设计决策。

关联文件：

- 第一版主报告：`web/docs/ai-memory-research-and-architecture-plan-2026-05-31.md`
- 研究记录：`findings.md`
- 当前代码诊断：`web/docs/ai-memory-current-state-diagnosis.md`

## 0. 本轮新增结论

第一版报告已经给出 Memory Spine 方向。本轮更广泛调查后，结论变得更明确：

1. 记忆系统要从“召回旧文本”升级为“治理一组会变化的事实、事件、信念、承诺和策略”。
2. 角色扮演和策略游戏都不适合只用滚动摘要。摘要要有来源，事件要结构化，关系要可追踪。
3. 向量检索是证据发现器，不是真相源。真相源应优先来自游戏状态、表格、诏令、承诺、事件账本。
4. 评测不能只看“答对老问题”。还要测：旧事实是否失效、隐藏信息是否泄漏、NPC 是否因旧偏见过拟合、AI 是否知道没有证据时拒答。
5. 天命已经有很多正确积木，最缺的是统一包络、写入队列、可见性、冲突/失效、检索 trace 和黄金场景测试。

## 1. 文献地图

### A. 多类型记忆

代表资料：

- [Memory Matters](https://ojs.aaai.org/index.php/AAAI-SS/article/view/27688)
- [A Survey on the Memory Mechanism of LLM Agents](https://arxiv.org/abs/2404.13501)
- [LangChain memory concepts](https://docs.langchain.com/oss/python/concepts/memory)
- [A Machine with Short-Term, Episodic, and Semantic Memory Systems](https://ojs.aaai.org/index.php/AAAI/article/view/25075)

核心思想：

- 语义记忆回答“世界是什么”。
- 情景记忆回答“何时何地发生过什么”。
- 程序记忆回答“该怎样做”。
- 工作记忆回答“本次推演该看哪一小部分”。

对天命的含义：

- 12 表、人物档案、地点组织是语义记忆。
- eventHistory、史记、编年、问对、密召是情景记忆。
- `_aiReflections`、势力弧线、政策失败教训应升级为程序记忆。
- SC_RECALL 和 prompt 注入只是工作记忆层，不应承担长期真相存储职责。

### B. OS 式记忆治理

代表资料：

- [MemGPT](https://arxiv.org/abs/2310.08560)
- [Letta MemGPT architecture](https://docs.letta.com/guides/agents/architectures/memgpt)
- [MemOS](https://arxiv.org/abs/2505.22101)
- [MemoryOS](https://arxiv.org/abs/2506.06326)
- [MemFactory](https://arxiv.org/abs/2603.29493)

核心思想：

- 把上下文窗口看作主存，长期记忆看作外存。
- 记忆操作要被调度、审计、版本化、回收。
- 记忆不是“加几段文本”，而是基础设施。

对天命的含义：

- `MemoryWriteQueue` 应像操作系统写入队列：接收事件、校验权限、合并冲突、更新索引。
- prompt 注入应像分页：当前状态和硬约束常驻，历史证据按需调入。
- 每条记忆要有状态：active、archived、superseded、contradicted、deleted。

### C. 图和时间

代表资料：

- [Zep](https://arxiv.org/abs/2501.13956)
- [Zep graph docs](https://help.getzep.com/v2/understanding-the-graph)
- [HippoRAG](https://arxiv.org/abs/2405.14831)
- [REMem](https://arxiv.org/abs/2602.13530)
- [MemoriesDB](https://arxiv.org/abs/2511.06179)

核心思想：

- 长期记忆不仅是向量点集，还要有实体、事件、关系、时间有效性。
- 新事实可以使旧事实失效，而不是简单追加。
- 多跳问题需要图扩展和时间过滤。

对天命的含义：

- 政策、联盟、官职、承诺、敌意、谣言都要有 valid_from / valid_to。
- “皇帝许诺 A”与“后来废止 A”必须形成 supersedes 关系。
- NPC/势力 prompt 只能看到它们可见的图子集。

### D. 自省、失败教训和程序记忆

代表资料：

- [Reflexion](https://arxiv.org/abs/2303.11366)
- [Voyager](https://arxiv.org/abs/2305.16291)
- [H2R](https://arxiv.org/abs/2509.12810)
- [LEGOMem](https://arxiv.org/abs/2510.04851)
- [MemSkill](https://arxiv.org/abs/2602.02474)
- [Learning from Supervision with Semantic and Episodic Memory](https://arxiv.org/abs/2510.19897)

核心思想：

- 不只保存事实，还要保存“这次为什么失败/成功”。
- 高层规划教训和低层执行细节要分开。
- 程序记忆可以沉淀为 reusable playbooks。

对天命的含义：

- `_aiReflections` 不应只是短文本数组，应拆成：
  - 具体失败事件：哪回合、谁、什么行动、实际结果。
  - 可复用教训：未来遇到类似局面该怎么判断。
  - 适用条件：哪些势力/制度/财政/军事条件下有效。
- 程序记忆可先做成只读/人工可审的策略模板，不急着让 AI 自主改写。

### E. 自演化记忆

代表资料：

- [A-MEM](https://arxiv.org/abs/2502.12110)
- [AgeMem](https://arxiv.org/abs/2601.01885)
- [MemSkill](https://arxiv.org/abs/2602.02474)
- [EvoMemBench](https://arxiv.org/abs/2605.18421)

核心思想：

- 新记忆可以反过来更新旧记忆的标签、链接和解释。
- 记忆操作可以被学习或策略化：store、retrieve、update、summarize、discard。
- 但评测显示没有一种记忆形式通吃。

对天命的含义：

- 近中期不要做复杂 RL 记忆管理。
- 但可以暴露相同操作集：新增、更新、归档、废止、合并、压缩、钉住、隐藏。
- 新事件写入时应尝试更新旧事件关系：continues、contradicts、supersedes、causes。

### F. 长上下文和评测

代表资料：

- [Lost in the Middle](https://arxiv.org/abs/2307.03172)
- [RULER](https://arxiv.org/abs/2404.06654)
- [LongMemEval](https://arxiv.org/abs/2410.10813)
- [LoCoMo](https://arxiv.org/abs/2402.17753)
- [LongMemEval-V2](https://arxiv.org/abs/2605.12493)
- [PersistBench](https://arxiv.org/abs/2602.01146)
- [What Happens Inside Agent Memory?](https://arxiv.org/abs/2605.03354)

核心思想：

- 长上下文不是记忆系统。
- 中间信息会被忽略，旧事实可能误用。
- 评测要覆盖静态状态、动态状态、工作流、踩坑经验、前提意识、拒答、安全。

对天命的含义：

- prompt 应分 lane，硬约束靠前或靠近任务指令。
- 记忆评测要看“没有证据时不编造”。
- 小模型做记忆抽取时尤其要小心，可能能做路由但抽不准内容。

## 2. 酒馆与角色扮演生态地图

### A. Lorebook / World Info 系

代表资料：

- [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)
- [Agnai Memory Books](https://agnai.guide/docs/memory/)
- [RisuAI Lorebook](https://github.com/kwaroran/RisuAI/wiki/Lorebook)

模式：

- 用关键词、正则、向量相似度触发 prompt 条目。
- 按角色、人格、聊天、全局作用域绑定。
- 通过 insertion order、weight、budget 决定位置和保留。

优点：

- 用户可编辑。
- 对设定、世界观、固定人物关系非常有效。
- 低技术门槛。

缺点：

- 对时间变化、失效、矛盾、隐藏信息支持弱。
- 复杂长篇会变成大量条目，触发噪声上升。

天命借鉴：

- “皇命”“世界设定”“人物档案”“地点组织”适合 lorebook 式条目。
- 不要把所有历史事件都塞成 lorebook。

### B. 摘要/分层压缩系

代表资料：

- [SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/)
- [qvink MessageSummarize](https://github.com/qvink/SillyTavern-MessageSummarize)
- [MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/blob/main/readme.md)

模式：

- 滚动摘要、逐消息摘要、场景摘要、章节/Arc/Book 级合并。
- MemoryBooks 区分 Scene、Clip、Side Prompt、Compaction、Consolidation。

优点：

- 省 token。
- 适合剧情连续性和章节回顾。

缺点：

- 摘要有损，细节会漂移。
- 若无来源链接，后续无法纠错。

天命借鉴：

- 现有 L1/L2/L3 可以保留，但 L2/L3 必须保存 source ids。
- “事件简表”和“史记”不要只留摘要，要能回溯原事件。

### C. 向量/RAG 系

代表资料：

- [SillyTavern Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/)
- [SillyTavern Chat Vectorization](https://docs.sillytavern.app/extensions/chat-vectorization/)
- [Agnai User/Chat Embeds](https://agnai.guide/docs/memory/embeddings.html)
- [VectFox](https://github.com/KritBlade/VectFox)

模式：

- 把聊天、文档、设定或事件向量化。
- 根据当前上下文召回相似内容。

优点：

- 适合模糊检索。
- 能处理长档案和跨章节旧线索。

缺点：

- 原始聊天 chunk 噪声大。
- 相似度不等于重要性或真实性。
- 用户经常不知道实际注入了什么。

天命借鉴：

- 语义召回继续保留，但应只作为候选来源。
- 重排必须加入：来源权威、可见性、事件重要性、有效期、冲突状态、当前任务相关性。

### D. 结构化事件系

代表资料：

- [VectFox](https://github.com/KritBlade/VectFox)
- [REMem](https://arxiv.org/abs/2602.13530)
- [Zep](https://help.getzep.com/v2/concepts)

模式：

- 不是总结整段聊天，而是抽取事件。
- 每个事件有主体、地点、阵营、因果、结果、未解线索、重要性、时间。

优点：

- 最适合长篇剧情、策略模拟、政治关系和伏笔。
- 可结合图和向量检索。

缺点：

- 写入成本更高。
- 抽取质量需要验证。

天命借鉴：

- 这是最适合天命的核心方向。
- 12 表中的 `eventHistory` 应扩展为真正的事件账本，而不是简单文本行。

## 3. 天命二版设计决策

### 决策 1：统一包络优先，不急着迁移存储

先做 facade：

```ts
type MemoryEnvelope = {
  id: string;
  kind: "state" | "canon" | "event" | "commitment" | "belief" | "relationship" | "foreshadow" | "reflection" | "procedure";
  text: string;
  entities: string[];
  factions: string[];
  places: string[];
  turn?: number;
  year?: number;
  month?: number;
  visibility: "public" | "player_only" | "gm_only" | "npc_known" | "faction_known" | "hidden";
  source: { system: string; ref: string };
  authority: "engine" | "player" | "ai_extracted" | "summary" | "semantic";
  confidence: number;
  importance: number;
  status: "active" | "archived" | "superseded" | "contradicted" | "deleted";
  validFromTurn?: number;
  validToTurn?: number;
  links: Array<{ type: string; targetId: string; confidence: number }>;
};
```

第一阶段只投影：

- 12 表
- memoryAnchors
- `_memoryLayers`
- `_aiReflections`
- ChronicleTracker
- shijiHistory
- foreshadows
- NPC memory / recognitionState
- Godot diplomacy_memory

### 决策 2：引入结构化事件账本

建议新增或扩展一个 `MemoryEvent`：

```ts
type MemoryEvent = {
  id: string;
  turn: number;
  title: string;
  eventType: "edict" | "meeting" | "promise" | "betrayal" | "battle" | "policy" | "rumor" | "relationship_change" | "resource_change" | "foreshadow";
  summary: string;
  actors: string[];
  targets: string[];
  factions: string[];
  places: string[];
  causes: string[];
  results: string[];
  openThreads: string[];
  commitments: string[];
  visibility: string;
  importance: number;
  confidence: number;
  sourceRefs: string[];
};
```

天命当前的 `eventHistory` 已经有“事件描述、权重、维度标签、关联人物、未来约束”，所以扩展成本可控。

### 决策 3：记忆分层按“权威”而不只按“新旧”

推荐权威顺序：

1. 引擎确定状态：财政、兵力、官职、地图、承诺状态。
2. 玩家/作者锁定：皇命、设定、手工 pin。
3. 结构化 AI 抽取：承诺、事件、信念变化。
4. 原始叙事证据：史记、编年、对话片段。
5. L2/L3 摘要。
6. 向量召回片段。
7. 自省/策略建议。

同一个问题冲突时，先按权威，再按有效期，再按置信度和时间。

### 决策 4：每条 prompt 注入都要有 trace

建议记录：

```ts
type MemoryTrace = {
  turn: number;
  subcall: string;
  query: string;
  candidates: Array<{ id: string; source: string; score: number; rejectedReason?: string }>;
  selected: Array<{
    id: string;
    lane: string;
    score: number;
    why: string[];
    tokenEstimate: number;
  }>;
  budget: { lane: string; used: number; limit: number }[];
};
```

这会让“AI 为什么忘了/乱记了”可诊断。

### 决策 5：隐藏信息是第一等字段

至少支持：

- `public`：所有 prompt 可见。
- `player_only`：玩家界面可见，但 NPC/势力不可见。
- `gm_only`：GM 推演可见，用于暗线。
- `npc_known:<name>`：某 NPC 已知。
- `faction_known:<faction>`：某势力已知。
- `hidden`：仅存档，不自动注入。

所有检索必须先过 visibility filter，再重排。

### 决策 6：不要让摘要覆盖事实

规则：

- 摘要只能生成 derived memory。
- derived memory 必须带 `sourceRefs`。
- 当摘要与源事实冲突，源事实优先。
- 玩家可把摘要提升为 canon，但这是显式操作。

## 4. 二版实现路线

### Phase A：研究转工程基线

输出：

- `MemoryEnvelope` 类型说明。
- 源存储到 envelope 的 projection functions。
- 记忆 inventory 面板或 debug 命令。

不改行为，只观察。

### Phase B：trace 和预算

输出：

- `GM._turnAiResults.memoryTrace`
- 每次 SC_RECALL 的候选、选中、拒绝原因。
- prompt lane token 估算。

收益：

- 先把黑箱变透明，再改策略。

### Phase C：结构化事件写入

输出：

- `MemoryWriteQueue`
- `MemoryEvent` 草案
- 从 `sc1q`、诏令、对话、Godot diplomacy_memory 写入事件。

收益：

- 承诺、毁约、政策反转、关系变化开始有统一事件源。

### Phase D：检索重排 v2

输出：

- 确定性读取优先。
- 词法/实体召回。
- 图一跳扩展。
- 语义召回作为候选。
- 权威/时间/重要性/置信度/可见性综合排序。

收益：

- 不再让向量 top-k 决定历史真相。

### Phase E：压缩和图关系

输出：

- L2/L3 摘要加 sourceRefs。
- supersedes/contradicts/continues/causes 成为一等 links。
- old policy invalidation。

收益：

- 支持旧政策废止、旧承诺过期、谣言被证伪。

### Phase F：Memory Inspector

输出：

- Query / Retrieved / Injected / Used 四栏。
- pin、hide、archive、supersede、mark false。
- 每条记忆来源和 token 成本。

收益：

- 玩家和设计者能调校记忆，而不是被黑箱支配。

### Phase G：黄金场景评测

最小测试集：

1. 旧诏令 20 回合后仍约束新事件。
2. 新诏令覆盖旧诏令。
3. NPC 只知道自己见过/听过的秘密。
4. 势力因旧毁约报复。
5. 旧谣言被证伪后不再当事实。
6. 没有证据时拒答或标注不确定。
7. L2 摘要可回溯源事件。
8. 向量召回命中但被高权威状态否决。

## 5. 设计红线

- 不用单一滚动摘要代替事件账本。
- 不让向量召回覆盖引擎状态。
- 不让 NPC 看到玩家/GM 隐藏记忆。
- 不让 AI 摘要直接改 canon。
- 不把记忆做成不可见黑箱。
- 不在第一阶段引入复杂 RL/自学习记忆策略。

## 6. 北极星修订

天命的 AI 记忆系统最终不应像“聊天机器人记忆”，而应像“朝廷档案、私人耳目、史官编年、势力密账、人物恩怨簿、政策案例库”的合体。

它要能回答：

- 朝廷现在确定知道什么？
- 某 NPC/势力自己知道什么？
- 玩家曾经明确命令过什么？
- 哪条旧事实已经被新事实废止？
- 本轮为什么召回这条记忆？
- 这条记忆来自哪次事件，可信度多少？
- 如果没有证据，AI 是否能不编？

这比“更长上下文”难一点，但它正好是天命这种长线历史模拟游戏的护城河。
