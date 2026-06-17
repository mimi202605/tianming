# 天命演绎脑·AI 记忆系统研究综述

> 本轮目标（owner 锁定 2026-05-31）：**只出研究综述**，把学术论文 + 酒馆类记忆插件 + 设计理念调研透，按三层记忆组织、每层并列【向量/检索式】与【纯文本/提示词式】两条路线，单列一章讲酒馆插件设计模式，末章只做"对天命的映射与可选方向"，**不写具体落地实施方案**（落地下一轮单独做）。
>
> 配套现状诊断见同目录 `ai-memory-current-state-diagnosis.md`（天命演绎脑当前记忆机制的只读代码画像）。

---

## 0. 方法论与可信度说明

- **学术层**：经 deep-research 流水线（104 个 agent、5 路检索 → 抓取 22 源 → 抽取 101 条论断 → 取 top-25 做 3 票对抗验证）产出，**24 条存活、1 条被驳回**。本文引用的学术论断均为 **3-0 一致通过、对 primary source（arXiv 原文）逐字核验**。
- **插件层（酒馆/AI Dungeon）**：流水线只验了 top-25、结果偏学术，把 owner 点名的"酒馆插件重点"漏在了存活论断外。故由我**补做 5 次定向 WebFetch**，直接读官方文档（SillyTavern docs、qvink GitHub、AI Dungeon help），把设计细节补齐。
- **可信度分级**：学术机制描述 = 高（逐字核验），但**这些是"某系统怎么做"的忠实转述，不是"已在历史模拟游戏里验证有效"**——映射到天命是合理类比、非实证迁移结论。插件层 = 官方文档 primary，机制可信、但参数默认值随版本变动。
- **重要免责**：见末章 §7 局限。其中 StreamingLLM 的边界结论、A-MEM 检索细节、若干 SOTA 数字的时效性，**引用时必须带限定**。

---

## 1. 总览：记忆的「三层 × 两路线」地图

学界已收敛出一个清晰认识：**记忆不是 LLM agent 的可选优化，而是支撑"长期 agent-环境交互"和"自我演化"的核心组件**——而此前机制散落各论文、缺系统性抽象（Zhang et al. 综述的明确动机）[arXiv:2404.13501]。

可套用的分类骨架来自 **CoALA（Cognitive Architectures for Language Agents）**[arXiv:2309.02427]，它把语言 agent 的记忆分为：

| 记忆类型 | CoALA 定义 | 天命对应物 |
|---|---|---|
| **Working（工作记忆）** | 当前决策周期的活跃信息 | 本回合 prompt 里的 sysP + tp 状态快照 |
| **Episodic（情景记忆）** | 过往决策周期的经验、历史事件流、轨迹 | 回合事件日志、邸报、`_aiMemorySummaries`、memoryAnchors |
| **Semantic（语义记忆）** | 对世界与自身的知识 | NPC 关系/忠诚、势力数值、世界状态、剧本设定 |
| **Procedural（程序性记忆）** | 隐于权重的知识 + 显式 agent 代码 | 推演规则、诏令生命周期框架、prompt 模板 |

记忆操作被建模为**读/写循环**：retrieval（读）从长期记忆调入工作记忆，learning（写）把信息写回长期记忆，reasoning 仅更新工作记忆 [arXiv:2309.02427]。

**两条技术路线**（贯穿三层、互补而非对立）：

- **向量/检索式**：把记忆编码为 embedding，按语义相似度召回。优点：语义模糊匹配、无需关键词、可规模化；缺点：需 embedding 端点、有索引/存储成本、"为什么召回这条"不透明。
- **纯文本/结构化/提示词式**：用结构化字段 + 关键词触发 + LLM 直接打分/摘要。优点：**任何 BYOK 端点可用、零 embedding 依赖、可解释、可手工编辑**；缺点：召回靠关键词/规则，语义泛化弱于 embedding。

> 关键洞见：**最成熟的系统（Generative Agents、SillyTavern）都是两条路线混用**——结构化打分/触发为主干，embedding 只做其中"语义相关度"那一个分量。

---

## 2. 第一层 · 人物记忆（关系 / 受恩 / 恩怨 / 立场 / persona）

> 直接对应天命痛点：**NPC 受过的恩德不累积、忠诚与立场记不住**。

### 2.1 奠基范式：Generative Agents 的 Memory Stream（混合路线）

Stanford《Generative Agents》[Park et al. 2023, UIST；arXiv:2304.03442] 是人物记忆的奠基工作：

- **存储**：每段经历存为一个记忆对象 = `自然语言描述 + 创建时间戳 + 最近访问时间戳`（纯文本，不是预先结构化的数值）。
- **检索打分**：`score = α_recency·recency + α_importance·importance + α_relevance·relevance`，实现中三个 α **全设为 1**，各分量先归一化到 [0,1]。
  - **recency（新近度）** = 指数衰减函数，**衰减因子 0.995**，按"距上次被检索的沙盒游戏小时数"计算 → 久未被想起的记忆自然变淡。
  - **importance（重要性）** = **直接问 LLM 打 1（纯日常）到 10（极深刻）的整数分**。**这是纯提示词信号、不依赖 embedding、任何 BYOK 端点可用**。
  - **relevance（相关度）** = 记忆 embedding 与当前查询 embedding 的余弦相似度（**唯一需要 embedding 的分量**）。

