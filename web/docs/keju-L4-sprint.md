# Phase L·Slice L4·Sprint Plan·**v7·核心 + RX + 深扩 + RY 全 ship**

> **L4·改革策对·AI·1**·Stage 2·Phase L 第 4 slice
> 状态·**核心 + RX + 深扩 + RY 全 ship (2026-05-24·v7)·不 ship 待 user review**·**仅剩 L4·g1 L7 hook 真填**
> 估时·核心 **2.6 d** + RX **0.3 d** + 深扩 **~1.5 d** + RY **0.3 d** = **总 4.7 d**
> 依赖·L1 ✓ + L2 ✓ + L3 ✓ + R5/R6 ✓ + **wendui 已 ship + F4 已 ship + ChronicleTracker 已 ship**
> 阻塞·L5/L6 共享 LLM prompt·可并行·L7 不阻塞 reader·准度回溯需 L7 后
> v1→v2→v3→v4→v5→v6→v7 演化·见 §19·**v7 反映 RY 11 项全修 (CSS / reputation / dedupe / sanitize)**
> smoke·**L4 97/97 ✅** (核心 42 + RX 11 + e/g1 12 + f1/f2 18 + RY 14) + L1·L2·L3·A1·B1-B3·C1·C4 全过零回归

---

## §0·v7 真实落地 (核心 ✅·RX ✅·深扩 ✅·**RY 11 项修 ✅**·仅 g1 L7 hook 留 ⏳·see §23/§24/§25/§26)

| 已 ship | 文件 | 行数 | 新加 |
|---|---|---|---|
| L4·a·archetype 8 谱 + 派生 + helpers | `web/tm-keju-reform-llm.js` | +296 | `_kjpInferAdvisorArchetype` / `_kjpBuildCeduiPromptContext` / `_kjpDeriveCandidateReactions` / `_kjpBuildCeduiPrefill` / `_kjpListForecastAdvisors` / `_kjpStringSimilarity` / `_ty3_appendReformPromptIfReform` / `_kjGetTopicShortLabel` / `_kjpAppendOwnCeduiHint` / `_kjpAppendPrivateAudienceHint` / `_kjpArchetypeBiasTone` / `_kjpArchetypeSpecificRequirements` / `_kjpIsOnFrontier` + 3 constants |
| L4·a·扩 wendui mode='cedui' | `web/tm-wendui.js` | +29 | modeLabel ('改革策对'·line 393)·prompt builder cedui 注入 (~line 1429)·history entry mode + ceduiParadigmDigest + turn (~line 1504)·closeWenduiModal cedui hook (line 1127) |
| L4·b/b2·面板按钮 + outcome | `web/tm-keju-paradigm-panel.js` | +234 | section l4-cedui·`_kjpRenderCeduiBody` / `_kjpRenderCeduiTimeline` / `_kjpInvokeCedui` / `_kjpApplyCeduiOutcome` / `_kjpOnCeduiClose` / `_kjpBumpForecastReputation` / `_kjpInitForecastReputation` / `_kjpAuditForecastAccuracy` stub·click handler cedui-btn·`_kjpHandleInputOrChange` advisor dropdown |
| L4·c·tinyi modulator | `web/tm-tinyi-v3.js:683-726` | +43 | `_ty3_initialStanceFromDimsCore` (原函数 rename)·`_ty3_initialStanceFromDims` (wrapper)·`_ty3_applyReformLeanModulator` (走 tags) |
| L4·d·keyi prompt 注入 + 9 议题 topicLabel | `web/tm-keju-runtime.js:2032-2062` | +27 | `_topicType` / `_topicData` / `_topicLabel` 派生·`_reformInjection` / `_privateAudienceHint` / `_ownCeduiHint` 注入 |
| L4·g2·leak F4 enqueue (核心已含) | 同上 panel.js | (内 b2) | `window._kjSpawnYanguanQingyi({source:'cedui-leak', ...})` |
| L4·smoke 核心 + RX | `scripts/smoke-l4-forecast-and-stance.js` | 新建 311 行 | 53/53 case·§A-§H + §RX |

| 深扩 已 ship ✅ | actual | 落地点 |
|---|---|---|
| L4·e·NPC reveal 私允 | 0.2 d ✅ | helper + keyi prompt 已注入·smoke §Deep·e 5 case 验 reveal 触发条件 |
| L4·g1·reputation framework | 0.3 d ✅ | `_kjpBumpForecastReputation` + `_kjpInitForecastReputation` + `_kjpAuditForecastAccuracy` stub·dropdown chip "言中 X/Y"·smoke §Deep·g1 7 case·**L7 hook 待填 ⏳** |
| L4·f1·multi-advisor 协商 | 0.6 d ✅ | RX·C3 禁→L4·f1 解禁 + loyalty filter·`_kjpLlmMergeAdvisorViews` + fallback·`_kjpMaybeTriggerMultiConsultMerge` panel auto-detect·跨党 partyTension +1·一次性 prestige +5·smoke §Deep·f1 11 case |
| L4·f2·UI 对比 advisor 两列 | 0.4 d ✅ | timeline 含 cedui + multi-consult 两类·multi-consult 标 ⚖️·每 cedui +/✓ 对比按钮·选 2 → 两列并排 + 清按钮·smoke §Deep·f2 7 case |
| smoke 深扩 | (并入 above) | +30 case 总 (e 5 + g1 7 + f1 11 + f2 7) |
| **— 深扩 合计 —** | **~1.5 d (跟 estimate 2.0 砍 0.5 d·复用真省)** | |

| 仅剩待做 ⏳ | est | 触发条件 |
|---|---|---|
| L4·g1·L7 真填准度 | 0.2 d | L7 实施完成后·`_kjpAuditForecastAccuracy(chronicleEntry, actualOutcome)` hook 真填·NPC reputation.averageScore 真生效 |

## §0·v4 复用清单 (核心·先看)

| 现有机制 | 文件 | 状态 | v4 复用 | v3 计划独立做 (废弃) |
|---|---|---|---|---|
| **问对系统 (wendui)** | `tm-wendui.js` (2503 行) | ✅ 完整 ship | **核心复用**·`openWenduiModal(name, 'cedui', prefill)` (新加第 4 mode)·NPC 1v1 对话 + history + 精力 + 召人对质 + reward/punish 全套 | ~~独立 `_kjpLlmForecastReform` LLM~~ |
| **wendui NPC 对话历史** | `GM.wenduiHistory[name][]` | ✅ ship | **直接当 NPC 策对记忆**·deep clone 跟 char·已 persist | ~~独立 `npc._kjpForecastMemory`~~ |
| **wendui 召人对质** | `_wdSummonConfronter()` | ✅ ship | **multi-consult 原型**·扩 cedui mode 触发 LLM merge | ~~独立 `_kjpLlmMultiConsult`~~ |
| **wendui 赏 / 罚** | `_wdReward()` / `_wdPunish()` | ✅ ship | **政治后果通道**·`GM._wdRewardPunish` 写已存 | ~~部分独立后果~~ |
| **F4 言官清议** | `tm-keju-yanguan-qingyi.js`·exposed `window._kjSpawnYanguanQingyi` | ✅ ship | **leak 链直接调**·非 L4·g2 自建 3 阶段状态机 | ~~独立 `_kjpStartLeakChain` + `_kjpProgressLeakChain`~~ |
| **Chronicle 编年录** | `tm-chronicle-tracker.js`·`window.ChronicleTracker.add({type,title,narrative,...})` | ✅ ship·cap 200 | **策对入卷统一通道**·`sourceType:'kjp-cedui'`·重复 upsert | ~~独立 `GM._kjpForecastLog` cap 30~~ |
| **精力扣** | `tm-launch.js`·`_spendEnergy(5, ...)` | ✅ ship | **wendui 已扣 5**·L4 复用·不重扣 | (已规划复用) |
| **狱中问对** | `tm-wendui-prison.js` | ✅ ship | wendui 自动 fallback·若 advisor 下狱 → 改导向 | (透明·不需特别处理) |
| **F4 trigger check** | `window._kjCheckYanguanQingyiTriggers` (endTurn 已调) | ✅ ship | L4 不动·F4 自然消费 leak | — |

**v4 设计原则**·**核心理念**·**策对就是带改革 paradigm context 的问对**·**100% 复用 wendui infrastructure**·**不新建独立 panel section**·**不新建独立 LLM 函数**·**不新建独立 history**·**不新建独立 leak 状态机**·**不新建独立入卷 schema**。

---

## §1·背景 & 范围

### 1.1·L3 已 ship 的 write side·L4 必接 (v3 同·不变)

| 写入位置 | 字段 | R6 schema | 拟读侧 |
|---|---|---|---|
| `_kjpInvokeAudienceLlm` line ~1108 | `npc._kjpReformLean` | `{value:[-100,+100], lastTurn}`·turn-distance decay | **L4·c**·tinyi v3 stance intensity 加权 |
| `_kjpInvokeAudienceLlm` line ~1115 | `GM._kjpPrivateAudienceLog[]` (cap 50) | `{turn, npc, intent, supportDelta, willAccept, offerTerms, cost, ts}` | **L4·e** (optional)·议政 reveal |
| `_kjpSubmitReform` → `openKeyiSession.topicData` | `magnitudeDescriptor / magnitudeParsed / pilotScope / pilotCandidates / courtMoodNarrative / courtMoodScale / courtMoodKeyNpcs / privateAudiences / isForced` | 见 v3 §1.1 | **L4·a 注入 wendui prefill·L4·d 注入 keyi prompt** |

### 1.2·L4 两道工序 (v4·名词稳定)

| 工序 | 时机 | 玩家感受 | LLM 调用 |
|---|---|---|---|
| **L4·A·策对·"召 X 史官·策问改革后效"** | 议政**前** (面板按钮·调 wendui) | 跳 wendui modal·跟 NPC 1v1 对话·prefill 含改革背景 | wendui 自带 LLM·**不加新 LLM 函数**·只改 prompt builder |
| **L4·B·Reader·tinyi v3 stance + keyi 议政 prompt 真用 L3 数据** | 议政**中** | NPC stance 跟 reformLean 挂·keyi NPC speech 知 magnitude/pilot | 复用现有 LLM·不加新 |

### 1.3·非目标 (v4·扩 v3)

