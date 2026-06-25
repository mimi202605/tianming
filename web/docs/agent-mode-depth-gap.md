# 模式 b · agent 模式 · 产出丰度差距清单 + 补法

> **诚实自审**·2026-06-20。owner 问"你还有没有偷懒"·此为最大一处的交代。
> **结论先行**:mode B 现在能**安全跑、能改对硬核账**,但一个回合的**丰度实打实比 mode A 薄**——
> 因为 mode B 替换了整个 `_endTurn_aiInfer`(=sc0-sc28 全家),而 agent 单循环 + 8 域软清单(COVERAGE_SPINE)
> **没有复现那 18 个专精 scene 的深度**。我之前用"只多不少·全收官"盖过了这个差距。这是overclaim。

---

## 1. 差距清单(sc0-sc28 各产出 vs mode B 现状)

| scene | 产出(写入) | mode B 现状 |
|---|---|---|
| sc0 深度思考 | 推演前局势深思(喂 sc1) | ✅ 覆盖(agent 自身循环推理代之) |
| sc1 结构化数据 | 主变更(财政/人事/省份/事件…) | ✅ 覆盖(agent 用工具直接改·机制不同) |
| sc2 / outline / review / prose 叙事 | 多 pass 叙事(大纲→审查→成文) | ⚠️ 弱(agent 单段叙事·无多 pass 打磨/质检) |
| sc1q 对话承诺推演 | 玩家对话承诺的兑现 | ❌ 丢 |
| sc05 / sc25 / sc25c 记忆 | 记忆回顾 / 伏笔 / 记忆压缩(`_aiMemory`/伏笔) | ❌ 丢(无记忆层产出) |
| sc1b 文事鸿雁人际 | 书信/人际往来 | ❌ 丢 |
| sc1c 势力外交·NPC阴谋 | 外交/阴谋 | ⚠️ 部分(agent 可写·无专精深度) |
| sc1d 实录时政 | 实录条目 | ⚠️ 弱 |
| sc15 / sc15n NPC 深度 | NPC 心绪/关系/暗手/流言/认知(`subcall15`+`_specialtySummary`) | ❌ 丢(agent 不产 NPC 深度层) |
| sc_memwrite NPC 记忆回写 | NPC 记忆(`_npcCommitments`) | ❌ 丢 |
| sc16 势力推演 | 势力优先级/行动/外交(`_factionUndercurrents`) | ⚠️ 部分(agent 改·无专精推演) |
| sc17 经济财政推演 | 经济深推 | ⚠️ 部分(agent 改国库·无专精推演) |
| sc18 军事态势推演 | 军事深推 | ⚠️ 部分 |
| sc_audit 一致性审核 | 数据审计 | ⚠️ 浅(self-check 代之·只查几项) |
| sc27 叙事审查 | 叙事质检 | ❌ 丢 |
| sc07 NPC 认知整合 | NPC 认知(`_npcCognition`) | ❌ 丢 |
| sc28 世界快照 | 世界态势快照(`_stateBoard`) | ❌ 丢 |

**净结论**:`❌ 丢` 集中在 **NPC 深度 / 记忆伏笔 / 认知 / 世界快照 / 书信** 这几类——它们是 mode A 让世界"活"的内核,mode B 目前**完全没产**。`⚠️ 部分/弱` 是势力/经济/军事/叙事——agent 改了状态但没有专精推演的厚度。

## 2. 为什么补法不 trivial(关键约束)

followup(sc15-28)不是独立模块,而是**一条耦合 sc1 的链**:
- **读** `GM._turnAiResults`(sc1 的结构化输出枢纽)+ `subcall1q`(对话)作上下文。
- **彼此链式**:sc15 → sc_memwrite(消费 sc15 的 hidden_moves)·sc16/sc28 读 `_factionUndercurrents`·sc2 读 `_specialtySummary`·sc07 读 `_npcCognition`。
- **写回** `_turnAiResults.subcallXX` + 一堆镜像字段。

mode B 不产 `_turnAiResults`/sc1q → **这些 pass 不能脱离 sc1 裸跑**。所以补法都要先解决"喂什么上下文给它们"。

## 3. 补法选项

**A·接受现状·诚实定位**(零工作):mode B = "更自由但更薄"的实验模式·文档讲清·真机玩验后再决定补哪些。
代价:`只多不少`契约暂不成立·NPC/记忆/世界这些活态在 agent 模式下消失。

**B·agent 主循环后接「深度相」·整体复用 followup**:agent 解完主回合(变更+叙事)→ 合成一个 `_turnAiResults`-shim(从 agent 的改动+叙事映射出 followup 需要的入口字段)→ 跑现成 sc15-28 补深度。
优:复用专精实现·不重写。难:造 shim(耦合 sc1 schema)+ sc16/17/18 与 agent 改动**双算**风险。

**C·把 followup 拆成 agent 可调的「深化工具」**:sc15/sc25/sc28… 各包成工具·agent 想给哪域加深就调哪个。
优:最贴"agent 自主"。难:逐个解耦 followup 的 sc1 依赖·工作量最大。

**D·选择性深度相(推荐)= B 的机制 + 精选子集**:只补**纯增量、不与 agent 改动冲突**的深度——
- 补:NPC 深度(sc15)/ 记忆伏笔(sc25/sc_memwrite/sc07)/ 世界快照(sc28)/ 书信(sc1b)——agent 不自然产、且不和硬核改动打架。
- 不补:势力/经济/军事(sc16/17/18)——agent 已在改·重复跑会双算。叙事(sc2)——agent 已做(质量另说)。
机制:agent 主循环后,以 agent 的"本回合实际改动 + 叙事"为上下文喂这几个 pass(轻 shim·只喂它们要的最小字段),在 agent-mutated 态上补深度层。

## 4. 推荐

**D**:性价比最高、冲突最小、最快让"活态"(NPC/记忆/世界)回到 agent 模式·又不双算。
但它仍是**真一刀工作量**(轻 shim + 选 4-5 个 pass 解耦其 sc1 依赖 + 接在 agent 循环后 + 避双算)。

**节奏建议**:鉴于 mode B 整套(S1-S9)**一次都没真机玩过**·建议**先真机玩一两回合 mode B**,亲眼看看"薄"到什么程度、最缺哪类深度,**再决定补 D 的哪几个 pass**——免得凭空补了用不上的。即:**先玩验 → 按真实体感定 D 的子集 → 补**。

> 若 owner 要现在就补,默认从 **NPC 深度(sc15)+ 世界快照(sc28)** 两个"最活态、最不冲突"的开刀。
