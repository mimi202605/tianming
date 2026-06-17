# Slice 3·stance paradigm 3 候选·详细实施

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "三个的实施细节"·Slice 3 paradigm decision 前置 audit
**背景**·v3 当前 stance 由 LLM 决定 (`_ty2_genOneSpeech` JSON return `{stance, confidence, line}`·L1937 写入 `CY._ty2.stances[name].current`)·Slice 3 想让 8D dims 接入·**接入方式有 3 个 paradigm**

---

## 共享前置·所有 paradigm 都要的 4 helper

```js
// 1·trait → dims 映射 (14 trait·已部分在 §5.5.2 spec)
function _ty3_dimsFromTraits(traitIds) {
  const dims = { honor: 0.5, compassion: 0.5, boldness: 0.5, rationality: 0.5,
                 greed: 0.5, cunning: 0.5, loyalty: 0.5, confucianism: 0.5 };
  if (!Array.isArray(traitIds)) return dims;
  const BIAS = {
    'trait_xianliang':  { honor: +0.3, compassion: +0.2 },
    'trait_chunzheng':  { honor: +0.3, boldness: +0.2 },
    'trait_yiqi':       { honor: +0.2, boldness: +0.3 },
    'trait_jinshen':    { rationality: +0.2, cunning: -0.2 },
    'trait_yaohua':     { cunning: +0.3, honor: -0.2 },
    'trait_gangzhi':    { boldness: +0.3, honor: +0.2 },
    'trait_xueshi':     { confucianism: +0.4, rationality: +0.2 },
    'trait_jiengong':   { rationality: +0.3 },
    'trait_quan':       { cunning: +0.3, greed: +0.2 },
    'trait_jian':       { honor: -0.3, cunning: +0.3, boldness: +0.3 },
    // ...14 trait 全列
  };
  traitIds.forEach(t => {
    const b = BIAS[t]; if (!b) return;
    Object.keys(b).forEach(k => { dims[k] = Math.max(0, Math.min(1, dims[k] + b[k])); });
  });
  return dims;
}

// 2·keyword fallback (无 traitId 时·~85% 精度·§5.5.6 已 spec)
function _ty3_dimsFromKeywords(ch) {
  const text = (ch.personality || '') + (ch.desc || '');
  const dims = { honor: 0.5, ... };
  if (/正直|忠贞|清廉/.test(text)) dims.honor += 0.3;
  // ...30+ keyword regex
  return dims;
}

// 3·调度·优先 aggregateDims → traitIds → keyword
function _ty3_getDims(ch) {
  if (ch.aggregateDims && Object.values(ch.aggregateDims).some(v => v !== 0))
    return ch.aggregateDims;
  if (ch.traitIds && ch.traitIds.length > 0)
    return _ty3_dimsFromTraits(ch.traitIds);
  return _ty3_dimsFromKeywords(ch);
}

// 4·expose·Slice 0.5 expose 块加
window._ty3_getDims = _ty3_getDims;
window._ty3_dimsFromTraits = _ty3_dimsFromTraits;
window._ty3_dimsFromKeywords = _ty3_dimsFromKeywords;
```

**4 helper 工时·~0.6d** (all 3 paradigm 共用)·

---

## Option A·dims-driven·LLM 只生成 line

### 实施步骤

**Step A.1** (0.5d)·新建 `_ty3_inferStance(ch, topicTags, topicText) → {stance, intensity}` (~80 行)

```js
function _ty3_inferStance(ch, topicTags, topicText) {
  const dims = _ty3_getDims(ch);
  // 按 §5.5.1 25 RULES + class 加成
  for (const rule of RULES) {
    if (rule.if(dims, topicTags, ch)) {
      return { stance: rule.stance, intensity: rule.intensity || 0.7, source: rule.id };
    }
  }
  // fallback·按 dims dominant 算
  if (dims.honor >= 0.7 && topicTags.includes('regicide-pursuit')) return { stance: 'oppose', intensity: 0.9 };
  if (dims.compassion >= 0.7 && topicTags.includes('penal-harsh')) return { stance: 'oppose', intensity: 0.8 };
  if (dims.greed >= 0.7 && topicTags.includes('reward')) return { stance: 'support', intensity: 0.8 };
  // ...
  return { stance: 'neutral', intensity: 0.3 };
}
```