> 这套三因子打分**几乎是天命"该把哪些历史喂给演绎脑"的标准答案**：相关 + 新近 + 重要。而且去掉 relevance 那一项后，recency+importance 两项**完全可以纯提示词实现**。

### 2.2 纯提示词信号 + 反思抽象（Reflection）

- **importance 打分纯靠提示词**（见上），可直接用于天命对"受恩/恩怨/关键政治事件"赋权重。
- **Reflection（高阶抽象）**：当"最近事件的 importance 分数之和 > 阈值 **150**"时触发——用最近 **100 条**记录提示 LLM 提炼"3 个最突出的高阶问题"，再综合出洞见(insight)，并形成对源观察的**引用树**（洞见的叶子是 base observations）[arXiv:2304.03442]。
- **天命映射**：NPC 把零散的"赏银、升官、被斥责、亲信被杀"等具体事件，定期 reflection 成"对玩家的总体立场"（如"虽屡受猜忌但念旧恩，倾向观望"）——**这正是"恩德不累积"的解法骨架：底层存事件 + 定期抽象成立场**。

### 2.3 向量 + 演化路线：A-MEM（Agentic Memory）

A-MEM [arXiv:2502.12110, NeurIPS 2025] 把记忆做成**受 Zettelkasten 卡片盒法启发的"记忆笔记"**：

- 每条笔记含 **7 个组件**：原始内容、时间戳、关键词、标签、上下文描述、embedding、链接的相关记忆。写入时由 **LLM 自动生成**语义组件（关键词/标签/上下文描述），构成可动态索引与链接的互联知识网络。
- **动态记忆演化（核心卖点）**：写入新记忆会**触发已存在的相关记忆更新其上下文/关键词/标签**——让旧记忆随新经验自适应、涌现高阶模式，而非僵化 [arXiv:2502.12110 §3.1/§3.3]。
- **天命映射**：恰好对应"NPC 立场随事件变迁时，旧记忆应被更新而非冻结"。例如玩家先施恩后猜忌，旧"受恩"记忆的上下文应被新事件重写为"恩已被疑心抵消"。
- ⚠️ **限定**：A-MEM"检索时是否自动连带召回被链接记忆"这一**细节在本轮被对抗验证驳回（1-2 票）**，证据不足，**不要据此断言其检索流程**。可借鉴的是"笔记结构 + 动态演化"理念，不是它的检索实现。

### 2.4 遗忘 / 巩固 / persona 一致性：MemoryBank

MemoryBank [arXiv:2305.10250, AAAI 2024，有公开代码]：

- 能检索相关记忆、通过持续更新演化、并**综合过往交互理解和适应用户性格（persona 一致性）**。
- **更新机制受艾宾浩斯遗忘曲线（Ebbinghaus Forgetting Curve）启发**：允许 AI 根据"时间流逝"与"记忆相对重要性"来**遗忘或强化**记忆。
- **天命映射**："让久未触发的恩怨自然淡化、让反复强化的立场固化"。
- ⚠️ **限定**：原文用词是"受……启发(inspired by)"，**不是已验证的生物学模型**，是一个工程化的衰减/强化规则，别当成科学定律。

### 2.5 人物记忆 · 两条路线对比

| 维度 | 向量/检索式（A-MEM 风） | 纯文本/提示词式（Gen-Agents importance + reflection 风） |
|---|---|---|
| 关系/受恩存储 | 记忆笔记 + embedding + 链接 | 结构化字段（loyalty/affinity）+ 事件日志（自然语言） |
| "想起哪条" | 语义相似度召回 | importance×recency 打分 / 关键词触发 |
| 立场抽象 | 动态演化重写旧笔记 | reflection 定期抽象成洞见 |
| BYOK 友好度 | 需 embedding 端点 | **全程可纯提示词** |
| 可解释/可手编 | 弱 | **强**（字段可见可改） |
| 适用场景 | NPC 多、历史长、需模糊语义关联 | NPC 可枚举、需确定性与可控、无 embedding 保证 |

---

## 3. 第二层 · 世界/事件长期记忆与一致性

> 对应天命痛点：**过往事件与进行中剧情线丢失、长程自相矛盾**。

### 3.1 图检索路线：HippoRAG

HippoRAG [arXiv:2405.14831, NeurIPS 2024]：

- 受人脑**海马索引理论**启发，模拟新皮层与海马的不同角色，解决"LLM 预训练后难高效整合大量新经验"。
- **检索机制**：协同编排 **LLM + 知识图谱 + Personalized PageRank**，**在图上做单步检索即完成跨段落多跳知识整合**（而非多轮迭代检索）。
- **效能**：多跳 QA 上相比当时 SOTA 最高提升约 **20%**；单步检索性能达到或超过 IRCoT 这类迭代检索，同时**成本低 10-30 倍、速度快 6-13 倍**。
- **天命映射**：把"人物—事件—势力—地点"建成知识图谱，演绎时单步多跳召回"与本回合诏令相关的历史链条"，有助于**关联多条剧情线、避免长程自相矛盾**，且在线开销低。
- ⚠️ **限定**："+20%"是 2024-05 相对当时 SOTA、最精确为 2WikiMultiHopQA 的检索准确率，**后续工作已超越**；引用数字要带时间与基准。

