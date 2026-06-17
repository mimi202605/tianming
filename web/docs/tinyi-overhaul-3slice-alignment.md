# 廷议 v2.1·Slice 2.5 / 8 / 10 三 slice 纸面对齐备忘

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "三个同时走"·并行 audit Slice 2.5 (召集制) + Slice 8 (反弹 hook) + Slice 10 (mentor)·找设计漏洞 + 跨 slice 边界
**方法**·亲读 v2.1 §5.4 / §4 Slice 8 / Slice 10 + grep 验证 v3 runtime 5 处关键 symbol 存在性

---

## TL;DR·3 hard bug + 9 待定

| # | 严重 | 问题 | slice |
|---|---|---|---|
| 1 | **hard** | `_ty3_phase6_recordSeal` **未 `window` 暴露**·v2.1 hook 必装不上 | 8 |
| 2 | **hard** | Slice 2.5 mentor 联动调 `GM._mentorIndex`·但 Slice 10 才建·顺序倒挂 | 2.5 → 10 |
| 3 | **hard** | endturn decay 接入点未定·跟 [[project_endturn_pipeline]] sprint 冲突 | 2.5 / 8 |
| 4 | medium | §5.4.2 "取最严" 实是 3 态 priority cascade·语义混乱 | 2.5 |
| 5 | medium | clientelism 70% 附议 vs Slice 3 8D dims·谁胜出未定 | 10 |
| 6 | medium | `CY._ty3.conveningPolitics` 跨 slice schema 无 fence | 2.5 ↔ 8 |
| 7 | low | `_ty3_buildMentorIndex` input/output shape 未 spec | 10 |
| 8 | low | §5.4.5 标 "三步推荐" 实是 4 步 | 2.5 |
| 9 | low | §5.4.7 dynastyInit / periodInit / customInit 数据源未定义 | 2.5 |
| 10 | low | §5.4.8 monthsPerTurn 假设 month=30 天·剧本 daysPerTurn 变量未验证 | 2.5 |
| 11 | low | §5.4.9 言官离心 decay 频率 (每 turn vs 每 month) 未明 | 2.5 |
| 12 | low | Slice 8 doc 说 "phase7 effects 已跑·我只 hook recordSeal"·但 phase6→7 调用链顺序未亲读 verified | 8 |

---

## 1·hard bug 详

### 1.1 (hard)·`_ty3_phase6_recordSeal` 未 expose

**事实** (grep verified·2026-05-23)·

```
tm-tinyi-v3.js L2770   function _ty3_phase6_recordSeal(status, ctx, detail) { ... }
                       (top-level function·strict mode)

tm-tinyi-v3.js L3363+  window._ty3_phase6_open = _ty3_phase6_open;
                       window._ty3_phase6_resolveSeal = ...
                       window._ty3_phase6_doSeal = ...
                       window._ty3_phase6_offerVerdictNote = ...
                       (但没有 window._ty3_phase6_recordSeal = ...)

grep "window\._ty3_phase6_recordSeal" *.js → 0 hit
```

**结论**·v2.1 Slice 8 §4 的 IIFE hook 模板·

```js
if (typeof window._ty3_phase6_recordSeal !== 'function') { setTimeout(tryHook, 200); return; }
```

会无限 retry·20 次后 silent 放弃·**反弹机制完全不触发**。

**修法选项**·

| | 方案 | 工时 | 风险 |
|---|---|---|---|
| **A** | sprint Slice 0 加 1 行 patch v3·L3363 之前加 `window._ty3_phase6_recordSeal = _ty3_phase6_recordSeal;`·然后 Slice 8 hook 照 v2.1 doc | +0.1d Slice 0 | 极低·v3 已暴露 30+ 函数·加 1 个一致 |
| **B** | Slice 8 hook 改 `_ty3_phase6_doSeal` (UI 入口·已暴露 L3386) | 0 | **不能**·doSeal 是 UI handler·跟 recordSeal 调用链分开·hook 拿不到 sealStatus detail |
| **C** | Slice 8 不用 IIFE hook·直接 patch tm-tinyi-v3.js 的 recordSeal body 末尾 inline append 调用 | +0.2d Slice 8 | 中·v3 文件被改 1 行·下次 v3 自身改动可能冲突 |

