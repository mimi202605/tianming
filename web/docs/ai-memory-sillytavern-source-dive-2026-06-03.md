# 酒馆（SillyTavern）AI 机制与记忆系统 · 源码级深度调研报告

> 目的：为「天命」LLM 历史模拟游戏的 AI 记忆系统（方向：**纯文本主干 + 向量增强 + 统一记忆日志**）提供可借鉴的设计输入。
> 方法：两段式调研。① docs/社区层（deep-research 框架，5 角度 × 20 源 × 25 断言 3 票对抗核查，22/25 确证）；② 源码层（本地浅克隆 `SillyTavern/SillyTavern` + `qvink/SillyTavern-MessageSummarize` + `aikohanasaki/SillyTavern-MemoryBooks`，9 个 agent 直读真实源文件，带 `file:line` 引用）。
> 版本锚点：SillyTavern commit `51ad27fb`（release 分支，2026-06）。参数默认值随版本会变，落地前以安装版本为准。

---

## 0. 一句话结论

SillyTavern 的"记忆"**不是一个存储，而是一套分层、位置感知的 prompt 注入系统**：底层有一个统一原语 `setExtensionPrompt(key, value, position, depth, role)`，World Info（关键词检索）、Author's Note、Summarize（滚动总结）、Vector Storage（RAG）全部经它把文本"摆"进 prompt 的特定位置/深度。这个"**一条注入管道 + 多个可插拔激活器**"的范式，恰好就是天命「纯文本主干 + 向量增强」该长的样子——主干是确定性的关键词/recency 注入，向量只是把"老但相关"的叶子重新激活进**同一条**预算/优先级/去重管线，而不是另起一条竞争注入。

---

## 1. 总体架构：记忆 = 分层位置感知的注入

把"记忆"拆成五层，全部最终落到同一个注入原语上：

| 层 | 机制 | 检索方式 | 注入原语 key |
|---|---|---|---|
| 世界设定/事实 | World Info / Lorebook | 关键词扫描（+可选向量） | 经 `worldInfoBefore/After` 与 `CUSTOM_WI_DEPTH_ROLE` |
| 作者旁白/导向 | Author's Note | 常驻、按 depth+frequency | `2_floating_prompt` |
| 滚动压缩 | Summarize（内置 memory） | 线性滚动总结 | `1_memory` |
| 语义召回 | Vector Storage / Data Bank | embedding 相似度 | `3_vectors` / `4_vectors_data_bank` |
| 运行时脚本 | `/inject`、群聊 depth prompt、QR 自动执行 | 脚本/事件驱动 | `script_inject_*`、`DEPTH_PROMPT_INDEX(i)` |

**核心原语**（`public/script.js`）：
- 注册表：`extension_prompts = {}`（`script.js:625`，`clearChat` 时整体重置 `:1588`——**每回合/每次载入要重新注册，不持久**）。
- 写入：`setExtensionPrompt(key, value, position, depth, scan=false, role=SYSTEM, filter=null)`（`script.js:8866`）。**同 key 覆盖**（一个 id 一个槽，幂等更新）；空 value = 禁用。
- 位置枚举（`script.js:483`）：`NONE:-1, IN_PROMPT:0, IN_CHAT:1, BEFORE_PROMPT:2`。**注意没有 `AFTER_PROMPT`**——"after"就是 `IN_PROMPT`(0，story string 之后)，"before"是 `BEFORE_PROMPT`(2，story string 之前)，命名不对称。（这条修正了 docs 调研里被否决的"两个对称 anchor"说法。）
- 角色枚举：`{SYSTEM:0, USER:1, ASSISTANT:2}`。
- 读取/合并：`getExtensionPrompt(position, depth, sep, role, wrap)`（`script.js:3242`）——按 `Object.keys(extension_prompts).sort()` **字母序**取同位置同深度的项，`filter()` 闭包逐个 await 过滤，`join('\n')`，最后 `substituteParams` 跑宏。**排序唯一 tie-break 是 key 字符串**（无优先级/权重字段）。
- IN_CHAT 织入：`doChatInject(messages)`（`script.js:5569`）把消息数组 reverse，`for i in 0..MAX_INJECTION_DEPTH(=10000)`，每个 depth 按 `[SYSTEM,USER,ASSISTANT]` 顺序取注入、splice 成"伪消息"再 reverse 回去。depth 0 = 紧贴最后一条。

> ⚠️ **共性反模式**：`getExtensionPromptMaxDepth()` 写死 `return 10000`（`script.js:3222`，自适应版本被注释掉），所以每次生成都跑 0..10000 的空扫，`O(10001 × roles × prompts)`。天命的统一日志**必须按实际 depth 建索引**，绝不能照抄这个暴力循环。

---

## 2. 官方核心记忆体系（docs + 源码双层）

### 2.1 World Info / Lorebook 引擎 —— 确定性关键词检索层

入口 `checkWorldInfo(chat, maxContext, isDryRun)`（`world-info.js:4597`）。

**扫描窗口**：`WorldInfoBuffer` 存 reversed chat（`chat[0]`=最新），`getDepth()= world_info_depth + skew`（默认 `world_info_depth=2`，即只扫最近 2 条），每条 entry 可用 `entry.scanDepth` 覆盖。`MAX_SCAN_DEPTH=1000` 硬顶。消息间用 `\x01` MATCHER 字符分隔，使整词边界正则不跨消息匹配。

**关键词匹配** `matchKeys`（`:337`）：
- 若 key 写成 `/pattern/flags` 字面量 → 纯 `regex.test`，**覆盖大小写与整词所有设置**。
- 否则默认 lowercase（除非 `caseSensitive`）。整词模式（默认关）：单词用 `(?:^|\W)(key)(?:$|\W)`；**多词 key（含空格）退化成纯 `includes()` 子串**（footgun：'New York' 会子串误匹配）。
- 非整词 = 纯子串。