**Step A.2** (0.5d)·改 `tm-chaoyi-tinyi.js _ty2_genOneSpeech` (L292-349)·prompt 改

```diff
- // 当前·LLM 自己决定 stance
- prompt += '...请根据以上推断你对本议题的立场...';
- prompt += '\n返回 JSON：{"stance":"...","confidence":...,"line":"...","reason":"..."}';
+ // v2.6·先算 stance·prompt 注入·LLM 只生成 line
+ const inferredStance = _ty3_inferStance(ch, topicTags, CY._ty2.topic);
+ prompt += '\n你的立场已定·' + inferredStance.stance + ' (强度 ' + (inferredStance.intensity*100).toFixed(0) + '%)';
+ prompt += '\n写发言契合此立场·若强反对此立场·勿写 (返 empty line)';
+ prompt += '\n返回 JSON：{"line":"...","reason":"..."}';
```

**Step A.3** (0.2d)·改 `_ty3_safeGenSpeech` (L1931) parse return

```js
// LLM return 只含 line + reason
// stance 用 _ty3_inferStance 算的覆盖
if (r && CY._ty2.stances[name]) {
  CY._ty2.stances[name].current = inferredStance.stance;
  CY._ty2.stances[name].confidence = inferredStance.intensity * 100;
  CY._ty2.stances[name].source = 'dims';  // verify 用
}
```

**Step A.4** (0.4d)·smoke `web/scripts/smoke-tinyi-stance-dims.js`

```js
const cases = [
  { ch: '杨涟', topic: '诛戮魏珰', tags: ['regicide-pursuit'], expect: 'oppose' },
  { ch: '魏忠贤', topic: '诛戮魏珰', tags: ['regicide-pursuit'], expect: 'support' },
  // ...10 case
];
cases.forEach(c => {
  const r1 = _ty3_inferStance(findCharByName(c.ch), c.tags, c.topic);
  const r2 = _ty3_inferStance(findCharByName(c.ch), c.tags, c.topic);
  assert(r1.stance === r2.stance, 'deterministic');
  assert(r1.stance === c.expect, c.ch + ' on ' + c.topic);
});
// 统计·总 NPC 中 极支+极反 比例
const allNpcs = GM.chars.filter(c => c.alive);
const stances = allNpcs.map(ch => _ty3_inferStance(ch, ['regicide-pursuit'], '诛戮魏珰').stance);
const extremeRatio = stances.filter(s => s === 'support' || s === 'oppose').length / stances.length;
assert(extremeRatio >= 0.20, '极支+极反 ≥ 20%');
```

### 跨 slice 交互

**问题**·dims-driven paradigm 跟其他 slice 冲突·

| 其他 slice | 冲突 | 修法 |
|---|---|---|
| Slice 9·emperor cue (_lastEmperorIntent +20%) | dims 算 stance 后 LLM 不再调整·emperor cue 失效 | 加 `_ty3_inferStance` 含 cue param·`if (cue==='punish' && stance==='support') intensity *= 0.8` |
| Slice 10·clientelism (mentor 极支 → 70% 附议) | dims 算 stance 跟 mentor stance 不一致时·哪赢 | §5.4.10 v2.3 已加优先级·dims 反向时 mentor cancel·OK |
| Slice 4·prompt 段 A/B/C/D 注入 | dims-driven 不影响·LLM 仍要 persona / hw/hq 注入生成 line·OK | 无冲突 |

### 工时合计

| 子任务 | 工时 |
|---|---|
| 4 helper (共享) | 0.6d |
| A.1·_ty3_inferStance | 0.5d |
| A.2·prompt 改 | 0.5d |
| A.3·parse return 改 | 0.2d |
| A.4·smoke | 0.4d |
| **paradigm change 整合**·跟 Slice 9/10 联调 | **0.3d** |
| **合计** | **2.5d** |