**推荐**·**A**·一致性 paradigm·1 行 patch v3·hook 干净。

### 1.2 (hard)·Slice 2.5 → Slice 10 顺序倒挂

**事实** (grep verified)·

```
grep "_ty3_buildMentorIndex|GM\._mentorIndex" *.js → 0 hit (runtime 不存在·全 Slice 10 新建)

v2.1 §4 实施顺序·Slice 0/1/2/2.5/3/4/4.5/5/6/7/7.5/8/8.5/9/10/11
                                ↑ 2.5 在 10 之前

v2.1 §5.4.10 (Slice 2.5 子任务 5.4.10)·
  function _ty3_suggestMenteesOf(attendees) {
    const mentees = GM._mentorIndex?.mentor?.[name] || [];  ← Slice 10 才建
    ...
  }
```

**影响**·Slice 2.5 ship 时·`GM._mentorIndex` undefined·optional chaining 不 throw·`suggestions = []`·UI 永远 0 "建议同召" — silent 功能死。Slice 10 ship 后才活·但 Slice 2.5 的 DoD #11 "mentor 联动·UI 建议同召 mentee" 在 Slice 2.5 单测时就过不了。

**修法选项**·

| | 方案 | 描述 | 工时 |
|---|---|---|---|
| **A** | **Slice 10 拆 10a/10b** | 10a (数据补 + buildMentorIndex·1d) 提前到 Slice 2.5 之前·10b (clientelism mode + 联动 UI·0.5d) 留 Slice 2.5 之后 | 0 (同总工时) |
| **B** | Slice 2.5 mentor 联动 lazy·`if (GM._mentorIndex)` guard·空时 UI 隐 mentor section·Slice 10 ship 后自动现身 | DoD #11 改为 "Slice 10 完成后追加验证" | 0 |
| **C** | 全 Slice 10 提前·但 10b 一键加召 UI 依赖 2.5 召集 modal·deadlock | × | × |

**推荐**·**A**·拆 10a/10b·拓扑正确·DoD 各自独立可验。

### 1.3 (hard)·endturn decay 接入点未定·跨 sprint 冲突

**事实**·

- v2.1 §5.4.8 民意度 decay·"按 dynasty + daysPerTurn"·**没说每 turn 哪里 hook**
- v2.1 §5.4.9 言官离心 decay·"5%/月"·**没说哪里调**
- v2.1 Slice 8 §4 函数末尾调 `_ty3_v15_decayConveningCounters()`·但这只在 "议题结案时触发"·不是 endturn — 漏空 turn

**冲突**·当下 [[project_endturn_pipeline]] sprint 进行中 (16 文件 25k LOC 改显式 6-step 管道·5-6 周)·廷议 v2.1 的 decay 落点没占位·

- 若先 ship 廷议 sprint·decay 落点必须 patch 旧 endturn pipeline·然后 endturn sprint 完成后再迁移·**2 次 patch**
- 若先 ship endturn sprint·廷议 decay 可直接挂新 pipeline 的 `crossTurn` step

**修法选项**·

| | 方案 | 描述 |
|---|---|---|
| **A** | **廷议 v2.1 加 Slice 0.5**·定义 decay 接入点契约·spec 哪个 step·延后实施 | 推荐·解锁两 sprint 独立 |
| **B** | 廷议 Slice 11 增 endturn pipeline 适配子任务 | 工时 +0.5d |
| **C** | 等 endturn sprint 完后再启廷议 v2.1 | 总工时不变·但 unblock 失败 |

**推荐**·**A**·廷议 Slice 0.5 写 contract·两 sprint 各自演化·收口在 Slice 11 verified。

---

## 2·medium issue

### 2.1 §5.4.2 "取最严" 实是 3 态 cascade

doc 写·