### 3.2 episodic / semantic 分层（CoALA）

- **episodic** 存"过往回合发生了什么"（事件流、轨迹）；**semantic** 存"世界与人物现在是什么样"（关系、势力、地理）。
- 天命启示：**事件日志（episodic）与状态快照（semantic）应分开存、分开喂**——前者回答"发生过什么"，后者回答"现在如何"。当前天命的状态快照很强，但 episodic 事件流偏弱（见诊断 §2/§5）。

### 3.3 重要边界：StreamingLLM 不是记忆方案，长上下文≠记得住

StreamingLLM [arXiv:2309.17453, ICLR 2024]：

- 让有限注意力窗口训练的 LLM **无需微调即可泛化到无限序列长度（实测 400 万 token+）**，靠保留少量初始 "attention sink" token 的 KV + 最近 token 的滑动窗口。
- ❗ **但它明确"不扩展模型对远古内容的有效记忆"**——窗口外的 token 无法影响预测，**它只解决流式生成的稳定/高效，不解决长程召回**（原文 Appendix A 逐字反证："not suitable for tasks that demand long-term memory"）。
- **对天命的反向启示（关键，易被误用）**：**不能指望"长上下文 / 无限流式"本身让演绎脑"记住"远古回合**。长程记忆**必须靠外部记忆 + 检索/注入**。这也呼应业界"Lost in the Middle / 长上下文 vs 检索之争"——塞满上下文 ≠ 记得住，中间位置信息会被忽略。
- ⚠️ 引用 StreamingLLM 时**务必带上"不扩展长程记忆"的限定**，否则会被误读为"上长上下文就能解决跨回合记忆"。

### 3.4 世界/事件记忆 · 两条路线对比

| | 向量/图检索式（HippoRAG 风） | 纯文本/结构化式 |
|---|---|---|
| 事件存储 | 段落 embedding + 知识图谱 | 结构化事件日志（回合/参与者/类型/重要性）+ 编年摘要 |
| 召回 | 单步多跳图检索 | 关键词触发（见 §5 World Info）+ 按回合/参与者筛选 |
| 一致性维护 | 图上关联约束 | 显式状态机 + 摘要链 + 硬约束规则 |
| BYOK 友好度 | 需 embedding（+ 图构建成本） | 全程可纯提示词 |

---

## 4. 第三层 · AI 上下文管理（token 受限下喂什么）

> 对应天命痛点：**演绎脑 prompt 在 token 上限内难以选对要喂的历史**。

### 4.1 核心范式：MemGPT / Letta 的「LLM 即操作系统」虚拟上下文分页

MemGPT（后更名 Letta）[arXiv:2310.08560]：

- 提出**虚拟上下文管理**：借鉴操作系统的**分层内存**——在快/慢两级存储间搬运数据以制造"大内存假象"——让 LLM 在固定窗口外有效运作。
- 智能管理两级：**main context（≈RAM / 窗口内）** 与 **external context（≈二级存储 / 窗口外）**，靠 **interrupts（函数调用/控制流信号）** 调度搬运。
- **实证**：multi-session chat（MSC 数据集 DMR 一致性任务）中 GPT-4+MemGPT 达 **92.5%** 准确率 vs 基线 **32.1%**——**直接对应"NPC 跨回合记忆缺失"**。
- ⚠️ **限定**：跨会话靠**显式函数调用取数**而非全自动，缺时序/结构化元数据，多跳任务弱于后续工作（A-MEM、LongMemEval 已指出）。

### 4.2 记忆操作循环（CoALA read/write）

把"该喂什么"显式建模为 retrieval（决定从长期记忆调入哪些）+ learning（决定写回什么）。天命当前 SC0 的 `memoryQueries` 已是 retrieval 的雏形（AI 主动声明要查什么），但不持久、需 AI 主动发起（诊断 §2）。

### 4.3 压缩（摘要）与遗忘

- **分层摘要**：把"近期原始 → 中期摘要 → 远期纲要"逐层压缩（天命已有 L1/L2/L3 金字塔，诊断 §4）。
- **遗忘/巩固**：MemoryBank 的"按时间 + 重要性遗忘或强化"（§2.4）。
- **预算驱动截断**：见 §5.4 AI Dungeon 的"分区固定空间 + 最旧历史先删"。

### 4.4 token 内"选对要喂什么"的可操作信号

综合三层：**relevance（与本回合诏令相关）× recency（新近）× importance（重要）** 三因子打分（Gen-Agents），其中 recency+importance 可纯提示词、relevance 可用关键词触发近似 embedding（见 §5）。

---

## 5. 酒馆类游戏记忆插件 · 设计模式与可借鉴理念（重点专章）

> 这是 owner 点名的重点。社区把上面的学术路线**工程化、参数化**得最彻底，且**两条路线并存**——这正是天命演绎脑最直接的实现样板。以下均来自官方 primary 文档。

### 5.1 SillyTavern · World Info / Lorebook（纯文本/结构化路线的工程化巅峰）

来源：SillyTavern 官方文档 worldinfo。**这是"关键词触发注入"路线做到极致的范本**，零 embedding 依赖：