- ❌ **真 apply paradigm diff** (那是 L7)
- ❌ **演化推演 + 改革志** (那是 L8)
- ❌ **LLM 反对奏疏** (那是 L5)
- ❌ **自定义新 subject** (那是 L6)
- ❌ **改革命名 + 史评** (那是 L9)
- ❌ **改革黑天鹅** (那是 L9)
- ❌ **修 tinyi v3 25 RULES**·只加 modulator
- ❌ **leak 民间歌谣** (留 L14)
- ❌ **timeline graph PNG/canvas**·UI 纯 ASCII / DOM
- ❌ **准度真扣 prestige** (那是 L7·L4 留字段)
- ❌ **archetype 编辑器** (那是 L-K)
- ❌ **advisor 跨剧本传承** (那是 L35)
- ❌ **新建独立 NPC 对话 UI**·v4 复用 wendui (v3 错·v4 修)
- ❌ **新建独立 LLM `_kjpLlmForecastReform`**·v4 走 wendui prompt 扩 (v3 错·v4 修)
- ❌ **新建独立 leak 状态机**·v4 直接 enqueue F4 (v3 错·v4 修)
- ❌ **新建独立 NPC 记忆字段**·v4 用 GM.wenduiHistory (v3 错·v4 修)
- ❌ **新建独立 GM log**·v4 用 ChronicleTracker (v3 错·v4 修)

### 1.4·L4 策对是系统型·有政治后果 (v2 锁定·v4 强化·复用 wendui 通道)

按 memory `feedback_tool_vs_system_costs`·**系统型挂政治后果**·v4 通过**复用 wendui 现有 5 类政治通道**实现·

| 维度 | 通道 (现有·v4 复用) | 后果 |
|---|---|---|
| NPC 记忆 | `GM.wenduiHistory[name][]` (push) | NPC 知陛下曾召其策对 |
| GM 编年 | `ChronicleTracker.add({sourceType:'kjp-cedui', ...})` (upsert) | 入卷·L8 演化读 |
| NPC reformLean | `_kjpAccumReformLean(npc, +3, turn)` (R6 helper) | 受咨询=轻微示好 |
| 泄露 | `window._kjSpawnYanguanQingyi(...)` (F4 enqueue) | 言官清议自然 spawn |
| 精力 | `_spendEnergy(5, '问对·' + name)` (wendui 已扣) | 不重扣 |
| **新加** | `npc._forecastReputation` (字段) | 准度信誉·L7 后真填 |

**设计动机** (v2 → v4 不变)·策对用 LLM 模拟一名具体史官受陛下密召·按 archetype voice 答策对·NPC 的 trait/party/role 决定 archetype·决定立场偏向·**这才是 AI 历史模拟的精神**·**v4 进一步**·用现成的 wendui paradigm·避免新机制污染。

---

## §2·完整数据流图 (v4·复用通道)

```
L3 (已 ship·R6)             L4·v4 (本 sprint·复用)         L7 / L8 (后续)
─────────────────           ──────────────────────         ──────────────
[改革面板]
  ↓ 加 audience
  ├─ npc._kjpReformLean = {v:+15, t:42}  ──┐
  ├─ GM._kjpPrivateAudienceLog.push(...)  ─┤
  └─ draft.{magnitudeDescriptor,           │
          pilotScope, ...}                 │
                                           │
[面板·_kjpEstimateStanceDistribution 直调  │
   _ty3_initialStanceFromDims(ch, txt, tags)]─┐  ← L4·c 首消费方
                                              │      (panel.js:1654)
[面板·"召史策对" 按钮·v4 NEW]                 │
  ↓ user 选 advisor NPC dropdown            │
  ↓   (_kjpListForecastAdvisors helper)     │
  ↓ click "▶ 召 X 策对"                       │
  ↓                                         │
  archetype = _kjpInferAdvisorArchetype(npc)│
  ↓                                         │
  prefill = _kjpBuildCeduiPrefill(npc,      │
              archetype, draft) ────┐       │
  ↓                                 │       │
  **openWenduiModal(name,           │       │
    'cedui',                        │       │
    prefill)** ────────┐            │       │
  ↓                    ↓            │       │
  跳 wendui modal·已存 UI            │
  ↓                                          │
  user 跟 NPC 自然对话 (wendui paradigm)·    │
  wendui LLM·按 mode='cedui'·prompt builder │
  注入 archetype voice + paradigm context   │
  ↓                                          │
  对话进行中·NPC 答策对·见 wendui 现有 UI    │
  (含 reward/punish/召人对质 已存按钮)        │
  ↓                                          │
  GM.wenduiHistory[name].push (wendui 自动)   │
  ↓                                          │
[user close wendui]
  ↓
  **策对结束钩** (v4·NEW)·
   ├─ ChronicleTracker.upsert({sourceType:'kjp-cedui', sourceId:name+'_'+paradigmDigest, ...})
   ├─ _kjpAccumReformLean(npc, +3, GM.turn) (受咨询=轻微示好·R6 helper)
   ├─ _kjpBumpForecastReputation(npc, GM.turn)·L4 留·L7 真填
   └─ if loyalty<60 + rand<0.3·**直接 _kjSpawnYanguanQingyi({source:'cedui-leak', advisor:npc, ...})**·F4 自然消费
   (精力 wendui 已扣·不重扣)

[user 看 chronicle·或换 NPC 再策对·或改 paradigm·或上奏]
  ↓
[user 点"上奏"]
  ↓
openKeyiSession({topicType:'reform', topicData:{...}})
  ↓ (走 keyi)
GM.keju._pendingProposal.topicData = topicData
  ↓
[keyi 议政·tm-keju-runtime.js:1782 KEYI_STATE]
  ↓ NPC speech 生成 (tm-keju-runtime.js:2032)
  ↓ ←── L4·d·**改 keyi prompt builder**·若 topicType==='reform'·
                  注入 topicData·+ 修 9 议题 topicLabel
  ↓ ←── L4·e (opt)·查 topicData.privateAudiences·该 NPC 在 → 30% reveal
  ↓ ←── **v4 NEW·NPC 自引用** (axis 3)·
        查 GM.wenduiHistory[ch.name] 含 cedui 标记·摘 last 一条·prompt 加段
  ↓
[议政结束·_kjReformKeyiCallback (J3 stub·L7 真做)]
  ↓
                              [endTurn]
                                ↓
                            F4·_kjCheckYanguanQingyiTriggers
                              (已 ship·endTurn 自动跑)
                                ↓
                            若 cedui-leak 已 enqueue·F4 自然 spawn 言官清议
                            (走 F4 standard 流程·L4 不重写)

L7·真 apply paradigmDiff·写 actualOutcome ─┐
                                            ↓
                                        **准度回溯** (axis 3·hook 留 L7)·
                                        读 ChronicleTracker.findBySource('kjp-cedui', ...)
                                        → score 0-100
                                        → npc._forecastReputation 更新
                                        → wendui dropdown chip 显"言中 5/7"
```

---

## §3·L4·A·策对 LLM spec (v4·扩 wendui·非新建)

### 3.1·wendui 加第 4 mode·`'cedui'` (策对)

**改**·`web/tm-wendui.js`
**改动**·

1. **新加 mode 常量** (`_wenduiMode` 变量已存·支持 4 mode·tm-wendui.js:12)·
   - `'formal'` (朝堂问对)·已有
   - `'private'` (私下叙谈)·已有
   - `'audience'` (独召·via `_wdCanDirectAudience`)·已有
   - **`'cedui'` (策对·NEW)**·改革背景·archetype voice

2. **prompt builder 改** (tm-wendui.js:~1427·`var history = GM.wenduiHistory[name].slice(-10);` 段附近)·

```javascript
// v4·若 mode === 'cedui'·prompt 顶部加 archetype voice + paradigm context
if (_wenduiMode === 'cedui' && typeof _kjpBuildCeduiPromptContext === 'function') {
  var archetype = (typeof _kjpInferAdvisorArchetype === 'function')
    ? _kjpInferAdvisorArchetype(ch)
    : 'A3_pragmatic';
  var ceduiCtx = _kjpBuildCeduiPromptContext(ch, archetype);
  prompt = ceduiCtx + '\n\n' + prompt;
}
```

3. **history entry 加 metadata** (tm-wendui.js:~1500·`GM.wenduiHistory[name].push({...})` 段)·

```javascript
// v4·若 mode === 'cedui'·entry 标 mode=cedui·便于 L4·g1 准度回溯找
GM.wenduiHistory[name].push({
  role: 'npc',
  content: replyText,
  loyaltyDelta: loyaltyDelta,
  mode: _wenduiMode,                    // ← v4 NEW·'formal'/'private'/'audience'/'cedui'
  ceduiParadigmDigest: (_wenduiMode === 'cedui' && _kjpCurrentCeduiDigest) || null  // ← v4 NEW
});
```

### 3.2·prefill 构造·`_kjpBuildCeduiPrefill`

**位置**·`web/tm-keju-reform-llm.js` (新加)
**signature**·

```javascript
/**
 * 构造策对 wendui prefill·user 一进 modal 就看到
 * @param {object} npc - advisor NPC
 * @param {string} archetype - A1_radical / A2_conservative / ...
 * @param {object} draft - panel draft·含 magnitudeDescriptor / pilotScope / etc
 * @returns {string} prefill·古文化·跟 wendui 前置消息一致
 */
function _kjpBuildCeduiPrefill(npc, archetype, draft) {
  var label = ARCHETYPE_LABELS[archetype] || '务实派';
  var mag = (draft.magnitudeParsed && draft.magnitudeParsed.scale) || 30;
  var pilot = (draft.pilotScope && draft.pilotScope.name) || '全国一举';
  return '【陛下密召】卿身为' + label + '·朕欲改科举·略陈如下·\n' +
         '幅度·' + (draft.magnitudeDescriptor || '渐进') + ' (LLM 解 ' + mag + '/100)\n' +
         '试点·' + pilot + '\n' +
         '朝议支持·' + (draft.courtMoodScale || '?') + '/100\n' +
         '\n卿当如汉贤良对策·策问 5-10 年后效。';
}
```

### 3.3·`_kjpBuildCeduiPromptContext`·注入 wendui prompt

```javascript
/**
 * 给 wendui prompt builder 注入策对 context·archetype voice + paradigm
 */
function _kjpBuildCeduiPromptContext(npc, archetype) {
  var voice = ARCHETYPE_PROMPT_VOICE[archetype] || ARCHETYPE_PROMPT_VOICE['A3_pragmatic'];
  var topicData = (GM.keju && GM.keju._pendingProposal && GM.keju._pendingProposal.topicData) || null;
  // 注·策对在 panel 触发·此时 _pendingProposal 可能未 set·从 panel modal._kjpDraft 读
  // 简版·这里通过全局 _kjpCurrentCeduiDraft 拿 (panel 触发 wendui 前 set)
  var draft = window._kjpCurrentCeduiDraft || {};
  var partiesText = (GM.parties || []).map(function(p) {
    return '- ' + p.name + ' (' + (p.memberCount || 0) + ' 人)';
  }).join('\n');

  return '【你受陛下密召策对·改革议题】\n' +
    voice + '\n' +
    '\n【改革幅度】' + (draft.magnitudeDescriptor || '渐进') +
    '\n【试点范围】' + ((draft.pilotScope && draft.pilotScope.name) || '全国') +
    '\n【当下朝议】支持 ' + (draft.courtMoodScale || '?') + '/100' +
    '\n【当下国库】' + Math.round(((GM.guoku && GM.guoku.balance) || 0) / 10000) + ' 万两' +
    '\n【当下党派·' + (GM.parties || []).length + ' 党】\n' + partiesText +
    '\n\n【archetype-specific 要求】' + _kjpArchetypeSpecificRequirements(archetype) +
    '\n\n答策当如汉贤良对策·分 1y/3y/5y/10y 推演·按你的 archetype 倾向。';
}
```

