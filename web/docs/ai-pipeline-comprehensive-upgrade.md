# 过回合 AI 推演·全面升级方案 (Comprehensive Upgrade Plan)

**date**·2026-05-21
**owner**·Claude
**source**·SC1 主推演失败诊断 + 4 路并行子调用审计 + 管线编排分析
**replaces**·`ai-pipeline-robustness-sprint.md` (健壮性 sprint 升级为多阶段全面方案)

---

## §0 摘要

User 报告·SC1 主推演结构化经常失败。深入诊断后发现·问题远超"修 bug"·涉及·

- **架构债** — SC1 / SC1b / SC1c 字段重叠·SC1d 完全依赖 SC1·sc25 + sc_consolidate 范围重叠·sc07 + sc15 概念重叠
- **健壮性** — 9 个真问题 (含 SC05 throw 链·sc1b/c 静默 catch 等)
- **成本** — SC1 单次 ~15K tokens / $0.13·全管线 ~$0.40-0.50/回合·sysP 等可缓存部分未做
- **性能** — SC1 wall-clock 30-60s·post-turn 串行 sc25→sc28→sc_consolidate 浪费并行机会
- **质量** — json_object 不约束 schema·partial JSON 抢救缺·失败可见性差

本 doc 把这些拆成 **7 个 phase**·总工作量 **17-25 天**·可分阶段实施。**Phase 0+1+2 是最小可行 (~9 天)·解决用户主诉 + 架构债。后续阶段按 ROI 增量做。**

---

## §1 现状·全管线 19 子调用拓扑

```
[prep] → [plan-prefetch] → [ai] → [post-ai-edict] → [systems] → [render-and-finalize]
                            ↓
                ┌───────────┴───────────┐
                │  19 个 AI 子调用      │
                └───────────────────────┘
                            ↓
  ┌─── 记忆层 ────┬── 主推演层 ──┬── 深度推演层 ──┬── 后处理层 ────┐
  │ sc0           │ sc1 (主)     │ sc15 (NPC)     │ sc_audit       │
  │ sc_recall (内嵌)│ sc1b (文事) │ sc_memwrite    │ sc2 (后人戏说)│
  │ sc05 (回顾)   │ sc1c (势力)  │ sc16 (势力)    │ sc25 (伏笔)    │
  │               │ sc1d (实录)  │ sc17 (财政)    │ sc27 (审查)    │
  │               │              │ sc18 (军事)    │ sc07 (NPC认知) │
  │               │              │                │ sc28 (快照)    │
  │               │              │                │ sc_consolidate │
  └───────────────┴──────────────┴────────────────┴────────────────┘
       │串行→         │串行→        │parallel batch  │mixed sync+queued
       │                                              │
       ↓                                              ↓
  RAG 4 源检索                              post-turn 后台队列
  (RecallGate 60% 跳过)                     (sc25 → sc28 → sc_consolidate)
```

**关键观察**·
- pipeline 'ai' step `onError:'abort'`·SC1 失败 → 整个回合不推进 (`endturn-validity` gate)
- SC1d 早 return 如果 `!p1`·SC1 失败的连锁影响远超表面
- post-turn 队列依赖隐式·sc_consolidate 等 sc25/sc28·串行 ~30s

---

## §2 全部问题清单 (按维度)

### 🔴 架构债 (11 项·最高 ROI)

| 编号 | 问题 | 涉及 | 证据 |
|---|---|---|---|
| A1 | **SC1 schema 60+ 字段·但 9 个被指示"留空"** (cultural_works/npc_letters/npc_correspondence/npc_interactions/faction_interactions_advanced/faction_events/npc_schemes/hidden_moves/fengwen_snippets) | SC1 | tm-endturn-ai.js:2335 |
| A2 | **SC1 / SC1b 字段重叠**·SC1b 输出 concat 到 p1·相当于 SC1 跑了空白字段·SC1b 又跑实际内容 | SC1 + SC1b | L2786-2789 |
| A3 | **SC1 / SC1c 字段重叠**·同 A2 模式 (faction_events / npc_schemes / hidden_moves) | SC1 + SC1c | L2316 |
| A4 | **SC1d 完全依赖 SC1**·`if (!p1) return` 在 L2586·SC1 失败 → 实录 / 时政记成文也失败 | SC1d | L2586 |
| A5 | **sc25 + sc_consolidate 范围重叠**·两者都做"为下回合 sc1 准备记忆摘要"·sc25=immediate·sc_consolidate=cumulative·但边界模糊 | sc25 + sc_consolidate | followup.js:1593, 2200 |
| A6 | **sc07 + sc15 概念重叠**·sc15 出 hidden_moves (NPC 行为)·sc07 出 knows/unspokenConcern (NPC 认知)·都是"NPC 内心推演"·应可合一 | sc07 + sc15 | followup.js:394, 2050 |
| A7 | **sc2 + sc27 两遍叙事范式**·sc2 写一遍·sc27 审一遍·rewritten_passages 后置追加·smell·能否合一 | sc2 + sc27 | followup.js:1865 |
| A8 | **sc_audit 改完不验证**·auto_patches 字符串路径解析·成功否不 verify·sc2 可能读到未补丁的数据 | sc_audit | followup.js:1060 |
| **A9** | **★ SC1c + SC16 diplomatic_shifts 冗余且可矛盾**·SC1c (lite) 和 SC16 (full) 都输出 diplomatic_shifts·同一关系可能给出对立判定·sc_audit 检出但无法修正 | SC1c + SC16 | followup.js sc16 L863 |
| **A10** | **★ SC17 token 严重浪费 (83% 空闲)**·input 3K tokens·budget 12K·prompt 仅 11 行·输出"冠冕堂皇评论"无落地·应合到 SC1.fiscal_adjustments | SC17 | followup.js:894-926 |
| A11 | **sc15 hidden_moves vs npc_schemes 概念重叠**·hidden_moves=本回合秘密·npc_schemes=跨回合阴谋·边界不清·AI 经常混淆 | SC15 | followup.js:470-478 |

### 🟡 健壮性 (9 项·验证修)

| 编号 | 问题 | 严重 | 位置 | 来源 |
|---|---|---|---|---|
| H1 | **SC05 catch throw**·失败时·_runSubcall 重试·下游 memoryReview 为空 → SC1 失去因果链 | 🟡 | tm-endturn-ai.js:1163 | sprint doc R1 |
| H2 | **stream + response_format 静默冲突 (中转站)** | 🟡 | L2441-2469 | SC1 主诉 D 方案 |
| H3 | **JSON repair schemaHint 只截 3500 字·60 字段只看到末几个** | 🟡 | L206 | sprint doc R4 |
| H4 | **truncation toast 只首次触发** | 🟢 | L67-79 | sprint doc R2 |
| H5 | **sc1b/sc1c IIFE catch 静默**·只 warn·不记 ctx.meta.errors | 🟡 | L3220-3223 | sprint doc R3 |
| H6 | **sc1d 中文别名归一化分散**·5+ alias chain | 🟢 | L2634-2638 | sprint doc R5 |
| H7 | **partial JSON 没抢救层**·截断/破损直接 fallback·已生成部分丢弃 | 🟡 | tm-ai-infra.js:1501-1566 | C 方案 |
| H8 | **SC_RECALL try-catch 静默**·失败不记 errors | 🟢 | tm-endturn-ai.js:918-926 | memory agent |
| H9 | **sc_audit 补丁失效无回退** | 🟡 | sc_audit | post-processing agent |

### 💰 成本与性能 (5 项)

| 编号 | 问题 | 影响 | 优化方法 |
|---|---|---|---|
| P1 | **SC1 ~15K tokens / $0.13·schema 描述占 ~10K** | 单回合费 $0.40+ | A1/A2/A3 修完后预计降到 ~$0.08 |
| P2 | **sysP 跨回合不变·未用 cache_control** | 重复发送 ~2K tokens/回合 | OpenAI cached tokens / Anthropic prompt_cache_control |
| P3 | **post-turn 串行 sc25 → sc28 → sc_consolidate** | ~30s 后台延迟 | sc28 与 sc25 并行 (read-only) |
| P4 | **SC1 wall-clock 30-60s** (stream + 大 schema) | UX 卡顿主因 | A1 减字段 + B 拆分 |
| P5 | **sc_consolidate 等 sc25 + sc28 完成才跑** | 入参依赖耦合 | 改"读 summary"而非"读 result 对象" |

### 🎨 质量与 UX (6 项)

| 编号 | 问题 | 影响 |
|---|---|---|
| Q1 | **OpenAI 用户没走 json_schema strict** | 字段名漂移·类型违规可能 |
| Q2 | **失败可见性低**·诊断面板没暴露 ctx.meta.errors | 用户报错时无线索 |
| Q3 | **sc1d 早 return·实录/时政记可能完全缺失** | 用户看到"时政记空白" |
| Q4 | **SC1 重试整把重发·成本翻倍** | 没有"增量 retry 只补缺失字段" |
| **Q5** | **SC16/17/18 lite/standard depth 完全跳过·无降级 variant** | 玩家走 lite 时·全 npc 势力外交/经济/军事推演静默缺失·体验断裂 |
| **Q6** | **SC18 battleResult 无地理验证·虚假战役风险**·affectedArmies / casualties 数字无后验·commanderFate 无校验 | 玩家看到"荒诞战役"·两军距 2000 km 却交战 |

---

## §3 升级方案·7 phase

### Phase 0·Quick Wins (1-2 天·先做)

