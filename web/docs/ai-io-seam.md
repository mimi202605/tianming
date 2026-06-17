# AI I/O 接缝备忘 · 外部模型 → 队列/MCP 接管

> **生成**：2026-05-28 · 源于"让 Claude 经 MCP 当演绎脑、摘掉外部 API"的可行性勘察
> **目的**：标清「游戏调外部模型」的全部出口 + 「AI 输出落地 GM」的入口 schema，作为把外部 API 换成队列接口的施工底图
> **范围**：精确扒了 sc1 主推演的规范 schema + 调用咽喉；sc15~sc28 喷雾子调用未逐个拆（见末尾 caveat）

---

## 1. 输入接缝：全部外部调用汇聚在 `tm-ai-infra.js`

5 个公开函数，最后全落到 `fetch()`：

| 函数 | 行 | 用途 | 返回 |
|---|---|---|---|
| `callAI` | :649 | 纯文本补全 | `string` |
| `callAIWithTools` | :694 | **结构化 tool_use**（Anthropic / Gemini / OpenAI-compat 三分支 + 兜底） | `{text, toolCalls:[{name,input}], fallback?}` |
| `callAISmart` | :916 | `callAI` + 重试/校验/续写 | `string` |
| `callAIMessages` | :987 | 多轮 | `string` |
| `callAIMessagesStream` | :1120 | SSE 流 | `string` |

**请求体形状**（OpenAI chat 标准）：
```
{ model, messages:[{role,content}], temperature, max_tokens }
```
tool 版多 `tools:[{name, description, parameters(JSONSchema)}]` + `tool_choice`。

**两个白送的礼物：**
1. **队列已存在** —— `tm-ai-infra.js:832` `_aiQueue.enqueue(fn, priority)`，带优先级。"drain 一个队列"的基建不用从零建。
2. **"哑模型"路径已存在** —— `callAIWithTools` fallback（:716-751）：API 不支持原生 tool_use 时，把 schema 塞进 prompt、要求模型直接吐 `{"tool_calls":[{name,input}]}` 纯 JSON，再解析回 toolCalls。**这就是"外部东西返回 JSON"的现成插口。**

**拦截点**：在这 5 个函数转发，或更狠在 `_aiFetchWithRetry`（callAI/callAIMessages 经它）+ callAIWithTools 的内联 fetch（:816）两点拦截 —— **两点截全部外部出口**。

---

## 2. 输出接缝：`applyAITurnChanges(aiOutput)`

**`tm-ai-change-applier.js:605`**，签名见 `types.d.ts:1558`(AIScenarioResponse) / `:1889`(AIApplierResult)：
```
applyAITurnChanges(data: AIScenarioResponse): { applied, errors, warnings }
```

aiOutput 是**扁平大对象，~50 个字段族，全部 optional**：

- **叙事**：`narrative` / `shilu_text` / `shizhengji` / `yupiHuiting` / `qijuHistory` / `event{desc}` / `events[]`
- **核心变更**：`changes[]`（变量/状态）、`anyPathChanges[]`（v2 至高权力·任意路径写）
- **角色**：`char_updates[]` / `character_deaths[]` / `relations[]`
- **势力/党派/阶层**：`faction_*` / `party_*` / `class_*`（各含 create/succession/dissolve）
- **军事**：`army_changes[]` / `military_changes[]`（**travelTo 走这里**）、`battleResult{casualties}`
- **官制/行政**：`office_assignments[]` / `personnel_changes[]` / `office_changes[]` / `admin_division_updates[]` / `regions[]` / `region_updates[]`
- **财政/时代**：`fiscal_adjustments[]` / `era_state_delta` / `global_state_delta`
- 末尾 `[k:string]:any` —— AI 可附加任意扩展字段

**关键性质：applier 宽容。** 全 optional、未知 key 忽略、每字段族独立 try/catch、用 `{applied,errors,warnings}` 汇报而不崩 → **可先吐子集、优雅降级，增量友好。**

⚠️ **边界**：`npc_actions[]` **不走** applyAITurnChanges，由 `tm-endturn-ai-infer` 专门通道处理（applier:793 注释明说）。

---

## 3. 管道里的位置（见 `endturn-data-flow.md` §4 step 3）

AI step 顺序：
```
prompt.build(ctx) → subcalls.runMain(sc0/sc05/sc1) → apply.writeBack → followup.run(sc15/16/17/18/2/25/27/28…)
```

