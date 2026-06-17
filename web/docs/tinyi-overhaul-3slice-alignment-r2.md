# 廷议·二轮 audit·Slice 4 / 4.5 / 5 / 7

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "继续"·v2.2 写完后追加 audit·Slice 4/4.5/5/7
**方法**·亲读 v3 + 常朝 runtime (`tm-chaoyi-tinyi.js`·`tm-chaoyi-changchao.js`)·grep 验证 v2.2 doc 假设

---

## TL;DR·4 hard + 2 medium

| # | 严重 | 问题 | slice |
|---|---|---|---|
| 1 | **hard** | Slice 4 patch target 错·prompt 在 `_ty2_genOneSpeech` (v2)·不在 `_ty3_phase2_run`·**工时 1.5d 高估** | 4 |
| 2 | **hard** | Slice 5 mode 名漂·doc `cite` vs 常朝 runtime `augment`·structure paradigm 不一致 | 5 |
| 3 | **hard** | Slice 7 `_affinityMap[A][B]` 全 codebase 0 hit·data structure 未 spec | 7 |
| 4 | **hard** | Slice 8 patch L1045 `npc.affinity.toEmperor`·runtime `ch.affinity` 是 number·silent fail / TypeError | 8 |
| 5 | medium | Slice 4.5 `_cySubmitPlayerLine` → `_ty3_onPlayerSpeak` 接入路径未明 | 4.5 |
| 6 | medium | Slice 4.5 §5.1.6 5 NPC 并发抢答 LLM cost (~5x stream call) 未估 | 4.5 |

---

## 1·hard bug 详

### 1.1 (hard)·Slice 4 patch target 错位

**事实** (grep verified)·

```
tm-tinyi-v3.js L1842   async function _ty3_phase2_run() { ... }
                       L1881   var r = await _ty3_safeGenSpeech(nm, roundNum, prevSpeeches);
                       
tm-tinyi-v3.js L1931   async function _ty3_safeGenSpeech(name, roundNum, prevSpeeches) {
                       L1935   var r = await _ty2_genOneSpeech(name, roundNum, prevSpeeches);  ← 真 prompt 在这

tm-chaoyi-tinyi.js L292   async function _ty2_genOneSpeech(name, roundNum, prevSpeeches) {
                          ... 50+ 行 prompt build (L300-349)
```

**v3 phase2_run 自己不 build prompt**·只是分 4 轮 (主奏/同党/敌党/中立/兜底) 调 `_ty2_genOneSpeech` (旧 v2 函数)。

**v2 prompt 内已含**·

| Section | 已注入 | 字段 |
|---|---|---|
| A·persona | ⚠️ 部分 | `ch.personality` + `ch.background` (非 `ch.aiPersonaText`·v2 当时没有该字段) |
| B·recognition | ⚠️ 部分 | `ch._memory.slice(-5)` + `GM.dialogueHistory[name].slice(-3)` (非 `ch.recognitionState`) |
| C·hw/hq | ❌ 缺 | 0% |
| D·党派+learning | ✅ 已注入 | `_partyObj.policyStance` + `_partyObj.focal_disputes` + `ch.learning` |

**结论**·**Slice 4 真改动 ~30%·非 100%**·1.5d 高估。修法·

**方案 A**·改 doc·明确·
- patch target = `tm-chaoyi-tinyi.js:292 _ty2_genOneSpeech` (不是 v3 phase2_run)
- 用 PromptComposer 已有 `buildAiPersonaText` / `buildRecognitionState` helper (常朝大改 sprint 已建)·替换 v2 当前的 `ch.personality` / `ch._memory` 注入
- 真新加·只有 Section C hw/hq + 档位预测
- 工时改 **0.8d** (v2.2 -0.7d)

**方案 B**·v3 phase2_run 抽 prompt build·脱离 `_ty2_genOneSpeech` 依赖·建 `_ty3_buildSpeechPrompt(name, roundNum, prevSpeeches)`·然后照 doc 加 4 段。工时·1.5d 合理·但 v2 廷议路径同时失效需另测。

**推荐**·**A**·改 v2_genOneSpeech·v3 phase2_run 不动·风险最低。doc 措辞 "v3 phase 2 prompt" 明改 "廷议 NPC 发言 prompt (位于 tm-chaoyi-tinyi.js _ty2_genOneSpeech·v3 phase2 复用)"。

### 1.2 (hard)·Slice 5 mode 名漂 + paradigm 不一致

**事实** (grep verified)·

```
tm-chaoyi-changchao.js L2092-2174  常朝 6 mode 实际名·
  lead / second / rebut / soften / pivot / **augment**  (非 cite)

mode 数据结构 (常朝大改 sprint 1.2.4.4)·
  { opens: [15+], closes: [4+], structure: '...', requireEither: [...],
    requireClose: [...], forbidden: [...], example: [...], selfCheck: [...] }
  共 8 字段·非 doc 写的 { prompt, tone } 2 字段
```