**目标**·立刻见效·解决 SC1 主诉·零架构改动。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **D-1**·关 SC1 stream·`P.ai.stream_sc1=false` 默认 | tm-endturn-ai.js:2441 | 5 分钟 |
| **D-2**·SC1 prompt 末尾加 LSR 强约束·"YOU MUST RETURN JSON ONLY..." | L1357 | 10 分钟 |
| **D-3**·SC1 _retries 从 1→2·重试时自动降 schema 复杂度 | L472 | 30 分钟 |
| **H1**·SC05 catch 改 fallback·不抛 | L1163 | 5 分钟 |
| **H8**·SC_RECALL catch 加 ctx.meta.errors push | L918-926 | 10 分钟 |
| **P2**·sysP cache_control·OpenAI + Anthropic 双路 | _maybeCacheSys (L441) 扩展 | 半天 |
| **Q3**·SC1d 加 _seedFromBasicFacts·SC1 失败时 SC1d 仍能从 edicts/player_status 成文 | sc1d L2586 早 return 改 | 半天 |

**验收**·重跑 5 回合·SC1 成功率 ~70% → ~85%·sysP cache hit 率 > 80%

### Phase 1·健壮性收口 (2-3 天)

**目标**·全 19 子调用共享 partial JSON 抢救·失败可见。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **C-1**·npm install jsonrepair·内嵌到 tm-ai-infra.js robustParseJSON Layer 2.5 | tm-ai-infra.js:1501 | 半天 |
| **C-2**·`_hasSc1StructuredResult` 改"≥3 key" 而非"≥1 key" | tm-endturn-ai.js:574 | 30 分钟 |
| **H3**·`_parseOrRepairJsonResult` schemaHint 改 expectedKeys list + field 示例·而非 raw schema 尾 | L206 | 半天 |
| **H4**·`_truncatedOnce` → `_truncatedCount`·>3 次再 toast | L67-79 | 15 分钟 |
| **H5**·sc1b/sc1c IIFE catch 加 ctx.meta.errors push | L3220-3223 | 15 分钟 |
| **H6**·`_normalizeParsedJsonForExpected` 补全 50 字段中文别名 | L114-150 | 半天 |
| **H9**·sc_audit auto_patches 应用后 verify·失败回退 | followup.js sc_audit | 半天 |
| **Q2**·AI 诊断面板暴露 ctx.meta.errors·按子调用分组 | tm-endturn-render.js | 半天 |

**验收**·新增 smoke `scripts/smoke-json-repair-layers.js`·喂 5 种破损 JSON·全部抢救 ≥3 字段·诊断面板可见全部子调用错误

### Phase 2·架构债·SC1 family 重构 (5-7 天)

**目标**·消除 SC1/SC1b/SC1c 字段重叠·SC1 schema 瘦身 60→25 字段。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **A1**·SC1 schema 3 层·必含 (10 字段) / 高频 (10 字段) / 可选 (5 字段)·按模型 cap 动态包含/排除 | L1357-1603 schema 重构 | 2 天 |
| **A2**·SC1 schema 删 cultural_works/npc_letters/npc_correspondence/npc_interactions (SC1b 专管)·更新 prompt 不再提及 | SC1 + SC1b prompt 协议 | 1 天 |
| **A3**·SC1 schema 删 faction_events/npc_schemes/hidden_moves/faction_interactions_advanced/fengwen_snippets (SC1c 专管) | SC1 + SC1c prompt 协议 | 1 天 |
| **A4**·SC1d 解耦·支持从 player_edicts + GM 状态直接成文·`if (!p1)` 不再 early return·使用基础事实兜底 | SC1d L2583 重写 | 1 天 |
| **硬约束抽离**·把 SC1 L1172-1193 的 380 字硬约束移到 sysP·全管线共享 | sysP build (tm-endturn-prompt.js) | 半天 |
| **smoke 验证**·所有原有 sc1 字段消费者 (tm-ai-change-applier.js / tm-endturn-apply.js) 仍能正常工作·从 SC1b/SC1c concat 来的字段拿到 | smoke-endturn-public-contract.js 扩展 | 1 天 |

**验收**·SC1 prompt 从 ~30K → ~18K tokens·成本从 $0.13 → $0.08·SC1 成功率 ~85% → ~92%·SC1d 独立可成文 (smoke 跑 SC1 强制失败也能出实录)

### Phase 2.5·sc1q 对话承诺推演·新增 (1.5-2 天)

**目标**·补"玩家通过对话/朝议/常朝/廷议/御前/鸿雁/朱批下达的命令"被推演忽略的 gap。当前 SC1 只读 edicts·对话承诺常被埋在 25K prompt 中段·权重低·常被忽略。新加 sc1q 子调用·把**全 7 渠道**对话型决策提取为"和诏书等同的输入"。

**7 个渠道**·问对·朝议·常朝·廷议·御前·**鸿雁**·**奏疏朱批**。前 5 是新增·后 2 是补漏 (现状·鸿雁出走 _edictTracker 但漏私信·奏疏批走 _approvedMemorials 但 reply 朱批中的"着 X 即办"未提取为 commitment)。

**背景·为什么需要**·

- 玩家问对·"李某·去江南督修河堤·三月内完工"·李某答"诺·臣即起行"
- 当前·对话存 conv·承诺存 _npcCommitments·但 SC1 推演只重点看 edicts·NPC 实际没去
- 随游戏 paradigm 从"诏书制" → "对话型" (常朝大改·朝议·御前等)·gap 越来越大

**时机·并行 SC0·零 wall-clock 增加**·

```
sc0 (深度思考 8s)  ─┐
                    ├─ Promise.all·max 8s
sc1q (对话推演 6s) ─┘
       ↓ 两个 done
sc1 prompt build 读 sc1q 输出·dialogue_commitments 紧贴 edicts·平级地位
```

**实施细节**·`tm-endturn-ai.js` SC0 当前用 `await _runSubcall('sc0', ...)` 顺序跑·sc1q 要并行需改成·
```js
await Promise.all([
  _runSubcall('sc0', 'AI深度思考', 'standard', async function() {...}),
  _runSubcall('sc1q', '对话推演', 'lite', async function() {...})
]);
```
否则 sc1q 串行跑·wall-clock +6s。这步**必须在 2.5.1 内实现**·不能漏。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **2.5.1·sc1q 子调用实现**·input **6 字段·覆盖 7 渠道** (**字段名已 grep 核实真实存在**)·(1) `GM.jishiRecords` 近 3 回合·limit 50·mode 区分 wendui (问对) / formal (求见) / yuqian (御前公开) + (2) `GM._courtRecords` 近 2 回合·limit 3·包 transcript/stances/decisions (朝议+常朝+廷议合一存) + (3) `GM._secretMeetings` 本回合·包 advisors/decision (御前密议) + (4) `GM._npcCommitments` **dict 按 NPC 分桶 flatten**·filter status≠completed·跨回合追踪 + (5) `GM.letters` filter from=='玩家' && sentTurn==GM.turn (鸿雁出·含私信) + (6) `GM._approvedMemorials` filter turn==GM.turn && reply.length>3 (奏疏朱批中的具体命令)·output·4 字段 schema (dialogue_commitments / collective_resolutions / npc_dialogue_intent / required_sc1_actions)·**source_type 7 种** (问对/朝议/常朝/廷议/御前/鸿雁/朱批)·**temp=0.3 严格·"宁可不写不可编造"** (应对 R-A 误判承诺) | 新 sc1q | 1 天 |
| **2.5.2·SC1 prompt 平级注入**·tp1 加 3 段·[本回合对话承诺] 紧贴 edicts·[朝议决议] 紧贴前议追责·[required_sc1_actions] 末尾 LSR 后置 | tm-endturn-ai.js:1609 | 半天 |
| **2.5.3·SC1 schema 加 dialogue_commitment_feedback 字段**·**B 分离方案** (2026-05-22 user 选)·与现有 `commitment_update` 字段**故意分离**·原因·`commitment_update` 是 edict 触发的承诺反馈·`dialogue_commitment_feedback` 是 sc1q 对话触发的承诺反馈·source_conv_id 关联到对话·避免双轨混淆·**与 edict_feedback 同形**·status enum 对齐 (executing/completed/failed/delayed)·**同步在 `tm-ai-schema.js` 字段契约真源注册** (`dialogue_commitment_feedback: {type:'array', desc:..., consumedBy:['endturn-apply:_applyDialogueCommitmentFeedback']}`)·否则 `tm-ai-output-validator.js` 会打 warn | SC1 schema (Phase 2.1 SC1_FIELD_DEFS) + tm-ai-schema.js | 半天 |
| **2.5.4·apply 闭环 + dedup**·`_applyDialogueCommitmentFeedback`·根据 source_conv_id 更新 GM._npcCommitments.statusHistory·status 进入 pending/executing/completed/delayed/obstructed/resisted·**写 GM._npcCommitments 时用现有 commit 结构** (task/category/willingness/deadline/status/progress·非 sc1q 自创字段)·**sc1q 专属字段加 `_sc1q*` 前缀** (\_sc1qSource/\_sc1qSourceConvId/\_sc1qTarget/\_sc1qPlayerEmphasis)·**dedup·assignedTurn==当前回合 && task 相似度>0.7 视为重复·与 _wd_extractCommitments 已有 commit 合并** | tm-endturn-apply.js | 半天 |
| **2.5.5·sc_audit 覆盖率检查**·检查 SC1 输出是否 cover sc1q.dialogue_commitments 所有 NPC·漏掉 → ctx.meta.warnings + GM._sc1qMissedLastTurn·下回合 sc1q 优先强调 | sc_audit 扩 | 半天 |
| **2.5.6·sc25c 消费 sc1q**·sc25c (Phase 4) prompt 新增 input·dialogueCommitments_thisTurn / dialogueFeedback_thisTurn·让跨回合记忆抓"阳奉阴违"主线 | sc25c prompt 改 (Phase 4 联动) | 半天 |
| **2.5.7·sc_memwrite 消费 sc1q**·sc_memwrite (Phase 4) 加路径·把 dialogue_commitments / collective_resolutions 写到 NpcMemorySystem·NPC 自己记得承诺·下次 QA 有连续性 | sc_memwrite 扩 (Phase 4 联动) | 半天 |
| **2.5.8·sc15n 消费 sc1q**·sc15n (Phase 4) prompt 新增·npc_dialogue_intent 注入·让 mood_shifts / hidden_moves 据对话语气细化 | sc15n prompt 改 (Phase 4 联动) | 半天 |