**主/次关键词 + selective 逻辑**（`:4793`）：`selectiveLogic = AND_ANY:0 / NOT_ALL:1 / NOT_ANY:2 / AND_ALL:3`。源码注释"all entries are selective now"——selective 标志实际恒真。

**立即激活优先级**（`:4733` 的短路顺序）：disabled → 生成类型 triggers → characterFilter（名/标签）→ 时效（sticky/cooldown/delay）→ delayUntilRecursion → excludeRecursion → `@@activate/@@dont_activate` 装饰器 → **externalActivations（向量强制）** → `constant` → sticky → **最后才是关键词匹配**。即 constant/sticky 完全跳过关键词扫描。

**递归 / min-activations 状态机**：`scanState ∈ {INITIAL,RECURSION,MIN_ACTIVATIONS,NONE}`。`world_info_recursive`（默认关）时激活项的 content 回灌 buffer 触发更多项；`delayUntilRecursion` 分级；`world_info_min_activations` 不足则 `advanceScan()`（skew++）拓宽窗口重扫；`world_info_max_recursion_steps` 硬顶（设非 0 即关闭 min-activations 增长）。

**预算填充与排序**：`budget = round(world_info_budget * maxContext / 100) || 1`（默认 25%），`world_info_budget_cap>0` 时夹到绝对上限。排序：sticky 优先 → `getSortedEntries` 预排（chat lore → persona lore → char/global，按 `order` 降序，号大越靠后越贴近 prompt 末尾）。`ignoreBudget` 项无视上限；超预算后 `token_budget_overflowed=true`、后续非 ignoreBudget 项 break。概率 `verifyProbability`：失败项**整轮永久排除**（`failedProbabilityChecks`）。

**包含组（inclusion groups）**：同 `group` 互斥；可按 key 命中打分（`getScore`）选优，或按 `groupWeight`(默认100) 加权随机，或 `groupOverride` 强优先。→ 天命做"同一事实多版本只取一条"可借鉴。

**位置分桶 → 注入**（`:5084`）：按 `position` 枚举 `before:0, after:1, ANTop:2, ANBottom:3, atDepth:4, EMTop:5, EMBottom:6, outlet:7` 用 `unshift` 反序摆放。atDepth 项经 `setExtensionPrompt(CUSTOM_WI_DEPTH_ROLE(depth,role), ..., IN_CHAT, depth, ..., role)` 注入（`script.js:4612`）。

**向量化 WI 条目**（关键发现，修正 docs 调研）：`checkWorldInfo` **从不读 `entry.vectorized`**。向量化条目由 Vectors 扩展 out-of-band 激活：`activateWorldInfo`（`vectors/index.js:1623`）对 `entry.vectorized` 项做 `queryMultipleCollections(..., max_entries, score_threshold)`，命中后发 `WORLDINFO_FORCE_ACTIVATE` 事件 → 写进 `WorldInfoBuffer.externalActivations` → 下一轮 `getExternallyActivated` 强制激活。**即：关键词路径与向量路径完全解耦，向量只是往同一条管线塞候选。** ←★ 这是天命架构最该抄的范式。

**坑**（源码可见）：
- 向量化条目在 Vectors 扩展关闭时**彻底不触发**（无关键词后路）。→ 主干的确定性路径必须**单独自足**，向量严格增量。
- `getSortedEntries` 每回合 `structuredClone` 全量 + 每条 JSON-hash，`O(n)` 克隆+哈希——**长日志扛不住**（呼应你自己的 perf-audit / 增量 autosave 教训）。
- `${world}.${uid}` 全局键，跨书同名+同 uid 会互相覆盖。

### 2.2 Author's Note —— 可控注入槽范式

docs 确证（`docs.sillytavern.app/usage/core-concepts/authors-note/`）：「在任意位置、任意频率插入一段文本」。`depth`（0=对话最末，4=倒数第4条前）+ `frequency`（每 N 轮一次，0=从不）。**铁律：越靠 prompt 底部，对下一次回复影响越大**（recency bias）。源码上它就是 `setExtensionPrompt('2_floating_prompt', ...)`（`authors-note.js:383`），禁用时写空 value（`:352`）。→ 给"高优先级记忆"排序的可测试规则。

### 2.3 Summarize 内置扩展（`extensions/memory/index.js`）—— 线性滚动压缩

- **双阈值触发**（`getSummaryPromptForNow :565`）：从末尾倒走累计 `messagesSinceLastSummary` 与 `wordsSinceLastSummary`，命中上一锚点 break。`promptInterval`(默认10条) **或** `promptForceWords`(默认0=关) 任一满足即触发。
- **滚动/增量**（`:761`）：**是滚动总结**。RAW builder 显式把上一条总结 `latestSummary` 取出、只缓冲其 anchor index **之后**的消息，`getMemoryString = [system]+[latestSummary]+[buffer]` ——`O(新增消息)` 成本。默认 generateQuietPrompt 路径则靠 prompt 文案"use that as a base and expand"隐式滚动。
- **持久化/锚定**（`setMemoryContext :964`）：总结写进 `chat[idx].extra.memory`，默认锚到**倒数第二条**（`chat.length-2`）。**没有专用 metadata key**，"当前总结"靠 `getLatestMemoryFromChat` 反扫恢复（且**永远跳过最后一条** `reversedChat.shift()`）。
- **回滚**：编辑/重生成最后一条且 hash 变 → 删该锚点总结；删消息 → 重注入最新；切聊天 → 重新同步。
- **注入**：`setExtensionPrompt('1_memory', formatMemoryValue(summary), position=IN_PROMPT, depth=2, scan=false, role=SYSTEM)`，模板 `[Summary: {{summary}}]`。
- **官方自承的坑 + 源码坑**：docs 明确警告"总结有损、会幻觉，须人工核对"；源码层：默认 source=`extras`（本地 BERT，stock 安装没装则**静默无操作、无 UI 警告**）；`extractAllWords` 词数统计**对中文不准**（CJK 无词边界）——天命用词数阈值不可靠，应按 token/字符。