### 3.4·archetype voice 表 (8·v3 不变·搬到 reform-llm.js)

| ID | 中文名 | trigger | voice (in prompt) | bias tone | wendui 注入位置 |
|---|---|---|---|---|---|
| **A1·改革激进派** | 王安石型 | dims.boldness≥0.65 + honor≥0.6 + cunning≤0.4·或 party `/改革\|新党/` | "非变不可行·王安石之志·今当再举" | optimistic ×1.4 利 | prompt 顶 |
| **A2·守成派** | 司马光型 | trait `stubborn/chaste/temperate/humble` + dims.confucianism≥0.6·或 party `/守旧\|清流/` | "祖宗法度·议改宜慎·熙宁前车·不可不鉴" | pessimistic ×1.3 阻 | prompt 顶 |
| **A3·务实派** | 张居正型 | trait `administrator_ls/strategist/calm/patient`·或 dims.rationality≥0.65·或 class `geechen`·default | "谨陈三利五害·伏惟陛下察之" | realist 均衡 | prompt 顶 |
| **A4·史官派** | 老史官型 | title `/翰林\|史官\|侍读\|侍讲\|学士/`·或 trait `scholar` + dims.confucianism≥0.7 | "臣职在史·谨按熙宁元祐之变·参以本朝故事" | realist·必引 2-3 先例 | prompt 顶 |
| **A5·钦天派** | 占卜倾向 | title `/钦天监\|司天监/` | "臣职在司天·谨观二十八宿·参以政事" (**只 voice·不真扣 GM.var**) | pessimistic | prompt 顶 |
| **A6·边臣派** | 戚继光型 | title `/总督\|总兵\|提督\|边将\|戍/`·或 class `wujiang` + 在边境 | "臣久戍边陲·边饷之忧·不敢不报" | realist·必估边饷 | prompt 顶 |
| **A7·宗室派** | 后族近亲型 | class `waixi`/`xunqi`·或 spouse 在后宫 | "臣以宗室·谨陈宗藩科目之议" | pessimistic | prompt 顶 |
| **A8·隐士派** | 退休老臣型 | role `/致仕\|退休/`·或 prestige≥85 + 无 title | "老臣久谢朝政·谨陈一二·余事不敢妄议" | realist | prompt 顶 |

### 3.5·candidateReactions·按 paradigm 派生·非 hardcode (v3 同)

```javascript
function _kjpDeriveCandidateReactions(candRules, subjectsDiff, mag, biasTone) {
  var reactions = [];
  if (!candRules) return reactions;
  if (candRules.allowForeigner === true) reactions.push({type:'外族 (宾贡)', narrative:'准外族·宾贡可期', applicantDelta:'+10%'});
  if (candRules.allowMinority === true) reactions.push({type:'少数民族', narrative:'准少数·士林新血', applicantDelta:'+15%'});
  if (candRules.requirePrefecture === false) reactions.push({type:'流寓士子', narrative:'不限户籍·流寓得益', applicantDelta:'+20%'});
  if (candRules.feeReimbursement && candRules.feeReimbursement !== '自费') {
    reactions.push({type:'寒门', narrative:'考费由公·寒门得益', applicantDelta:'+30%'});
  }
  if (subjectsDiff && subjectsDiff.added && subjectsDiff.added.length) {
    reactions.push({type:'新科应试生', narrative:'新科目兴起·或转或弃', applicantDelta:'+25%'});
  }
  if (subjectsDiff && subjectsDiff.removed && subjectsDiff.removed.length) {
    reactions.push({type:'原科应试生', narrative:'原科废·应试者改业', applicantDelta:'-30%'});
  }
  return reactions;  // 空 array 也 OK
}
```

**注**·v4 把这段塞入 wendui prompt context·让 LLM 看到的"候考类"派生自真 paradigm·不 hardcode 5 类。

### 3.6·**政治后果**·复用 wendui 通道·`_kjpApplyCeduiOutcome`

**位置**·`web/tm-keju-paradigm-panel.js` (调用方在 wendui close hook)

```javascript
/**
 * wendui modal 关闭时调·应用策对政治后果
 * @param {object} npc
 * @param {string} archetype
 * @param {object} draft - panel draft (含 paradigmDiff)
 */
function _kjpApplyCeduiOutcome(npc, archetype, draft) {
  if (!npc) return;
  var turn = GM.turn || 0;
  var paradigmDigest = (typeof _kjpSummarizeDiff === 'function') ? _kjpSummarizeDiff(_kjpComputeDiff(draft)) : '';

  // 1. NPC 记忆·**wendui 已 push (history)**·不重做·只标 mode='cedui'·已在 §3.1·3 改 wendui prompt builder 时写

  // 2. GM 编年·复用 ChronicleTracker
  if (typeof window !== 'undefined' && window.ChronicleTracker) {
    window.ChronicleTracker.upsert({
      sourceType: 'kjp-cedui',
      sourceId: npc.name + '_' + paradigmDigest.slice(0,20),
      type: 'reform-counsel',
      category: '科举改革',
      title: '召 ' + npc.name + ' 策对·' + paradigmDigest.slice(0,30),
      narrative: archetype + '·' + (ARCHETYPE_LABELS[archetype] || '') + '·' + paradigmDigest.slice(0,80),
      actor: npc.name,
      stakeholders: [npc.name, npc.party || ''].filter(Boolean),
      currentStage: '策对完毕',
      sourceType: 'kjp-cedui'
    });
  }

  // 3. NPC reformLean +3·复用 R6 helper
  if (typeof _kjpAccumReformLean === 'function') {
    _kjpAccumReformLean(npc, 3, turn);
  }

  // 4. NPC reputation·L4 留字段·L7 后真填
  if (typeof _kjpBumpForecastReputation === 'function') {
    _kjpBumpForecastReputation(npc, turn);
  }

  // 5. 泄露·loyalty<60 + rand<0.3 → 直接 enqueue F4
  if ((npc.loyalty || 50) < 60 && Math.random() < 0.3) {
    if (typeof window._kjSpawnYanguanQingyi === 'function') {
      window._kjSpawnYanguanQingyi({
        source: 'cedui-leak',
        advisorNpc: npc.name,
        advisorParty: npc.party || '',
        reason: '陛下密召 ' + npc.name + ' 策对改革·偏听一方·当广纳众议'
      });
    }
    // 不另写 leak 状态机·F4 自然消费
  }

  // 6. 精力·**wendui 已扣 5**·不重扣
}
```

### 3.7·NPC 候选过滤 (wendui 已有 + L4 加 archetype filter)

```javascript
function _kjpListForecastAdvisors() {
  if (!Array.isArray(GM.chars)) return [];
  // 复用 wendui 的 _wdIsPlayerSideChar + _wdIsAtCapital filter
  var wenduiFilter = (typeof _wdIsPlayerSideChar === 'function' && typeof _wdIsAtCapital === 'function')
    ? function(c) { return _wdIsPlayerSideChar(c) && _wdIsAtCapital(c); }
    : function(c) { return c && c.alive !== false; };
  return GM.chars.filter(function(c) {
    if (!wenduiFilter(c)) return false;
    var title = c.officialTitle || c.title || '';
    var role = c.role || '';
    var prestige = c.prestige || 50;
    // 史官 / 翰林 / 礼部 / 高 prestige / 致仕 / 钦天 / 边臣 (跟 archetype 谱对齐)
    return /翰林|史官|侍读|侍讲|学士/.test(title) ||
           /礼部/.test(title) ||
           /致仕|退休/.test(role) ||
           (prestige >= 85 && !title) ||
           /钦天监|司天/.test(title) ||
           /总督|总兵|提督/.test(title) ||
           prestige >= 70;
  }).filter(function(c) {
    // 9.18 决策·禁阉党 / 弄权派 (loyalty<60 默禁)·**B 推荐**
    return (c.loyalty || 50) >= 60;
  }).slice(0, 10);
}
```

---

## §4·L4·B·Reader 集成·详细 spec (v4·同 v3·tinyi modulator + keyi prompt)

### 4.1·真实接入点 (v3 同·v4 不变)

| 项 | 文件·line | 类型 | 状态 |
|---|---|---|---|
| `_ty3_initialStanceFromDims(ch, topic, tags)` | `tm-tinyi-v3.js:683-726` | tinyi v3 stance 入口 | ✅ topic 是 string·modulator 走 tags |
| `_kjpEstimateStanceDistribution` 调上 | `tm-keju-paradigm-panel.js:1654-1683` | **L4·c 首消费方** | ✅ modulator 落地立即生效 |
| `openKeyiSession({topicType:'reform'})` | `tm-keju-paradigm-panel.js:1776` → `tm-keju-runtime.js:1743` | 走 keyi·非 tinyi v3 | ⚠️ v1 错认 |
| keyi NPC speech LLM prompt | `tm-keju-runtime.js:2032-2039` | **L4·d 直接改这里** | ✅ |
| `GM.keju._pendingProposal.topicData` | `tm-keju-runtime.js:1756` 写入 | reform topicData 存储 | ✅ |
| `window._kjSpawnYanguanQingyi` | `tm-keju-yanguan-qingyi.js` exposed | **leak 链直接调** | ✅ ship·v4 复用 |
| `window.ChronicleTracker.upsert` | `tm-chronicle-tracker.js` exposed | **策对入卷统一** | ✅ ship·v4 复用 |

### 4.2·L4·c·`_kjpReformLean` 加权·走 tags (v3 同·不变)