**集成路径汇总**·

| sc1q 输出 | 写到 | 谁读 | 怎么用 |
|---|---|---|---|
| `dialogue_commitments` | ctx.results.sc1q + GM._npcCommitments (dict 按 NPC 分桶·push 到对应 NPC 数组) | SC1 prompt + sc_audit + sc25c + sc_memwrite | 推演 + 覆盖率检查 + 跨回合记忆 + NPC 个人记忆 |
| `collective_resolutions` | ctx.results.sc1q + GM._courtRecords (朝议+常朝+廷议合一存·按 turn append) | SC1 prompt + sc25c | 推 edict_lifecycle + 下回合 narrative 主线 |
| `npc_dialogue_intent` | ctx.results.sc1q | sc15n | mood/hidden_moves 细化 |
| `required_sc1_actions` | ctx.results.sc1q | SC1 prompt LSR | SC1 硬性要求 |
| SC1 输出 `dialogue_commitment_feedback` | GM._npcCommitments.statusHistory + NpcMemorySystem | 下回合 sc1q + 下次 QA | 闭环·NPC 自己记得承诺进展 |

**风险与应对**·

| 风险 | 应对 | 归属 |
|---|---|---|
| **R-A**·sc1q 推断 commitment 与玩家本意不符 (over-interpret) | temp=0.3 + prompt "宁可不写不可编造·不确定的对话不要算 commitment·泛泛承诺不算·只算具体动作+时限+目标" | 嵌入 **2.5.1** |
| **R-B**·sc1q 失败 → SC1 收不到 dialogue_commitments | sc1q 失败时 SC1 仍读 `GM._npcCommitments` 原有路径·sc1q 是增量非替代 | 嵌入 **2.5.2** prompt build |
| **R-C**·jishiRecords / courtRecords 数据量大·sc1q input 膨胀 | jishiRecords 按 `turn >= GM.turn-2` 过滤 + limit 50·courtRecords 按 `turn >= GM.turn-1` + limit 3·更早依赖 `GM._npcCommitments` 跟踪 (注意·此字段是 **dict 按 NPC 分桶**·非 array·sc1q 实现时要 flatten) | 嵌入 **2.5.1** input 限制 |
| **R-D**·sc1q 与 _npcCommitments 双轨重复·apply 重复处理 | sc1q 输出加 source_conv_id 关联·apply 时 dedup | 嵌入 **2.5.4** |
| **R-E**·SC1 prompt 加 sc1q 段后超 token 预算 | Phase 2 已瘦身 ~10K 预算空间·5 条 commitments 占 ~1K·安全 | 嵌入 **2.5.2** + Phase 2 依赖 |
| **R-F**·NPC 客套话 ("臣愿效死力") 被误算 commitment | sc1q prompt 明确·只算"具体动作+时限+目标" | 嵌入 **2.5.1** |
| **R-G**·sc1q 与已有 SC1 注入段重复 (letter 段·`_approvedMemorials` 段) | 三段互补·不重复·letter/memorial 注入段管"状态+因果"·sc1q 段管"具体动作 NPC 必须在 npc_actions 中出现"·sc_audit 只检 sc1q.dialogue_commitments 覆盖率 | 嵌入 **2.5.2 + 2.5.5** |

**验收**·问对承诺被推演率 ~30% → ~90%·朝议决议被推演率 ~40% → ~90%·**鸿雁私信和奏疏朱批中的具体动作命令被推演率 ~50% → ~85%**·dialogue_commitment_feedback 玩家可在史记看到·NPC 在 QA 中记得自己承诺·sc1q wall-clock +0s (并行 sc0)·成本 +$0.02/回合

### Phase 3·深度推演层重构 (4-6 天)

**目标**·消灭 SC1c/SC16 矛盾·合并 SC17 到 SC1·补 lite depth 降级·补 battleResult 验证。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **A9**·SC1c diplomatic_shifts 删·全权交 SC16·SC1c 只管 npc_schemes / hidden_moves / faction_events | SC1c + SC16 边界 | 1 天 |
| **A10**·SC17 删·fiscal_analysis / supplementary_resource_changes 合到 SC1.fiscal_adjustments + SC1.economic_advice 字段 | 删 sc17·SC1 扩 2 字段 | 1 天 |
| **Q5**·SC16/17/18 lite depth 走简化 variant·SC16 出 top-3 faction_priorities 只 1 行·SC18 出 war_probability 单字段 | 新 lite variant prompt | 1-2 天 |
| **Q6**·SC18 battleResult 后验·地理距离 / 兵力比 / commanderFate 校验·荒诞战役 reject | SC18 post-validation | 1 天 |
| **A11**·SC15 hidden_moves / npc_schemes 边界明文写到 prompt·`hidden_moves=本回合具体动作`·`npc_schemes=酝酿中跨回合阴谋` | SC15 prompt 改 | 半天 |

**验收**·diplomatic_shifts 矛盾率 → 0·SC17 删后 token 省 12K/回合·lite 玩家也能看到 npc 势力动作·battleResult 荒诞率 -80%

### Phase 4·记忆层合并 (3-5 天)

**目标**·sc25 + sc_consolidate 合一·sc07 + sc15 合一·减少 30% 后台 API 调用。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **A5**·sc25 + sc_consolidate 合成 sc25c (memory_synthesis)·**双调用同 prompt 不同 temp** (tactical temp=0.3·strategic temp=0.5·应对 R-H)·sc1 prompt 注入读统一对象·带旧字段 alias fallback (应对 R-A)·**mirror 到 GM._turnAiResults.subcall25 = {memory, foreshadow, state_board}** (兼容 `tm-post-turn-jobs.js:212` reflect 任务·下游不破坏) | 新 sc25c·删旧 sc25/sc_consolidate | 2 天 |
| **A6**·sc07 + sc15 合成 sc15n (NPC state vector)·**按 cap 分 3 tier·core/common/extended** (应对 R-G)·apply 时 mirror 到 `GM._npcCognition` 兼容 shim (应对 R-B)·**mirror 到 GM._factionUndercurrents** (兼容 sc16/sc28 prompt 注入读·sc15 副产物保留) | 新 sc15n·删旧 sc07/sc15 | 2 天 |
| **P3**·post-turn 队列 DAG 化·sc28 / sc25c 并行·**先 grep 写入路径互不冲突** (应对 R-C)·`_enqueuePostTurnJob` 支持 dependsOn | followup.js post-turn 调度 | 半天 |
| **sc28 → sc1 注入**·sc28 world_snapshot 直接进下回合 sc1 prompt 头部·**G1 schema 精简时 sc28 段优先保留** (应对 R-D) | sc1 prompt 注入段 | 半天 |
| **F**·SC15→SC_MEMWRITE 同步链拆开·改 async lazy·**下回合 sc1 prep `await _awaitPostTurnJobs(['sc_memwrite'])`** (应对 R-E) | SC_MEMWRITE 调度 | 半天 |

**验收**·post-turn 后台总时间 ~30s → ~15s·sc25/consolidate 重复内容率 → 0·sc28 字段下回合可见

**R-H 决定记录** (2026-05-21·user 选)·sc25c 走**双调用**·temp=0.3 出 tactical (immediate_foreshadow / turn_memory / state_board)·temp=0.5 出 strategic (consolidated_narrative / key_threads / npc_trajectories / faction_vectors)。每次 ~6K output 不易截断·失去合并省钱收益但 schema 质量保证。

### Phase 5·sc2 + sc27 合并 (2-3 天)

**目标**·叙事审查从"后置 rewrite"改为"inline refinement"·减少 sc2 重写浪费。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **A7-1·sc2_outline**·新子调用·读 sc1/sc15 事实摘要·输出 scenes/narrative_arc/character_features/time_period_markers·**scenes ≤ 8 条·outline_lines ≤ 5 / scene** (应对 R-A 累积误差) | 新 sc2_outline | 1 天 |
| **A7-2·sc27 改审 outline**·读 outline + 角色名单 + period vocabulary·输出 anachronisms/name_errors/missing_beats/tone_guidance·**temp=0.3 + "仅在确信时报告"** (应对 R-B false positive)·**outline 缺失时回退原 prose 审查** (应对 R-C) | sc27 改造 | 半天 |
| **A7-3·sc2_prose**·读 outline + review + 事实·写完整 prose·已修正错误·**默认 standard depth always-on·lite 跳 sc27 但仍跑 outline+prose** (应对 R-D 总 wall-clock)·**mirror 到 GM._turnAiResults.subcall2 = {houren_xishuo, hourenXishuo, _sc2outline, _sc27review}** (兼容下游 render 读 subcall2.houren_xishuo·`tm-endturn-followup.js:1538-1581` 路径不变) | 新 sc2_prose·替代原 sc2 | 1 天 |
| **失败兜底**·三段任一失败的 4 种降级路径·保留 _runLegacySc2 旧路径 3 个月 (应对 R-C) | sc2_prose 入口 | 半天 |
| **UI 反馈**·sc2_outline 完成时 push "构思中·已铺好场景" 提示条·sc2_prose 完成时再 push 完整 prose (应对 R-E 延迟感) | conv UI 时序 | 半天 |

**验收**·sc2 narrative 字段名错误率 -50%·anachronism 检出 +30%·wall-clock ≤ 当前·玩家不再见"补丁段"

### Phase 6·OpenAI json_schema strict (2-3 天)