### 成本影响

- **LLM cost·-15% prompt token** (去 stance 段) + **-20% response token** (去 stance 字段)
- 单议题·~$0.10 → $0.08 (省 $0.02)
- 玩家日 (10 议题)·$1.0 → $0.8

### 风险

- 失 LLM 灵活性·NPC 无法看上下文动态调整 (虽然 cue / mentor 可补·但 LLM 训练偏中立的本能没了)
- dims RULE 不全时·stance 死板·"高 cunning + reward" 必走 'second' 即使议题敏感
- 实施成本最高·要重写大量 LLM prompt 段
- 测试性最好·smoke 可单元测·CI 友好

---

## Option B·LLM stance + dims prior bias

### 实施步骤

**Step B.1** (0.3d)·新建 `_ty3_buildDimsHint(dims, tags) → string` (~30 行)

```js
function _ty3_buildDimsHint(dims, tags) {
  const parts = [];
  if (dims.honor >= 0.7) parts.push('重名节');
  else if (dims.honor <= 0.3) parts.push('轻名节');
  if (dims.compassion >= 0.7) parts.push('仁悯民');
  if (dims.boldness >= 0.7) parts.push('敢直谏');
  if (dims.rationality >= 0.7) parts.push('理性判');
  if (dims.greed >= 0.7) parts.push('图利');
  if (dims.cunning >= 0.7) parts.push('权谋');
  if (dims.loyalty >= 0.8) parts.push('忠主');
  if (dims.confucianism >= 0.7) parts.push('儒生');
  return parts.length ? parts.join('·') : '中庸';
}
```

**Step B.2** (0.3d)·改 `_ty2_genOneSpeech` prompt (少改·~5 行 diff)

```diff
+ // v2.6·dims hint 注入·prior bias·LLM 自决最终 stance
+ const dimsHint = _ty3_buildDimsHint(_ty3_getDims(ch), topicTags);
+ prompt += '\n你的性格倾向·' + dimsHint;
+ prompt += '\n可保留倾向·或上下文驱动反转·若反转·reason 必含原因';
  // prompt 保留 stance return 不动
  prompt += '\n返回 JSON：{"stance":"...","confidence":...,"line":"...","reason":"..."}';
```

**Step B.3** (0.0d·v3 不动)·`_ty3_safeGenSpeech` parse 不变·LLM return stance 直接用

**Step B.4** (0.3d)·smoke·统计性 verify

```js
// 跑 50 NPC × 5 case = 250 stance
const allTests = [...];
const stances = allTests.map(t => callLLMAndParse(t));
// DoD #4·extreme ratio
const extreme = stances.filter(s => /极/.test(s.stance)).length / stances.length;
assert(extreme >= 0.20, '极支+极反 ≥ 20%');
// dims-stance correlation
const honorHighOppose = stances.filter(s => s.dims.honor >= 0.7 && s.topic === 'regicide' && /反/.test(s.stance)).length;
const honorHighTotal = stances.filter(s => s.dims.honor >= 0.7 && s.topic === 'regicide').length;
assert(honorHighOppose / honorHighTotal >= 0.6, 'honor>0.7 + regicide → 60%+ oppose');
```

### 跨 slice 交互

| 其他 slice | 冲突 | 修法 |
|---|---|---|
| Slice 9·emperor cue | LLM 看 hint + cue + prev·自决·灵活 | 无冲突·LLM 自然融合 |
| Slice 10·clientelism | LLM 看 hint·遇到 mentor 极支 NPC 倾向附议·自然 | 无冲突 |
| Slice 4·prompt A/B/C/D | hint 是新加段 D 之后·一行注入 | 无冲突 |

### 工时合计