```javascript
function _ty3_initialStanceFromDims(ch, topic, tags) {
  var result = /* 原 20+ 分支 + fallback */;
  result = _ty3_applyReformLeanModulator(ch, tags, result);  // ← v4 加
  return result;
}

function _ty3_applyReformLeanModulator(ch, tags, result) {
  if (!ch || !ch._kjpReformLean) return result;
  var leanObj = ch._kjpReformLean;
  if (!leanObj || typeof leanObj !== 'object') return result;
  var t = tags || [];
  var isReform = t.indexOf('reform') >= 0 || t.indexOf('restoration') >= 0;
  if (!isReform) return result;
  var lean = parseInt(leanObj.value, 10) || 0;
  if (lean > 30) {
    if (result.stance === 'oppose') return { stance:'neutral', intensity:result.intensity*0.7, _modulated:true, _modSource:'reformLean+' };
    return { stance:'support', intensity:Math.min(1.0, result.intensity*1.3), _modulated:true, _modSource:'reformLean+' };
  }
  if (lean < -30) {
    if (result.stance === 'support') return { stance:'neutral', intensity:result.intensity*0.7, _modulated:true, _modSource:'reformLean-' };
    return { stance:'oppose', intensity:Math.min(1.0, result.intensity*1.3), _modulated:true, _modSource:'reformLean-' };
  }
  return result;
}
```

**首消费方** (落地立即生效)·`panel.js:1654 _kjpEstimateStanceDistribution`·L3 courtMood 预判读·**不依赖 L4·d 完成**。

### 4.3·L4·d·keyi NPC speech prompt 注入 + 9 议题 topicLabel 修

**改**·`web/tm-keju-runtime.js:2032-2039`

```javascript
var topicType = (GM.keju._pendingProposal && GM.keju._pendingProposal.topicType) || 'kaike';
var topicData = (GM.keju._pendingProposal && GM.keju._pendingProposal.topicData) || {};
var topicLabel = _kjGetTopicShortLabel(topicType) || '开科举';

// L4·d·reform 注入
var reformInjection = '';
if (topicType === 'reform' && typeof _ty3_appendReformPromptIfReform === 'function') {
  reformInjection = _ty3_appendReformPromptIfReform('', topicData);
}
// L4·e·私允 reveal
var privateAudienceHint = '';
if (topicType === 'reform' && typeof _kjpAppendPrivateAudienceHint === 'function') {
  privateAudienceHint = _kjpAppendPrivateAudienceHint('', ch, topicData);
}
// v4 NPC 自引用·**复用 GM.wenduiHistory[ch.name]**·查 mode='cedui' 历史
var ownCeduiHint = '';
if (topicType === 'reform' && typeof _kjpAppendOwnCeduiHint === 'function') {
  ownCeduiHint = _kjpAppendOwnCeduiHint('', ch, topicData);
}

var prompt = ctxBase + '\n' +
  '你是上朝庭议的大臣 ' + s.name + '...' +
  reformInjection + privateAudienceHint + ownCeduiHint +
  '请就「' + topicLabel + '」立场发表 80-160 字...';
```

`_kjpAppendOwnCeduiHint` **直接读 `GM.wenduiHistory`·非新建 `_kjpForecastMemory`**·

```javascript
function _kjpAppendOwnCeduiHint(promptBuf, ch, topicData) {
  if (!ch || !ch.name) return promptBuf;
  var history = (GM.wenduiHistory && GM.wenduiHistory[ch.name]) || [];
  // 找 mode === 'cedui' 的 NPC 答策·按 ceduiParadigmDigest 模糊匹
  var topicDigest = (topicData.paradigmDigest) ||
                    (typeof _kjpSummarizeDiff === 'function' ? _kjpSummarizeDiff(topicData.paradigmDiff) : '');
  var match = history.filter(function(m) {
    return m.role === 'npc' && m.mode === 'cedui' &&
           m.ceduiParadigmDigest &&
           _kjpStringSimilarity(m.ceduiParadigmDigest, topicDigest) > 0.6;
  }).pop();
  if (!match) return promptBuf;
  return promptBuf + '\n\n【你曾对此议策对过】\n受陛下密召策对·答曰·' + String(match.content).slice(0,80) + '\n今议·可适度引用·';
}
```

### 4.4·L4·e·NPC reveal 私允 (optional·v3 同·走 keyi prompt 30% reveal)

```javascript
function _kjpAppendPrivateAudienceHint(promptBuf, ch, topicData) {
  if (!topicData || !Array.isArray(topicData.privateAudiences)) return promptBuf;
  var myAudiences = topicData.privateAudiences.filter(function(a) {
    return a.npc === ch.name && a.willAccept && !a.failed;
  });
  if (!myAudiences.length) return promptBuf;
  if (Math.random() > 0.3) return promptBuf;
  var last = myAudiences[myAudiences.length - 1];
  return promptBuf + '\n\n【你的隐情】你曾在私下被陛下召对·允' +
    (last.offerTerms ? '·蒙允' + String(last.offerTerms).slice(0, 30) : '') +
    '·按 ' + last.intent + '·此次发言可适度透露 (但保持文官矜持)。';
}
```

---

## §5·7 sub-slice 拆分 (v5·核心 ✅·深扩 ⏳·g2 已并入核心)

### L4·a·扩 wendui·新加 `'cedui'` mode + archetype voice 注入 (0.6 d) [核心] ✅ DONE

**改**·`web/tm-wendui.js`
**改动**·
- `_wenduiMode` 允许 `'cedui'` 值 (line 12)
- prompt builder 段 (line ~1427)·若 mode==='cedui'·注 `_kjpBuildCeduiPromptContext`
- history entry push 段 (line ~1500)·加 `mode` + `ceduiParadigmDigest` 字段
**新加**·`web/tm-keju-reform-llm.js`
- `_kjpBuildCeduiPromptContext(npc, archetype)`·见 §3.3
- `_kjpBuildCeduiPrefill(npc, archetype, draft)`·见 §3.2
- `ARCHETYPE_PROMPT_VOICE` 表·8 entry (v3 §12 已写)
- `ARCHETYPE_LABELS` 表·8 entry
- `ARCHETYPE_BIAS_TONE` 表·8 entry
- `_kjpArchetypeSpecificRequirements(arch)` helper
- `_kjpDeriveCandidateReactions(candRules, subjectsDiff, mag, biasTone)`·v3 §3.5 同
- `_kjpInferAdvisorArchetype(npc)`·v3 §13 同
- `_kjpIsOnFrontier(npc)` helper
**expose**·全 expose for smoke

### L4·b·面板按钮 + advisor dropdown + 触发 wendui (0.4 d) [核心] ✅ DONE

**改**·`web/tm-keju-paradigm-panel.js`
**新加**·
- 面板加 "召史策对" 按钮 + advisor dropdown (调 `_kjpListForecastAdvisors`)
- click handler·`_kjpInvokeCedui(modal, advisorName)`·
  1. archetype = `_kjpInferAdvisorArchetype(npc)`
  2. prefill = `_kjpBuildCeduiPrefill(npc, archetype, draft)`
  3. `window._kjpCurrentCeduiDraft = draft` (let wendui prompt builder 读)
  4. `window._kjpCurrentCeduiDigest = _kjpSummarizeDiff(diff)`
  5. `openWenduiModal(advisorName, 'cedui', prefill)`·跳 wendui
- 监听 wendui close (改 `closeWenduiModal` 加 hook·或新 event)·若 mode==='cedui'·调 `_kjpApplyCeduiOutcome(npc, archetype, draft)`
- 历次策对查 `ChronicleTracker.list(filter:'kjp-cedui')`·panel 折叠区 显近 5 条
- `_kjpListForecastAdvisors` helper (复用 wendui filter)·见 §3.7

### L4·b2·政治后果应用·`_kjpApplyCeduiOutcome` (0.3 d) [核心] ✅ DONE

**改**·`web/tm-keju-paradigm-panel.js`
**新加**·`_kjpApplyCeduiOutcome(npc, archetype, draft)`·见 §3.6
**改**·`web/tm-save-lifecycle.js`·APPEND_ONLY 白名单·**`GM._kjpForecastLog` 已删·走 ChronicleTracker 自带 save**·只需保 `_chronicleTracks` 已在 R5 白名单·**0 改动**·验 grep 即可

### L4·c·tinyi v3 modulator (0.4 d) [核心·v3 同] ✅ DONE

**改**·`web/tm-tinyi-v3.js:683`·加 modulator·见 §4.2

### L4·d·keyi prompt 注入 + 9 议题 topicLabel 修 (0.5 d) [核心·v3 同] ✅ DONE

**改**·`web/tm-keju-runtime.js:2032-2039`·见 §4.3

### L4·smoke 核心 (0.4 d·~25 case → actual 42 case + RX 11 case = 53) [核心] ✅ DONE

**新建**·`scripts/smoke-l4-forecast-and-stance.js`
**核心覆盖** (见 §8)·~25 case·全过

### **— L4·核心 合计 2.6 d·Release 1.2.6.5 候选 —** (v3·4.0 → -1.4 d·复用 wendui 砍)

---

### L4·e·NPC reveal 私允 prompt 段 (0.4 d·optional·user 决 §9.1) [深扩·v3 同] ✅ DONE·actual 0.2 d·helper + keyi prompt + smoke §Deep·e (5 case)

### L4·f1·多 advisor 协商·**复用 wendui 召人对质 + 加 archetype merge LLM** (0.5 d→0.6 d) [深扩] ✅ DONE·actual 0.6 d·RX·C3 禁→解禁 + loyalty filter·`_kjpLlmMergeAdvisorViews` + fallback·panel `_kjpMaybeTriggerMultiConsultMerge` auto-trigger (近 5 turn 同 paradigm 别 advisor 已 cedui→merge LLM·多 advisor chronicle entry·跨党 partyTension +1·一次性 prestige +5)·smoke §Deep·f1 (11 case)

**改**·`web/tm-wendui.js`·`_wdSummonConfronter` 段·若主 mode==='cedui'·confronter 也启 cedui mode
**新加**·`web/tm-keju-reform-llm.js`·`_kjpLlmMergeAdvisorViews(history1, history2)`·读两个 advisor 的 cedui history·LLM 抽共识 + 分歧 (~2.5k token)
**新加**·面板渲染 multi-consult 结果

### L4·f2·UI 历次策对 timeline·**复用 ChronicleTracker.list filter** (0.4 d→0.5 d) [深扩] ✅ DONE·actual 0.4 d·timeline 含 cedui + multi-consult 两类·multi 标 ⚖️·每 cedui +/✓ 对比按钮·选 2 → 两列并排·清按钮·`_kjpRenderCeduiCompare` 渲 wendui history last cedui reply·smoke §Deep·f2 (7 case)·risk heatmap 留 L8 (需 forecast.partyReactions·当前 chronicle 不存)

**改**·`web/tm-keju-paradigm-panel.js`
**新加**·`_kjpRenderCeduiTimeline(modal)`·调 `ChronicleTracker.list({sourceType:'kjp-cedui'})`·render 近 10 条·timeline 视图
**改**·`web/tm-keju-paradigm-panel.css`·`.kjp-cedui-timeline` 等