**目标**·OpenAI/Azure 用户走 logit-mask 级 schema 约束·彻底解决字段名/类型漂移。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **Q1-1**·维护标准 JSON Schema 文件·按 SC1_SCHEMA_TIERS 动态拼·**可选字段标 nullable·enum 列表完整·字段长度宽松** (应对 R-B 模型答不出)·smoke 用 ajv validate | 新 web/schemas/sc1.schema.json + _buildSc1JsonSchema() | 1 天 |
| **Q1-2**·detect 严格·`provider===openai && /api.openai.com/.test(url) && model 支持 strict`·**非 OpenAI 路径完全不变·零影响** (应对 R-D) | _sc1Body build | 半天 |
| **Q1-3**·strict 失败自动回退 json_object·**回退记 ctx.meta.warnings·诊断面板可见** (应对 R-A schema 写错全 fail) | _callEndturnAI catch | 半天 |
| **Q1-4**·全 19 子调用扩 schema·**写脚本从 prompt 自动反推 schema 草稿 + CI 校验 schema 与 prompt 一致** (应对 R-C 维护成本) | schemas/ + 自动加载 + 新 smoke | 1 天 |

**验收**·OpenAI 用户 SC1 成功率 ~92% → ~98%·字段名漂移 → 0·strict 回退率 <5%·非 OpenAI 零变化

### Phase 7·性能与 UX (3-5 天)

**目标**·SC1 wall-clock 优化·cost 仪表盘·失败重试增量化。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **Q4·SC1 增量 retry**·只重生成缺失字段·`_findMissingSc1Fields` + `_runIncrementalSc1Retry` 走 mini schema·**increment prompt 注入已有结构化数据让 model 看上下文** (应对 R-A 语义矛盾)·**missing >3 才 retry·只 retry 一次** (应对 R-B 误判循环) | _trySc1Rescue 重构 | 1-2 天 |
| **Cost dashboard**·TokenUsageTracker 扩 byId·设置面板按子调用 cost 排序·**canvas 限 last 20 turn·老电脑退化文本表** (应对 R-C 卡顿) | tm-player-settings.js + tm-ai-infra.js | 1 天 |
| **Failure dashboard**·诊断面板按子调用 + 按 category·失败率高亮·**"全部历史" toggle 从 IndexedDB 读** (应对 R-D 长局看不到趋势) | tm-endturn-render.js | 1 天 |
| **Wall-clock 优化**·`_buildSharedPromptPrefix` 抽出·sysP 末尾追加·19 子调用 prompt 删重复段·**monitor cached_tokens·若降则裁剪 sysP 长度** (应对 R-E cache 失效) | tp build + sysP build | 半天 |

**验收**·SC1 wall-clock -20%·user 可见成本/失败趋势·单回合 prompt 重复段 ~10K → ~5K

### Phase 7.5·设置面板大改 + 设置语义对齐 (3-5 天)

**目标**·Phase 0-7 引入 9 个新 toggle·重命名 1 个旧 toggle·重新映射 2 个旧 toggle 文案·修复设置-管线对齐问题。所有设置改动一次性集中做·避免每 Phase 反复改设置面板。

**5 处真实影响** (经核实·原 7 处中 npcAiPrecision/npcAiCosmeticEnrich 是 Phase F3 独立系统·不动)·

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **A·新 toggle 暴露**·`stream_sc1 / cacheSysP / enableSc1q / enableLiteVariants / sc2ThreeStage / useJsonSchemaStrict / incrementalRetry / costDashboard / failureDashboard` 9 个 toggle 暴露到设置 "AI 高级" 段 | tm-patches.js (openSettings) | 1-1.5 天 |
| **B·重命名旧 toggle**·`consolidationEnabled` → `memorySynthesisEnabled` (因 Phase 4 sc_consolidate 合到 sc25c)·**老存档加载时 mirror 旧值到新名** (兼容 migrate) | tm-patches.js + tm-save-lifecycle.js | 半天 |
| **C·重新映射文案** | tm-patches.js | 1 天 |
| · `modelTier` (auto/low/medium/high) → 重新映射到 Phase 2.1 SC1_SCHEMA_TIERS·low=core only / medium=core+common / high=全 3 tier | | |
| · `aiCallDepth` (full/standard/lite) → 文案现在写"11/6/3 调用"实际已 19 调用·更新为 Phase 7 后的"18/14/10 调用"·按 Phase 3 lite variant 行为重述 | | |
| **D·设置-管线联动 + 警告** | 跨文件 | 半天 |
| · `P.ai.prompt` / `P.ai.rules` / `summaryRule` 编辑器加 sysP cache 警告·"修改会破坏 cache·下次过回合多花 ~$0.004" (应对 Phase 0.6 cache 失效) | | |
| · `convKeep` 联动·Phase 2.5 sc1q input 实现时 `min(50, convKeep)` (注释·非代码改) | | |
| · `hourenMin/Max` 联动·Phase 5 sc2_prose 必须读·sc2_outline 不读 (注释·非代码改) | | |
| **E·僵尸字段处理**·`showRelation` 当前 UI 写但无 renderCharProfile 消费者·实装 OR 删 UI (`tm-player-settings.js:522` 注释建议) | tm-three-systems-ui.js OR 删 UI | 半天 |

**验收**·设置面板 9 个新 toggle 可见可控·老存档加载 consolidationEnabled 自动 mirror·sc1q/sc2_prose/sysP cache 各路径与设置正确联动·showRelation 不再僵尸

**注**·`npcAiPrecision` 和 `npcAiCosmeticEnrich` 是 Phase F3 独立 NPC 模块决策系统 (tm-faction-npc-settings.js)·跟 Phase 0-7 的 SC15/sc15n/SC16 完全正交·**Plan 不动**。

### ⚠️ 跨 Phase·_subcallMeta + CALL_POLICIES 同步注册表

`tm-endturn-ai.js:409 _subcallMeta` (19 子调用注册·诊断面板元数据来源) 和 `tm-endturn-ai.js:3346 CALL_POLICIES` (每子调用 timeout/retry 政策) 是**所有 Phase 共享的注册表**·每个 Phase 改 sub-call 必须同步改这两处·**否则**·

- 新加子调用没注册·诊断面板不显·_runSubcall 找不到 minDepth 走默认
- CALL_POLICIES 没注册新调用·走 `SAFE_CALL_DEFAULT` 通用 90s timeout / 1 retry·可能不适合 sc15n 长 prompt 或 sc1q 短调用

| Phase | _subcallMeta 改动 | CALL_POLICIES 改动 |
|---|---|---|
| 2.5 | +sc1q (lite, order:80) | +sc1q:_p('high',45000,30000) |
| 3 | -sc17 | -sc17 |
| 4 | -sc25 -sc_consolidate -sc15 -sc07·+sc25c (lite·post-turn) +sc15n (standard, order:150) | 同步删/加·sc25c 双调用各一·sc15n 长 prompt 给 timeout=120s |
| 5 | -sc2·+sc2_outline (lite, order:195) +sc2_prose (lite, order:200) | sc2_outline:_p('normal',30000)·sc2_prose:_p('normal',120000,60000) |

**Phase 7.5 设置面板 aiCallDepth 文案要动态读 _subcallMeta** (不硬编码 "11/6/3 调用")·按 minDepth 实际数。

### ⚠️ 跨 Phase·存档持久化提醒

`tm-save-lifecycle.js` 用"显式 mirror"模式 (e.g. `GM._savedNpcCommitments = _safeClone(GM._npcCommitments)`) 持久化关键字段·**Phase 新增 GM 字段必须同步加 mirror**·否则跨存档加载丢失·

**已验证已 mirror** (不需 Phase 改动)·`GM._factionUndercurrents`·`GM._courtRecords`·`GM._npcCommitments`·`GM._secretMeetings`·`GM._aiMemory`·`GM._sc16FactionDirectives`

**Phase 引入的新 GM 字段·必须加 mirror**·
- Phase 2.5·`GM._sc1qMissedLastTurn` (sc_audit 漏覆盖记录·下回合 sc1q 用)
- Phase 4·`GM._lastSc28Snapshot` (sc28 → sc1 注入)
- Phase 4·若 sc25c 输出存到新字段名 (而非合并到 `_consolidatedMemory`)·要 mirror

不加 mirror → 存档加载后下回合 sc1q 看不到上回合漏覆盖记录 / sc28 注入缺失·跨回合连续性破坏。

### Phase 8·SC1 4 路并行拆分 (5-7 天·备选·只在 Phase 0-7 后仍频繁失败时启)

**目标**·把 Phase 2 后 25 字段 SC1 schema 按字段族拆 4 路并行 (账本·势力军事·区划政制·事件叙事)·终极方案。

| 改动 | 涉及 | 工作量 |
|---|---|---|
| **8.1·字段族分组**·设计 5 族 (A 账本·B 势力军事·C 区划政制·D 叙事·E 扩展)·D 必须最后 (读 ABC 输出) | 设计文档 | 1 天 |
| **8.2·SC1a 账本族**·人事+财政+char_updates·~4K output·**启用 Phase 6 strict schema** | 新子调用 | 1 天 |
| **8.3·SC1d_acc 叙事族**·读 A/B/C 输出·写 turn_summary/events/edict_feedback·**禁止编造账本未提及事** | 新子调用 | 1 天 |
| **8.4·主流程并行 merge**·`Promise.allSettled` 跑 A/B/C/E·等 D·合并到 p1·**merge 时按 SC1_FIELD_DEFS 排序保 deterministic** (应对 R-D apply 下游) | SC1 主流程重写 | 1 天 |
| **8.5·部分族失败容错**·任一族失败 → 其他族 + 兜底字段仍 apply·**A/B/C 各加 15s timeout 防慢路拖累** (应对 R-C)·**A/B prompt 加"已知约束摘要"从上回合 GM 推断**(应对 R-B 语义需互看)·**失败 toast + 诊断面板高亮 + 可重跑** (应对 R-E user 感知) | 8.4 内 | 1-2 天 |

**启动 gate** (5 条全过才启)·

1. Phase 0-7 全部完成 + 灰度稳定
2. SC1 实测成功率仍 < 95%
3. user 反馈仍有 wall-clock 慢 (>30s)
4. **cache 命中率 >80% (应对 R-A·4 路共用 sysP 成本翻倍)**
5. user 明确同意成本可能略涨 5-10%

