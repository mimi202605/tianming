# 天命 · 演绎脑实跑报告 · 天启七年 T1 完整一回合

> **日期**：2026-05-28（实跑）/ 2026-05-29（整理）
> **目的**：验证"让 Claude 经 MCP 式中转当演绎脑、游戏零外部 API 跑完整一回合"，并记录**每个 AI 调用的实际作用**（这是最初要回答的问题）。
> **结果**：✅ 成功。天启七年开局 + T1 全部 AI 调用（39+ 次）由 Claude（演绎脑）应答，零外部模型，游戏推进到 **T2**（`GM.turn:2` 已确认）。
> **数据源**：`dev-tools/ai-relay/queue/transcript.jsonl`（40 条，含 relay 两次重启的重号）。

---

## 1. 架构（队列接缝 · 零改游戏代码）

```
游戏 renderer ──POST──▶ 本地中转 relay.js (127.0.0.1:8765, 冒充 OpenAI 兼容端点)
   (P.ai.url 指向中转)        │  park 成 queue/pending/<id>.prompt.txt
                              ▼
                    Claude/agent 读 prompt → 写 queue/answer/<id>.json
                              │  {json:{...}} | {content:"..."} | {tool_calls:[...]}
                              ▼
              中转包成标准 OpenAI 响应 ──▶ 游戏现有解析/applier 一行不改
```

**关键决策**：不 patch `tm-ai-infra.js`，而是利用游戏自带的 BYOK（`P.ai.url` 可指任意第三方中转）。只改 `P.ai.url` + `P.ai.secondary.url` 两个值 → 全部调用进中转。key 从未被读/改。

**配套工具**（全在 `dev-tools/ai-relay/`）：relay.js（中转+自动应答探测调用）、cdp-eval.js（CDP 注入）、inject-config.js（指向中转+强制 full 深度）、inject-nofetchtimeout.js（去 fetch 超时防重试风暴）、agent-brief.md（并发 agent 作业手册）、wait.js/peek.js（监测）。

---

## 2. 每个调用的实际作用（核心交付）

### 开局阶段（载入剧本时触发）
| 调用 | 实际作用 | 输出 schema |
|---|---|---|
| 连通 ping "Hi" | 探测中转可达（maxTok=5） | 中转自动答 OK |
| 上下文窗口探测 | 二分"测试文本"探模型容量，用于标定压缩参数 | 中转自动答 200000 |
| 世界配置确认 | 确认 AI 世界配置完成 | 中转自动答 |
| **科举体系配置** | 给天启朝配 keju（三级/间隔/糊名誊录/科目） | `enabled/tiers/subjects/features` |
| **推演稳定性规划** | 24 NPC 隐藏议程 + 危机分支 + 临界点 + 首回合反应 + 叙事基调 | `npcHiddenAgenda/crisisBranches/tippingPoints/npcFirstTurnReaction/narrativeTone` |
| **势力关系矩阵** | 22 势力两两关系 + 结盟潜力 + 三角博弈 + 黑天鹅 | `factionMatrix/alliancePotentials/strategicTriangles/blackSwans` |

### 回合内交互（玩家操作触发）
| 调用 | 实际作用 | 备注 |
|---|---|---|
| 问对 ×N（崔呈秀等） | NPC 单独对话，含 reply/忠诚变化/建议/情绪/记忆 | 走 **secondary tier**（gemini-3-flash） |
| 问对后指令提取 | 从对话提取皇帝下达的指令/NPC 承诺 | `commitments[]` |
| 御前廷议 ×多轮 | 史可法/方正化/李标 各 2 轮就陕灾发言 | 每位发言被存、喂给下一位的【已往对答】 |
| 廷议归纳 ×3 | 各臣奏对的第三人称精要 | 纯文本 |