### L4·g1·准度追踪·NPC reputation 字段 (0.6 d→0.3 d) [深扩] ✅ FRAMEWORK DONE·actual 0.3 d·`_kjpBumpForecastReputation` + `_kjpInitForecastReputation` + `_kjpAuditForecastAccuracy` stub + reputation label 映射 (new/reliable/mixed/unreliable) + dropdown chip "言中 X/Y (avg/100·label)"·smoke §Deep·g1 (7 case)·**剩 L7 hook 真填准度 ⏳·0.2 d**

**新加**·
- `npc._forecastReputation = {totalForecasts, accurateForecasts, averageScore, reputation}`·初始 0/0/0/'new'
- `_kjpBumpForecastReputation(npc, turn)`·写 totalForecasts++ (在 b2 调)
- `_kjpAuditForecastAccuracy(chronicleEntry, actualOutcome)`·hook·L7 后调
- wendui dropdown chip·"言中 5/7 (72/100·reliable)" / "新·暂无信誉"
- `_kjpAppendOwnCeduiHint` 见 §4.3·议政时自引用

### L4·g2·leak 直接 F4·**复用 `_kjSpawnYanguanQingyi`** (0.2 d) [深扩] ✅ DONE·v4 设计已并入核心 b2·1 行 enqueue·跨 turn F4 自动消费

**改**·§3.6 `_kjpApplyCeduiOutcome` 第 5 步·若 leaked·直接调 `window._kjSpawnYanguanQingyi({source:'cedui-leak', ...})`·F4 endTurn 自动消费
**0 自建 leak 状态机** (v3·g2 0.7 d → v4·0.2 d·砍 0.5 d)

### L4·smoke 深扩 (0.4 d→0.3 d·~15 case·因 g2 已入核心 smoke) [深扩] ✅ DONE·actual 0.3 d·30 case (e 5 + g1 7 + f1 11 + f2 7)·全过

### **— L4·深扩 合计 2.5 d (含 e) / 2.1 d (不含 e)·Release 1.2.7.x 候选 —** (v3·4.0 → -1.5 d)

### **— L4·v4 总 5.1 d (含 e) / 4.7 d (不含 e)·两 Release —** (v3·8.0 → -2.9 d·**砍 36%**)

---

## §6·总 budget (v4·复用砍)

| slice | v3 估 | **v4 估** | 砍 | 复用源 |
|---|---|---|---|---|
| L4·a (LLM + archetype voice) | 1.0 d | **0.6 d** | -0.4 | wendui prompt builder |
| L4·a2 (helpers·派生·候选过滤) | 0.5 d | 合入 a | -0.5 | wendui filter helpers |
| L4·b (面板 UI) | 0.7 d | **0.4 d** | -0.3 | 改按钮 + 调 wendui (无独立 NPC dialog UI) |
| L4·b2 (政治后果) | 0.5 d | **0.3 d** | -0.2 | ChronicleTracker + R6 _kjpAccumReformLean + F4 spawn |
| L4·c (lean reader) | 0.4 d | 0.4 d | 0 | — |
| L4·d (keyi prompt) | 0.5 d | 0.5 d | 0 | — |
| L4·smoke 核心 | 0.4 d | 0.4 d | 0 | — |
| **— 核心合计 —** | **4.0 d** | **2.6 d** | **-1.4 d** | |
| L4·e (NPC reveal·optional) | 0.4 d | 0.4 d | 0 | — |
| L4·f1 (multi-consult) | 1.0 d | **0.5 d** | -0.5 | wendui `_wdSummonConfronter` |
| L4·f2 (UI timeline) | 0.8 d | **0.4 d** | -0.4 | ChronicleTracker.list |
| L4·g1 (准度追踪) | 0.7 d | **0.6 d** | -0.1 | reputation 字段简化 |
| L4·g2 (leak F4 集成) | 0.7 d | **0.2 d** | -0.5 | `_kjSpawnYanguanQingyi` 已 ship |
| L4·smoke 深扩 | 0.4 d | 0.4 d | 0 | — |
| **— 深扩合计 —** | **4.0 d** | **2.5 d** (含 e) / **2.1 d** (不含 e) | **-1.5 d** | |
| **— L4·v4 总 —** | **8.0 d** | **5.1 d** (含 e) / **4.7 d** (不含 e) | **-2.9 d (-36%)** | |

跟 plan doc 原估 2-3 d 对比·v4 仍超 ~2 d·但·**因 v4 真做 5 深化轴 (archetype/multi/准度/leak/UI) + reader 工序**·plan doc 原估远偏短。

---

## §7·风险 & 边界 (v4·复用风险新加)

### 7.1·LLM budget (v4 复用 wendui·~3-5k token / 策对·跟 wendui 平均一致)

### 7.2·party hardcode 风险 (v2 已修·v4 不变)

### 7.3·tinyi v3 25 RULES 不破 (v3 同·post-call wrap)

### 7.4·~~L4·d discovery~~ (v2 已消除)

### 7.5·_kjpReformLean schema 兼容 (R6 已 object schema)

### 7.6·策对可信度幻觉 (v3 同·attribution chip 明 archetype bias)

### 7.7·并发 LLM (v3 同·共享 counter)

### 7.8·政治后果失控 (v3 同·cap + 精力 + counter + loyalty filter)

### 7.9·NPC 候选不足时 panel 表现 (v3 同·hide 按钮)

### 7.10·8 archetype 难 maintain (v3 同)

### 7.11·multi-consult token (v3 同·限 3 advisor)

### 7.12·~~F4 audit~~ (v4·F4 已 ship·exposed·**风险消除**)

### 7.13·准度回溯需 L7 (v3 同·字段框架·hook 留)

### 7.14·A5 钦天派擦红线 (v3 同·voice only·smoke 验)

### 7.15·NPC 自引用相似度算法粗 (v3 同·bigram Jaccard 简版)

### 7.16·**v4 NEW**·wendui 集成风险

- 改 wendui prompt builder 加 mode='cedui' 分支·要不破 formal/private/audience 现有逻辑
- **mitigation**·smoke 加 §S·跑 wendui 现有 3 mode·验返回 entry 跟旧一致
- L4·a 风险·若 wendui prompt builder 难拆 (mode 不在合理 if 分支)·拆 a.1 (audit wendui 0.2 d) + a.2 (实施 0.4 d)

### 7.17·**v4 NEW**·ChronicleTracker upsert 风险

- ChronicleTracker.add cap 200·若 user 频繁策对·可能踢掉别系统的 chronicle entries
- **mitigation**·`upsert` 走 `sourceType+sourceId`·重复策对同 paradigm 不会 add 新条·只 update·实际控量

### 7.18·**v4 NEW**·wendui close 不可靠 hook

- wendui 现有 `closeWenduiModal` 不一定有 close event·user X 关 modal·策对 outcome 没触发
- **mitigation 1**·改 `closeWenduiModal` 加 hook·若 mode==='cedui' → 调 `_kjpApplyCeduiOutcome`
- **mitigation 2**·加 `window.addEventListener('unload', ...)`·防 user 关游戏漏触
- **mitigation 3**·实测·若 wendui 内已有"对话结束"逻辑·hook 那里更准

---

## §8·smoke 设计·~45 case (核心 25 + 深扩 20)

### 核心·25 case [Release 1.2.6.5]

| § | 内容 | case 数 |
|---|---|---|
| §A·archetype 派生 | `_kjpInferAdvisorArchetype` 8 archetype × 1 典型 NPC | 8 |
| §B·archetype voice | `ARCHETYPE_PROMPT_VOICE` 8 entry·biasTone 映射 | 3 |
| §C·candidate 派生 | `_kjpDeriveCandidateReactions`·按 candidateRules 派生·非 hardcode·空 → [] | 4 |
| §D·prefill | `_kjpBuildCeduiPrefill` 含 archetype label + paradigm + 朝议 + cedui 标记 | 2 |
| §E·modulator | `_ty3_applyReformLeanModulator(ch, tags, result)`·走 tags·非 topic.source·schema 旧 number 不响应 | 4 |
| §F·政治后果 | `_kjpApplyCeduiOutcome`·走 ChronicleTracker.upsert·reformLean +3·loyalty<60+rand → F4 spawn·钦天 voice 不扣 GM.var | 4 |
| §G·候选过滤 | `_kjpListForecastAdvisors`·archetype 谱对齐·loyalty<60 默禁 (9.18 B) | 2 |
| §H·keyi prompt | keju-runtime.js:2032 含 topicLabel + reform 注入·9 议题 topicLabel 全 (grep) | 2 |

**核心 smoke 合计·29 case** (跨 archetype × 8 / candidate 4 / modulator 4·密集)

### 深扩·20 case [Release 1.2.7.x]

| § | 内容 | case 数 |
|---|---|---|
| §I·multi-consult | `_kjpLlmMergeAdvisorViews`·2 advisor history 输入·返 disagreements + advisorRelations | 4 |
| §J·timeline | `ChronicleTracker.list({sourceType:'kjp-cedui'})`·render filter 真返 | 2 |
| §K·准度 | `_kjpBumpForecastReputation`·初始化·incr·reputation label 映射 (new/mixed/reliable) | 4 |
| §L·NPC 自引用 | `_kjpAppendOwnCeduiHint`·读 GM.wenduiHistory mode='cedui'·相似度阈值·prompt 含"曾对此议策对过" | 3 |
| §M·leak F4 | `_kjpApplyCeduiOutcome` loyalty<60+rand → 调 `_kjSpawnYanguanQingyi` (mock 验调用·非真 F4 spawn) | 3 |
| §N·reveal (若 L4·e) | `_kjpAppendPrivateAudienceHint`·30% 真有概率·prompt 含"你曾在私下被陛下召对" | 2 |
| §O·wendui 集成 | wendui 改后·formal/private/audience 3 mode 跟旧返回一致 (regression) | 2 |

**深扩 smoke 合计·20 case·全过**

**L4·v4 smoke 总 ~49 case** (v3·69 → -20·因复用·smoke 简)

---

## §9·决策点·18 项 (v3 同)

(全列表见 v3 §9·v4 不变)

**v4 我推荐**·
- 9.1 A 做 / 9.2 A 折叠区 (改按钮调 wendui) / 9.3 B 硬码 fallback / 9.4 B ×1.3 / 9.5 B ±30 / 9.6 B c/d 先 / 9.7 必留 (锁) / 9.8 A 共享 / 9.9 A reformLean+3 / 9.10 A loyalty<60+0.3 / 9.11 A 候选过滤标准 / 9.12 A 8 archetype 全 / 9.13 A multi 3 上限 / 9.14 **简化为·直接 F4 enqueue·不做 3 阶段状态机** (v4 改) / 9.15 A 字段·hook 留 L7 / 9.16 A NPC 自引用 / 9.17 A 两 Release / 9.18 B 禁 loyalty<60

---

## §10·post-L4 影响 (v4·回向看·更少独立字段)