```
6 层叠加·取最严
...
实际取严逻辑·若任 1 层判 "不召" → 不召·否则·若任 1 层判 "必召" → 必召·否则取最高 category
```

这不是 "取最严" 是 **3 态 priority cascade**·`不召 > 必召 > 取严`。语义文字应改·避免实施者按 "取最严" 写出错 logic。

**修法**·v2.1 doc §5.4.2 caption 改 "3 态 priority cascade (不召 cancel·必召 elevate·其他 取严)"·伪代码·

```js
function _ty3_calcEligibility(ch, topic, scenario) {
  const layers = [
    _ty3_calcEligibilityByRank(ch),
    _ty3_calcEligibilityByLocation(ch),
    _ty3_calcEligibilityByStatus(ch),
    _ty3_calcEligibilityByDynasty(ch, scenario, topic),
    _ty3_calcEligibilityByPartyTaboo(ch, topic),
    _ty3_calcEligibilityByPrestige(ch)
  ].filter(Boolean);
  if (layers.some(l => l.category === '不召')) return { category: '不召', layer: layers.find(l => l.category === '不召').layer };
  if (layers.some(l => l.category === '必召')) return { category: '必召', layer: layers.find(l => l.category === '必召').layer };
  const order = ['可召', '罕召'];  // 取严 = order index 高的
  let max = '可召';
  for (const l of layers) if (order.indexOf(l.category) > order.indexOf(max)) max = l.category;
  return { category: max, layer: 0 };
}
```

### 2.2 clientelism 70% 附议 vs 8D dims 谁胜出

§5.4.10 Slice 10 clientelism·"NPC 看 mentor 极支/极反·70% 附议"
§4 Slice 3·"8D dims 接入 stance"·NPC 按 dims 算 stance

**冲突场景**·

- mentor 极反·dims (cunning=0.9, honor=0.2) → 极支 (利益派)
- 70% 附议是 mentor 还是 dims·谁胜

**修法**·v2.1 §5.4.10 加 "clientelism vs dims 优先级"·

```
优先级·dims (loyalty>80 主君) > dims (傲性 boldness>0.8) > mentor 极支/反 > dims 默认
```

或更简·dims 算出极反时·mentor 极支只能让 NPC 沉默 (mode 'pivot')·不能反转 stance。

### 2.3 `CY._ty3.conveningPolitics` 跨 slice 无 schema fence

Slice 2.5 写·`CY._ty3.conveningPolitics = { tilt, crossPartyRatio, missedHighRank }`
Slice 8 读·`CY._ty3?.conveningPolitics?.tilt`

两 slice 各自实施时若字段名漂 (`tilt` → `tiltCategory`)·silent 失效。

**修法**·v2.1 §5 加 "5.x·shared schema fence" section·集中列·

```
CY._ty3.conveningPolitics  ←  Slice 2.5 write·Slice 8 read
  tilt:                    'balanced' | 'oneParty' | 'fullOneParty' | 'megaCeremony'
  crossPartyRatio:         number 0-1
  missedHighRank:          string[]
  
GM._convening_民意度       ←  Slice 2.5 write·Slice 4/8/UI read
  number -100..+100
  
GM._convening_言官离心     ←  Slice 2.5 write·Slice 11 + UI read
  number 0..100
  
GM._mentorIndex            ←  Slice 10a write·Slice 2.5/10b read
  { mentor: Record<name, name[]>, mentee: Record<name, name> }
  
GM._pendingMartyrEvents    ←  Slice 8 write·Slice 11 verify
  Array<{ npc, turn, reason }>
  
GM._pendingTinyiTopics     ←  Slice 2.5 write·existing endturn pipeline read
  Array<{ topic, proposer, urgency, turn }>
```

---

## 3·low issue (Slice spec 措辞 / 数据源 / 默认值)

### 3.1 `_ty3_buildMentorIndex` shape 未 spec

Slice 10 §5.4.11 只给数据·没 spec helper 输入输出。补·

