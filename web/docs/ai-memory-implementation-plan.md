# 天命演绎脑·AI 记忆系统落地实施方案（第三轮）

> ⚠️ **2026-06-01 作废声明（SUPERSEDED）**：本方案写于"未发现天命已有 v6 Memory OS"的错误前提下。实际上天命已有一整套受治理记忆系统（`TM.Memory*` 19 模块 + ~40 smoke + 记忆宪法/权威 A0-A9/Envelope/WriteGate/Retrieval/ContextCompiler/Trace），权威设计见 `ai-memory-v6-foundation-compendium-zh-2026-05-31.md`、`ai-memory-system-contract-2026-06-01.md`、`ai-memory-turn-inference-plan-2026-06-01.md`。本方案提的"三大缺口/7 阶段"绝大多数 v6 已实现。**真正前沿 = turn-inference 计划的 Phase A/B/C**。本文仅留作历史参考，勿据此开工。
>
> 承接研究综述 `ai-memory-research-review.md`（两轮）+ 现状诊断 `ai-memory-current-state-diagnosis.md`。
> 本轮 = **把研究结论翻译成天命的具体改造设计**：分阶段、带真实 `文件:行号` 落点、每刀只做一件事。
> **本文是方案，不是已落代码**——等 owner 拍板逐刀开工（沿用科举/廷议 sprint 的"批准开工"节奏）。
> 生成：2026-06-01

---

## 0. 两条已锁决策（证据已支持，见综述 §9.7）

- **① 主干 = 纯文本/提示词路线**（BYOK 零 embedding 人人可用），**向量召回作可选增强档**。
- **② 上 KG 增强档，但收窄到 Graphiti/Zep 式「实时增量 + 双时间」**，避开 GraphRAG 式静态语料批处理全量重建。

最具操作性的总纲（Lost-in-the-Middle 实锤，综述 §9.3）：**别塞长上下文 → 外部记忆 + 精选注入 → 重要内容放 prompt 末尾**。

---

## 1. 现状家底（real code，决定我们"改"而非"建"）

天命**已有相当完整的记忆设施**，本方案是**重构/补齐**而非平地起楼：

| 设施 | 位置 | 现状 |
|---|---|---|
| 原始事件流 `_aiMemory[]` | 贯穿 endturn | 条目 `{turn,type,content/text/summary}`，**这就是 episodic 主干** |
| 三层金字塔 L1/L2/L3 | `tm-memory-anchors.js:296` `_ensureMemoryFreshness` | L1 最近5回合原始·L2 每5回合摘要·L3 每30回合纲要·**本地合并、无 AI** |
| 记忆锚点 + 归档 | `tm-memory-anchors.js:24/189/236` | importance **规则打分**（按 type + context bump）·年度归档·substring 截断 |
| 注入入口 | `tm-endturn-prompt.js:687` `getMemoryAnchorsForAI(8)` | **topK=8 硬写死、对本回合诏令盲选（无 relevance）** |
| 跨回合摘要 | `tm-endturn-prompt.js:3320` `_aiMemorySummaries.slice(-3)` | 滚动摘要注入 sysP |
| 上回合回顾 | `tm-endturn-prompt.js:689` `chronicleAfterwords` | |
| 角色弧线 / 玩家轨迹 | `getAllCharacterArcContext(5)` / `getPlayerDecisionContext(6)` | 已有人物/意图记忆雏形 |
| 关系账 | `tm-help-social.js:787` `AffinityMap`（get/set/delta/getRelations/getSignificantRelations） | 亲疏值哈希 |
| 识别状态 | `recognitionState{lastTurn,lastEmotion,summary,history[]}` | NPC 互动记录 |
| 半检索雏形 | `tm-endturn-ai.js:~1140` SC0 `memoryQueries` | AI 主动声明查询，但不持久、需主动发起 |
| sysP 截断 | `tm-endturn-prompt.js:3387` | **裸 `substring(0, contextK*512)` 砍尾部，无优先级** ← 病灶 |
| 恩德链 Stage1-3（已 ship 1.2.8.x） | `tm-endturn-edict.js` 等 | 任命补 loyalty / 赏赐识别 / 喂 AI 受恩 / 衰减放缓（见记忆 [[恩德不累积批完整闭环]]） |