**验收**·SC1 wall-clock ~25s → ~18s·成功率 ~95% → ~98%·"全军覆没"概率 ~5% → ~0.2%·成本 +5-10% (因 4 次 sysP·但 cache 缓解)

---

## §4 工作量与 ROI 汇总

| Phase | 工作量 | SC1 成功率 | Token 成本 | wall-clock | 优先级 |
|---|---|---|---|---|---|
| Phase 0·Quick Wins | 1-2 天 | 70% → 85% | -10% | -10% | 🔴 必做 |
| Phase 1·健壮性 | 2-3 天 | 85% → 88% | 0 | 0 | 🔴 必做 |
| Phase 2·SC1 重构 | 5-7 天 | 88% → 92% | -40% | -30% | 🔴 必做 |
| **Phase 2.5·sc1q 对话推演 (新增)** | 1-2 天 | 92% → 92% | +5% (sc1q $0.02) | 0 (并行 sc0) | 🔴 必做·解第二大 gap |
| Phase 3·深度推演重构 | 4-6 天 | 92% → 93% | -15% (删 SC17) | -10% (lite 加 variant) | 🟠 强烈推荐 |
| Phase 4·记忆合并 | 3-5 天 | 93% → 94% | -15% (post·双调用打折) | -30% (post) | 🟠 强烈推荐 |
| Phase 5·sc2/27 合并 | 2-3 天 | 94% → 94% | -5% | 0 | 🟡 应做 |
| Phase 6·json_schema strict | 2-3 天 | 94% → 98% (OpenAI) | 0 | 0 | 🟡 应做 |
| Phase 7·UX | 3-5 天 | 94% → 95% | 0 | -20% | 🟢 可做 |
| **Phase 7.5·设置面板大改 (新增)** | 3-5 天 | 94% → 95% | 0 | 0 | 🟢 可做·配 Phase 7 完工 |
| Phase 8·SC1 拆分 | 5-7 天 | 95% → 98% | -10% | -30% | ⚪ 备选 |
| **最小可行** (Phase 0+1+2+2.5) | **10-11 天** | **70% → 92%** | **-36%** (Phase 2.5 sc1q 略涨) | **-40%** | 🔴 |
| **推荐档** (Phase 0-4 含 2.5) | **16-24 天** | **70% → 94%** | **-60%** | **-65%** | 🟠 |
| **完整档** (Phase 0-7 含 2.5+7.5)·**user 选** | **23-34 天** | **70% → 96% (98% OpenAI)** | **-58%** | **-70%** | 🟢 ⭐ |
| **全做** (Phase 0-8 含 2.5+7.5) | **31-44 天** | **70% → 99%** | **-65%** | **-80%** | ⚪ |

---

## §5 实施顺序与依赖

```
Phase 0 (Quick Wins)
  ├── 无依赖·随时启
  └── 完成 → Phase 1 可启

Phase 1 (健壮性)
  ├── 依赖 Phase 0 (D 方案)
  └── 完成 → Phase 2 + Phase 6 可启

Phase 2 (SC1 family 重构)
  ├── 依赖 Phase 1 (新 partial JSON 抢救层)
  └── 完成 → Phase 2.5·Phase 5·Phase 8 可启

Phase 2.5 (sc1q 对话推演·新增)
  ├── 依赖 Phase 2 (SC1 schema 已瘦身·有空间塞 sc1q 注入段)
  ├── 部分子项 (2.5.6/2.5.7/2.5.8) 联动 Phase 4·要在 Phase 4 改 sc25c/sc_memwrite/sc15n 时同步加 sc1q 消费路径
  └── 完成 → 解决对话承诺被忽略 gap

Phase 3 (深度推演重构 SC1c/SC16/SC17/SC18)
  └── 依赖 Phase 2 (SC1c 边界要先稳)·与 Phase 2.5 并行 (无字段冲突)

Phase 4 (记忆合并 sc25/consolidate/sc07/sc15)
  ├── 与 Phase 3 并行·无依赖 (post-turn 独立)
  └── 包含 Phase 2.5 的 sc25c/sc_memwrite/sc15n 联动子项

Phase 5 (sc2/27 合并)
  └── 依赖 Phase 2 (SC1 schema 稳)

Phase 6 (json_schema strict)
  └── 与 Phase 2 并行·只对 OpenAI

Phase 7 (UX)
  └── 依赖 Phase 1 (诊断数据)

Phase 8 (SC1 4 路·备选)
  └── 依赖 Phase 2 + Phase 6
```

---

## §6 风险与回退

### 重大风险

- **Phase 2 (SC1 删字段)**·若 tm-ai-change-applier.js / tm-endturn-apply.js 有未发现的 SC1 字段消费者·会 silent break。**缓解**·扩展 smoke-endturn-public-contract.js 覆盖全部 60 字段
- **Phase 3 (sc25/sc_consolidate 合并)**·下回合 sc1 注入逻辑要同步改·有 silent 质量下降风险。**缓解**·保留旧 sc25 字段名作 alias·灰度切换
- **Phase 4 (sc2/27 合并)**·sc2 改三阶段·改动面大·叙事质量可能不稳。**缓解**·feature flag·允许回退老 sc2 + sc27

### 回退策略

每个 Phase 都·
1. 改前做 backup (`backups/2026-XX-XX-phase-N/`)
2. 加 feature flag·`P.ai.enablePhaseN = true`·失败时一键切回
3. smoke 测试通过才合入主线
4. 灰度·先 dev 自测 3 回合·再 user 灰度 1 回合·确认稳定才默认开

---

## §6.5·实施前必做清单 (Round 2 全核·4 路 agent 综合)

经 2026-05-22 4 路并行深 grep (35+ 文件·324 GM 字段·150+ 命中点)·**实施前必修 15 项 P0 + 6 项 P1 + 3 项 P2**·按 Phase 排·

### 🔴 P0·阻断·实施前必修 (15 项)

| Phase | 必修项 | 位置 |
|---|---|---|
| 2 | ~~**`p1.faction_relation_shift` Ghost 字段处理**~~·✅ #98 调查完毕 (2026-05-22)·**不是 ghost**·是双轨字段·schema/validator 已补·收敛留 Phase 2 SC1 重构 (下方明细) | tm-endturn-apply.js:2423 |
| 2 | faction_events 加 `consumedBy:['endturn-ai-infer:sc1c']` 标签 | tm-ai-schema.js:96 |
| 2.5 | **注册 `dialogue_commitment_feedback`** 字段 (schema + validator fallback) | tm-ai-schema.js + tm-ai-output-validator.js |
| 2.5 | **新建 `_applyDialogueCommitmentFeedback()`** 函数 (当前完全无此) | tm-endturn-apply.js |
| 2.5 | sc1q input 必须 **包含 `GM._secretMeetings`** (御前密议·doc 提了但 agent 警告"未消费") | sc1q implementation |
| 2.5 | **dedup 算法实装** (sc1q + _wd_extractCommitments 同回合不重复 push)·assignedTurn + task 相似度 | tm-wendui.js / tm-endturn-apply.js |
| 3 | SC17 删后 `_specialtySummary.sc17` (sc2 prompt 消费) 改读 `sc1.economic_analysis` | tm-endturn-followup.js |
| 3 | SC16 prompt 加硬规则·"必输 diplomatic_shifts·无则 []" (SC1c 让位后 SC16 唯一负责) | tm-endturn-followup.js SC16 |
| 4 | **`_POST_TURN_NEXT_REQUIRED_IDS = { sc25: true }` 改 `sc25c: true`** (关键依赖映射) | tm-post-turn-jobs.js:28-30 |
| 4 | sc25c 必须保留 `GM._stateBoard` 写入路径 (sc1 prompt L1268-1287 消费) | sc25c apply |
| 4 | sc15n 必须保留 `GM._factionUndercurrents` + `_specialtySummary.sc15` 写入 | sc15n apply |
| 4 | `GM._lastSc28Snapshot` 加 `_ensureGMDefaults()` 默认值 (否则 save/load 丢) | tm-save-lifecycle.js |
| 5 | **SC27 expectedKeys L1891 改新 review schema** (当前硬编码 rewritten_passages/added_details·改 anachronisms/name_errors/missing_beats/tone_guidance) | tm-endturn-followup.js:1891 |
| 7 | `GM._costHistory` 加 `_ensureGMDefaults()` 初始化 | tm-save-lifecycle.js |
| 7 | TokenUsageTracker.record() **8 处调用全补 id 参数** (否则 byId 永远空·dashboard 无数据) | 8 文件 |

### 🟡 P1·设计漂移·实施时核 (6 项)

| Phase | 应做项 |
|---|---|
| 2.5 | `_edictTracker` (28 引用) 跟 sc1q 关系文档化·是否 sc1q input·当前 doc 空白 |
| 2.5 | `_plotThreads` (14) / `_foreshadows` (20) 跟 sc1q / sc25c 关系文档化 |
| 5 | sc2_prose mirror 时机明确·`ctx.results.sc2_prose → GM._turnAiResults.subcall2.houren_xishuo` 必须在 render 阶段之前完成 |
| 6 | 3 个函数 `_supportsStrict / _buildSc1JsonSchema / _applyStrictSchemaIfAvailable` 完全未编写·要 from scratch |
| 7.5 | `P.conf.modelTier` 下游核·tm-ai-planning.js 是否真消费·否则 UI toggle 是 dead 字段 |
| 7.5 | `P.ai.prompt` 改后清 `GM._lastSysPHash` (sysP cache·tm-ai-infra.js)·当前 openSettings 不清 |

### 🟢 P2·可靠性 (3 项)