**vs Slice 5 doc L922-936**·

```js
const TINYI_MODES = {
  lead:        { prompt: '你首发言主奏', tone: '庄重' },   ← 字段错·应是 opens/closes/structure
  ...
  cite:        { prompt: '用专业数据反驳' },               ← mode 名错·常朝是 augment
};
```

**结论**·Slice 5 doc 是 v1 paradigm (mode 表只 2 字段·当时简单)·常朝大改 sprint 后 paradigm 变成 8 字段 + augment 名·**doc 没追上**。

**影响**·实施者按 doc 写出来的 6 mode·跟常朝 runtime 不一致·若想复用常朝 mode template 必须按 8 字段写。**工时也不准**·

- 复用常朝 6 mode 模板 + 新加廷议 4 mode 模板 (按 8 字段 paradigm) = **1.0-1.2d**
- 全重写 10 mode (含 mode 名整改) = **2.5-3d**
- doc 当前 2.0d 居中·暗示"模糊改造"·会踩坑

**修法**·
- Slice 5 doc 改成常朝 paradigm 对齐版·6 mode 复用 (含 augment 不改名)·廷议 4 mode 按 8 字段新建
- 工时改 **1.2d** (v2.2 -0.8d)
- DoD 加 "mode 名 6 + 4 跟常朝 runtime mode 表 grep 对齐 100%"

### 1.3 (hard)·Slice 7 `_affinityMap` 未 spec

**事实** (grep verified)·

```
grep "_affinityMap" *.js → 0 hit (全 codebase 不存在)
```

**Slice 7 doc 写**·

```
A confront B → 链结束·_affinityMap[A][B] -= 10
```

**问题**·
- `_affinityMap` 数据结构未 spec·`{A: {B: 50}}` 二维 map? 还是 `Map<Map<>>`?
- 在哪 init·什么 namespace (GM / CY / module-local)
- 跟 `ch.affinity` (现有 number 字段) 关系
- 跨场景 persist 还是 per-session
- UI 哪里读

**修法**·Slice 7 spec 加·

```
GM._affinityMap = { [nameA]: { [nameB]: number 0-100 } }
init·GM 初始化时 = {}·懒加载
update·confront 链结束 / NPC 互骂时 set
read·v3 phase 2 prompt 注入·UI 关系图 (可选)
persist·随 GM save·跨场景 reset
default·若 _affinityMap[A]?.[B] undefined → 50 (中立)
```

工时 +0.1d (data structure + init + smoke)。

### 1.4 (hard)·Slice 8 patch L1045 `affinity.toEmperor` 字段错

**事实** (grep verified)·

```
runtime ch.affinity 是 number·见 tm-endturn-apply.js·
  L3936  _targetCh.affinity = (_targetCh.affinity || 50) + 5;
  L3951  _satCh.affinity = Math.max(0, (_satCh.affinity || 50) - 8);
  ... 多处
全 codebase 0 hit ch.affinity.toEmperor·全是单值
```

**Slice 8 doc L1044-1045**·

```js
npc.affinity = npc.affinity || {};        // ← 若 npc.affinity = 50·这行返 50·然后·
npc.affinity.toEmperor = ...;             // ← 50.toEmperor 在 strict mode 抛 TypeError
                                          //   non-strict 静默失败
```

**结论**·这 patch 实际 broken·跟 runtime affinity paradigm 不匹配。

**修法 (3 选项)**·

| | 方案 | 描述 |
|---|---|---|
| A | 用现有 number affinity | `npc.affinity = Math.max(0, (npc.affinity || 50) - finalRebound * 0.6);`·简单·不引入新字段 |
| B | 加 nested `affinityRelations` | `npc.affinityRelations = npc.affinityRelations || {}; npc.affinityRelations.toEmperor = ...`·新字段·跟现有 `ch.affinity` (单值) 并存·区分 "对皇帝 affinity" vs "通用 affinity" |
| C | 扩 `ch.affinity` paradigm 为 object | 全 codebase 改 (tm-endturn-apply.js 等 6 处)·跟 [[feedback_scope_strictness]] 冲突·风险高 |

**推荐**·**A** (最简) 或 **B** (若设计真需 "对皇帝 affinity")。v2.2 doc 当前是错·必改。

**额外**·L1059 `n.dims?.honor`·runtime 字段是 `aggregateDims.honor` (Slice 3 已 spec)·应改 `n.aggregateDims?.honor`·或定义 helper `_ty3_getDims(ch)` (Slice 3 §4 已写)·用 helper 而非裸字段。

---

## 2·medium issue

