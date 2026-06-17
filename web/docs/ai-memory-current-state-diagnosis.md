# 天命演绎脑·AI 记忆机制现状诊断（研究综述配套·只读诊断）

> 用途：AI 记忆系统优化研究的"现状 grounding"。所有结论由只读代码探查得出，带 `文件:行号` 证据。
> 本文件只做现状画像，不含落地实施方案。配套的学术 + 酒馆插件研究综述见 `ai-memory-research-review.md`（待生成）。
> 生成时间：2026-05-31

---

## 整体画像（一句话）

天命演绎脑当前是**"每回合无状态快照 + 跨回合事件锚点分层压缩"**的混合记忆范式：单轮推演本身无对话记忆，靠三层记忆金字塔 + 主动注入的摘要来保留跨回合上下文；**摘要驱动而非检索驱动**，**无 token 预算管理**，NPC 关系/恩德持久化但分散、缺统一变更日志。

---

## (1) 提示词组装

- 主组装：`tm-endturn-prompt.js:69` `TM.Endturn.AI.prompt.build(ctx)` 构建 sysP + tp(base)；`tm-prompt-composer.js:204-232` `buildCommon()` 组合基础段落。
- 注入内容块：基础设定(composer:55-68)、本朝特设(84-88)、玩家附注 aiPersona/systemPrompt(74-78)、叙事风格(95-110)、编年体笔法(116-127)、时间粒度(133-148)、诏令生命周期9阶段(prompt:104-151)、推演依据A-E五层(prompt:175-181)、玩家直接指令+持久规则(prompt:183-249)、运行时态势力/党派/军情快照(ai-context:47-110)、NPC预规划(ai-context:112-122)、硬约束块(composer:270-279)。
- **评价：注入结构强、分层清晰、含动态运行时态；但历史靠外部注入、单轮不累积。**

## (2) 历史/记忆注入

- 跨回合 AI 摘要：`GM._aiMemorySummaries`，注入最近 3 条 `slice(-3)`（prompt:3315-3320）。
- 编年事后语：`GM.chronicleAfterwords[]`，注入上回合回顾（prompt:689-694）。
- 记忆锚点系统：`GM.memoryAnchors[]` / `GM.memoryArchive[]`，三层金字塔 L1(最近5回合原始)/L2(每5回合摘要)/L3(每30回合纲要)；`getMemoryAnchorsForAI(8)` 按 importance 取 topK（tm-memory-anchors.js:24-72, 189-228）。
- 历史回顾段：生成【历史纪要】【近期要事】含角色弧线+玩家决策轨迹（prompt:686-694）。
- 局势记忆查询：SC0 深度思考的 `memoryQueries` 字段，支持四源查询（NPC个人记忆 / ChronicleTracker / shijiHistory / 伏笔库），可按关键词/回合范围/参与者筛选（tm-endturn-ai.js:1140-1143）。
- 选择策略：锚点按 importance 排序取 topK(默认8)；摘要滑动窗口最近3条；无全量注入、无 token 预算截断。
- **评价：能力中等。有滑动窗口+优先级，但缺"近期N条原始事件"完整链；memoryQueries 灵活但需 AI 主动声明。**

## (3) NPC/人物记忆

- 亲疏值：`GM.affinityMap[key]` 哈希 `{nameA|nameB: value∈[-100,100]}`，`AffinityMap.get/set/delta/getRelations`、`getSignificantRelations(threshold)`（tm-help-social.js:787-833；初始化 tm-save-lifecycle.js:48）。
- 忠诚度：`char.loyalty`（对所属势力/首领，非对玩家），AI 权重 + 硬约束（composer:276）。
- 识别状态：`char.recognitionState = {subject,familiarity,level,lastTurn,lastEvent,lastEmotion,lastWho,summary,history[]}`，`buildRecognitionState()` 注入【NPC识别状态】（composer:154-188）。
- NPC 隐藏议程：`GM._aiInferencePlan.npcHiddenAgenda[name]` 120字动机（ai-context:159-164）。
- 第一回合反应：`npcFirstTurnReaction[name]`，仅 T<=2 注入（ai-context:183-188）。
- 累积/更新：互动后由 AI 或显式规则更新；**无事件日志追溯**（查不出"T5 谁恩德了谁"）。
- **评价：中等偏弱。有亲疏值/忠诚/识别状态，但缺"恩德历史"和"承诺债务"的持久化追踪；隐藏议程是动态注入非持久记忆。** ←—— 直接对应 owner 长期痛点"恩德不累积"。