- **触发**：每个条目有**主关键词 Key**（逗号分隔、默认不区分大小写、支持正则 `/pattern/flags`）+ 可选**副关键词 Optional Filter**，逻辑可选 **AND ANY / AND ALL / NOT ANY / NOT ALL**。
- **三种激活模式**：
  - 🔵 **Constant（常驻）**：始终在 prompt 中（适合世界观铁律、当前格局）。
  - 🟢 **Selective/Normal（关键词触发）**：被主/副关键词命中才注入（适合"提到才需要"的细节）。
  - 🔗 **Vectorized（向量）**：靠 Vector Storage 相似度匹配、**无需关键词**（两路线在同一系统并存的明证）。
- **Scan Depth（扫描深度）**：扫描聊天历史中**最后 N 条消息**找关键词（0=仅递归条目和作者注、1=仅最后一条、N=最后 N 条），可全局设或条目级覆盖。
- **Recursion（递归扫描）**：条目内容里提到别的条目关键词时可**连锁触发**；配套 `Non-recursable`（不被触发）、`Prevent further recursion`（触发后不再触发别的）、`Delay until recursion`（仅递归阶段激活、带 Recursion Level 分层）、`Min Activations`（不顾扫描深度向后扫直到触发够数）、`Max Recursion Steps`。
- **插入位置与顺序**：`Insertion Position`（角色定义前/后、示例消息前/后、作者注顶/底、`@D` 指定深度可带角色）；`Insertion Order`（数值越大越靠近上下文末尾、对输出影响越大）；`Strategy`（默认 Sorted Evenly 跨源混排 / Character Lore First / Global Lore First）。
- **Token Budget（预算）**：可设相对百分比或绝对 token 数；**预算耗尽则即使命中关键词也不激活**。超预算的取舍优先级：**① Constant 条目 → ② 按 Insertion Order → ③ 直接提及关键词的条目优于递归触发的**。
- **时序控制（Timed Effects，以消息数计）**：`Sticky`（激活后保持 N 条消息）、`Cooldown`（激活后 N 条内不能再激活）、`Delay`（聊天至少 N 条消息才可激活）；另有 `Probability`（注入概率）、`Inclusion Group`（多条目命中时随机或按优先级取一）。

> **可借鉴理念**：① 用 constant/selective 区分"铁律常驻"与"按需触发"，省 token；② 预算耗尽的**确定性取舍顺序**；③ Insertion Order 决定"越重要越靠近末尾"；④ sticky/cooldown 防止同一条目反复刷屏或瞬灭。

### 5.2 SillyTavern · Chat Vectorization（向量召回路线）

来源：官方 chat-vectorization 文档（本轮唯一经对抗验证 3-0 的酒馆论断）：

- 标准 RAG：逐条（过长则按 ~400 字符 chunk）对消息做 embedding，按语义相似度召回与最近消息相关的过往消息，**明确区别于关键词触发的 World Info**。
- **可调参数**：查询默认取**最近 2 条**消息；过往消息相关度 **≥25% 阈值**才合格；默认插入 **top-3** 匹配；**最近 5 条消息被保护**（retain，不参与重排）。

> **可借鉴理念**：阈值 + 条数 + 保护窗三个旋钮**精确控制注入量**——正对天命"token 内选对历史"的需求。

### 5.3 SillyTavern · Summarize 扩展 + qvink MessageSummarize（分层摘要 / 短期长期记忆）

**官方 Summarize**：

- **增量滚动摘要**：把摘要嵌入"生成摘要时上下文最后一条消息的元数据"，后续在此基础上累积；删/改带摘要的消息会回滚到上一有效状态。
- **触发频率**：`Update every X messages` / `Update every X words`（任一非零、先到先触发）/ 手动 "Summarize now"。
- **后端**：Main API（用当前模型，无需额外配置）vs Extras（BART 模型，但上下文仅 ~1024 token）。
- **注入**：`{{summary}}` 宏 + Injection Template，位置/深度同 Author's Note（主 prompt 前/后或聊天内指定深度）。

**qvink MessageSummarize（社区热门，纯摘要、不用 embedding/RAG）**：

- **逐条消息独立摘要**（而非一次性全局摘要），摘要**绑定其源消息**——避免官方方案让 LLM 管全局摘要导致的"信息衰退/细节丢失"。
- **短期 vs 长期分层**：短期记忆自动轮转只留最近、有独立 token 预算（`Short-Term Memory Injection → Context`）；长期记忆靠**手动点"脑"图标标记**（或 `/qm-toggle-remember`），有独立上限，可设 `Always Separate` 始终单存。
- **转移条件**：短期摘要超预算后，被标记的迁入长期、否则丢弃。
- **选择性注入**：`Message Length Threshold`（只摘超阈值的消息）、`Injection Threshold`（从历史往前多少条开始注入）、可配 User/Hidden/System 消息是否纳入。

> **可借鉴理念**：① **摘要绑定源消息**（删源即删记忆，天然防孤儿/防 stale）——直接呼应天命此前踩过的"段位/民心死缓存"坑；② **短期池自动轮转 + 长期池显式标记**的双层结构；③ "重要的才升入长期"。

### 5.4 AI Dungeon · 记忆系统 + Story Cards（分区 + 优先级 + 预算截断顺序）