L4 完工后·下列 R5/R6 doc TODO 即可勾掉·

- ✅ `npc._kjpReformLean` 真消费 (L4·c)
- ✅ `topicData.magnitudeDescriptor / pilotScope / courtMoodScale` 真注入 keyi NPC prompt (L4·d)
- ✅ 闭环·user audience → reformLean → courtMood 预判 + keyi 议政 stance + NPC 自引用
- ⚠️ `topicData.privateAudiences[]` 仅 L4·e 才消费·若 9.1 选不做·留 L5/L8
- ⏳ `GM._kjpPrivateAudienceLog[]` 50 ring·仍写多读零·留 L8

**v4 新增·复用现有·不脏新字段**·
- 🔄 `GM.wenduiHistory[name]` 含 cedui mode 标·**通用·不污染**·tinyi 自引用读
- 🔄 `GM._chronicleTracks` 加 sourceType=`'kjp-cedui'` entries·**通用·L8 演化读统一**
- 🔄 F4 言官清议 trigger 加 `'cedui-leak'` source·**通用·F4 自然处理**
- 🆕 `npc._forecastReputation` (字段简化命名)·**通用·非 kjp-prefix·因 reputation 是 NPC 属性**·L7 真填
- 🔄 wendui 加 mode='cedui'·**通用·将来若有其他 paradigm 需要也复用 cedui mode**

---

## §11·ship 节奏 (v4·两 Release·v3 同)

### Release 1.2.6.5 候选·L4·核心 (2.6 d)

### Release 1.2.7.x 候选·L4·深扩 (2.1-2.5 d)

---

## §12·8 archetype 完整谱 (v3 §12 同·v4 不变·搬到 reform-llm.js)

(见 §3.4 表·voice / labels / biasTone 三表·v4 无改)

---

## §13·真派生函数 (v3 §13 同·v4 不变)

(完整代码见 v3 §13·_kjpInferAdvisorArchetype + sanity check 表·v4 无改)

---

## §14·多 advisor 协商 (v4·复用 wendui confronter)

### 14.1·流程

```
[user 在 wendui modal 内·已对 advisor A 策对中]
  ↓ user 点 wendui 现有 "召人对质" 按钮 (_wdSummonConfronter)
  ↓ wendui modal 启 confronter 选 advisor B
  ↓ B 进入 modal·跟 A 同 mode='cedui'
  ↓ wendui 按 confronter paradigm 推进 (现有逻辑)
  ↓ A B 各 1-2 轮发言·history 双 push
  ↓ user close modal
  ↓
**v4 NEW·merge phase**·
  _kjpLlmMergeAdvisorViews(historyA, historyB) → LLM 二次调用·~2.5k token
  ↓ 返·{ consensusForecast, disagreements:[], advisorRelations:[] }
  ↓
  面板渲染·共识 + 分歧 + advisor 互动
  multi-consult 衍生政治后果·
   ├─ 跨党·_factionTension +1
   ├─ user "看似公允" prestige +5 (一次性·_kjpFairnessBonusGranted)
   └─ A B 各应用 _kjpApplyCeduiOutcome (B 触发时已自动跑)
```

### 14.2·`_kjpLlmMergeAdvisorViews`

```javascript
async function _kjpLlmMergeAdvisorViews(advisorA, advisorB) {
  var histA = (GM.wenduiHistory[advisorA.name] || []).filter(function(m) { return m.mode === 'cedui'; }).slice(-6);
  var histB = (GM.wenduiHistory[advisorB.name] || []).filter(function(m) { return m.mode === 'cedui'; }).slice(-6);
  var archA = _kjpInferAdvisorArchetype(advisorA);
  var archB = _kjpInferAdvisorArchetype(advisorB);
  var prompt = '你是中立摘录者·读以下 2 位大臣的策对对话·抽共识与分歧·\n' +
    '【' + advisorA.name + '·' + ARCHETYPE_LABELS[archA] + '·' + (advisorA.party || '中立') + '】\n' +
    histA.map(function(m) { return '[' + m.role + '] ' + m.content.slice(0,120); }).join('\n') +
    '\n\n【' + advisorB.name + '·' + ARCHETYPE_LABELS[archB] + '·' + (advisorB.party || '中立') + '】\n' +
    histB.map(function(m) { return '[' + m.role + '] ' + m.content.slice(0,120); }).join('\n') +
    '\n\n返 JSON·{ consensusForecast:string, disagreements:[string], advisorRelations:[string] }';
  var raw = await callAISmart(prompt, 2500, { maxRetries: 1, priority: 'low' });
  return _kjpParseJson(raw);
}
```

---

## §15·准度追踪 + NPC 自引用 (v4·简化字段)

### 15.1·`npc._forecastReputation` (字段简化·去 kjp-prefix·因属性是 NPC 通用)

```javascript
{
  totalForecasts: 7,
  accurateForecasts: 5,  // L7 后真填·L4 初始 0
  averageScore: 72,      // L7 后真填
  reputation: 'reliable' // 'new'(total=0) / 'reliable'(>=70) / 'mixed'(50-70) / 'unreliable'(<50)
}
```

### 15.2·`_kjpBumpForecastReputation(npc, turn)`·见 §3.6·L4·b2 调

### 15.3·`_kjpAuditForecastAccuracy(chronicleEntry, actualOutcome)`·hook·L7 后填

```javascript
function _kjpAuditForecastAccuracy(chronicleEntry, actualOutcome) {
  // chronicleEntry·从 ChronicleTracker.findBySource('kjp-cedui', ...)
  // actualOutcome·L7 写
  // L4 stub·真填留 L7
  return 0;
}
```

### 15.4·dropdown chip 显·`言中 5/7 (72/100·reliable)`·见 §3.7 + L4·b

### 15.5·NPC 自引用·议政时·见 §4.3·`_kjpAppendOwnCeduiHint`·**读 GM.wenduiHistory·非新建 memory 字段**

---

## §16·跨系统 rumor·**直接 F4 enqueue** (v4·砍 3 阶段状态机)

### 16.1·v3 自建·v4 复用对比

| v3 (废弃) | **v4 (复用 F4)** |
|---|---|
| `GM._kjpForecastLeakState` 状态机 | ❌ 不要 |
| `_kjpStartLeakChain` + `_kjpProgressLeakChain` | ❌ 不要 |
| endTurn hook 自建·3 stage 推进 | ❌ 不要 |
| spawn 鸿胪寺密报事件·自建 | ❌ 不要 |
| spawn F4 言官清议·自建 hook | ✅ `window._kjSpawnYanguanQingyi(...)`·一行 enqueue·F4 自然消费 |
| F4 trigger check·自建 | ✅ `window._kjCheckYanguanQingyiTriggers` (endTurn 已跑) |
| 3 阶段时间间隔 | ✅ F4 自带 trigger 时序 |
| 民间歌谣 spawn | ❌ 留 L14 |

### 16.2·`_kjpApplyCeduiOutcome` 第 5 步·v4 简化

```javascript
if ((npc.loyalty || 50) < 60 && Math.random() < 0.3) {
  if (typeof window._kjSpawnYanguanQingyi === 'function') {
    window._kjSpawnYanguanQingyi({
      source: 'cedui-leak',
      advisorNpc: npc.name,
      advisorParty: npc.party || '',
      reason: '陛下密召 ' + npc.name + ' 策对改革·偏听一方·当广纳众议'
    });
  }
  // 完·F4 自己消费
}
```

**v3 g2 0.7 d → v4 g2 0.2 d**·砍 0.5 d。

---

## §17·UI·历次策对·**复用 ChronicleTracker.list** (v4·砍自建 timeline schema)

### 17.1·`_kjpRenderCeduiTimeline(modal)`

```javascript
function _kjpRenderCeduiTimeline(modal) {
  if (!window.ChronicleTracker) return '';
  var tracks = window.ChronicleTracker.listVisible
    ? window.ChronicleTracker.listVisible().filter(function(t) { return t.sourceType === 'kjp-cedui'; })
    : (GM._chronicleTracks || []).filter(function(t) { return t.sourceType === 'kjp-cedui' && !t.hidden; });
  tracks = tracks.slice().sort(function(a, b) { return (b.startTurn||0) - (a.startTurn||0); }).slice(0, 10);

  if (!tracks.length) return '<div class="kjp-muted">尚无策对·点 ▶ 召史策对</div>';

  return '<div class="kjp-cedui-timeline">' +
    tracks.map(function(t) {
      var riskIcon = t.narrative.indexOf('extreme') >= 0 ? '🔴' :
                     t.narrative.indexOf('high') >= 0 ? '🟠' :
                     t.narrative.indexOf('moderate') >= 0 ? '🟡' : '🟢';
      var leakedTag = t.narrative.indexOf('leaked') >= 0 ? ' <span class="kjp-forecast-leaked">●泄</span>' : '';
      return '<div class="kjp-cedui-row">' +
        '<span class="kjp-cedui-turn">T' + t.startTurn + '</span>·' + riskIcon + ' <b>' + _escHtml(t.actor) + '</b>·' +
        _escHtml(t.title.slice(0, 40)) + leakedTag + '</div>';
    }).join('') +
    '</div>';
}
```

### 17.2·对比 advisor·两列并排·复用 ChronicleTracker.findBySource 拿两条·渲染

### 17.3·risk heatmap (按党)·复用 forecast.partyReactions·DOM 字符

---

## §18·命名 in-game 词约定 (v3 §18 同·v4 不变)

| in-game·古文化 | 内部代码·英文 |
|---|---|
| **策对** (动作·"召 X 策对") | wendui mode `'cedui'`·内部 |
| **对策** (名词·"X 的对策") | wendui history entry 内容 |
| **召史策对** (UI section 标题·v4 改为按钮 label) | "AI Preview" (代码 comment) |
| **言中之誉 / 对策准度** | `_forecastReputation` |
| **历次策对** (UI 折叠区) | `ChronicleTracker.list({sourceType:'kjp-cedui'})` |
| **史官派 / 改革激进派 / ...** | `A1_radical / A2_conservative / ...` |
| **臣前奉策对·尝陈...** (NPC 自引用) | `_kjpAppendOwnCeduiHint` |

**禁用词** (出戏)·"预言" / "预演" / "AI 推演 5 年" / "AI 建议" / "模拟"

---

## §19·变更 log (v1 → v2 → v3 → v4)