### 2.4 Vector Storage / Data Bank（`extensions/vectors/index.js` + `src/endpoints/vectors.js`）—— RAG 层

- **分块** `splitRecursive`（`utils.js:1157`，**按字符 `String.length` 非 token**）：分隔符顺序 `['\n\n','\n',' ','']`（段→行→空格→硬切），`force_chunk_delimiter` 可前置/独占。**→ issue #2625 的 newline-aware 分块其实已落地**（修正 docs 调研"未实装"的存疑）。但最后的 `''` 意味超长原子块仍会**词中硬切**。
- **重叠**（`vectorizeFile :727`）：先把 chunkSize 缩掉 overlapSize 再切，回填时在句边界（`trimToStartSentence/EndSentence`）拼接。
- **查询**（`getQueryText :901`）：取最近 `query`(默认2) 条非空消息（去附件、newest-first）join。
- **Top-K + score 阈值**（**过滤在服务端** `vectors.js:385`）：`score_threshold` 默认 **0.25**；topK：chat `insert=3` / file `chunk_count=2` / DB `chunk_count_db=5` / WI `max_entries=5`。**不对称 bug**：chat 记忆走 `hashes`（取全部 topK，**忽略阈值**），file/DB 走 `metadata`（**遵守阈值**）；且服务端阈值缺省回落 0.0（传 0 = 不过滤）。
- **注入**（`rearrangeChat :776`，注册为 `generate_interceptor`）：生成前跑，**把命中的旧消息从 live chat 数组 splice 出去**（`:843`，`protect=5` 保护最近5条），再 `setExtensionPrompt('3_vectors', 'Past events:\n{{text}}', IN_PROMPT, depth=2)` 重注入。检索消息按相关度**反序**（最相关贴最后）；file/DB chunk 按文档 `.index` 时序排。
- **embedding 后端**：默认本地 `transformers`(ONNX `jina-embeddings-v2-base-en`)，可换 ollama/llama.cpp/vLLM/OpenAI/Cohere 等。
- **坑**：字符分块（CJK token 数不可预测）；exact-hash 去重（宏展开变文本就 orphan）；**splice 破坏源**（注入若放不下，那批消息这回合直接消失）；阈值不对称。

### 2.5 上下文拼装：两条路，差异巨大

**Chat-completion（OpenAI 等）= 可重排 marker 系统**（`openai.js`）：
- `prepareOpenAIMessages :1533` → `preparePromptsForChatCompletion`（建有序集合）→ `populateChatCompletion`（按 token 预算逐条填）。
- 顺序由**用户拖拽的 marker 顺序**决定（`promptManager.getPromptCollection`），seed 数组只是给 marker 槽填内容。每个 prompt 有 `injection_position/depth/order/role` 覆盖。
- summary/authorsNote/vectors 都**锚在 'main' 旁**（`injectToMain :1256`）——最终位置取决于用户把 main 放哪。
- 历史填充 `populateChatHistory :876`：`[...messages].reverse()` newest-first，`insertAtStart` 保时序，`canAfford` false 即停（**丢最旧**）。example 是**整块全有或全无**。
- 深度注入 `populationInjectionPrompts :801`：按 `injection_order`(默认100) 降序分组、`[system,user,assistant]` 织入。
- `reserveBudget/freeBudget` 两段预留：必含项先占预算，不被裁。←★ 天命该抄。

**Text-completion = 单一 Handlebars 模板**（`power-user.js` `renderStoryString :2234`）：
- `story_string` 模板，字段 `{{description}}{{personality}}{{scenario}}{{persona}}{{wiBefore}}{{wiAfter}}{{mesExamples}}` 等，顺序写死在模板里。
- token 裁剪（`script.js:4713`）：`this_max_context = maxContext - maxResponse`；WI 预算**不显式扣减**，只是把 prefix 撑大间接挤占；chat 倒序累加 `< this_max_context` 即停（**首条超就丢所有更旧**，order-naive）；`checkPromptSize` 仅 continue 时做二次递归裁剪。
- **坑**：两条 codepath（OAI vs text）割裂——天命统一日志应**只有一个拼装器**；深度注入"user shot himself in the foot"**不设上限**会饿死历史——增强层必须对主干设预算上限。

---

## 3. AI 机制全景

**角色卡**（docs 确证）：v2（`malfoyslastname/character-card-spec-v2`）、v3（`kwaroran/character-card-spec-v3`）。v3 内嵌 `character_book`（`scan_depth/token_budget/recursive_scanning/entries[]`）——**可序列化、自包含的记忆 schema 范式**，天命做"剧本自带记忆种子"可参考。卡片以 PNG `tEXt` chunk 嵌 base64 JSON。

**群聊**（`group-chats.js`）：
- 每个发言成员**整条 prompt 重拼**（swap `this_chid/name2` → `Generate('normal')`）——每角色看到不同上下文。
- `generation_mode`：SWAP(0,默认)=只用当前发言者卡 + 其 depth prompt；APPEND(1)=所有成员卡 `\n`-拼接（**无去重、会泄露每个角色隐藏信息给所有人**）；APPEND_DISABLED(2)=连禁用成员也并。
- `getGroupDepthPrompts`：APPEND 模式下**所有成员的 depth prompt 同时在场**，各按自己 depth 注入。
- 激活策略 NATURAL：`talkativeness >= Math.random()` 独立掷骰（可多人同回合激活）+ @提及 + 禁上轮发言者重复。`disabled_members` = mute。
- ←★ 群聊"每个 actor 看到共享主干的一个过滤切片"正是天命多势力/多角色记忆的范式。