## (4) 摘要/压缩机制

- 三层金字塔 `_ensureMemoryFreshness(GM)`：L1(≤20条·最近5回合原始·每回合同步)、L2(≤12条·每5回合摘要·纯本地合并无AI)、L3(无上限·每30回合纲要·累积不丢)（tm-memory-anchors.js:296-398）。
- 锚点归档 `archiveOldMemories`：超 anchorLimit(默认40) 按年份压缩为"年度纪要"(top-3 events/年)，同步无AI、substring 硬截断(50~400字)（236-289）。
- 兜底压缩：`_aiMemory.length > memHardLimit(默认100)` 且 >10 回合未压缩 → 保留最近50%原始、旧条目合并 1 条 `type:'compressed'`，substring(0,1200)（366-394）。
- Prompt 分层缓存 `PromptLayerCache`：固定层(朝代/官制/规则) hash 检测复用、速变层每回合重建（tm-ai-infra.js:27-72）；sysP 超 `contextK*512` 字符则末尾截断（prompt:3384-3389）。
- **无显式 token 预算**：压缩/截断被动触发，topK 硬写死(8)，不按可用 token 动态调整。
- **评价：能力强（金字塔+年度归档+兜底）；但缺 token 预算驱动的主动截断，压缩用 substring 而非 AI 摘要。**

## (5) AI 调用与上下文

- **单轮单向**：`messages:[{role:system,content:_maybeCacheSys(sysP)},{role:user,content:tpX}]`，无 assistant、无对话历史，每回合从零重建（tm-endturn-ai.js:1144,1215,3084）。
- 子调用清单：sc0 深度思考(12K)→tensions/memoryQueries；sc05 记忆审视(5K)；sc1q 对话承诺(3.5K)→dialogue_commitments；sc1 主推演(12-16K)；sc1b/c/d 文事/外交/实录(可选)；sc15-sc28 后续系统。每个 subcall 独立单轮、无累积。
- 无 `GM.conversationHistory`/`_chatHistory` 多轮累积；memoryQueries 是唯一向历史"查询"机制（但返回也是单次注入，不持久累积）；SC05 memoryReview 也是单次生成不作下轮输入。
- 缓存仅对 sysP 做 Anthropic cache_control，目的减少固定层重算、非对话历史（ai.js:1503 `_maybeCacheSys`）。
- **评价：架构清晰可控；但本质是"状态快照+指令"的无状态调用，不具备对话记忆累积。**

---

## 五条结论（供研究综述"对天命的启示"对照）

1. **单轮推演无记忆链**：`推演_Tn = f(sysP, 状态快照n, 指令n)`，与 `推演_T(n-1)` 无因果链接。
2. **跨回合记忆三层金字塔**（L1/L2/L3）已存在，思路接近学界分层记忆，但摘要为本地字符串合并、非 AI/语义。
3. **NPC/关系持久化但分散**：AffinityMap / loyalty / recognitionState / hiddenAgenda 四处分管，无统一"关系/恩德变更日志"——这正是"恩德不累积"的结构根源之一。
4. **摘要驱动而非检索驱动**：历史是被主动注入的，不是被语义检索的；memoryQueries 是半检索雏形但需 AI 主动声明且不持久索引。
5. **无 token 预算管理**：压缩/截断被动、topK 硬写死，不随可用上下文动态规划。