| 子任务 | 工时 |
|---|---|
| 4 helper (共享) | 0.6d |
| B.1·_ty3_buildDimsHint | 0.3d |
| B.2·prompt 改 (5 行 diff) | 0.3d |
| B.3·parse 不变 | 0.0d |
| B.4·smoke 统计性 | 0.3d |
| **小计** | **1.5d** |

### 成本影响

- **LLM cost·+10% prompt** (hint 段 +50 token / NPC)·**response 不变**
- 单议题·$0.10 → $0.11
- 玩家日·$1.0 → $1.1

### 风险

- stance 不 deterministic·smoke 难单元测·只能统计性
- LLM 默认偏中立 (training bias)·"极支+极反 ≥ 20%" 难保证·可能要加 "请坚持立场" prompt 段
- dims-stance correlation 低 (LLM 可能忽略 hint)·DoD 难定量
- 实施成本最低·改动最小·LLM cost 微涨

---

## Option C·hybrid·初始 dims·LLM 可调

### 实施步骤

**Step C.1** (0.3d)·新建 `_ty3_initialStanceFromDims(ch, topic, tags) → stance` (跟 _ty3_inferStance 同名实质相同)

```js
function _ty3_initialStanceFromDims(ch, topic, tags) {
  // 跟 Option A 的 _ty3_inferStance 同·返 deterministic stance
  return _ty3_inferStance(ch, tags, topic).stance;
}
```

**Step C.2** (0.5d)·改 `_ty3_phase2_run` (L1842)·Round 1 之前算 initial

```js
async function _ty3_phase2_run() {
  // ...原 setup...
  
  // v2.6 新·算所有 attendees 的 initial stance
  const tags = _ty3_inferTopicTags(CY._ty3.meta.topicType, CY._ty3.topic);  // Slice 2 helper
  CY._ty3.attendees.forEach(name => {
    const ch = findCharByName(name);
    const initial = _ty3_initialStanceFromDims(ch, CY._ty3.topic, tags);
    CY._ty3.stances[name].initial = initial;
    CY._ty3.stances[name].current = initial;
    CY._ty3.stances[name].confidence = 70;  // 中等初始
  });
  
  // ...原 round loop·_runOneSpeaker(name, roundNum)...
}
```

**Step C.3** (0.5d)·改 `_ty2_genOneSpeech` prompt·按 roundNum 分

```diff
+ // v2.6 hybrid·prompt 按 roundNum 分
  const myInitial = CY._ty2.stances[name].initial || 'neutral';
  const myCurrent = CY._ty2.stances[name].current || myInitial;
+ if (roundNum === 1) {
+   prompt += '\n你的 initial 立场 (按性格 8D 算)·' + myInitial;
+   prompt += '\n第一轮发言·尽量遵循 initial·若强反对·reason 必含原因';
+ } else {
+   prompt += '\n你的 initial 立场 (Round 1 锚定)·' + myInitial;
+   prompt += '\n当前 current·' + myCurrent;
+   prompt += '\n本轮可保 current·或看前发言/cue/党争 调·若调 reason 必含';
+ }
  prompt += '\n返回 JSON：{"stance":"...","confidence":...,"line":"...","reason":"..."}';
```

**Step C.4** (0.3d)·改 `_ty3_safeGenSpeech` parse·invariant·initial 不变·current 可变

```js
if (r && r.stance && CY._ty2.stances[name]) {
  // current 可变 (LLM 调整)
  CY._ty2.stances[name].current = r.stance;
  CY._ty2.stances[name].confidence = r.confidence;
  // initial 锁定 (Round 1 之后不能改)
  // history (audit 用)
  CY._ty2.stances[name].history = CY._ty2.stances[name].history || [];
  CY._ty2.stances[name].history.push({
    round: roundNum, stance: r.stance, reason: r.reason || '', timestamp: Date.now()
  });
}
```

**Step C.5** (0.3d)·schema 扩 + smoke