**正则三段**（`extensions/regex/engine.js`）：`getRegexedString(str, placement)`，placement = USER_INPUT/AI_OUTPUT/SLASH_COMMAND/WORLD_INFO/REASONING。同一条消息在**显示**（`markdownOnly`，仅渲染）/**prompt**（`promptOnly`，仅送 LLM）/**摄入**（两 flag 都无 → **改写存储文本，不可逆**）三个 pass 独立跑。→ 天命要的是**单一权威主干文本**，别学这种三视图分叉（已知 footgun）。

**STScript `/inject`**（`slash-commands.js:3778`）：运行时记忆杠杆。`/inject id position(before/after/chat/none) depth(默认4) role scan ephemeral filter`，**持久化进 `chat_metadata.script_injects[id]`**（跨回合/重载存活，载入时 `processChatSlashCommands` rehydrate）+ 写 live `setExtensionPrompt`。`ephemeral` 在 GENERATION_ENDED 自动移除。**坑**：陈旧 `/inject` 会**永久污染** prompt 直到 `/flushinject`——天命统一日志需显式 TTL/eviction。

**Quick Reply 自动执行**（`quick-reply/index.js`）：QR 槽绑生命周期事件（APP_READY/USER_MESSAGE_RENDERED/CHARACTER_MESSAGE_RENDERED/CHAT_CHANGED/GENERATION_AFTER_COMMANDS 等）跑 STScript——社区维护运行时状态的标准姿势（如每回合自动 `/inject`、`/setvar`）。

---

## 4. 第三方记忆扩展（源码级）

### 4.1 qvink MessageSummarize（社区最推记忆扩展）

**架构 = per-message "micro 总结" + 短/长两层 + 零向量**：
- **每条消息单独总结**（不是整局滚动），存 `message.extra.qvink_memory.{memory,hash,remember,include,...}`，并镜像进 `swipe_info`。编辑/删一条只影响那一条记忆——**避开"一次坏生成毁掉整个滚动总结"**（正对你的"民心 aggregate 蒸发"教训）。
- **两层**（`update_message_inclusion_flags :3799`，反向遍历）：短期自动（按 token 预算 newest-first 纳入，默认占 context 10%），满了则只有手动点"记住"(`remember`)的进**长期**（另有 10% 预算，超了也会掉出并标红）。`separate_long_term` 强制 remembered 进长期（可能破坏时序）。
- **注入**：`setExtensionPrompt('qvink_memory_long'/'_short', ..., IN_PROMPT, depth=2)` + 注册全局宏 `{{qm-short-term-memory}}/{{qm-long-term-memory}}`（"算记忆"与"摆记忆"解耦）。
- **省 token**：`exclude_messages_after_threshold`（默认开）经 generate_interceptor 把超阈值的完整消息从 outgoing prompt 删掉、用其总结替代。
- **独立 connection profile** 跑总结（可 temp=0）。
- **坑**：**纯位置召回、无语义**（README 明说无 embedding/RAG）；老但相关的事实一旦超预算且没人手动 pin 就**静默蒸发**；预算数学近似；阈值每回合移动**爆 prompt cache**；单条孤立总结易丢主语（"a person/someone"）。
- → ★ 借鉴 per-event 叶子 + 短/长两层 + 注入解耦；**向量增强正是补它"无语义召回"这个洞**。

### 4.2 MemoryBooks（auto-lorebook from chat）

**架构 = 把聊天自动炼成 World Info 条目 + 多层 arc 合并**：
- **范围编译**（`chatcompile.js`）：按消息 index 区间收集（跳 `is_system` 隐藏消息），**不跑正则**。
- **生成结构化 JSON**（`stmemory.js`）：prompt 要求只返回 `{title(1-3词), content, keywords[]}`，走 JSON schema + dirty-json 修复 + 截断分类错误（NO_JSON_BLOCK/UNBALANCED/...）。把"前序记忆"作为 `=== PREVIOUS SCENE CONTEXT (DO NOT PROCESS) ===` 喂入但不重处理。
- **建条目/键/位置**（`addlore.js`）：`entry.content`=记忆、`entry.key`=suggestedKeys（关键词层）、`entry.comment`=标题、`constVectMode` blue/green/link → constant/keyword/vectorized；盖 `entry.stmemorybooks=true`（**所有权标志，无启发式回退**）+ `STMB_start/STMB_end`（覆盖游标）。
- **去重两层**：① 消息**区间重叠**门（`ns<=e && ne>=s` 抛 review）；② 前序上下文喂入防重炼。**注意是 index 区间去重、非语义**。
- **多层 arc 合并**（`arcanalysis.js`）：tier 0=memory,1=arc,2=chapter,3=book,4=legend,5=series,6=epic。分批（每批12项、最多10轮）让模型把低层条目合并成高层 recap（CANON-DO-NOT-REWRITE 锚定已接受的），回填 15-30 个检索关键词（带情感/抽象词停用表），可选禁用原条目。**仅用户确认时触发**（达 minChildren 默认5）。
- **幂等 upsert-by-title**：living tracker（侧 prompt）按**标题精确字符串**更新同一条而非追加。
- **坑**：index 区间去重抓不到"同事件不同回合"；exact-title 键脆（改名即重复）；`char/4` 估 token（CJK 不准）；前序上下文是 naive last-N 非检索。
- → ★ 借鉴：append-only 结构化叶子 + 滚动高层合并（=主干 + 周期 recap）、所有权标志 + 覆盖游标（增量只消费新叶子）、按稳定 ID 幂等 upsert（恩德/关系 tracker = 一条被反复重写）。

---

## 5. 横向对照（社区实践与争议）

| 维度 | World Info | Summarize(内置) | Vectors/DataBank | qvink | MemoryBooks |
|---|---|---|---|---|---|
| 检索 | 关键词(+可选向量) | 无(线性滚动) | 语义相似度 | 纯位置(短/长) | 关键词/向量(条目级) |
| 存储 | 独立 lorebook 文件 | `chat[].extra.memory` | 向量库(Vectra) | `message.extra` | lorebook 条目 |
| 压缩 | 无(人工写) | LLM 滚动总结 | 无(切块) | LLM per-message | LLM scene + 多层 arc |
| 失真风险 | 低(确定性) | **高(滚动累积漂移)** | 中(召回错) | 中(孤立总结丢主语) | 中(JSON 解析失败) |
| CJK 友好 | 中(整词多词退化) | **差(词数阈值)** | **差(字符分块)** | 中 | 差(char/4) |
| 持久/跨局 | ✔ | ✘(随 chat) | ✔(库) | ✘(随 chat) | ✔(lorebook) |
| 天命可借鉴度 | ★★★★★ | ★★★ | ★★★★ | ★★★★ | ★★★★ |

公认坑（docs 警告 + 源码 + 社区）：lorebook token 膨胀、滚动总结失真、字符分块切碎结构化文本、向量召回阈值难调、CJK 处处水土不服。

---

## 6. 映射到天命「纯文本主干 + 向量增强 + 统一记忆日志」

### 6.1 可借鉴（BORROW）

1. **"一条注入管线 + 可插拔激活器"**（来自 WI×Vectors 解耦）：主干 = 确定性的 constant/keyword/recency 叶子，**永远自足**；向量 = 把"老但相关"的叶子经事件 force-activate 进**同一条**预算/优先级/去重管线。绝不让向量另起一条竞争注入。
2. **统一注入原语**（`setExtensionPrompt` 范式）：一个 keyed registry，**一个 id 一个槽、同 id 覆盖**——正合你"改源头叶子非直写聚合值"的纪律（让叶子成为 source）。配 `position + depth + role` 寻址 + `filter()` 惰性闸（向量相关性可做成"检索到才返回 true 的 filter"）。
3. **两段预算预留**（`reserveBudget/freeBudget`）：必含的主干记忆先占预算永不裁；向量命中只填剩余空间。再给向量层一个 `budget% + 绝对 cap + ignoreBudget 逃生口`（照 WI 的 `world_info_budget=25% / world_info_budget_cap`）。
4. **per-event 叶子 + 短/长两层**（qvink）：每个事件独立"micro 记忆"绑其 source record（带稳定 hash 做增量重建），短期 recency 窗 + 手动 pin 长期——**确定性、非 LLM 的记忆控制器**。
5. **主干 + 周期 recap 的滚动压缩**（Summarize 增量路径 + MemoryBooks arc）：上一条 recap 显式前置、只消费 anchor 之后的新叶子（`O(新增)`）；高层 recap 是低层的合并，锚定"已接受"防重写。
6. **所有权标志 + 覆盖游标 + 幂等 upsert**（MemoryBooks）：每条叶子盖 owner flag + coverage cursor（类 `highestMemoryProcessed`），增量只吃新叶子；恩德/关系 tracker 按**稳定 ID** upsert（一条反复重写，非追加）。
7. **群聊"每 actor 看共享主干的过滤切片"**：天命多势力/多角色，各 actor 只见与己相关的记忆切片，而非全局态。

### 6.2 要规避（AVOID）

1. **每回合 `structuredClone` 全量 + JSON-hash**（WI）——长日志必崩，要增量/索引去重（正合你的 perf-audit / 增量 autosave 教训）。
2. **写死 0..10000 深度暴扫**——按实际 depth 建索引。
3. **字符数分块 + 词数阈值**——天命中文，**必须按 token 或语义记录边界**分块/计量，绝不按 char/word。
4. **content-hash 当身份**（宏展开就 orphan）——用**持久 record key**，别用内容哈希（正合你"minxinLocal vs div.minxin 命名/模糊匹配"教训）。
5. **index 区间去重 / exact-title 键**——按实体/关系语义键去重，按稳定 ID upsert。
6. **存储只藏在 per-message extra + 反扫恢复**（Summarize/qvink）——天命要**显式 keyed 的权威主干存储**，不靠反扫重建。
7. **纯位置召回**（qvink）/ **naive last-N 上下文**（MemoryBooks）——这正是**向量增强要填的洞**。
8. **三视图文本分叉**（正则 display/prompt/stored）——主干保持**单一权威文本**。
9. **陈旧 `/inject` 永久污染**——统一日志要 TTL/eviction（照 ephemeral）。
10. **两条割裂的拼装 codepath**——天命只要**一个拼装器**；增强层永远对主干设预算上限（别学"uncapped 深度注入饿死历史"）。

### 6.3 建议骨架（天命统一记忆日志）

```
统一记忆日志（权威、持久、keyed）
├─ 叶子层 entries[]：{id, owner, type(事件/恩德/关系/...),
│     coverageCursor, ts, text, keys[], pinned, sourceHash, embedding?}
│     · append-only；改源头叶子非直写聚合
├─ 压缩层 recaps[]：周期把旧叶子合并成 tier-N recap（锚定已接受，防重写）
└─ 注入装配（单一拼装器，token 预算两段预留）
    ├─ 确定性主干：constant + 关键词(整词,中文分词) + recency 窗 + pinned   ← 永远自足
    ├─ 向量增强：embedding 召回"老但相关"叶子 → force-activate 进同一管线  ← 严格增量、有预算 cap
    └─ 运行时杠杆：per-actor filter 切片 + TTL/ephemeral 注入
```

---

## 7. 来源

**官方一手（docs，3-0 确证）**：
- World Info: `raw.githubusercontent.com/SillyTavern/SillyTavern-Docs/main/Usage/worldinfo.md` · `docs.sillytavern.app/usage/core-concepts/worldinfo/`
- Author's Note: `docs.sillytavern.app/usage/core-concepts/authors-note/`
- Summarize: `docs.sillytavern.app/extensions/summarize/`
- Data Bank/Vectors: `docs.sillytavern.app/usage/core-concepts/data-bank/`
- Context Template: `docs.sillytavern.app/usage/prompts/context-template/`
- 角色卡: `github.com/kwaroran/character-card-spec-v3` · `github.com/malfoyslastname/character-card-spec-v2`
- 分块改进: `github.com/SillyTavern/SillyTavern/issues/2625`（**已落地**）· 历史 ChromaDB/Extras: `issues/1212`

**源码一手**（本地 clone `51ad27fb`，带 file:line）：
- `public/script.js`（注入注册表/主生成管线）· `public/scripts/world-info.js`（WI 引擎）· `public/scripts/openai.js`（Prompt Manager）· `public/scripts/power-user.js`（Story String）· `public/scripts/group-chats.js` · `public/scripts/slash-commands.js`（/inject）· `public/scripts/extensions/{memory,vectors,regex,quick-reply}/`
- `qvink/SillyTavern-MessageSummarize`（index.js + README）· `aikohanasaki/SillyTavern-MemoryBooks`（addlore/arcanalysis/stmemory/summaryTiers 等）

## 8. Caveats 与残留开放问题

- **版本敏感**：默认值/滑块名随版本变，落地以安装版为准。
- **稀疏 checkout 盲区**：`PromptManager.js`、`variables.js`（`/setvar` 实现）、`slash-commands/` 子目录未拉，故 chat-completion 默认 marker 顺序、`/setvar` 内部未源码核实。
- **docs 调研被否决的 3 条**（勿用）：① WI 的 "Constant/Selective/Vectorized 三策略 = 关键词+向量混合"框架（源码已澄清是两条解耦路径）；② emogie 扩展的 "RAG+LoRA+RLHF 三层"架构（0-3 否决）；③ "两个对称 anchor"注入（源码：枚举无 AFTER_PROMPT）。
- **未覆盖**：→ 已在 §9「盲区补全」处理。

---

## 9. 盲区补全（第三段调研）

> 第三段专补三大盲区：记忆树/层级方案、其它记忆扩展全景、Vectra 落盘与社区调参值。以下两块（记忆树、其它扩展）已完成；Vectra 服务端落盘、向量/WI 具体调参值、跨平台对照三块在重试中（首轮 4/6 agent 撞 StructuredOutput 速率失败，已分波重跑）。

### 9.1 记忆树 / 层级长期记忆设计（ST 生态 + 学术先例）

酒馆社区**确实有一小撮真·层级/树状长期记忆方案**，分两种范式：

**范式 A · 按"年龄/位置"递归滚动压缩树**
- **Summaryception**（`github.com/Lodactio/Extension-Summaryception`）= 最清晰的"总结金字塔"：verbatim 区（最近若干回合保留原文）→ Layer 0（批量直接总结）→ Layer 1（对 L0 的元总结）→ … 最多 5 层。每层满 30 snippet 即"晋升"，**N 合 1**（默认 3）→ 每层覆盖量 ~3× 几何增长；最老 snippet 无 LLM"种子晋升"，溢出的对目标层已有内容做**增量 delta** 总结。自称 ~1000:1 压缩（≈11000 回合塞进 ~16k token，**作者营销数、未独立验证**）。注入 = 整摞按 depth 注入（无检索）。

**范式 B · 按"语义/叙事"分层**
- **MemoryBooks**（已在 §4.2 源码级覆盖）：Scene→Arc→Chapter→Book→Legend→Series→Epic，存 lorebook 条目、关键词/向量激活。
- **Smart-Memory**（`github.com/senjinthedragon/Smart-Memory`）= **6 条并行分层、各自 token 预算 + 合并阈值**：长期事实（500 token/角色上限25）、会话内细节（400/30）、短期滚动摘要（context 80% 触发）、场景史（留5场/300 token）、故事弧/未结线（追10条/700 token，pinned 跨局持久）、离开回顾弹窗（4h+）。总记忆预算 ~3750 token；每 3 条消息抽取；事实 4 条/关系 3 条触发合并去重；按关键词打分排序、低分先裁。

**对照（非树）**：Timeline Memory（`unkarelian/timeline-memory`）是**线性**章节时间线，但亮点是 **tool-call 检索**（`query_timeline_chapter[s]` + agentic 填充）——最接近 RAPTOR/MemTree 的 collapsed-tree 按需检索。qvink / ReMemory 都是 flat/2 层，非递归树。

**学术先例**（ST 方案是启发式重造、**未见任何 ST 扩展真正引用/实装**这两篇）：
- **RAPTOR**（arXiv 2401.18059）：递归 embed→聚类(GMM+UMAP)→自底向上总结成树，collapsed-tree 检索跨抽象层；QuALITY +~20%。
- **MemTree**（arXiv 2410.14052, ICLR 2025）：**动态在线插入树**——新信息从根按"深度自适应余弦相似度"路由下行，发散则建新叶、并重写祖先节点；collapsed-tree 检索。

**三种注入/检索策略（与树怎么"建"正交，可自由组合）**：(a) 整摞 depth 注入（built-in Summarize / Summaryception，便宜、常驻、无检索）；(b) 关键词/向量 lorebook 激活（MemoryBooks / character-memory / Smart-Memory，选择性、可扩展）；(c) **tool-call 按需检索**（Timeline Memory，最贴近 collapsed-tree）。

→ **映射天命**：天命的「主干 + 周期 recap」本质就是范式 A 的树。**关键启示**：① 树的"建法"（年龄 vs 语义）与"注入法"（depth/关键词/tool-call）可解耦自由配——天命可"语义分层建树 + tool-call 按需检索"；② MemTree 的**动态相似度路由插入 + 祖先重写**是增量维护层级记忆的成熟范式，比 GraphRAG 全量重建更适合天命每回合变世界（呼应你已锁的"收窄到 Graphiti/Zep 式增量"决策）；③ Summaryception 的"种子晋升 + 增量 delta 总结"避免每次全量重炼，值得抄。

### 9.2 其它记忆/上下文/状态扩展全景（除 qvink & MemoryBooks）

酒馆记忆生态按**四种职能**分类，且有一条决定性事实：**SillyTavern-Extras 已于 2024-04 停更**——一切依赖它的（旧 Smart Context + Extension-ChromaDB 向量路、Extras-summarize 后端）**全部废弃**。现代栈全部跑在"Main API"（你的常规 LLM，经 Connection Profiles）。

| 职能 | 代表 | 说明 |
|---|---|---|
| **SUMMARIZER 总结** | 内置 Summarize、qvink、Summaryception、ReMemory、MemoryBooks | 压缩聊天为散文，经 Author's Note 槽注入 |
| **STORE 存储** | MemoryBooks、ReMemory、WorldInfoRecommender、DynamicLore | 持久化为 lorebook/World Info 条目 |
| **RETRIEVER 检索** | 内置 Vector Storage/Data Bank（替代 Smart Context）；~~Smart Context+ChromaDB(废)~~ | embedding/RAG 召回相关块 |
| **STATE TRACKER 状态** | 内置 Objective、kaldigo Tracker(+Enhanced/Sim/BetterSim)、SillyTavern-State、rpg-companion、WTracker | 每回合重生成结构化字段(地点/时间/装束/属性/关系/任务/库存) |

值得记的几个：
- **kaldigo Tracker**（`kaldigo/SillyTavern-Tracker`，~94★）= 领头的结构化状态追踪：每回合吐 JSON/YAML（时间/地点/天气/话题/角色字段），CC+TC 双模式走主 API。← 天命的"势力/人物状态每回合刷新"可直接参考其"结构化字段每回合重生成"范式。
- **Objective**（官方）= 目标/任务**树**状态追踪：把目标拆成 step/branch 任务树、自动生成、对照聊天自动判完成。← 天命"长期目标/计划"追踪可借鉴。
- **WorldInfoRecommender** / **DynamicLore** = 把聊天上下文喂 LLM **自动建/更新 lorebook 条目**（= 自动记忆存储生成器，类 MemoryBooks 的轻量路）。
- **timeline-memory / Smart-Memory** = 新兴**混合体**（总结+存储+检索），但星少、采用度不及 qvink/MemoryBooks。
- **LALib**（`LenAnderson/SillyTavern-LALib`，v3.12.x，活跃）= STScript 脚本库（条件/列表/字典/WI 查询），众多自制记忆/状态脚本的底座——基础设施而非记忆功能本身。
- **Timelines**（官方）= 聊天分支**可视化导航**，**不是记忆系统**（常被误归类）。

→ **映射天命**：① **状态追踪（Tracker/Objective）是天命被低估的一类**——天命的势力健康度/人物关系/任务其实更像"每回合重生成的结构化 tracker"而非散文记忆，可独立成一层（结构化 state 每回合刷新，与叙事记忆主干分开）；② "自动建 lorebook 条目"（WorldInfoRecommender）= 把 AI 叙事自动炼成结构化记忆叶子的范式，正合天命统一日志的"叶子自动产出"；③ 避免依赖任何 Extras 式外置服务（天命 BYOK 同理，一切走玩家自接的 LLM）。

### 9.3 Vectra 服务端落盘（源码级 · `vectra@0.2.2` + ST `src/endpoints/vectors.js`）

ST 的向量库后端是 npm 包 **vectra**（一个极简本地向量库），落盘机制：

- **路径**：`directories.vectors/sanitize(source)/sanitize(collectionId)/sanitize(model)/index.json`（`vectors.js:300`）。`collectionId` = chatId / file id / WI 条目 id，**原样传入**。换 embedding model = **另起一个文件夹**（静默 model 隔离，旧索引变孤儿）。
- **格式**：单个 JSON `{version, metadata_config, items[]}`。每 item = `{id(uuid v4), metadata, vector(原始 float 明文 JSON 数), norm(预算 L2)}`（`LocalIndex.js:374`）。**全 metadata inline、float 以十进制文本存**（比二进制大得多）。
- **全量入内存**：`loadIndexData` 每次操作都 `readFile + JSON.parse` **整个文件**入 RAM 并缓存（`:328`）。query/list/insert/delete 都物化全部向量。10k 消息 × 384 维 ≈ ~30MB live + 多 MB JSON。
- **写 = 全量重写、无原子保证**：`endUpdate` 每次 `JSON.stringify` 全部 items **重写整个 index.json**（`:156`），**无 temp-file+rename、无 fsync** → 崩溃中途截断 → 下次 `JSON.parse` 抛错 → ST 的 `regenerateCorruptedIndexErrorHandler` **直接删整库**（静默全损、需重 embed）。批量 insert 一次 begin/end（好），但每个独立 `/insert` 又全量重写一次（日志越长越贵，**趋近二次方**）。`beginUpdate` 浅拷贝（`_update.items === _data.items`）是 latent bug。
- **查询 = 纯暴力**：`queryItems` 线性 `O(items×dims)` 余弦（`ItemSelector.normalizedCosineSimilarity`）+ 全量排序 + slice topK，**无 ANN/HNSW/IVF**。
- **端点**（`vectors.js`）：`/insert`(metadata `{hash,text,index}`)、`/list`(只回 hash 供客户端 diff 哪些已 vectorize)、`/delete`(按 hash `$in` 过滤)、`/query`(topK 默认 10、threshold 默认 **0.0**=不过滤；**确认 §2.4 不对称**：`hashes` 不过阈值、`metadata` 过阈值)、`/purge`。默认 transformers `{pooling:mean, normalize:true}` 预归一、batch 顺序逐个。
- **坑**：全量入内存 + 全量重写 + 明文 float 占盘 + 纯暴力扫描 + 无原子写(崩→删库) + model/dim 仅靠路径分区无 dim 守卫（混维→NaN 分数）。

→ **映射天命**：vectra 是**小集合够用、长 campaign 必崩的告诫基线**（正是 `_turnReport无界` 那种无界增长形态）。天命要：① **分片**向量库（按章/朝代/势力，类 vectra per-collection 文件夹），别让单一索引装下整段历史；② 老条目**摘要进纯文本主干后丢弃其向量**；③ 向量层**只存 id+hash+小 metadata+vector，权威 prose 留主干**——索引损坏可廉价重建；④ **原子写**（temp+rename 或 append-only log），**向量库永不做 source of truth**（主干才是系统 of record，向量是可重建缓存）；⑤ 每库 pin 死 embedding model+dim。

### 9.4 社区具体调参值（向量 / World Info / Summarize）

**向量（官方默认，高置信）**：chunk **400 字符**、score 阈值 **0.25**、query **2** 条、insert **3**、retain/protect **5**、默认本地 embedding **jina-v2-base-en**。官方建议阈值 **0.2(松召回)~0.5(紧精度)**。
**结构化记忆专用建议**（第三方 `character-memory` 扩展，中置信，**正对天命这种结构化记忆**）：chunk **~1000 字符**（容 2-3 条记忆块/chunk）、overlap **10-15%**（**0% 会切碎块**→同一 bullet 重复注入）、阈值 **0.3**（漏召降 0.2）、retrieve **2-3**（>5 黄牌"灌爆"）、query **1**、最佳 embedding `text-embedding-3-small` 或本地 `nomic-embed-text`。
**失败模式**：最常见"不召回"=**根本没开向量**（二元开关）；阈值太高滤掉重要；字符分块切碎结构块（改 overlap/chunk size 后须 **purge + 重 vectorize**）；轻量英文 embedder 长文/跨语种掉到 0.4-0.6、mxbai 512-token 截断。

**World Info**：Budget=0 时自动 **~20% context**；社区甜区 **20-30%**；scan depth 普通 **2**(作者用 4)、冒险/指令向 **15 + budget 1800**；recursion 须封顶（`Non-recursable` / `Max Recursion Steps`，1=关）；**timed effects**（sticky/cooldown/delay，按消息数）让纯文本 WI **模拟有状态记忆**（如某事件触发后 sticky 3 回合常驻）。inclusion group 默认权重 100。

**Summarize**：官方**无数字默认**，建议第一次总结定在"消息开始掉出 context"时；社区每 **2-4 条**（低置信）；qvink 每条。

**共识架构（重要）**：**混合分层、非向量优先**。**确定性纯文本（WI + Author's Note + 总结）扛 load-bearing、必须对的事实；向量只做 best-effort 远期模糊召回**。官方原话：想要确定性就用关键词匹配。且**向量与 prompt cache 冲突**（动态前缀每次变→cache miss）——"二选一，别都开"。

→ **映射天命**：阈值起 **0.3**；结构化记忆（恩德/关系/事件）**按记录边界分块，绝非 400 字符**；向量只补主干、关键事实走确定性关键词/constant；用 sticky/cooldown 给记忆做"显著性衰减"；警惕动态注入打爆 cache（呼应你已落的"freeze/稳定注入"思路）。

### 9.5 跨平台对照（AI Dungeon / NovelAI / KoboldAI / MemGPT / mem0）

**普遍两层结构**：常驻 pinned 块（Memory / Plot Essentials，**顶部**始终注入）+ 按需 surfaced 库（World Info / Lorebook / Story Cards / Memory Bank，相关才拉入）。

**位置强度是公认设计杠杆**：同样文本越靠 context **底部 steer 越强**——AN / Plot Essentials 放底部 N 行；NovelAI AN 默认底前 3 行；KoboldAI"越靠末尾效果越强"。→ 天命：世界/势力 lore 放顶，**当前危机 / 活法令语气注入低位**强 steer 演绎脑（与你已落的 Lost-in-the-Middle"重要内容放末尾"一致）。

值得抄的结构：
- **AI Dungeon Memory Bank** = 最可直接抄的 **auto-memory**：等 8 动作 → 摘最老 4 成快照 → 存 text+embedding → 按最近动作相似度召回。**完美映射回合制**：每回合事件摘成快照、按当前局势召回。
- **关键词成了小查询语言**：AND(`&`)、scan 窗（NovelAI max 10000）、recursion、min-activations。→ 天命：一个"陕西" key 级联拉出官员/流寇/民变条目（**recursion 是级联上下文的关键**：陕西→流寇→…）。
- **MemGPT/Letta**：LLM **自分页**（core/recall/archival 三层）+ ~70% context **内存压力中断**让模型自决驱逐/召回。重，但提供"演绎脑自决召回哪些往事"的模型（vs 确定性注入）。
- **mem0**：LLM 抽原子事实做 **ADD/UPDATE/DELETE 合并**进 vector+graph，>90% token 省、+26% 准（LOCOMO）。**直击你的恩德/关系分散日志痛点**——ADD/UPDATE/DELETE 事实合并正是避免陈旧重复的范式（与 §4.2 MemoryBooks 的 upsert、你的"一条 tracker 反复重写"一脉）。
- KoboldAI 预算示例（具体数感）：Memory ~200 token、WI 条目 50(次要)/100(重要角色)/150(主要设定) token、AN <50 token。

### 9.6 盲区补全 → 天命增量结论

1. **向量库别照抄 vectra**：单 JSON 暴力存只适合小集合；天命长 campaign 须**分片 + 老条目摘要回主干 + 原子写 + 向量永不做权威源**。
2. **结构化记忆按记录边界分块**（非字符数），阈值起 0.3，retrieve 2-3 不灌爆——直接用社区实证值省去自己踩坑。
3. **确定性优先、向量增强**再获一手社区背书：load-bearing 事实走关键词/constant，向量只捞远期模糊；注意向量动态注入打爆 prompt cache。
4. **状态 tracker 独立成层**（跨平台普遍 + kaldigo Tracker 范式）：天命势力健康度/关系/任务更像"每回合重生成的结构化字段"，与叙事记忆主干分开。
5. **mem0 的 ADD/UPDATE/DELETE 事实合并** + **AI Dungeon 快照 auto-memory** + **MemTree 相似度路由插入** = 三个可拼装的增量记忆维护范式，直接对症恩德/关系分散无统一日志。
6. **位置强度**作为注入策略：世界 lore 置顶、当前危机/活令置底强 steer——与已落的"重要放末尾"对齐。