**上下文拼装**（来源：AI Dungeon help）：

- **始终包含（固定分区）**：AI Instructions、Story Summary、**Plot Essentials（原名 Memory）**、Author's Note、最近动作文本。
- **条件包含**：Story Cards（仅关键词触发时加入）。
- **预算满载的截断顺序**：固定分区保持各自分配空间，**最先删的是"最旧的历史故事文本"**，Story Cards 按剩余空间动态伸缩。
- **压缩**：Auto Summarization 每 **15 个动作**生成一次 Story Summary。
- **检索**：Memory Bank 用向量相似度智能调取相关记忆，**补偿被截断的历史**。
- **设计理念自述**：受人脑启发——**压缩记忆（保留要点非逐字）+ 记忆检索（相关时才触发细节）+ 固定层（核心指导常驻）**。

**Story Cards（= 旧称 World Info）**：

- 字段：Type / Name / **Entry（触发时发给 AI 的核心内容）** / **Triggers（关键词）** / Notes（其中 Type/Name/Notes **AI 看不见**，仅供玩家参考）。
- 触发：**大小写不敏感、但对首尾空格敏感**；扫描**玩家输入和 AI 输出**；支持部分匹配（"boat" 触发 "boats"）；有时序延迟（AI 在回复中途触发的卡，**下一次输出才生效**）。
- 注入：Entry 以 `World Lore:` 前缀插入上下文。
- **设计原则自述**："让 Story Cards 只在需要时激活、而非一直占空间"——因为它们**是上下文满时最先被删的元素之一**。

> **可借鉴理念**：① **分区 + 每区固定预算 + 明确的截断优先级**（最旧历史先删、核心指导永驻）；② **压缩 + 检索 + 固定层三管齐下**；③ 关键词触发卡"按需占位"以省 token。

### 5.5 从社区提炼的可借鉴设计模式（汇总）

1. **常驻 vs 按需触发分流**：铁律/当前格局常驻，细节靠关键词/向量按需召回（World Info constant vs selective）。
2. **双轨并存**：关键词触发（纯文本）+ 向量召回（embedding）在同一系统共存，互补取长（ST 同时有 World Info 和 Vectorization）。
3. **分区固定预算 + 确定性截断顺序**：token 满时谁先删、谁永驻，写死规则（AI Dungeon / World Info budget）。
4. **越重要越靠近 prompt 末尾**（Insertion Order）。
5. **分层摘要 + 短期/长期双池**，重要的才升入长期（qvink）。
6. **摘要绑定源**，删源即删记忆，防 stale/孤儿（qvink）。
7. **时序控制**：sticky/cooldown/delay 防注入刷屏或瞬灭。
8. **可调旋钮**：阈值/条数/保护窗精确控制注入量（Vectorization）。
9. **结构化字段 AI 可见性分离**：有些字段只给玩家、不喂 AI（Story Cards 的 Name/Notes）。

---

## 6. 对《天命》演绎脑的启示（只做映射与可选方向，不写落地方案）

> 结合现状诊断（`ai-memory-current-state-diagnosis.md`）。天命当前是"**每回合无状态快照 + 跨回合事件锚点分层压缩**"的混合范式，**已有相当成熟设施**（L1/L2/L3 金字塔、importance 加权锚点、AffinityMap、SC0 memoryQueries 半检索雏形），缺口集中在**结构化、统一化、检索化**。

### 6.1 逐痛点 → 学界/社区解法映射

| 天命痛点 | 现状（诊断） | 可映射的解法 |
|---|---|---|
| **NPC 受恩/恩德不累积** | loyalty/affinity/recognitionState/hiddenAgenda **四处分管、无统一变更日志** | Gen-Agents：**底层存"受恩事件"(episodic) + 定期 reflection 抽象成"对玩家立场"**；A-MEM：旧记忆随新事件**演化重写**而非僵化 |
| **忠诚/立场记不住** | 数值字段有、但喂 AI 是单值快照、无历史 | importance×recency 打分挑"该提醒 AI 的关系事件"；MemoryBank：久未触发淡化、反复强化固化 |
| **过往事件/剧情线丢失** | episodic 事件流偏弱、靠主动注入非检索 | CoALA：episodic（发生了什么）与 semantic（现在如何）**分存分喂**；HippoRAG：知识图谱关联多剧情线 |
| **长程自相矛盾** | 无强一致性约束 | 显式状态机 + 摘要链 + 硬约束（纯文本路线）；或图上关联约束（向量路线） |
| **token 内选对历史** | topK 硬写死(8)、无 token 预算、被动截断 | Gen-Agents 三因子打分 + AI Dungeon **分区固定预算/确定性截断顺序** + ST 阈值/条数旋钮 |
| **段位/民心死缓存（历史教训）** | 缓存字段不同步 | qvink：**摘要/派生值绑定源、删源即删**，回合末统一同步（天命已用 syncAuthorityPhases 思路） |

### 6.2 两条路线在天命 BYOK 约束下的取舍（关键决策点）