**三个真缺口**（研究对准的）：① 恩德/关系**四处分管、无统一变更日志**；② 注入**盲选 + 无 token 预算**；③ 截断**砍尾部（杀高召回区）、无分区优先级**。

---

## 2. 总体架构（纯文本主干 + 两个可选增强档）

```
┌─────────────────────────────────────────────────────────┐
│  记忆主干（纯文本·任意 BYOK 可用）                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │episodic  │ │semantic  │ │procedural│ │relation  │   │
│  │事件流    │ │世界/状态 │ │治理套路  │ │恩德/恩怨 │   │
│  │_aiMemory │ │快照      │ │(新·P4)   │ │日志(新P1)│   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       └────────────┴──── 三因子注入打分(P2) ──┴──────┐   │
│                    recency×importance×relevance      │   │
│                              ↓                        │   │
│            分区预算 + 确定性截断 + 重要放末尾(P3)        │   │
│                              ↓ 注入 prompt              │   │
└─────────────────────────────────────────────────────────┘
        ↑(可选)向量 hybrid(P5)    ↑(可选)增量时序KG(P6)
        仅玩家配 embedding 时启用   Graphiti式·关联多跳
```

---

## 3. 分阶段方案（保守拆分·一刀一事）

### Phase 0 · 口径统一与记忆事实 schema（低风险·先读后定）
- **做什么**：盘清 `_aiMemory` / `memoryAnchors` / `AffinityMap` / `recognitionState` / `loyalty` / `hiddenAgenda` 各自的**写入口**（grep 所有 writer），确认 `_aiMemory` 为 episodic 唯一主干；定义统一「记忆事实」字段约定（`{turn, actor, target, type, importance, delta, sourceEvent, text}`）供后续各刀复用。
- **不写运行逻辑**，只产出口径文档 + 字段约定。
- **验收**：一张"谁写哪本账"的 writer 清单（防再次出现[[各省民心两本账没并坐实]]那种多写口蒸发）。

### Phase 1 · 统一恩德/关系事件日志 + 立场巩固（治"恩德不累积"根因）⭐建议首刀
- **病根**（诊断 + [[恩德不累积根钉死]]）：恩德/恩怨散在 loyalty/affinity/recognitionState/hiddenAgenda，AI 只拿到单值快照、拿不到"累积净账"。
- **做什么**：
  - **1a** 统一 `GM.relationLog[]`（或复用 `_aiMemory` 打 `type:'relation'` 标）——每次施恩/处罚/猜忌/背叛都追加一条带 importance 的事实（**承接已 ship 的恩德 Stage1-3，不重做、只汇流**）。
  - **1b** 立场巩固（Gen-Agents reflection，综述 §2.2）：每 N 回合或某 NPC 关系事件 importance 累积超阈值时，让 AI 把该 NPC 的零散受恩/恩怨**抽象成一句"对玩家立场"**写回 `char`（净账，不是原始流）。
  - **1c** AI 面：prompt 喂"该 NPC 受恩累积净账 + 当前立场摘要"，而非散点。
- **路线**：纯文本（importance 可沿用现有规则打分，无需 embedding）。
- **验收**：构造"先施恩后猜忌"序列，AI 推演能体现"念旧恩但已生疑"的净账；node 断言 relationLog 累积正确；天启/绍宋实存档跑回合验。