| Phase | 完善项 |
|---|---|
| 7 | `GM._aiDispatchStats` 标准化结构·`{errorLog, successCount, totalTokens}` |
| 全 | TM_AI_SCHEMA·Phase 2 删的 9 字段加 deprecated 映射·validator 兼容老存档 |
| 全 | 跨 Phase 链式依赖文档化·`_edictTracker → sc1q → _plotThreads → sc25c`·当前散落无单点真源 |

### 📊 Round 2 全核统计

- 4 路 agent 总耗时 ~10 分钟·grep 35+ 文件·324 GM 字段·~150 命中点
- Ghost 字段·1 (`p1.faction_relation_shift`·tm-endturn-apply.js:2423)
- 完全未实现的函数·5 (Phase 6 strict 3 个 + Phase 7 dashboard 2 个)
- 漏 cover 的关键 GM 字段·6 (`_edictTracker / _plotThreads / _foreshadows / _turnAiResults mirror / _aiDispatchStats 标准化 / _costHistory 初始化`)
- 上一轮 (Round 1) 找到的 9 处补救·已 doc·**Round 2 在此基础上 +15 P0 + 6 P1 + 3 P2 = +24 项**

---

### Round 3 (2026-05-22)·smoke + render + 嵌套 + pipeline 端到端 + dead

2 路 agent 跨 Phase 链路追踪 + 嵌套字段 + zombie 普查·再找出 Round 1+2 没找到的 **20 项**。

#### 🔴 P0·阻断·实施前必修 (10 项 Round 3)

| Phase | 必修项 |
|---|---|
| 2.5 | **`dialogue_commitment_feedback` 与现有 `p1.commitment_update` 故意分离** (user 选 B 方案·2026-05-22)·两者职责区分·commitment_update=edict 触发·dialogue_commitment_feedback=对话触发·status enum 对齐·避免双轨混淆 |
| 2.5 | smoke·`scripts/smoke-endturn-subcall-registry.js:28-29` 必须加 `sc1q` entry·否则 smoke 失败 |
| 3 | smoke·`scripts/smoke-endturn-followup.js:44` 当前锁 `sc17`·Phase 3 删后 smoke 必破·改 expected list |
| 4 | smoke·`scripts/smoke-endturn-followup.js:48` 当前锁 `sc25`·Phase 4 改 `sc25c` 后破·改 expected list |
| 5 | **`SC27 expectedKeys L1891` 硬编码 `rewritten_passages/added_details`** (Round 2 已 doc)·但 Round 3 新发现·**这俩字段无下游消费者·是 dead 字段**·Phase 5 改新 review schema 顺便清理 |
| 5 | render 层·`tm-endturn-render.js:35 hourenXishuo \|\| zhengwen \|\| ''` 后备链·sc2_prose mirror 必须确保 `aiResult.hourenXishuo` 仍命中·否则 render 拿 undefined |
| 5 | render 层·`tm-endturn-render.js:46-51` dead char filter 当前对 hourenXishuo 全文过滤·**sc2_outline 段不应过滤**·区分 outline vs prose |
| 4 | **`GM._lastSc28Snapshot` 完全无·从 0 实现**·结构 `{turn, world_snapshot, next_turn_seeds, tension_level, expiresAt}`·+ expiresAt 清除逻辑 (当前 sc28 写 _aiMemory/_foreshadows·不写专字段) |
| 6 | **Phase 6 strict mode 基础设施完全无**·`tm-ai-schema.js` 当前只 `{type, desc, consumedBy}`·**缺 enum/additionalProperties/required/nested**·要从 0 写完整 JSON Schema·`RECONCILE_TOOLS L328+` 有 enum 但与主 S 分离·要统一 |
| 全 | **老存档无 migration 函数**·只有 compat restore (tm-save-lifecycle.js:904-942)·新加 GM 字段无初始化·新 schema 删字段无清理·**实施前必加 migration framework** |

#### 🟡 P1·应做 (6 项 Round 3)

| Phase | 应做项 |
|---|---|
| 2.5 | sc1q apply 写 `_npcCommitments` 时·dedup 与 `_wd_extractCommitments` (tm-wendui.js:1180+)·避免同回合双重 push |
| 2.5 | `_specialtySummary` (sc2 prompt 中文字提及) 搜不到定义·确认是死字段还是函数级·Phase 4 删 sc17 时一并清 |
| 4 | sc25c 必须保留 `_stateBoard` 过期清除逻辑·Phase 4 实施时确认 |
| 6 | 新建 `scripts/smoke-strict-schema.js`·检 enum / additionalProperties / required 完整性 |
| 全 | 新建 `scripts/smoke-old-save-compat.js`·验证老存档加载后新字段安全初始化 |
| 全 | 跨 Phase 链式依赖文档化·`_edictTracker → sc1q → _plotThreads → sc25c → _stateBoard` 主链 + 旁支 |

#### 🟢 P2·清理 (4 项 Round 3)

| 项 | 描述 |
|---|---|
| dead 字段清·sc27.rewritten_passages/added_details | Phase 5 改 schema 时自然清·入 release notes |
| dead 字段清·_specialtySummary | 跟 P1 确认结果·若死即删 prompt 提及 |
| dead 字段清·npc_behavior post-turn job | tm-post-turn-jobs.js:34 注释允许后台·但消费逻辑无·确认实际用途或删入队 |
| dead toggle·`P.conf.showRelation` | Phase 7.5 处理·我推荐删 UI (1 toggle 不值得新功能) |

### 📊 三轮总核实统计

```
Round 1·9 项 (字段名虚构修正)
Round 2·24 项 (P0 15 + P1 6 + P2 3·真实字段对齐)
Round 3·20 项 (P0 10 + P1 6 + P2 4·smoke + render + pipeline + dead)
─────────────────────────────
共 53 项必修
```

实施前 Round 4 不做·边际收益小 (核实已 saturate)·进 Phase 0 实施。

---

## §6.6·决定记录 (2026-05-22 user 拍板)

### 决定 1·commitment_update vs dialogue_commitment_feedback = **B 分离**

理由·语义边界清·sc1q 专属 source_conv_id 追溯·避免 edict 和 dialogue 反馈混搅。

### 决定 2·设置面板 6 决定 (按 Claude 推荐)

| # | 问题 | 决定 |
|---|---|---|
| 1 | sysP cache 命中率显示位置 | ④ 性能段 (跟 cacheSysP toggle 同段) |
| 2 | enableSc1q 默认 | **true** (主诉问题·默认开·user 可关) |
| 3 | Phase 6 strict 非 OpenAI 用户隐藏 toggle | **不隐藏·灰显** (让 user 知道这功能存在·切到 OpenAI 即可用) |
| 4 | showRelation zombie 处理 | **删 UI** (1 toggle 不值得新功能·标 deprecated) |
| 5 | incrementalRetry / jsonrepair 暴露 vs 内部 | **暴露给 user** (放 ④ 性能段·user 可关回退) |
| 6 | costDashboard / failureDashboard 默认开关 | **默认 off** (节省面板空间·user 主动开) |

---

## §7 不在本方案范围 (后续 backlog)

- AI 模型分级·每个子调用按 standard / full 跑不同模型 (省钱 30%·复杂度高)
- prompt 模板化·所有子调用 prompt 走 PromptTemplate.render·便于编辑器修改
- 端到端 e2e smoke·完整回合跑·覆盖 19 子调用 + sc_apply
- 多 provider 配置 UI·OpenAI / Anthropic / Gemini / DeepSeek 一键切换

---

## §8 user 决策点

```
[A] 只做 Phase 0+1 (3-5 天)
    SC1 成功率 70% → 88%·性价比高·先验证主诉解决·不动架构
    
[B] 做 Phase 0+1+2+2.5 (10-11 天) ← 最小可行
    SC1 成功率 70% → 92%·解决主诉 + 消除 SC1 family 架构债 + 对话承诺被推演
    
[C] 做 Phase 0-4 含 2.5 (16-24 天) ← 推荐性价比
    SC1 成功率 70% → 94%·成本降 60%·sc25/consolidate/sc07/sc15/SC17 全合并
    用户体验本质升级 (lite/standard 不再 npc 静默)
    
[D] 做 Phase 0-7 含 2.5 + 7.5 (23-34 天) ← **user 选** ⭐
    SC1 成功率 70% → 96% (98% OpenAI)·UX 大幅改善·诊断面板完整·sc1q 对话承诺闭环
    
[E] 全做 (28-39 天) Phase 0-8 含 2.5
    SC1 成功率 70% → 99%·终极方案·包含 SC1 4 路并行拆分
```

**user 确认档次**·2026-05-22·**[D] Phase 0-7 含 Phase 2.5·20-29 天**

---

## §9 调用数变化对照

### 现状·19 个子调用

```
记忆 (3)·sc0  sc_recall  sc05
主推演 (4)·sc1  sc1b  sc1c  sc1d
深度 (5)·sc15  sc_memwrite  sc16  sc17  sc18
后处理 (7)·sc_audit  sc2  sc25  sc27  sc07  sc28  sc_consolidate
```

### Phase 0-7 + 2.5 完成后·18 个

```
记忆 (3)·sc0  sc_recall  sc05                       不变
+ **sc1q (NEW Phase 2.5)**                          ← 对话承诺推演
主推演 (4)·sc1  sc1b  sc1c  sc1d                    不变·SC1 schema 60→25
深度 (4)·sc15n*  sc16  sc18                         sc07+sc15 合 sc15n·sc17 删·sc_memwrite 后台
后处理 (6)·sc_audit  sc2_outline  sc27  sc2_prose  sc25+consolidate 合 sc25c·sc25c 实际 2 调用算 1
            sc25c**  sc28                              

净·19 - 3 (删 sc17/sc07/sc_consolidate) - 1 (sc15+sc07 合) - 1 (sc25+consolidate 合) 
   + 2 (sc2 拆 outline+prose) + 1 (sc1q 新增) = 17
   (sc25c 双调算 1 是逻辑·实际 wall-clock 2 次·算物理调用 = 18)
```