- **约束**：天命默认零外部 API、玩家 BYOK，**不保证有 embedding 端点**。
- **纯文本/提示词路线**（importance LLM 打分 + recency 衰减 + 关键词触发 + 分层摘要 + reflection 抽象）：**全程任意 BYOK 可用、可解释、可手编、对接现有演绎脑最稳**。代价：relevance 这一分量靠关键词/标签近似 embedding，语义泛化弱一些。
- **向量/RAG 路线**（A-MEM 演化 / HippoRAG 图检索 / ST Vectorization）：语义召回强、规模化好。代价：**需 embedding 端点**——只能作为"检测到玩家配了 embedding 才启用"的**增强档**，不能作默认。
- **倾向性结论（供下一轮决策，非拍板）**：**以纯文本/提示词路线为主干**（保证人人可用），把向量召回设计成**可选增强层**——这恰好是 SillyTavern 的现成范式（World Info 常驻 + 关键词触发为底座，Vectorization 为可选扩展）。

### 6.3 可选方向梳理（只列方向，实施下一轮做）

1. **统一"恩德/关系事件日志"**：把分散的 loyalty/affinity/恩怨收敛成一条带 importance 的 episodic 事件流，喂 AI 时按三因子挑选 + 定期 reflection 成立场。（治"恩德不累积"根因）
2. **三因子注入打分替代硬写死 topK**：recency(衰减) × importance(LLM 打分) × relevance(关键词/可选 embedding)，配 token 预算动态取条数。
3. **分区固定预算 + 确定性截断顺序**：给 prompt 各记忆分区分配固定预算、写死"谁先删/谁永驻"（学 AI Dungeon）。
4. **常驻 vs 按需触发分流**：世界铁律/当前格局常驻，细节靠关键词触发（学 World Info constant/selective）——天命已有"固定层缓存"，可扩展成关键词触发层。
5. **knowledge-graph 化（增强档）**：人物—事件—势力—地点建图，支持关联多剧情线、查长程一致性（学 HippoRAG，需评估构建成本）。
6. **摘要绑定源 + 回合末统一同步**：所有派生记忆值绑定源、删源即删，根除 stale 缓存（学 qvink，呼应天命历史教训）。

---

## 7. 局限与待补（忠实搬运，落地前必读）

**Caveats（来自验证流水线 + 补抓）：**

1. 学术 claim 是对论文**自身机制描述**的忠实转述（逐字核验、3-0），但**多为"某系统怎么做"，非"已在历史模拟游戏验证有效"**——映射天命是合理类比、非实证迁移。
2. **SOTA/benchmark 数字有时效**：HippoRAG "+20%" 是 2024-05 相对当时 SOTA（最精确为 2WikiMultiHopQA 检索准确率），后续工作已超越；MemGPT 多会话实测真实但已被指缺时序/结构元数据、多跳偏弱。
3. **A-MEM "向量+链接式混合检索（先余弦再连带召回链接记忆）"这条细节被对抗验证驳回（1-2）**——其检索细节本轮证据下不可靠，**不要据此断言其检索流程**；可借鉴的是"记忆笔记结构 + 动态演化"理念。
4. 本轮 caveat 提到一篇 2026 批评性 follow-up 综述（"Anatomy of Agentic Memory"，**其引用未经我独立核实，存疑**），大意是 agentic-memory 系统普遍存在"经验基础脆弱、benchmark 饱和、准确率依赖 backbone、理论承诺与实测有落差"。**不论真伪，原则成立：任何 agentic memory 方案在天命落地前都应做场景化实测。**
5. **StreamingLLM 的边界结论极关键且易被误用**：它**不是记忆方案、不扩展长程记忆**，引用时务必带限定，别被读成"长上下文即可解决跨回合记忆"。

**Open Questions（本轮未覆盖、需补一轮专项检索的）：**

- **mem0** 的工作原理与参数；**SillyTavern Lorebook 更细的 recursion/scan/constant 实战取舍、MemoryBooks** 等第三方插件——本轮补抓已覆盖 World Info/Summarize/qvink/Vectorization/Story Cards 核心，但 mem0 与部分第三方插件仍缺。
- **Reflexion（语言自反思）与 Voyager（skill library = procedural memory）** 如何把"失败教训/可复用策略"沉淀为程序性记忆——对天命"演绎脑跨回合不重复犯同类错误/沉淀治理套路"可能直接相关，本轮无存活 claim，需单独验证。
- **纯文本路线在无 embedding 时，能多大程度近似 relevance 分量**（关键词/标签 vs embedding 的精度损失实测）——直接影响 §6.2 的主干选型。
- **"Lost in the Middle" / 长上下文 vs 检索之争的具体结论**（长上下文模型中间位置召回衰减程度、何时检索优于塞满上下文）——直接影响天命"塞长上下文 vs 外部记忆+精选注入"的路线选择，本轮未验证为存活 claim，需补证。

---

## 8. 参考来源