- **sc1 = 唯一的"主推演"** —— 输出走 AIScenarioResponse → applyAITurnChanges。**这是该交给演绎脑的那一个高判断调用。**
- **sc15~sc28 = "喷雾"** —— 写 narrative/memory 的 `GM._*` 字段，不是世界状态。高频小调用，该批处理 / 降级确定性 / 先 stub。

---

## 4. 兜底层已在跑（"用 AI 修 AI"）

`apply.writeBack`（**`tm-endturn-apply.js:134`**）：当 validator 置位 `_needsReconcile` 时，**再调一次 `callAIWithTools` 做二审修复**。"确定性外壳兜 AI 错"已有第一块成品。

---

## 5. 落到"无外部模型、只演绎脑 + 确定性规则跑"

1. **接缝**：tm-ai-infra.js 两个 fetch 点 → 路由到队列；复用 `_aiQueue`。
2. **演绎脑吃 sc1**：输入是现成 OpenAI-format prompt，输出吐 `AIScenarioResponse` 子集（或 `{tool_calls:[...]}`）—— 两种形状的解析路径源码里都有。
3. **唯一待拍板的设计岔路**：sc15~28 喷雾 —— **串行全接（慢但全保真）** vs **stub/降级确定性（快但丢叙事层）**。

---

## 6. 喷雾子调用全表（2026-05-28 补扒 · 已逐个核实）

**两个先验更正：**
- `_runSubcall(id, name, minDepth, fn)` 第三参是 **minDepth 深度门槛**（`{lite:0,standard:1,full:2}`，ai.js:792），不是 tier。玩家 `_aiDepth` 低于门槛则**整个跳过** → `full` 档的（sc16/17/18/sc28）只在 full depth 跑。
- ai.js 的 **sc1b/sc1c/sc1d 属 sc1 主推演族**（裸 IIFE，输出 concat 进 `p1`），不是可裁喷雾。

**默认活跃版本**（受 `P.ai.*` 开关控制，施工以这些为准）：sc15→**sc15n**、sc17→**默认 skip**、sc25+sc_consolidate→**sc25c** 双调用、sc07 被 sc15n 接管。

| id / 名 | 门槛 | timing | 输出关键字段 | 落地 GM._* | 裁判 |
|---|---|---|---|---|---|
| **sc0** 深度思考 | standard | inline(sc1前) | tensions/mood/foreshadow/**memoryQueries[]** | `_turnAiResults.thinking`→注入sc1 | 弱·可合并进sc1(留memoryQueries hook) |
| **sc1q** 对话承诺 | lite | inline(sc1前) | dialogue_commitments[]/collective_resolutions[]/npc_dialogue_intent[] | `subcall1q`→喂sc15n/memwrite/25c | model·可并入sc1 |
| **sc05** 记忆回顾 | standard | inline(sc1前) | causal_chains/unresolved/patterns(文本) | `memoryReview`→注入sc1 | 弱·可砍/合并 |
| **sc15/sc15n** NPC深度推演 | std/lite | inline BranchA | mood_shifts[]/relationship_changes[]/hidden_moves[]/npc_schemes[]/faction_undercurrents[]/rumors | 直接改 loyalty/stress/AffinityMap/activeSchemes/`_factionUndercurrents` | **核心·留** |
| **sc_memwrite** NPC记忆回写 | lite | **post-turn** | memory_writes[]/arc_updates[]/causal_edges[] | NpcMemorySystem.remember/`_causalGraph` | **记忆层·留** |
| **sc16** 势力推演 | full | inline BranchB | faction_directives[]/faction_actions[]/diplomatic_shifts[] | `_sc16FactionDirectives`/fac._sc16Directive | 核心·可降级lite |
| **sc17** 经济财政 | full | inline BranchB | (默认skip)fiscal_analysis/economic_advice | `subcall17={_sc17Skipped,_derivedFromSc1}` | **已确定性化·先例** |
| **sc18** 军事态势 | full | inline BranchB | battleResult{}/supplementary_army_changes[]/faction_military_actions[] | MilitarySystems.applyBattleResult/`_factionMilitaryLog` | 半·battleResult可"意图+确定性解算" |
| **sc_audit** 一致性审核 | lite | inline BranchB后 | conflicts[]/auto_patches[{path,op,value}]/needs_rerun[] | patch `_turnAiResults` | **可规则化** |
| **sc19** 新实体丰化 | lite | **post-turn** | factions/classes/parties/characters_enriched[] | `_mergeIfEmpty`填空字段 | 弱·可模板化 |
| **sc2/outline/prose** 叙事成文 | lite | inline BranchC | **zhengwen**/houren_xishuo/new_activities[] | 回合正文(玩家可读)/`biannianItems` | **最核心叙事·绝不stub** |
| **sc27/review** 叙事审查 | std | inline BranchC末 | name_errors/rewritten_passages/added_details | 追加进 zhengwen | 半·name检查可确定性 |
| **sc25c** 记忆合成(双调用) | lite | **post-turn** | tactical:immediate_foreshadow[]/state_board{}/imperial_candidates[]；strategic:key_threads[]/npc_trajectories[]/faction_vectors[] | `_foreshadows/_stateBoard/_consolidatedMemory` | **跨回合记忆核心·留** |
| **sc25 / sc_consolidate** | lite | post-turn | (默认被sc25c取代skip) | — | legacy·以sc25c为准 |
| **sc07** NPC认知整合 | lite | inline(sc15后) | NPC认知画像(信息不对称) | 供问对/朝议复用 | model·留 |
| compress_* ×3 | lite | post-turn | 旧记忆压缩为摘要 | — | 弱·可截断/规则替代 |