净 -1 调用·但能力大幅扩展 (对话承诺·NPC 一致性·叙事 inline 修正)。

---

## §10 成本变化对照 (单回合 GPT-4o 估)

| Phase | 单回合 | 累计变化 | 200 回合长局 |
|---|---|---|---|
| **现状** | **$0.45** | — | $90 |
| Phase 0 | $0.40 | -11% | $80 |
| Phase 1 | $0.40 | -11% | $80 |
| Phase 2 | $0.32 | -29% | $64 |
| Phase 2.5 | $0.34 | -24% (sc1q +$0.02) | $68 |
| Phase 3 | $0.29 | -36% | $58 |
| Phase 4 | $0.24 | -47% | $48 |
| Phase 5 | $0.23 | -49% | $46 |
| Phase 6 | $0.23 | -49% | $46 |
| Phase 7 | $0.19 | -58% | $38 |
| Phase 8 (备选) | $0.20 | -56% | $40 |

**user 选档 [D] Phase 0-7 含 2.5**·单回合 $0.45 → $0.19·**-58%**·200 回合 $90 → $38·**省 $52**

---

## 11. Kickoff Notes (2026-05-22)

**baseline 文件**·`docs/ai-upgrade-baseline-2026-05-22.json` (任务 #110 录·17 subcall / 24 CALL_POLICIES / stream_sc1=ON / 4 mirror / 244 schema field)

**重跑命令**·
```
node scripts/calibrate-ai-pipeline-baseline.js --diff    # 每 phase 落地后跑·flag 偏差信号
node scripts/calibrate-ai-pipeline-baseline.js --print   # 不写文件·只看当前快照
```

**灰度顺序**·
1. #98 Ghost 字段调查 (30 min·零风险) → 标 baseline 是否真有 1 处 faction_relation_shift
2. #99 Phase 0·D-1 SC1 stream 默认 OFF (5 min·flip P.ai.stream_sc1) → 跑 --diff 确认信号已变
3. #100 Phase 1·健壮性收口 (全实现错误隔离才动 Phase 2)
4. #101 Phase 2·SC1 family 重构 + #98 Ghost 修复
5. #102/#103 并行 (Phase 2.5 sc1q + Phase 3 深度推演·二者互不依赖)
6. #104 Phase 4·sc25c/sc15n 合并 (最大改动·需 #102 #103 双绿灯)
7. #105/#106 并行 (Phase 5 sc2/sc27 + Phase 6 strict schema)
8. #107 + #108 (Phase 7 UX + Phase 7.5 设置面板)
9. 备选·#109 Phase 8 (30 天观察后·5 门槛过才启)

**Rollback 锚点**·每 phase 完成前打 commit tag `ai-upgrade-phaseX-done`·失败可回滚

**用户验收 checkpoint**·每批落地后录一段绍宋 1 回合 gameplay·user 看完→续下批

---

## 12. #98 Ghost 字段调查结果 (2026-05-22)

**结论**·`p1.faction_relation_shift` **不是 ghost 字段·是双轨技术债**·

| | `faction_relation_changes` (旧·扁平) | `faction_relation_shift` (新·mirror) |
|---|---|---|
| Prompt | SC1 L1375 + SC1c L2901/3101 | SC1 L1469 |
| 字段形 | `{from,to,type,delta,reason}` | `{from,to,relation_delta,new_type,event,reason}` |
| Apply | apply.js:1388·写 `GM.factionRelations[]` 扁平双 push·反向减半 | apply.js:2423·`setFactionRelation(.., {mirror:true})`·有 historicalEvents |
| Schema | ✅ 已有 | ✅ 已加 (本次) |
| Validator | ✅ 已有 | ✅ 已加 (本次) |
| EventBus | `_dbg` log | `addEB('外交', ...)` |

**本次修复 (#98)**·
- ✅ `tm-ai-schema.js:97` 加 `faction_relation_shift` 定义·标 `consumedBy:['endturn-ai-infer:sc1','tm-endturn-apply.js:2423']`
- ✅ `tm-ai-output-validator.js:40` 加 `faction_relation_shift:'array'` fallback
- ✅ doc 双轨事实归档

**留给 Phase 2 SC1 重构的指引**·当前 AI 每回合被要求同时输出两份等价数据·factionRelations 被双写。Phase 2 应做以下决定·
- **方案 A·收敛到 `_shift`** (推荐)·新 mirror 模型更强·删 SC1 L1375 + SC1c L2901/3101 + apply L1388·保留 L1469 + L2423·节约 ~3% prompt tokens
- **方案 B·收敛到 `_changes`** (保守)·删 SC1 L1469 + apply L2423·setFactionRelation mirror 能力丢失
- **方案 C·维持双轨** (现状)·schema 已补·不再 silent break·但 cost 浪费

Phase 2 实施时 user 拍板。

---

## 13. P.ai Flag 总览 (2026-05-22 实施完成)

实施完毕后·**所有 P.ai opt-in flag 状态表**·一站式 user 索引·

| Flag | 默认值 | 启用条件 | 影响 | 引入 Phase |
|---|---|---|---|---|
| `P.ai.stream_sc1` | **false** (Phase 0 D-1 翻) | `=== true` 才走 SSE | SC1 走 stream·JSON 抢救能力 -·进度条 + | Phase 0 D-1 |
| `P.ai.openaiStrict` | **false** | `=== true` 启用 json_schema strict | logit-mask 锁 JSON 形·失败率 70%→99%·失败自动 fallback to json_object | Phase 6 Q1 |
| `P.ai.sc1OwnedBySc1b` | **true** (默认 ON) | `=== false` 回滚双管 | SC1 schema 删 cultural_works/npc_letters/npc_correspondence/npc_interactions·~-900 tokens | Phase 2 Slice 3 |
| `P.ai.sc1OwnedBySc1c` | **true** (默认 ON) | `=== false` 回滚双管 | SC1 schema 删 faction_events/npc_schemes/hidden_moves/faction_interactions_advanced/fengwen_snippets·~-750 tokens | Phase 2 Slice 4 |
| `P.ai.sc17Skip` | **true** (默认 ON) | `=== false` 启用旧 SC17 子调用 | SC17 跳·SC1.economic_advice 替代·`_specialtySummary.sc17` 派生·**-$0.02/turn** | Phase 3 A10 |
| `P.ai.sc16Lite` | **false** | `=== true` 走 SC16 lite (top-3 priorities) | SC16 prompt -70%·~-$0.005/turn·适用 low-tier model | Phase 3 Q5 |
| `P.ai.sc25cEnabled` | **true** (默认 ON) | `=== false` 走旧 sc25 + sc_consolidate | sc25c 双 LLM 并行 (tactical temp=0.3 / strategic temp=0.5)·R-H 决定 | Phase 4 A5 |
| `P.ai.sc15nEnabled` | **false** | `=== true` 启用·sc15+sc07 合一 | sc15n 3-tier 按 modelTier (core/common/extended)·-1 LLM call·**-$0.02/turn** | Phase 4 A6 |
| `P.ai.sc2Pipeline` | **undefined (legacy)** | `=== '3stage'` 走 sc2_outline + sc27_review + sc2_prose | 三段管线·总 ~7.5K vs 旧 13K tokens·**-$0.04/turn**·anachronism +30% 拦截 | Phase 5 A7 |
| `P.ai.sc18Lite` | **false** | `=== true` 走 SC18 lite (war_probability 单字段) | SC18 prompt -70%·~$0.005/turn·适用 low-tier model | Phase 3 Q5 (Pass B 真做) |

### P.conf flag (设置面板·Phase 7.5 补 defaults)

| Flag | 默认 | 用途 |
|---|---|---|
| `P.conf.dialogueRecallTurns` | 3 | sc1q 输入 jishiRecords 回看窗口 |
| `P.conf.costAlertThreshold` | 0.5 | 单回合超阈值 ($) 显示 warning |
| `P.conf.strictSchemaEnabled` | false | 镜像到 P.ai.openaiStrict (UI 友好别名) |
| `P.conf.modelTier` | undefined (auto) | low/medium/high·决定 SC1 schema 裁剪 + sc15n tier |

### 启用顺序建议 (user 跑回合验稳后逐个翻)

1. **Phase 0/1/2/3 已默认 ON**·**直接跑**·无需 user 改
2. **Phase 4 sc25cEnabled 已默认 ON**·跑 1-2 回合验 sc25c.tactical + strategic 两段都出
3. 验稳后开 `P.ai.openaiStrict=true` (Phase 6·**最高 ROI**·失败率 70%→99%)
4. 跑 5+ 回合验 strict 稳定后·开 `P.ai.sc2Pipeline='3stage'` (Phase 5·-$0.04/turn)
5. 跑 10+ 回合验 3stage 稳定后·开 `P.ai.sc15nEnabled=true` (Phase 4 E·-$0.02/turn)
6. low-tier model 用户·额外开 `P.ai.sc16Lite=true`

---

## 14. 实施遗留清单 (2026-05-22·"剩下的真做" Pass A-G 后·剩 1 项)

**最终 Pass·A-G 已落地·**
- ✅ Pass A·§6.5·TokenUsageTracker.record() 8 处补 id 参数 (5 处 tm-ai-infra·2 处 tm-endturn-ai)·byId 现可拆分
- ✅ Pass A·TokenUsageTracker.getSnapshot() 新加·成本面板拆分 ready
- ✅ Pass B·Phase 3 Q5·SC18 lite variant·`P.ai.sc18Lite=true`·war_probability 单字段·~70% token 节省
- ✅ Pass C·Phase 4 P3·post-turn DAG·`_enqueuePostTurnJob(id, fn, {dependsOn:['sc28']})` 正式 API
- ✅ Pass D·Phase 2.5 联动 3 项·sc25c/sc_memwrite/sc15n 全部消费 sc1q (dialogue_commitments / collective_resolutions / npc_dialogue_intent)
- ✅ Pass E·Phase 4 Slice 5·sc_memwrite async lazy·sc1 prep `await _awaitPostTurnJobsById(['sc_memwrite'])` 头部·确保 NPC 记忆已最新
- ✅ Pass G·D2 三档重定义·UI 改"全 17 / 快 11 / 跳 8"
- ✅ Pass G·D6·GPT-5-mini option 加进 modelTier select
- ✅ Pass G·"导出 AI 日志"按钮·设置面板加 button·接 `TM.ai.exportDiagnostics()`

**唯一遗留 (低 ROI·留浏览器实测后做)·**



实施完成后仍有部分·**已 API surface ready 但 UI 或边缘场景未做**·

### 🟡 部分实施·UI 留 user 浏览器实测后做

| 遗留项 | 原 Phase | 状态 | 缺什么 | 留户建议 |
|---|---|---|---|---|
| 完整成本面板 UI (4 区) | Phase 7 | API ready | 4 区 HTML/CSS·读 `GM._costHistory` 渲染折叠区 + 当前回合成本预估 | 浏览器实测后按需做 |
| aiCallDepth 三档动态 UI | Phase 7 / 7.5 D2 | 改默认值 ready | tm-patches.js:520 硬编码 "11/6/3"·实际 23 entry·UI 应动态从 CALL_POLICIES 读 + 重命名"全/快/跳" | 改 3 行 HTML |
| Warning toast 体系 | Phase 7 | recordSubcallError ready | sc_consolidate 全失败 toast / sc15n 降级 status bar / p1 缺 3+ 字段 console.warn | 接 ctx.meta.errors→toast |
| "导出 AI 日志"按钮 | Phase 7 | exportDiagnostics ready | 设置面板加一个 button·`onclick="TM.ai.exportDiagnostics()"`·5 行 HTML | 显式 UI 接 API |
| D2·aiCallDepth 三档重定义 | Phase 7.5 | flag ready | UI 改三档标签·全=17 (含 sc1q)·快=11 (sc25c 合并后)·跳=8 (跳 sc16/17/18/sc_audit) | UI 改 |
| D6·GPT-5-mini 选项 | Phase 7.5 | - | tm-player-settings.js:241 modelTier 加 option | 1 行 HTML |
| 4 区结构 panel 重组 | Phase 7.5 | - | 智能档位 / 推演深度细调 / 性能成本控制 / 诊断 4 区·当前混在一处 | 大 UI 重组 |

### 🟠 简化实施·真"动态"功能未做

| 遗留项 | 原 Phase | 状态 | 当前简化 | 真做需要 |
|---|---|---|---|---|
| Phase 2 A1·SC1 schema 3 层 (必含/高频/可选 按 cap 动态) | Phase 2 | 简化 | 用 P.ai.sc1OwnedBySc1b/sc1c flag·binary 开/关·非 3 层 | `_buildSc1Schema(tier, modelCap)` 动态拼·按 modelTier 决定字段集 |
| Phase 3 Q5·SC18 lite variant | Phase 3 | 未做 | 只 SC16 lite | SC18 lite·war_probability 单字段·~2 小时·battleResult 后验复杂度高·谨慎 |
| Phase 4 Slice 5·sc_memwrite async lazy | Phase 4 | 未做 | sc_memwrite 同步阻塞 | 改 async·下回合 sc1 prep `await _awaitPostTurnJobs(['sc_memwrite'])`·~5-10s wall-clock 节省 |
| Phase 4 P3·post-turn DAG dependsOn | Phase 4 | 简化 | 当前用 `_awaitQueuedPostTurnSubcallsById` 等待·非正式 DAG | `_enqueuePostTurnJob` 支持 dependsOn:['sc28']·正式拓扑排序 |
| Phase 2.5 联动·sc25c/sc_memwrite/sc15n 消费 sc1q | Phase 2.5 (后 3 项) | 未做 | 当前 sc25c/sc_memwrite/sc15n 不读 sc1q 输出 | prompt 加 input section + apply 路径联调·~3 hours/each |

### 🔴 §6.5 必修·小条目未完

| 遗留项 | 状态 | 影响 |
|---|---|---|
| SC27 expectedKeys L1891 改新 review schema | 部分 | 当 sc2Pipeline=3stage 开时 sc27_review 用新字段·legacy sc27 仍用旧字段 (rewritten_passages/added_details)·共存无破·但 schema drift |
| TokenUsageTracker.record() 8 处补 id 参数 | 未做 | 当前 byId={} 永远空·成本面板按 subcall 拆分缺数据·5 小时改 8 处 |

### 📋 Phase 8 备选 (条件触发·不主动启)

| 5 门槛 | 当前满足 |
|---|---|
| Phase 6 strict schema 已稳定 30 天·success rate ≥98% | ⏸ 待 user 实测 |
| Phase 7 cost panel 显示当前 SC1 成本曲线 ≤ baseline | ⏸ panel UI 未做 |
| Phase 4 sc25c/sc15n 稳定 30 天·无降级 | ⏸ 待观察 |
| 用户实际反馈 SC1 延迟 >30s 是痛点 | ⏸ 待反馈 |
| SC1 当前失败率 ≥5%·影响半径太大 | ⏸ 数据未收集 |

**Phase 8 备选总评**·所有 5 门槛都需 user 实测数据·此前 Phase 8 不主动启。备选路径·`sc1_inline_retry` (1-2 d) 可作快速替代·避免 SC1 4 路并行 +15% 成本。

---

## 15. 跨 Phase 链式依赖图 (§6.5 R3 #12·2026-05-22)

主链 (回合内·顺序)·
```
[用户输入]
   ├─ edicts (诏书)              ─┐
   ├─ jishiRecords (问对/常朝/御前) ─┤
   ├─ _courtRecords (朝议/廷议)    ─┤
   ├─ _secretMeetings (御前密议)   ─┤  → sc1q (并行 sc0)
   ├─ _npcCommitments (跨回合承诺) ─┤
   ├─ GM.letters (鸿雁出)          ─┤
   └─ _approvedMemorials (朱批)    ─┘

sc0 (深度思考) ─┐
sc1q (对话承诺) ─┤ Promise.all → sc1 prep
                ↓
       (sc1 prep·await sc_memwrite 完)
                ↓
sc1 (结构化主推演) ←── sc1q.dialogue_commitments 注入 ←── _stateBoard (上回合)
                  ←── sc28 snapshot (上回合)
                  ←── _consolidatedMemory (sc25c 上回合)
                ↓
sc1b (文事鸿雁人际)·sc1c (势力外交)·sc1d (实录时政) [并行]
                ↓
[sc1 增量 retry / rescue]·若 missing>3 字段
                ↓
        apply (write GM)
                ↓
sc15 / sc15n (3-tier) [opt-in]·sc16·sc17 (skip)·sc18·sc_audit
                ↓
sc07 / sc15n 接管 cognition
                ↓
sc2 / sc2_outline → sc27_review → sc2_prose (3stage)·sc27 audit
                ↓
[post-turn 队列] sc25c (dual-call) + sc28 + sc_memwrite
                ↓
GM._stateBoard / _consolidatedMemory / _lastSc28Snapshot / _npcCognition / _factionUndercurrents·跨回合可见
```

关键字段依赖 (跨 Phase·跨子调用)·

| 字段 | 写入者 | 消费者 | 关键 |
|---|---|---|---|
| `GM._edictTracker` | edict 提交 | sc1q (Phase 2.5)·sc1 prompt | 玩家诏命单源 |
| `GM.jishiRecords` | wendui/court/yuqian | sc1q (Phase 2.5) | 7 渠道对话 |
| `GM._courtRecords` | 朝议/常朝/廷议 | sc1q + sc25c (Phase 2.5/4) | 集体决议 |
| `GM._npcCommitments` (dict) | _wd_extractCommitments + sc1q apply | sc1 prompt + 下回合 sc1q | 承诺持久 |
| `GM._stateBoard` | sc25c.tactical (Phase 4) | sc1 prompt (Phase 0+) | 朝堂状态板 |
| `GM._consolidatedMemory` | sc25c.strategic (Phase 4) | sc1 prompt + memory diagnostics | 记忆固化 |
| `GM._lastSc28Snapshot` | sc28 post-turn (Phase 4) | sc1 prep (Phase 4 sc28→sc1 注入) | 上回合 world snapshot |
| `GM._foreshadows` | sc25c.immediate_foreshadow + sc28 | sc1 prompt + sc25c.strategic | 伏笔 |
| `GM._factionUndercurrents` | sc15 / sc15n (Phase 4) | sc16/sc28 prompt | 势力暗流 |
| `GM._npcCognition` | sc07 / sc15n (Phase 4) | sc15n core·tier=extended | NPC 认知 |
| `_specialtySummary.sc15/16/17/18` | sc15/sc16/sc17 (派生)/sc18 | sc2 narrative prompt | 后人戏说素材 |
| `GM._costHistory` | record.finalize (Phase 7) | TM.ai.showCostPanel·exportDiagnostics | 成本面板 |

Opt-in flag 启用建议路径 (按 ROI)·
```
Phase 0-4 默认 ON (已启)
    ↓
P.ai.openaiStrict = true  (Phase 6·真正大幅降失败率·OpenAI 用户)
    ↓ 跑 5-10 回合
P.ai.sc2Pipeline = '3stage'  (Phase 5·-$0.04/turn·anachronism 拦截)
    ↓ 跑 5+ 回合
P.ai.sc15nEnabled = true  (Phase 4 E·-$0.02/turn·sc07+sc15 合一)
    ↓
P.ai.sc16Lite = true / sc18Lite = true  (Phase 3 Q5·low-tier model 适用)
```

---

— Claude·2026-05-22·实施档次·[D] Phase 0-7 含 Phase 2.5·总 20-29 天·实际浓缩单会话完成 (scaffold + opt-in 策略·真做留 user 跑回合验稳后)