### 2.1 Slice 4.5 `_cySubmitPlayerLine` → `_ty3_onPlayerSpeak` 接入路径未明

**事实**·

```
tm-chaoyi.js L62  function _cySubmitPlayerLine(){
                    CY._pendingPlayerLine = v;       ← 缓存模式·非直调
                  }
                  
tm-tinyi-v3.js L1948  async function _ty3_handlePlayerInterject(prevSpeeches) {
                       if (!CY._pendingPlayerLine) return false;
                       ...
                       await _ty2_playerTriggeredResponse(line);  ← 现走 v2 handler
                     }
```

**Slice 4.5 doc §5.1.3** 写 `_ty3_onPlayerSpeak(text)` 但没说接入路径·

**两选项**·

| | 方案 | 描述 |
|---|---|---|
| A | 改 `_cySubmitPlayerLine` 直调 | v3 模式下绕过 `_pendingPlayerLine` 缓存·实时分发·UX 即时响应 |
| B | 改 `_ty3_handlePlayerInterject` | 保留缓存·改调 `_ty3_onPlayerSpeak` 取代 `_ty2_playerTriggeredResponse`·timing 跟现状一致 |

**推荐**·**B**·改动小·timing 不变·只换 handler。v2.2 doc §5.1.3 加 patch spec。

### 2.2 Slice 4.5 §5.1.6 5 NPC 并发抢答 LLM cost 未估

**事实**·示例·"严办许显纯" → 5 NPC 并发抢答 (许显纯 / 言官 / 客氏 / 韩爌 / 阉党)·doc 标 "全 LLM 流式"。

**cost 估**·

```
单 NPC 1 stream call ≈ 600 tokens prompt + 200 tokens response
5 NPC 并发·~3000 + 1000 tokens / 玩家发言
若玩家 1 廷议说 5 次·= 20000 tokens / 议题
日玩 10 议题·= 200K tokens / day
```

按 sc1 单价·~$0.5/day·一玩家。**非小数**。

**修法**·Slice 4.5 §6 LLM 预算补 1 表·

```
5 NPC 并发抢答 cost·
  prompt·600 token × 5 = 3000 token / 玩家发言
  response·200 token × 5 = 1000 token / 玩家发言
  per 议题 (玩家 5 发言)·~20K token
  per 玩家日 (10 议题)·~200K token
  → 用户日均 LLM 费 $0.3-0.7·若 ≥5 议题/日触发 5 并发
```

DoD 加 "5 NPC 并发抢答 cost 实测 ≤ 25K token / 议题·超则降级 3 NPC 并发"。

---

## 3·建议的 v2.2 → v2.3 调整

| # | 改动 | 工时影响 |
|---|---|---|
| 1 | Slice 4 patch target 改 `_ty2_genOneSpeech`·工时 1.5d → 0.8d | **-0.7d** |
| 2 | Slice 5 mode 名 cite→augment·structure 8 字段对齐·工时 2.0d → 1.2d | **-0.8d** |
| 3 | Slice 7 加 `_affinityMap` spec·工时 1.5d → 1.6d | +0.1d |
| 4 | Slice 8 affinity.toEmperor → affinity (单值)·dims → aggregateDims | 0 工时·修 doc |
| 5 | Slice 4.5 §5.1.3 加 `_cySubmitPlayerLine` 接入 patch spec | 0 工时·修 doc |
| 6 | Slice 4.5 §6 加并发 LLM cost 表 + DoD 项 | 0 工时·修 doc |
| **合计** | | **-1.4d** |

**v2.2 总工时·23.5-26.5d → v2.3·22.1-25.1d**

---

## 4·DoD 影响

| Slice | v2.2 DoD | v2.3 改后 |
|---|---|---|
| Slice 4 | 4 项 | 4 项·改"prompt 体积 +600 token" → "+300 token (复用 helper)·新加 hw/hq +150 token" |
| Slice 5 | 5 项 | 6 项 (加 "mode 名 6+4 跟常朝 runtime 100% 对齐") |
| Slice 7 | 4 项 | 5 项 (加 "GM._affinityMap data structure + persist + UI 读") |
| Slice 8 | 9 项 | 10 项 (加 "affinity 用 number 不用 .toEmperor·grep 0 hit `affinity.toEmperor`") |
| Slice 4.5 | 9 项 | 10 项 (加 "5 NPC 并发抢答 cost 实测 ≤25K/议题") |

---

## 5·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **批准·写 v2.3** | 6 处修订并入 v2.3·总工时 -1.4d (实际更准·非削减 scope)·然后等开工 |
| **B** | 先讨论再定·一条一条看 | |
| **C** | 不再 audit·按 v2.2 开工·implementation 时遇到再修 | 风险高·hard bug 4 + medium 2 都会在 Slice 4/5/7/8 实施时立刻撞墙 |