```js
function _ty3_buildMentorIndex(chars) {
  const idx = { mentor: {}, mentee: {} };
  for (const ch of chars) {
    if (!ch.mentees) continue;
    idx.mentor[ch.name] = ch.mentees;
    for (const m of ch.mentees) idx.mentee[m] = ch.name;
  }
  return idx;
}
```

### 3.2 §5.4.5 "三步推荐" 实是 4 步

doc 自己注释 1/2/3/4·caption 改 "四步推荐"。

### 3.3 §5.4.7 dynastyInit / periodInit / customInit 数据源未定义

补·

- `dynastyInit` ← `DYNASTY_POPULATION_CONFIDENCE_INIT[scenario.dynasty]`
- `periodInit` ← `scenario.tinyi.populationConfidenceInit` (剧本配·已示例 -20)
- `customInit` ← `0` (default)

### 3.4 §5.4.8 monthsPerTurn 假设 month=30 天

`_getDaysPerTurn()` 已存·但 v3 helper·sprint 必复用而非自建。`/ 30` 是近似·正确写法·

```js
const monthsPerTurn = _getDaysPerTurn() / 30.4375;  // 365.25/12
```

或不假设·直接·

```js
const turnsPerMonth = 30 / _getDaysPerTurn();
GM._convening_民意度 *= Math.pow(baseRate, 1 / turnsPerMonth);
```

### 3.5 §5.4.9 言官离心 decay 5%/月·谁 hook 哪 step

跟 hard bug #3 (endturn 接入点) 同一类·Slice 0.5 contract 一并定。

### 3.6 Slice 8 doc 说 phase7 effects 已跑·调用链未亲读

v2.1 §4 Slice 8 §·"v3 phase6 / phase7 effects 已跑·只查不动" — 但 `_ty3_phase6_recordSeal` 是否在 `_ty3_phase7_reviewFollowUp` 之前·doc 没 verify。需 grep 调用链·

```
_ty3_phase6_doSeal → _ty3_phase6_resolveSeal → _ty3_phase6_recordSeal → ???
_ty3_phase7_reviewFollowUp 从哪 trigger·跟 phase6 时序
```

**TBD**·Slice 0.5 contract 一并 verify。

---

## 4·建议的 sprint 调整

1. **加 Slice 0.5** (0.5d·prep)·定义 endturn decay contract + shared schema fence + verify phase6/7 调用链
2. **Slice 10 拆 10a (1d·提前) + 10b (0.5d·留原位)**
3. **Slice 8 工时 +0.1d** (patch v3 expose + 验证 hook)
4. **Slice 2.5 工时 +0.1d** (lazy guard mentor 联动·DoD 改 "Slice 10b 后追验")
5. **§5.4.2 / 5.4.5 / 5.4.7 / 5.4.8 doc 措辞修** (Slice 0 顺手做·30min)

总工时变化·**+0.7d** (Slice 0.5 + Slice 8 / 2.5 微调)·原 23-26d → **23.7-26.7d**·可忽略。

---

## 5·DoD 影响

| Slice | 原 DoD 数 | 改后 |
|---|---|---|
| Slice 2.5 | 12 项 | 11 项 (#11 mentor 联动 lazy·迁 10b)·新增 1 项 (民意度 decay 走 Slice 0.5 contract) |
| Slice 8 | 8 项 | 9 项 (新增 "Slice 0 patch v3·`window._ty3_phase6_recordSeal` expose verified") |
| Slice 10 | 4 项 | 拆 10a (3 项·数据 + buildMentorIndex + 反向索引) + 10b (2 项·clientelism + 联动 UI) |
| 新 Slice 0.5 | - | 4 项 (decay 接入契约 + schema fence + phase6/7 调用链 verified + window expose 1 行) |

---

## 6·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **批准修订·写入 v2.2** | 把 12 条修订并入新 v2.2 sprint doc·更新 §4 顺序 + §5 加 schema fence + 加 Slice 0.5 spec·然后等开工信号 |
| **B** | 先讨论再决定 | 12 条 review·user 表态后再改 doc |
| **C** | 只做 hard bug (1-3)·low 留 implementation phase 再改 | 减少 doc 来回 |