### Phase 2 · 三因子注入打分 + token 预算（替换硬写死 topK=8）
- **落点**：`tm-endturn-prompt.js:687` `getMemoryAnchorsForAI(8)` + `tm-memory-anchors.js:189`。
- **做什么**：把 topK 排序换成 **score = recency × importance × relevance**（综述 §2.1）：
  - **recency**：指数衰减（按回合数，类比 0.995/小时 → 天命按回合）。
  - **importance**：沿用 `calculateAnchorImportance`（规则，纯文本）。
  - **relevance（新增·关键）**：与**本回合诏令/焦点**做关键词/词法重叠打分（BM25-lite，纯文本，综述 §9.4 证明词法跨域稳健）——把"盲选"变"诏令感知"。
  - **token 预算**：不再固定取 8 条，按预算填到上限为止（接 Phase 3 分区预算）。
- **增强档接口**：relevance 留一个可选 embedding 通道（玩家配了 BYOK embedding 时切 hybrid，见 P5），默认纯词法。
- **验收**：同一历史库下，针对不同诏令注入的记忆条目不同（诏令感知生效）；token 预算上限可配、不溢出。

### Phase 3 · 分区预算 + 确定性截断 + 重要内容放末尾（治盲截断）
- **病灶**：`tm-endturn-prompt.js:3387` 裸砍 sysP 尾部——既杀掉 Lost-in-the-Middle 的高召回末端、又无优先级。
- **做什么**（学 AI Dungeon 分区 + World Info 预算顺序，综述 §5.1/§5.4）：
  - prompt 切**固定分区**（铁律/世界态势/记忆/参考），**每区固定预算**。
  - 超预算时**确定性丢弃顺序**：先丢最低优先级分区的最旧/最不重要条目（而非砍 sysP 物理尾部）。
  - **重要记忆放 prompt 末尾**（U 曲线两端高，综述 §9.3）——把 Phase 2 选出的高分记忆排在靠近末端。
  - 常驻 vs 触发分流：铁律/当前格局常驻（复用 `PromptLayerCache` 固定层 `:3371`），细节靠 Phase 2 relevance 触发。
- **验收**：构造超预算场景，验证丢弃顺序符合优先级、铁律永驻、高分记忆位置靠后；对比改前后中段信息召回。

### Phase 4 · 程序性记忆层（Reflexion/Voyager）——沉淀治理套路、不重复犯错
- **缺口**：CoALA 四类里天命最弱的 procedural（综述 §9.2）。
- **做什么**：
  - **4a** 回合末把"本回合诏令的后果/教训"蒸馏成一条**语言反思**（Reflexion 式 episodic 反思文本），存 `GM.proceduralMemory[]`。
  - **4b** 可复用"治理套路"库（Voyager 式 skill library，纯文本规则/经验），按情境关键词检索复用。
  - **4c** AI 面：遇相似情境时注入"过去教训/可用套路"，让演绎脑不重复踩坑。
- **路线**：纯文本，无 embedding。
- **验收**：构造"重复同类错误诏令"序列，验证第二次 AI 能引用首次教训。

### Phase 5（增强档·可选·feature-flag）· 向量召回 hybrid
- **前提**：仅当玩家 BYOK 提供 embedding 端点时启用（检测不到则纯词法，综述 §9.4）。
- **做什么**：给 Phase 2 的 relevance 加 dense 向量分量，hybrid（BM25 + dense，RRF 融合）。默认关，feature-flag 开。
- **验收**：开关切换不影响主干；开启后语义/转述召回提升。

### Phase 6（增强档·可选·重）· 增量时序知识图谱（Graphiti/Zep 式）
- **做什么**（综述 §9.5，**必须增量+双时间、不可 GraphRAG 批处理**）：
  - 人物/势力/地点/事件建图，**每回合增量摄取**演绎结果（领土得失/生死/关系翻转），即时解析对齐已有节点。
  - **双时间边**：有效区间 `t_valid/t_invalid`（"某关系在第 N 回合前有效"）天然表达天命的世界变迁。
  - 用途：关联多剧情线、查长程一致性、联想多跳（HippoRAG2 +7%）。
- **评估闸**：先做构建/维护成本的小样验证再决定是否全量上（综述 §9.6 批评：须场景化实测）。
- **验收**：增量更新开销可接受；图能答出向量召回答不出的多跳关联。