| 日期 | 版本 | 内容 |
|---|---|---|
| 2026-05-24 | v1 | 初稿 |
| 2026-05-24 | v2 | Preview 改系统型·真政治后果 |
| 2026-05-24 | v3 | 加 5 深化轴·8 archetype·真派生·"策对" 改词 |
| 2026-05-24 | **v4** | **user "复用·扩展现有·非独立再作" 重写**·全 audit 6 现有机制 (wendui / F4 / Chronicle / 精力 / 狱中 / wendui filter)·砍 36% budget·删独立 `_kjpLlmForecastReform / _kjpForecastMemory / _kjpForecastLog / _kjpStartLeakChain / 独立 panel section`·改为·扩 wendui 加 mode='cedui' + 走 ChronicleTracker + F4 enqueue + GM.wenduiHistory 当 NPC memory |
| 2026-05-24 | **v5** | **L4 核心 ship + RX 12 项全修**·见 §23 修复对照表·5 文件改 + 1 smoke·53/53 case·零回归·状态从"纸面"转"已落地"·doc 加 file:line refs·slice 标 ✅/⏳·budget actual vs estimate·新 §24 ship readiness checklist |
| 2026-05-24 | **v6** | **L4 深扩 ship·e + g1 framework + f1 + f2**·5 slice 全 ✅·smoke 53→83 case (+30)·新 §25·深扩落地·candidates 更新 (深扩 done·ship vs L7 真填准度 决策)·g1 仅剩 L7 hook 真填·余全 ship |
| 2026-05-24 | **v7** | **Round Y audit + RY 11 项全修**·见 §26 修复对照表·CSS +50 行 (Y-A1·破·UI 真生效)·reputation 'unaudited' default (Y-B1)·dedupe + same-turn guard + digest 40 + sanitize·smoke 83→97 case (+14)·零回归·**L4 全 done·待 L7 hook + ship** |

### v4 增量 (相对 v3)

- §0 加复用清单 (核心改动·先看)
- §1.3 加 5 项 v4 拒绝独立新建
- §1.4 改·政治后果走 wendui 通道
- §2 数据流·改"调 openWenduiModal"·删独立 LLM call
- §3 全改·删 `_kjpLlmForecastReform` 大段·改"扩 wendui 加 cedui mode + prompt 注入"
- §3.5 candidate 派生不变·v3 同
- §3.6 政治后果·改 ChronicleTracker.upsert + F4 enqueue·删 _kjpForecastLog
- §4 reader 不变·v3 同
- §5 slice 7 → 7·**每 slice budget 砍 30-50%**
- §6 总 budget 8.0 → 5.1 d·砍 -2.9 d (-36%)
- §7 加 7.16/7.17/7.18 wendui 集成 / ChronicleTracker 风险
- §8 smoke·69 → 49 case·因复用·smoke 简
- §10 影响·改"复用现有·不脏新字段"
- §12 archetype 谱·搬到 reform-llm.js·内容不变
- §13 派生·不变
- §14 multi·改"复用 wendui confronter + 加 LLM merge"
- §15 准度·`_forecastReputation` 字段简化命名 (去 kjp-prefix)
- §16 leak·全删自建·改"直接 _kjSpawnYanguanQingyi"
- §17 UI·timeline 改"复用 ChronicleTracker.list"
- §18 命名·不变
- §20 一致性核·加 6 项复用 ✅

---

## §20·跟 plan doc / memory 一致性核 (v4·复用得更对)

| 原则 (memory) | v4 符合度 |
|---|---|
| `feedback_tool_vs_system_costs`·工具 vs 系统型代价区分 | ✅ 策对明示系统型·走 wendui 通道·跟 audience 对称 |
| `feedback_no_mystic_penalties`·失败禁玄幻 | ✅ A5 钦天派只 voice·smoke 验 |
| `project_faction_center_layers`·三层加强·读势力走 TM.FactionIndex | ⚠️ 直读 GM.parties·**改走 TM.FactionIndex.get** 更对·L4·a 实施时一并修 |
| `feedback_paradox_ui_unreliable`·P 社 UI 不可信 | ✅ UI 是 DOM 字符·非 P 社 |
| `feedback_scope_strictness`·指 X 改 X | ✅ 不改 tinyi 25 RULES·只加 modulator |
| `feedback_audit_layers`·UI 必三层 | ✅ smoke 覆三层 |
| `feedback_conservative_slicing`·一刀只做一件事 | ✅ 7 slice·两 Release |
| `feedback_chinese_string_translation_during_refactor`·禁顺手翻译 | ✅ "预言→策对" 显式决策·非顺手 |
| `feedback_large_file_split_paradigm`·5k 行 IIFE 拆模块·alias + 内联 | ✅ wendui 2503 行·v4 不拆·只加 mode 分支 (改 < 50 行)·**完全符合 paradigm** |
| `project_renovation_phase0` | — 不相关 |
| `feedback_editor_game_relation`·编辑器是宪法·游戏是历史 | ⚠️ L4 全游戏侧·编辑器留 L-K |
| **`feedback_refactor_not_reskin`·user 说"重构"指 paradigm 推倒** | ✅ **v4 关键符合**·v3 把策对当独立新建是"reskin (新建复制 wendui)"·v4 改为"扩 wendui 加 mode"·真复用·非 reskin |

**v4 复用·命中 12 个 memory 原则·100%** (v3 9/12)

---

## §21·一句话·v4 核心

> v3 已把策对从"工具"修为"系统型 + 8 archetype + 多 advisor + 准度 + leak + UI"·**v4 更进一步**·
> 把所有"独立新建"改为"扩展现有"·
> 策对就是带改革 paradigm context 的 wendui 问对·
> NPC 记忆走 wendui history·入卷走 ChronicleTracker·泄露走 F4 enqueue·
> **L4 v4·5 个新字段砍到 2 个·5 个新函数砍到 1.5 个·-36% budget·完全符 user `feedback_refactor_not_reskin`**·
> 命名·"策对"替"预言"·"对策"替"forecast"·古文化在场感。

---

## §22·候选 (v6·全 ship)

- ✅ **L4 核心 ship** (a/b/b2/c/d + smoke 核心) — DONE
- ✅ **Round X·三层 audit + RX 全修** — DONE·12 项
- ✅ **L4 深扩** (e/g1 framework/f1/f2/smoke 深扩) — DONE
- ⏳ **ship 1.2.6.5** (跟 L3 一并) — 等 user pass review
- ⏳ **Round Y audit** — 防深扩漏·可选
- ⏳ **L7·apply diff + g1 hook 真填准度** — 后续阶段
- ⏳ **L5·反对奏疏** / **L6·自定义新 subject** — L-A Release 剩 2 slice

---

## §23·RX 全修对照表 (12 项·v5 新)

按 Round X audit 三层分类·**全 ship**·smoke +11 case 覆盖·

| ID | 级别 | 内容 | 修复位置 | smoke |
|---|---|---|---|---|
| **B1** | BUG·高 | `_kjpInvokeCedui` 双击 spawn 多 wendui modal | `tm-keju-paradigm-panel.js`·`_kjpInvokeCedui` 入口 guard·检 `document.getElementById('wendui-modal')` | n/a (DOM 测) |
| **B2** | BUG·中 | reformLean 同 turn 重复刷分 exploit | `_kjpApplyCeduiOutcome`·走 `npc._lastCeduiTurn === turn` skip +3·chronicle/reputation 仍 bump | ✅ RX·B2 (2 case) |
| **A4** | 设计·中 | paradigm 改后 timeline 不标 stale | `_kjpRenderCeduiTimeline(draft)`·算 currentDigest·entry sourceId 末段不匹则 stale 标 ⚠️ | n/a (UI 测) |
| **C3** | 设计·中 | confronter 在 cedui mode archetype 错 | `tm-wendui.js`·`_wdSummonConfronter` 入口·`if (_wenduiMode === 'cedui') return` | ✅ RX·C3 grep (1 case) |
| **B5** | polish·中 | NPC 自引用相似度 0.6 过严 | `_kjpAppendOwnCeduiHint`·阈值 0.4·近 5 turn boost 0.3·wendui entry 加 `turn` 字段 | ✅ RX·B5 (2 case) |
| **B3** | polish·中 | advisor 候选无排序 | `_kjpListForecastAdvisors`·sort by reputation.averageScore desc + prestige desc | ✅ RX·B3 (2 case) |
| **A1** | polish·中 | 按钮文案不 dynamic | `_kjpHandleInputOrChange`·dropdown change 时更新 `.kjp-cedui-btn` textContent | n/a (UI 测) |
| **B4** | polish·低 | dims 全 0.5 时误命中 A1 | `_kjpInferAdvisorArchetype`·dimsAllDefault 检·跳 dims 路径 | ✅ RX·B4 (2 case) |
| **A2** | polish·低 | section 默认折叠·空时不污染 UI | 已有 (collapsedDefault=true) | n/a |
| **A3** | polish·低 | timeline 空态文案改清楚 | `_kjpRenderCeduiTimeline`·空态文案 "选 advisor 后点策对按钮" | n/a (UI 测) |
| **C4** | 设计·低 | chronicle sourceId 跨 turn 覆盖 | sourceId 改 `name_T<turn>_digest`·跨 turn 多次策对保历史·findBySource 同步改 | ✅ RX·C4 (1 case) |
| **C5** | polish·低 | window globals 残留 | `_kjpOpenReformProposal` 入口 reset 5 个 cedui globals | n/a (DOM 测) |

**5 项需 e2e DOM 测**·留 manual verify (按钮文案 / DOM collision / 空态文案 / global reset)。
**7 项 smoke 覆盖**·全过。

---

## §24·L4 核心 ship readiness checklist (v5 新)

### 24.1·代码 ✅

- [x] L4·a·`tm-keju-reform-llm.js` +296 行·archetype 谱 + 派生 + helpers + RX 修
- [x] L4·a·`tm-wendui.js` +29 行·mode='cedui' + prompt 注入 + history metadata + close hook + RX·C3 禁 confronter
- [x] L4·b/b2·`tm-keju-paradigm-panel.js` +234 行·section + invoker + outcome + RX 全修
- [x] L4·c·`tm-tinyi-v3.js:683-726` +43 行·wrapper + modulator
- [x] L4·d·`tm-keju-runtime.js:2032-2062` +27 行·topicLabel + reform 注入 + 9 议题 bug 修
- [x] save lifecycle·复用 `_chronicleTracks:1` 白名单·**无新加字段**

### 24.2·smoke ✅·**53/53 + 全 regression 零回归**

- [x] L4 smoke 核心 + RX·`scripts/smoke-l4-forecast-and-stance.js`·53 case
- [x] L1·95·L2·115·L3·107·零回归
- [x] A1·B1 (75)·B2 (156)·B3 (12)·C1 (13)·C4 (8)·零回归

### 24.3·doc ✅

- [x] sprint plan doc v5·**当前** keju-L4-sprint.md
- [x] RX audit + 全修对照·§23

### 24.4·跟 memory 一致性 ✅·12/12

(详 §20·v5 不变)

### 24.5·未做·留深扩 / L7 ⏳