**学术（primary，arXiv 逐字核验、3-0 通过）：**
- Zhang et al., *A Survey on the Memory Mechanism of LLM-based Agents* — arXiv:2404.13501（ACM TOIS）
- Park et al., *Generative Agents: Interactive Simulacra of Human Behavior* — arXiv:2304.03442（UIST 2023）
- Packer et al., *MemGPT: Towards LLMs as Operating Systems* — arXiv:2310.08560（→ Letta）
- Sumers/Yao et al., *Cognitive Architectures for Language Agents (CoALA)* — arXiv:2309.02427（TMLR 2024）
- Zhong et al., *MemoryBank: Enhancing LLMs with Long-Term Memory* — arXiv:2305.10250（AAAI 2024）
- Xu et al., *A-MEM: Agentic Memory for LLM Agents* — arXiv:2502.12110（NeurIPS 2025）
- Gutiérrez et al., *HippoRAG* — arXiv:2405.14831（NeurIPS 2024）
- Xiao et al., *StreamingLLM (Efficient Streaming LMs with Attention Sinks)* — arXiv:2309.17453（ICLR 2024）

**社区/插件（官方 primary 文档，补抓）：**
- SillyTavern World Info / Lorebook — https://docs.sillytavern.app/usage/core-concepts/worldinfo/
- SillyTavern Chat Vectorization — https://docs.sillytavern.app/extensions/chat-vectorization/
- SillyTavern Summarize — https://docs.sillytavern.app/extensions/summarize/
- qvink SillyTavern-MessageSummarize — https://github.com/qvink/SillyTavern-MessageSummarize
- AI Dungeon Memory System — https://help.aidungeon.com/faq/the-memory-system
- AI Dungeon Story Cards — https://help.aidungeon.com/faq/story-cards
- AI Dungeon Plot Essentials — https://help.aidungeon.com/faq/plot-essentials

**二手/博客（背景参考，未单独逐条核验）：**
- 1M Token Context vs RAG — mindstudio.ai/blog
- MemGPT 解读 — leoniemonigatti.com/blog/memgpt.html
- Context Engineering — weaviate.io/blog/context-engineering
- SillyTavern World Info（DeepWiki）— deepwiki.com/SillyTavern/SillyTavern/6.1-world-info-system

---
## 9. 第二轮专项补检索成果（2026-05-31）

> 背景：第二轮的 deep-research workflow（127 agent）因速率/容量压力整轮失败（详见 §7 教训），改用**直接 WebFetch/WebSearch 抓权威 primary source**完成（省额度、无 StructuredOutput 失败风险）。本轮 6 专项**定向服务两条已锁决策**（①纯文本主干+向量增强档 ②上 KG 增强档），每项末标注【支持/挑战】。这同时回收了 §7 的 open questions。

### 9.1 mem0：生产级「抽取—巩固」记忆管线 [arXiv:2504.19413]
- 架构：以记忆为中心，原始对话日志经 **Extraction（抽取显著事实）+ Update（巩固/增删改、消解冲突）两阶段**管线；**Mem0g** 变体用图结构存关系、做关系推理。
- 关键：记忆是**抽取出的自然语言事实**（不只是向量块）。
- LOCOMO 评测：相对最佳方法在 single-hop/temporal/multi-hop 上 **+5%/+11%/+7%**；LLM-as-judge 相对 OpenAI 记忆 **+26%**；**p95 延迟比全上下文基线低 >91%**；Mem0g 比基础版总分再高约 2%。
- 对天命：**抽取显著事件→巩固成事实**正是"恩德事件日志 + 定期消解"的生产范式，且记忆为文本事实 → 【支持决策①】。图变体只小幅 +2% → 【提示决策②：KG 收益真实但别指望独挑大梁】。

### 9.2 程序性记忆：把「教训/套路」沉淀下来（补全 CoALA 四类中天命最弱的一环）
- **Reflexion** [arXiv:2303.11366]：agent 把失败反馈**口头反思成自然语言**，存进 **episodic memory buffer**，后续 trial 复用以改进决策——**不更新权重**；HumanEval pass@1 **91%**（超 GPT-4 的 80%）。短期=当前轨迹，长期=跨 trial 的反思文本库。
- **Voyager** [arXiv:2305.16291]：**skill library 以可执行代码存技能**（时间扩展、可解释、可组合）+ 自动课程 + 迭代提示（环境反馈/执行错误/自我验证），技能可组合、缓解灾难性遗忘；相比基线 **3.3× 物品 / 2.3× 距离 / 15.3× 科技里程碑**。
- 对天命：直接对应**"演绎脑沉淀治理套路、跨回合不重复犯同类错误"**——把"某诏令的恶果/某套路的成功"写成语言反思或可复用规则存入程序性记忆。机制核心**纯文本/代码、无 embedding** → 【支持决策①】。

### 9.3 Lost in the Middle + 长上下文 vs 检索之争（决定「塞 vs 选」）[arXiv:2307.03172]
- **U 型曲线**：相关信息在开头/结尾时性能最高、**中间时显著下降**。GPT-3.5-Turbo 20 文档：开头 **75.8% → 中间 53.8%（差 22 个百分点**，原文"can drop by more than 20%"）；Claude-1.3 更鲁棒（差 3.1pt）。
- **越塞越糟的反直觉证据**：20/30 文档时性能**低于完全不给文档的 closed-book 基线（56.1%）**（GPT-3.5 30 文档中间位仅 50.9%）。
- **长上下文模型并不能根治**位置偏置；LongMemEval [arXiv:2410.10813] 实测商用助手与长上下文 LLM 长程交互**准确率掉约 30%**——"没有有效记忆机制就管不住不断增长的历史"。
- 对天命：**强力支持"外部记忆 + 精选注入"而非"塞长上下文"**，并印证 §5.1——**最重要内容放 prompt 末尾**（U 曲线两端高、中间洼）。本篇对天命最直接可执行的结论之一。