---

## 4. 横切关注点（每刀都要守）

- **防 stale/孤儿**：所有派生记忆值（立场摘要、L2/L3、KG 节点）**绑定源、回合末统一同步**（沿用 `syncAuthorityPhases` 范式；牢记[[UI天下民情图各省民心死缓存]]、[[各省民心两本账]]教训——别在聚合层直写、别留死缓存）。
- **三面齐全**（[[feedback_editor_game_relation]]）：本系统以 **runtime + AI 面**为主；**编辑器面**轻量但要留：剧本可作者化"NPC 初始恩怨/立场种子"、关键词触发的 lorebook 条目（World Info 式）、importance 权重——这些进编辑器，不硬编码。
- **失败后果不玄幻**（[[feedback_no_mystic_penalties]]）：记忆驱动的后果走自然政治/技术结果。
- **验证纪律**：每刀 node 断言脚本（`web/scripts/verify-*.js`）+ 涉 UI 走 playwright 实跑；关键刀在**天启七年/绍宋实存档**端到端跑回合（综述 caveat：任何方案落地前场景化实测）。
- **发版纪律**：bridge 发不了热更、须桌面端 ship（[[bot-bridge发热更卡点]]）；增量包须对齐基线防假更新（[[热更增量包打在对不齐基线上]]）；阶段未验完不 ship。

---

## 5. 明确「不做 / 反模式」（防跑偏）

- ❌ **不靠"塞长上下文/大窗口"解决跨回合记忆**——Lost-in-the-Middle + StreamingLLM 实锤无效（综述 §3.3/§9.3）。
- ❌ **KG 不用 GraphRAG 式批处理全量重建社区摘要**——天命每回合改世界，只能 Graphiti 式增量（综述 §9.5）。
- ❌ **向量不作默认/必需**——只作 BYOK 增强档（决策①）。
- ❌ **不在 aggregate/聚合层直写派生记忆值**——改源头叶子，回合末同步（天命血泪教训）。
- ❌ **不重做已 ship 的恩德 Stage1-3**——Phase 1 是汇流统一，不是推倒。

---

## 6. 建议排期与首刀

| 优先 | 阶段 | 理由 | 预估 |
|---|---|---|---|
| ⭐ 首刀 | **P1 恩德/关系统一日志 + 立场巩固** | 直击 owner 最痛的"恩德不累积"根因、承接已 ship 链 | 中 |
| 高 | P2 三因子注入打分 | 解"盲选"、收益面最广 | 中 |
| 高 | P3 分区预算 + 重要放末尾 | 解"盲截断"、Lost-in-Middle 直接受益 | 中 |
| 中 | P4 程序性记忆 | 补 CoALA 最弱环、提升长期一致性 | 中 |
| 可选 | P5 向量 hybrid | 仅 BYOK embedding 玩家受益 | 小（flag） |
| 可选·重 | P6 增量时序 KG | 关联多剧情线/长程一致性，需成本评估 | 大 |

P0→P1→P2→P3 是**纯文本主干闭环**（人人可用、解决三大缺口）；P4 补程序性；P5/P6 是增强档。

---

## 7. 待 owner 决策点（开工前）

1. **首刀确认**：是否从 P1（恩德统一日志）开工？还是先 P2/P3（注入与截断，收益面更广但不直击恩德）？
2. **排期粒度**：P1-P3 一个 sprint 连做，还是一刀一验一确认？（[[feedback_conservative_slicing]] 倾向后者）
3. **P6 KG 增强档**：现在排进路线图，还是等主干闭环 ship 后再单独评估成本？
4. **编辑器面范围**：剧本作者化"NPC 初始恩怨/立场种子 + lorebook 关键词条目"是否纳入本次（涉及编辑器改动）？

---
*生成 2026-06-01 · 方案基于真实代码 grounding（tm-memory-anchors.js 全读 + tm-endturn-prompt.js 注入/截断区）· 未写实现代码 · 等 owner 拍板逐刀开工。*