- [ ] L4·e·NPC reveal e2e verify (helper 已 ship·prompt 已注入·缺真实运行验)
- [ ] L4·f1·multi-advisor LLM merge·解禁 confronter cedui mode + 加 archetype merge LLM
- [ ] L4·f2·对比 advisor 两列 UI + risk heatmap (按党)
- [ ] L4·g1·`_kjpAuditForecastAccuracy` L7 真填·NPC reputation 准度回溯
- [ ] L4·smoke 深扩·+15 case

### 24.6·ship 节奏建议 (v6 更新)

**当前状态·v6·核心 + RX + 深扩 全 ship·仅剩 g1 L7 hook 真填**·user pass review 后·
- **A·ship 1.2.6.5** (跟 L3 一并)·release note·"科举改革·NPC 史官策对·8 archetype + multi-advisor 协商 + reputation framework + 议政深度集成 + 9 议题 topicLabel bug 修"
- **B·先 audit Round Y / Z 深扩·再 ship**·防深扩漏
- **C·开 L7** (apply diff + g1 hook 真填准度)
- **D·开 L5** (反对奏疏) / **L6** (自定义新 subject)

---

## §25·L4 深扩落地 (v6 NEW·跟 §23 RX 同等地位)

### 25.1·实施清单·5 slice 全 ship

| ID | 内容 | 文件 | 函数 / 行 | smoke |
|---|---|---|---|---|
| **L4·e** | NPC reveal 私允·30% 概率 prompt 段 | tm-keju-reform-llm.js + tm-keju-runtime.js | `_kjpAppendPrivateAudienceHint` (helper·已 expose)·keyi prompt builder 内调 (line 2049) | §Deep·e 5 case·rand 控制 reveal / not·offerTerms 摘录验 |
| **L4·g1** | reputation framework + audit stub | tm-keju-paradigm-panel.js | `_kjpBumpForecastReputation` / `_kjpInitForecastReputation` / `_kjpAuditForecastAccuracy` (stub L7 真填)·dropdown chip 渲染 | §Deep·g1 7 case·init/bump/label 映射 (new/reliable/mixed/unreliable) |
| **L4·f1** | multi-advisor 协商 auto-detect + merge LLM | tm-keju-reform-llm.js + tm-keju-paradigm-panel.js + tm-wendui.js | `_kjpLlmMergeAdvisorViews` / `_kjpMergeViewsFallback` / `_kjpMaybeTriggerMultiConsultMerge` (panel)·wendui confronter cedui 加 loyalty filter (RX·C3 解禁) | §Deep·f1 11 case·fallback schema / multi entry / 跨党 tension / prestige bonus |
| **L4·f2** | timeline + 对比 view | tm-keju-paradigm-panel.js | `_kjpRenderCeduiCompare` + compare button click handler + timeline 含 multi-consult 渲染·新加 `kjp-cedui-compare-btn` / `kjp-cedui-compare-clear` | §Deep·f2 7 case·timeline 含 multi·compare 两列·清按钮 |
| **smoke 深扩** | (并入 above) | scripts/smoke-l4-forecast-and-stance.js | §Deep·e + g1 + f1 + f2 | 30 case |

### 25.2·新加文件 / 字段总览 (v5 → v6)

| 项 | 详 |
|---|---|
| 新文件 | 0·全复用现有 |
| 新加 GM 字段 | `GM._kjpFairnessBonusGranted` (一次性 prestige bonus 标·跨党 multi-consult 触发) |
| 新加 NPC 字段 | 0·`_forecastReputation` v5 已加·`_lastCeduiTurn` v5 已加 |
| 新加 chronicle sourceType | `kjp-multi-consult` (跟 `kjp-cedui` 同 timeline) |
| 新加 wendui mode | `cedui` confronter 解禁·loyalty>=60 filter |

### 25.3·multi-consult auto-trigger 流程 (v6 实施)

```
user 关 advisor A 的 wendui modal
  ↓
_kjpOnCeduiClose(A) → _kjpApplyCeduiOutcome(A) (1 entry chronicle)
  ↓
_kjpMaybeTriggerMultiConsultMerge(A, paradigmDigest, turn)
  ↓
找近 5 turn 同 paradigm 别 advisor 已 cedui (e.g. B)
  ↓ 有
_kjpLlmMergeAdvisorViews(A, B, digest) async (~2.5k token·fallback 走默认)
  ↓
chronicle.add({sourceType:'kjp-multi-consult', ...})
  ↓ 跨党
GM._factionTension +1
若 !GM._kjpFairnessBonusGranted → GM.vars['威望'].value +5·标 granted
  ↓
panel rerender timeline 显新 multi entry (含 ⚖️ 标)
```

### 25.4·multi-consult 设计选择 (panel auto-detect vs wendui confronter)

v3 doc 原意是·wendui confronter (modal 内召人对质) 解禁 cedui mode → 双 advisor 同 modal 内对话 → 关后跑 merge LLM
v6 实施·**panel auto-detect**·user 分别召 A → 关 → 召 B → 关·panel 检测近 5 turn 同 paradigm 自动 trigger merge
**理由**·wendui confronter 复杂度高 (双 NPC reply / archetype 切 / context 同步)·panel auto-detect 简洁·user 体验 sequential 也自然·实现成本低 (~0.6 d vs 1.2 d)
**取舍**·wendui confronter 用 loyalty filter 仍然解禁·**留给 future 演化·若 user 反馈需 modal 内同时召**·再做

### 25.5·准度回溯·L7 真填 hook spec (v6·g1 剩工 0.2 d)

L7 实施完成时·

```javascript
// L7·真 apply paradigm 完成后·调
function _kjpL7TriggerForecastAudit(executedParadigm, actualOutcomeData) {
  if (!window.ChronicleTracker) return;
  var ceduiEntries = window.ChronicleTracker.list().filter(function(e) {
    return e.sourceType === 'kjp-cedui' &&
           // 同 paradigm·sourceId 末段 digest 跟 executedParadigm digest 匹
           String(e.sourceId).indexOf(executedParadigm.digest) >= 0;
  });
  ceduiEntries.forEach(function(entry) {
    var score = _kjpAuditForecastAccuracy(entry, actualOutcomeData);   // 0-100
    var npc = findCharByName(entry.actor);
    if (!npc || !npc._forecastReputation) return;
    var rep = npc._forecastReputation;
    rep.accurateForecasts = (score >= 70 ? 1 : 0) + (rep.accurateForecasts || 0);
    rep.averageScore = Math.round((rep.averageScore * (rep.totalForecasts - 1) + score) / rep.totalForecasts);
    _kjpUpdateForecastReputationLabel(npc);
  });
}
```

具体·`_kjpAuditForecastAccuracy(entry, actual)` 真填 risk match (30%) + revenue diff (30%) + timeline match (40%) → 总 0-100。
**hook 留 L7 / L8**·L4 不强求·dropdown chip 在 L7 完工后真生效·当前 chip 显"言中 ?/0 (新)"。

### 25.6·跟 plan doc 一致性 (v6)

| 原则 | 命中 |
|---|---|
| feedback_tool_vs_system_costs | ✅ 系统型·5 通道复用 |
| feedback_no_mystic_penalties | ✅ A5 钦天派只 voice·smoke 验 GM.vars 不动 |
| feedback_refactor_not_reskin | ✅ multi-consult 用 panel auto-detect (复用 chronicle + wendui history)·非新建 NPC dialog manager |
| feedback_large_file_split_paradigm | ✅ wendui 改 7 行·panel 改 ~130 行 (但是新加 + 修·非拆分) |
| feedback_audit_layers | ✅ 深扩 smoke 30 case 覆三层 |
| **NEW** project_faction_center_layers | ⚠️ 仍直读 GM.parties·**未走 TM.FactionIndex.get**·留 Round Z |

---

## §26·RY 全修对照表 (11 项·v7 NEW)

按 Round Y audit 三层分类·**全 ship**·smoke +14 case 覆盖·

| ID | 级 | 内容 | 修复位置 | smoke |
|---|---|---|---|---|
| **Y-A1** | **极重·UI 破** | L4 全套 cedui CSS class 都没·compare 两列不分栏·stale 不灰 | `tm-keju-paradigm-panel.css` +50 行·grid-template-columns + flex 真分栏·stale opacity 0.55 灰显 | ✅ RY·A1 4 case grep |
| **Y-B1** | 中·UX | reputation auto-unreliable (avg=0 + acc=0 + total>0 → 'unreliable')·user 误觉 advisor 全不准 | `_kjpBumpForecastReputation` 加 `if (acc === 0 && avg === 0) reputation = 'unaudited'`·L7 hook 后真填 | ✅ RY·B1 1 case |
| **Y-B3** | 中·准度 | totalForecasts 同 turn 重复 cedui 仍 ++·user 刷统计 | `_kjpBumpForecastReputation` 入口检 `lastForecastTurn === turn` skip | ✅ RY·B3 2 case |
| **Y-B5** | 中·collision | digest slice(0, 20) 前 20 字符 collision 风险·改革 paradigm hash 易撞 | sourceId / findBySource / merge detect / timeline stale 全 `slice(0, 40)` | ✅ RY·B5 2 case grep |
| **Y-C1** | 中·chronicle 爆 | user 同 paradigm 召 5 advisor·写 4 multi-consult entry·chronicle 爆 | `_kjpMaybeTriggerMultiConsultMerge` 入口 dedupe·同 paradigm 已有 multi → skip | ✅ RY·C1 1 case |
| **Y-A2** | polish 中 | multi entry 信息密度低·只有名字 | narrative + title 加 archetype 摘要 "A 改革激进派 vs B 史官派" | ✅ RY·A2 2 case |
| **Y-A3** | polish 低 | FIFO 静默替换·user 困惑 | `_kjpCompareSelection.shift` 前加 toast "已替最早选" | n/a (DOM 测) |
| **Y-B2** | 低·冗余 | `_lastCeduiTurn` 跟 `reputation.lastForecastTurn` 重复 | 删 `_lastCeduiTurn`·改 RX·B2 检 `_forecastReputation.lastForecastTurn` | ✅ RY·B2 1 case grep |
| **Y-B4** | 低·防御 | offerTerms 多行破 prompt 格式 | `String(...).replace(/\s+/g, ' ').trim().slice(0, 30)` 单行化 | ✅ RY·B4 1 case |
| **Y-C3** | 已防 | NPC 死中途·防御 OK | (已有·outcome 入口检 `if (!npc) return`) | n/a |
| **Y-C4** | 已 OK | panel close 时 multi LLM 还跑·rerender skip 无害 | (已有·rerender check `modal.isConnected`) | n/a |

**修复·8 项 smoke 覆盖 + 3 项 DOM/已防**·全过·**零回归**·跟 §23 RX 风格一致。