## 7. 依赖链（谁的输出喂谁）

```
sc0 ─(memoryQueries)→ SC_RECALL ─┐
sc0/sc05 ─(文本)────────────────→ sc1 prompt
sc1q ─(commitments/intent)──────→ sc15n / sc_memwrite / sc25c
sc1 ── p1 账本 ─┬→ sc1b/sc1c/sc1d(并行·concat回p1)
                ├→ sc15 / sc16 / sc17(派生) / sc18   (读 p1)
                ├→ sc2(读 p1 + _specialtySummary[15/16/17/18])
                └→ sc28
sc_audit  ← subcall1 + 16 + 17 + 18      (横向消费·检冲突→patch)
sc_memwrite ← sc15.hidden_moves + sc1q + p1
sc2_prose ← sc2_outline + sc27_review ;  sc27 ← sc2.zhengwen
sc25c ← sc28.world_snapshot              (post-turn 内 await)
执行DAG: A(sc15)→sc07/sc2 ; B(16/17/18)→sc_audit→sc27 ; post队列:memwrite/19/28/25c/compress
```
**sc1 是所有人的数据源**；`_specialtySummary`(15/16/17/18) 汇入 sc2；sc_audit 是唯一横向消费 16/17/18 的节点；sc25c 是回合末跨回合记忆收口。

## 8. 摘外部 API、只留演绎脑接 sc1 的裁剪三档

- **第一档·可直接 stub/确定性化**：sc17(已是先例)、sc_audit(数值冲突检测→规则引擎)、sc27 的 name_errors(正文人名 vs 存活名单 diff)、compress_*；sc0/sc05 可合并进 sc1(保留 memoryQueries 轻 hook)。
- **第二档·半可裁(降级不删)**：sc18(battleResult 改"sc1 给意图 + 确定性战斗解算"，本就有后验 fu.js:1188)、sc16(已有 lite top-3)、sc15n 的数值 delta 部分、sc19(模板化)。
- **第三档·必须留给脑(砍掉丢灵魂)**：sc2 族(《后人戏说》正文)、sc1b/c/d(诗词/书信/阴谋/史官成文)、sc15(NPC 暗流改 loyalty/scheme)、sc_memwrite(NPC 跨回合记忆来源)、sc25c(伏笔+长程记忆)、sc07(NPC 认知画像)。

**一句话**：真正"喷雾即可裁"的只有 sc17(已裁)/sc_audit/compress_* + 可合并的 sc0/sc05；sc16/18/19/27 可降级；其余是叙事/记忆/NPC 灵魂，必须留给（队列后的）演绎脑。

---

## Caveat

- 第 1-5 节(sc1 主路径 + 咽喉 + 落地 + 兜底)与第 6-8 节(喷雾全表)均已逐个核实(spot-check: ai.js:792 minDepth、fu.js:1062 sc17skip、fu.js:1980 sc25c)。
- 受 `P.ai.*` 开关影响的"默认活跃版本"以本文 §6 标注为准；改配置会切回 legacy 版(sc15/sc25/sc_consolidate/sc07 旧实现)。
- 各喷雾子调用的**完整 prompt 文本**未逐字摘录(过长)，只记了 I/O schema 与落地字段；真要重建某个子调用的 prompt 时仍需回源码读对应 `tp` 构建段。