```
// schema 扩 (§6)
CY._ty3.stances[name] = {
  initial: 'support',     // Round 1 dims 锚定·不可变
  current: 'support',     // 当前·可被 LLM 调
  confidence: 0-100,
  history: [{round, stance, reason}, ...],
  locked: false,
  source: 'dims-initial' | 'llm-adjusted'
}
```

```js
// smoke
// 5 case·verify
// 1. initial deterministic·跑 2 次同 ch+topic·initial 一样
// 2. current 可变·若 != initial·history 含 reason
// 3. initial 锁·Round 2+ 不变
```

### 跨 slice 交互

| 其他 slice | 冲突 | 修法 |
|---|---|---|
| Slice 9·emperor cue | Round 2+ LLM 看 cue·可调 current·自然·initial 不变 | 无冲突·LLM 自然融合 |
| Slice 10·clientelism | mentor 极支·Round 2+ LLM 可附议调 current | 无冲突 |
| §6 schema | 多 `initial / history` 字段·implementer 易混·重 schema fence | 加 §5.4.15 schema·明 initial 不可变 |

### 工时合计

| 子任务 | 工时 |
|---|---|
| 4 helper (共享) | 0.6d |
| C.1·_ty3_initialStanceFromDims | 0.3d |
| C.2·phase2_run 改 Round 1 init | 0.5d |
| C.3·prompt 按 roundNum 分 | 0.5d |
| C.4·parse + history schema | 0.3d |
| C.5·smoke·initial 锁 / current 可变 verify | 0.3d |
| **paradigm 整合**·invariant 实现 + 文档 | **0.2d** |
| **小计** | **2.7d** |

### 成本影响

- **LLM cost·+5% prompt** (initial hint 短)·**response 不变**
- 单议题·$0.10 → $0.105
- 玩家日·$1.0 → $1.05

### 风险

- 两阶段 schema 复杂·implementer 易混 initial / current·要 schema fence 强制
- LLM 找借口·dims initial=支·LLM Round 2 反转 reason "看了前发言"·破坏 dims 一致性
- smoke 复杂·要验 initial vs current 各自 invariant
- 复杂度最高·但灵活 + 可控兼顾

---

## 总对比表

| 维度 | A·dims-only | B·LLM + bias | C·hybrid |
|---|---|---|---|
| **工时** | 2.5d | **1.5d** ⭐ | 2.7d |
| **stance deterministic** | 100% | 0% | initial 100%·current 看 LLM |
| **DoD 极支+极反 ≥ 20%** | 易保证·dims 可控 | 难保证·LLM 偏中立 | 易保证·initial 控 |
| **LLM cost** | **-15%** ⭐ | +10% | +5% |
| **LLM 灵活性** | 0·全程 deterministic | 100% | Round 2+ 有 |
| **emperor cue (Slice 9)** | 要加 helper 兼容 | 自然融合 ⭐ | Round 2+ 自然 ⭐ |
| **clientelism (Slice 10)** | 跟优先级冲突可能 | 自然 ⭐ | 自然 ⭐ |
| **smoke 测试性** | 单元 ⭐ | 统计性·CI 难 | 双 invariant·复杂 |
| **实施风险** | 高·重 paradigm | 低·小改 ⭐ | 中·schema 复杂 |
| **跨 slice 协调成本** | 高 | 低 ⭐ | 中 |

### 推荐 (no preference·按场景)·

- **如果优先 LLM cost / smoke 可测**·选 **A**
- **如果优先实施速度 / 改动小**·选 **B** ⭐
- **如果优先 DoD 可控 + 保留 LLM 灵活**·选 **C**

---

## 决策点 (user 必选)

| | 选项 | 描述 |
|---|---|---|
| A | dims-driven | stance 完全 deterministic·LLM 只生成 line·成本省 15%·测试性最好·但失 LLM 灵活 |
| B | LLM + bias | stance 仍 LLM 决定·dims 作 hint·实施最快 (1.5d)·改动最小·但 DoD 极支+极反 难保证 |
| C | hybrid | initial dims 锚定·current LLM 可调·兼顾 DoD + LLM 灵活·但 schema 复杂 |
