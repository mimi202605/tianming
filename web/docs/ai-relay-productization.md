# 天命 · AI 管道产品化决策备忘

> **来源**：2026-05-28 演绎脑实跑天启 T1 一回合（见 ai-relay-run-report-T1.md）暴露的真问题。
> **目的**：把"验证性试跑"的发现，转成对**正式 AI 管道 / BYOK 玩家体验**的设计决策。
> **定位**：这是 backlog/设计输入，不是已批准开工的 sprint。每条都标了证据与建议落点。

---

## 决策 1 · 超时与重试：游戏假设"模型秒回"，这是脆弱点

**证据**：`tm-ai-infra.js` fetch 默认 180s 超时；sc1 prompt 达 16 万字、maxTok 2 万。实跑中演绎脑（分钟级）一超时，`callAISmart` 立即重试，瞬间堆出 004-013 一串重复调用（retry 风暴），孤儿答复全废。

**根因**：超时 + 自动重试，对"慢但会成功"的后端（慢模型/高负载代理/长输出）是**放大故障**而非容错——重试只是再发一遍同样会超时的大请求。

**建议**：
- a) **按 maxTok 分级超时**：sc1/sc2 这类大输出调用，超时应随 maxTok 线性放宽（如 maxTok×N ms + base），而非全局 180s。
- b) **重试前先判因**：超时（slow）不应立即原样重试；应区分"超时"与"HTTP 错误/截断"，超时走"延长等待"而非"重发"。
- c) **幂等去重**：同一 subcall 的并发重试应被去重（按 subcall id + turn），防止风暴。
- **落点**：`_aiFetchWithRetryInner`（:566 重试循环）+ `callAISmart`（:916 attemptCall）。

---

## 决策 2 · secondary tier 是隐藏的覆盖盲区

**证据**：回合内对话（问对/常朝/廷议/御前）**大多显式走 `tier:'secondary'`**（便宜模型，省成本）。`_getAITier('secondary')` 读独立的 `P.ai.secondary.{url,key}`。实跑中只改 `P.ai.url` 时，这些调用全溜到玩家配的次 API（wclau.de）——**只改主 tier 抓不全**。

**对产品的含义**：
- 任何"全局切换 AI 行为"的功能（如统一中转、统一日志、统一降级），**必须同时覆盖 primary + secondary**，否则一半对话漏网。
- BYOK 玩家若只配 primary 不配 secondary，secondary 自动回退 primary（`_getAITier` 已处理）——但若配了 secondary，两套独立。
- **落点**：任何动 AI 配置的代码，检查 `P.ai` 和 `P.ai.secondary` 两处；`tm-utils.js:_getAITier/_buildAIUrlForTier` 是唯一权威入口。

---

## 决策 3 · 流式回退已有，但依赖响应头

**证据**：对话用 `callAIMessagesStream`（SSE）。`_callAIMessagesStreamDirect`（:1076）在响应 `Content-Type: application/json`（非 SSE）时走"部分代理不支持 stream"的非流式回退分支 → 单 JSON 也能解析。实跑中中转返单 JSON，靠这个回退成功。

**含义/风险**：
- 这是个**隐式契约**：后端必须在不支持 stream 时返 `application/json` 而非空 SSE。某些代理返回畸形 SSE（无 data 行）会卡住而非回退。
- **建议**：回退判断除 Content-Type 外，加"首 chunk 超时无 SSE 数据 → 转非流式重读"的兜底；或给 BYOK 配置一个"禁用流式"开关（已有 `opts.skipQueue` 类似旋钮，可加 `P.ai.noStream`）。

---

## 决策 4 · 吞吐量分层属实 → 调用分类与降级策略

**证据**：一回合 ~30 次调用，量级差异极大：
- **高判断低频**（必须强模型）：sc1 主推演、sc2 叙事、sc15 NPC 暗流、sc_memwrite、sc25c 记忆。
- **机械/可派生**（不配叫模型）：连通 ping、上下文窗口探测、世界配置确认——本次**中转直接自动答**；sc17 经济**默认已从 sc1 派生不发调用**（`P.ai.sc17Skip` 默认 true）；sc_audit 数值一致性、sc27 人名校验**可确定性化**。
- **中判断**：常朝/廷议发言、sc16 势力、sc18 军事——可降级 lite 变体（已有 `sc16Lite/sc18Lite`）。

**对产品的含义**（呼应 ai-io-seam.md §8）：
- a) **探测类调用应内置答案**，不该真打模型——浪费 token + 引入失败点。本次中转的 `AUTO_MAX_TOK` 自动答机制证明可行，可考虑游戏侧也对这类调用走本地常量。
- b) **成本/延迟分层**：强模型只接高判断那一档，中判断走便宜模型（已是 secondary 的设计意图），机械类不调模型。这正是 secondary tier 存在的理由，但分类可更明确（按 subcall id 配 tier，而非散落在各调用点）。
- c) **BYOK 玩家成本**：一回合 ~30 调用、sc1 单次 16万字 prompt，对玩家 API 账单不小。值得给"经济档/完整档"预设（对应 `aiCallDepth` lite/standard/full，已存在但可前置到 UI）。

---

## 决策 5 · sc1q→sc1 硬约束链是好设计，值得保护

**证据**：sc1q 从对话提取 `required_sc1_actions`，这些原样进 sc1 prompt 的"硬性要求·缺一条视为推演失败"段。实跑中"崔呈秀辞呈/史方请缨"确实从问对→sc1q→sc1 贯穿落地。

**含义**：这条链让"玩家与 NPC 的对话"真正影响世界推演（而非对话归对话、推演归推演）。是把**对话型决策提升为"与诏书等同的输入"**的机制。产品化时：
- 保护这条链的完整性——任何重构 sc1q/sc1 边界时，`required_sc1_actions` 的传递不能断。
- sc_audit 的"用 AI 修 AI"兜底（tool_call 修补不一致）是这套的安全网，应保留。

---

## 决策 6 · 演绎脑质量 ≠ 玩家弱模型质量（最重要的清醒）

**证据**：本次应答由 Claude（演绎脑）完成，质量远高于玩家 BYOK 可能配的弱模型。所有 schema 都被完美遵守、时空约束零违反。

**风险**：这给"管道很健壮"的**假信心**。恰恰是"模糊到弱模型会翻车"的 prompt 健壮性、schema 刚性 bug，本次被强模型的理解力悄悄圆过去了。

**建议**：
- 单独用真·弱模型（如 gpt-4o-mini / 便宜国产模型）跑一遍同样的 T1，专门抓：schema 违反、tool_call 失败回退、超长 prompt 截断、JSON 解析失败。这才是 BYOK 版真正要抓的 bug。
- 本次中转 + agent 工具链可复用做这个测试（把 agent 换成调真弱模型即可）。

---

## 附 · 可复用资产

`dev-tools/ai-relay/` 整套（中转/CDP/注入/agent手册/监测）已沉淀，可作为：
1. **回归测试床**：录制一回合的全部 prompt，未来改 prompt/schema 后回放比对。
2. **弱模型健壮性测试**（决策 6）。
3. **演绎脑共创模式**（最初畅想的"导演/陪练"）的基础设施——若哪天想做"只属于你的活体对手/军师"，这是现成接缝。

transcript 完整保留在 `dev-tools/ai-relay/queue/transcript.jsonl`（T1 全程 40 条）。