### 9.4【验证决策①主干】无 embedding 时纯词法能否近似语义相关度 [BEIR, arXiv:2104.08663]
- **BM25 是稳健的零样本/跨域基线**，常接近甚至超过某些 dense 向量模型；**dense 模型在训练分布外泛化常变差**。
- **无单一最优**：reranking / late-interaction 平均零样本最好，但**计算代价高**。
- 对天命：**支持"纯文本/词法主干可用"**（天命领域专名多、关键词命中率高）→ 【支持决策①】。诚实边界：**纯词法对同义/转述/语义泛化弱于 dense**；缓解 = LLM 自动生成关键词/标签（A-MEM 式）扩命中面，或玩家配了 embedding 时切 **hybrid（BM25+dense）** 增强档。结论：**纯文本主干站得住，向量作增强档而非必需**——正是决策①。

### 9.5【服务决策②KG】agent 知识图谱记忆：批处理 vs 增量是分水岭
- **HippoRAG 2** [arXiv:2502.14802]：承 HippoRAG 的 Personalized PageRank，强化段落整合与在线 LLM 使用；**联想记忆任务比 SOTA 向量模型 +7%** → 【支持决策②：KG 利于联想/多跳】。
- **微软 GraphRAG** [arXiv:2404.16130]：**两阶段 LLM 索引**——先抽实体知识图，再**为所有实体社区预生成社区摘要**；global（社区摘要 map-reduce）vs local 查询。**面向静态语料的批处理/预生成范式**（论文未给增量方案）→ 【挑战：天命每回合改世界，若用 GraphRAG 式全量重建社区摘要则代价高、不适合频繁变动】。
- **Zep / Graphiti** [arXiv:2501.13956]：**时序知识图谱**引擎，**双时间（bi-temporal）**——每条边带有效区间（t_valid/t_invalid）+ 系统时间（t_created/t_expired）；**实时增量摄取**新事件、即时解析新实体/关系并对齐已有节点；DMR 基准**超过 MemGPT**。
- 对天命：**KG 增强档要走 Graphiti 式「增量 + 时序」，不要 GraphRAG 式「批处理全量重建」**——天命世界每回合在变（领土得失/人物生死/关系翻转），双时间模型还天然表达"某关系在第 N 回合前有效"。决策②从"该不该上"细化到"上哪一种"。

### 9.6 生产级记忆系统横评 + 对 agentic memory 的批评
- 取舍：**Letta(MemGPT)** = OS 分页（§4.1）；**Zep** 在 DMR 超 MemGPT、强于时序；**mem0** 主打 token 高效 + 低延迟（p95 -91%）；图变体（Mem0g/HippoRAG2/Graphiti）关系/联想更强但有构建成本。
- **LongMemEval 通用优化（与具体系统无关、天命可直接借）**：session decomposition（按会话/回合切分提粒度）、fact-augmented key expansion（用抽取的事实扩充索引键）、time-aware query expansion（按时间扩展查询范围）。
- **诚实批评**：即便最强长上下文 LLM 也搞不定长程记忆（须外部机制）；评测结论**依赖 backbone 模型**、不同基准有别——**任何方案落地天命前都应在天启/绍宋实存档做场景化实测**（呼应 §7）。

### 9.7 本轮对两条锁定决策的裁定

| 决策 | 证据裁定 |
|---|---|
| **① 纯文本主干 + 向量增强档** | **支持，站得住**。BM25 跨域稳健（BEIR）、mem0/Reflexion/Voyager 核心机制皆纯文本无需 embedding。边界：纯词法对同义/转述弱，用 LLM 生成关键词/标签 + 可选 hybrid 缓解。向量作增强档而非必需——与决策一致。 |
| **② 上 KG 增强档** | **支持，但收窄到「增量+时序」流派**。HippoRAG2/图记忆联想多跳 +7% 收益真实；但**须走 Graphiti/Zep 式实时增量 + 双时间**，避开 GraphRAG 式静态语料批处理全量重建（不适合天命每回合变世界）。 |

### 9.8 第二轮新增来源
- mem0 — arXiv:2504.19413 / mem0.ai/research
- Reflexion — arXiv:2303.11366
- Voyager — arXiv:2305.16291
- Lost in the Middle — arXiv:2307.03172（ar5iv 全文取数）
- BEIR — arXiv:2104.08663
- HippoRAG 2（From RAG to Memory）— arXiv:2502.14802（ICML 2025）
- 微软 GraphRAG（From Local to Global）— arXiv:2404.16130
- Zep / Graphiti（Temporal KG for Agent Memory）— arXiv:2501.13956
- LongMemEval — arXiv:2410.10813（ICLR 2025）

---
*生成：2026-05-31 · 第一轮学术层经 deep-research 流水线 3 票对抗验证、插件层经 5 次定向官方文档抓取；第二轮 6 专项经直接 WebFetch/WebSearch 抓 arXiv 等 primary source（workflow 失败后改的省额度方案）· 两条架构决策(纯文本主干+向量增强档 / 上增量时序 KG)已被证据支持 · 落地实施方案下一轮单独启动。*