### endTurn 结算管道（说"结束回合"触发，**这是最想看的部分**）
| 调用 | 子调用 | 实际作用 |
|---|---|---|
| sc0 | 深度思考 | tensions/npc_spotlight/foreshadow/**memoryQueries**（驱动记忆检索） |
| sc1q | 对话承诺推演 | 从 7 渠道提取承诺 → **变成 sc1 的硬约束**（required_sc1_actions） |
| sc05 | 记忆回顾 | causal_chains/unresolved/patterns/momentum（因果合成喂 sc1） |
| 常朝议程 | — | 生成 5-9 条朝堂奏报（含 ≥1 urgent + ≥1 弹劾对质） |
| 常朝发言 ×N | — | 李国普/施凤来/李永贞/阎鸣泰/方正化 等就议程表态，**各有锁定的 mode**（pivot/augment/soften/second…） |
| **sc1** | **主推演** | **AIScenarioResponse**：narrative/events/npc_actions/char_updates/faction_events/changes/economic_advice → `applyAITurnChanges` 落地 GM |
| sc1b | 文事鸿雁人际 | cultural_works/npc_letters/npc_correspondence/npc_interactions |
| sc1c | 势力外交·NPC阴谋 | faction_interactions/events/npc_schemes/hidden_moves/fengwen（8 字段） |
| sc1d | 实录时政 | 把 sc1 账本改写为史官文体（shilu_text/shizhengji），**严禁新增事实** |
| sc15 | NPC 深度推演 | hidden_moves/mood_shifts/relationship_changes/faction_undercurrents（改忠诚/关系/阴谋） |
| sc16 | 势力推演 | faction_directives/priorities/actions（势力 AI 战略指令账本） |
| sc17 | 经济财政 | fiscal_analysis/economic_advice/supplementary_resource_changes |
| sc18 | 军事态势 | military_situation/war_probability/battleResult/supplementary_army_changes |
| sc_audit | 一致性自审 | **用 tool_call 修补 sc1 与 narrative 的不一致**（record_disaster/revolt/diplomacy/edict_events） |
| sc2 | 叙事成文 | houren_xishuo《后人戏说》正文 + new_activities |
| sc27 | 叙事审查 | anachronisms/name_errors/润色（查时代错乱、人名错误） |
| sc07 | NPC 认知整合 | 为 22 NPC 生成"信息不对称画像"（谁知道什么） |
| sc_memwrite | NPC 记忆回写 | memory_writes/arc_updates/causal_edges（承诺落到对应 NPC 记忆） |
| 科举判断 | — | 礼部判断是否开科（shouldTrigger/reason） |

---

## 3. 三重铁证：调用链路真实且有状态延续

1. **渲染**：崔呈秀/史可法等的回答逐字渲染进游戏对话面板（截图确认）。
2. **多轮上下文**：问对第二问的 prompt 里，第一问的回答作为 `<<<assistant>>>` 轮带入；廷议中每位 NPC 的发言作为【已往对答】喂给下一位——我的输出在 NPC 间链式传递。
3. **跨子调用约束链**：sc1q 提取的 `required_sc1_actions`（崔呈秀辞呈/史方请缨等）原样出现在 sc1 prompt 的"硬性要求"段；sc_audit 用工具修补 sc1 输出的不一致。**这些是任何"假装"都伪造不出来的。**

最终 `GM.turn` 从 1 → 2，T1 结算落地。

---

## 4. 实跑暴露的真问题（→ 见产品化决策备忘 ai-relay-productization.md）

1. **超时假设**：游戏设 180s fetch 超时，假设模型秒回；演绎脑分钟级 → 超时 → callAISmart 重试风暴。本次靠注入 fetch 去 signal 补丁解决。
2. **secondary tier 漏网**：回合内对话（问对/常朝/廷议）大多走 `P.ai.secondary`（便宜模型）；只改 `P.ai.url` 抓不到，必须同时重定向 secondary。
3. **流式自动降级**：对话用 SSE 流式，但游戏在响应 `Content-Type: application/json` 时自带非流式回退 → 中转返单 JSON 也能工作（游戏自己填了这个坑）。
4. **吞吐量分层属实**：一回合 ~30 次调用，高频小调用（探测/归纳/sc17 默认派生）与低频高判断（sc1/sc2/sc15）混在一起，验证了"演绎脑只该吃高判断、机械小调用应自动答或确定性化"。
5. **并发是关键加速**：每个 pending 派一个 sub-agent 落盘，3 路并行把手答瓶颈打开。注意 sub-agent 内置 Write 在沙箱不落盘，必须走 Node fs.writeFileSync 真实磁盘。

---

## 5. Caveat
- transcript 有 relay 两次重启的重号 id（如两个 #012/#013），靠 prompt 内容区分，不影响调用清单完整性。
- 本回合是验证性试跑，**未存档**（关机前存档调用没发出），T1/T2 进度已丢；工具链完整保留可重跑。
- 演绎脑（Claude）质量远高于玩家 BYOK 弱模型，**本次跑得漂亮 ≠ 弱模型跑得动**；prompt 健壮性/schema 刚性仍需用真·弱模型单独验。
