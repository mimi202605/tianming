# 廷议·五轮 audit·Slice 3 + 7.5 + §6 数据契约 + §14 v3 亮点

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "B·进五轮"·v2.5 写完后剩余 slice + 跨 slice schema audit
**方法**·亲读 Slice 3 (stance dims) + 7.5 (动作 ceremony) + §6 schema + §14 11 项亮点·grep verify

---

## TL;DR·2 hard + 3 medium + 2 low

| # | 严重 | 问题 | slice |
|---|---|---|---|
| 1 | **hard** | Slice 3 工时大幅低估·v3 stance 现 LLM-driven·改 dims-driven 是 paradigm change·非 "加 helper"·1.5d 估·实际 ≥2.5d | 3 |
| 2 | **hard** | §6 schema internal contradiction·`affinity: { toEmperor }` (object) 跟 v2.3 Slice 8 patch (number) 自相矛盾 | §6 |
| 3 | medium | doc 字段名漂·`_inPrison` → 应是 `_imprisoned` (grep verified 1 vs 44 hit) | 2.5·§6 |
| 4 | medium | `_dingyou` (丁忧) runtime 0 hit·Slice 2.5 §5.4.2 8 类 status 假设存在·实际要新建 | 2.5 |
| 5 | medium | §6 `GM._chronicleTracker[]` 字段名错·应是 `GM._chronicleTracks[]` (复数·verified L3865) | §6 |
| 6 | low | v3 phase14 用 `chaoyi_pending` (朝议) 而非 `tingyi_pending` (廷议) 类型·user "廷议待落实卡缺" 报告可能源头 | 11 |
| 7 | low | Slice 7.5 工时 0.8d 略低估·按子任务实际 ~1.0-1.1d (6 动作 + 5 ceremony + integration test) | 7.5 |

---

## 1·hard 详

### 1.1 (hard)·Slice 3 stance paradigm change·工时低估

**事实** (grep verified)·

```
tm-tinyi-v3.js stance 计算·
  L1732  CY._ty3.stances[c.name] = { current: 'neutral', confidence: 0 }
  L1787  CY._ty2.stances[n] = { current: 'neutral', initial: 'neutral', locked: false, confidence: 0 }
  L1937  CY._ty2.stances[name].current = r.stance     ← LLM-driven·r 来自 _ty2_genOneSpeech JSON return

tm-chaoyi-tinyi.js _ty2_genOneSpeech L348  prompt 让 LLM 自己定 stance·
  '返回 JSON·{"stance":"极力支持/支持/...","confidence":0-100,"line":"..."}'

grep "_ty3_inferStance|_ty3_dimsFromTraits|_ty3_dimsFromKeywords|aggregateDims" web/tm-tinyi-v3.js → 0 hit
```

**结论**·v3 stance **现在是 LLM-driven**·**非** dims-driven。Slice 3 要做的不是"加 helper"·是·

- (A) 改 stance paradigm·dims 算 stance·LLM 只生成 line (不返 stance)
- (B) 保留 LLM stance + dims 作 prior bias·prompt 注入"你的倾向是 X (dims 算)·可以保留或反转"
- (C) hybrid·初始 stance 用 dims·LLM 可调整·confidence 由 dims 给

Slice 3 doc 没说哪种。工时按 helper + 接入估 (1.5d)·实际工时·

| 子任务 | 工时 |
|---|---|
| `_ty3_dimsFromTraits` (按 traitId → 8D vector·全 14 trait 映射) | 0.4d |
| `_ty3_dimsFromKeywords` (fallback B·已 spec §5.5.6·~30 keyword regex) | 0.3d |
| `_ty3_getDims` 调度 (aggregateDims / fallback A / fallback B) | 0.1d |
| `_ty3_inferStance(ch, topicTags, topicText)` 新建·按 dims × topic-tag 算 stance + intensity | 0.5d |
| **stance paradigm decision** (跟 user 讨论 A/B/C) | **0.3d** |
| **_ty2_genOneSpeech prompt 改** (按 paradigm 决定·去 stance return / 加 prior bias / hybrid) | **0.5d** |
| smoke·5 剧本测·≥95% 命中 aggregateDims / fallback A·fallback B 准确率 ≥85% | 0.4d |
| stance 分布·`极支+极反` ≥ 20% (避全中立) verify | 0.2d |
| **小计** | **~2.7d** (v2.5 +1.2d) |

**修法**·

- 工时 1.5d → **2.5-3.0d**
- 加子任务 3.0·"stance paradigm decision (跟 user 讨论 A/B/C)"·**先讨论再实施**
- DoD 加 "stance paradigm 锁定·doc 写明 A/B/C"

### 1.2 (hard)·§6 schema affinity 仍写 object·跟 Slice 8 v2.3 修矛盾

**事实**·

```
v2.5 §6 L2943·
  affinity: { toEmperor },          // 反弹层用

v2.3 Slice 8 patch L1045 (v2.3 修)·
  // v2.3 修·ch.affinity 是 number (对皇帝)·非 object·禁 .toEmperor 嵌套
  npc.affinity = Math.max(0, (npc.affinity || 50) - finalRebound * 0.6);

runtime verified·
  tm-endturn-apply.js L3936  _targetCh.affinity = (_targetCh.affinity || 50) + 5;
  ... 全 codebase 用 number·非 object
```

**结论**·§6 schema 没跟 Slice 8 v2.3 修同步·**doc internal contradiction**·实施者照 §6 写 `npc.affinity.toEmperor = ...` 会撞 v2.3 修过的 bug。

**修法**·§6 L2943 改·

```
affinity: 50,                       // number·对皇帝·v3 phase6/7 + Slice 8 反弹写
```

加注释说明·"非 object·不要 `.toEmperor` 嵌套·v2.3 修 Slice 8 patch 已 enforced"。0 工时。

---

## 2·medium 详

### 2.1 (medium)·`_inPrison` vs `_imprisoned` 字段名漂

**grep verified**·

```
runtime 实际·
  _imprisoned     44 hit  (tm-wendui-prison.js·tm-tinyi-v3.js·etc·主用)
  _inPrison        1 hit  (旧字段·几乎死)

v2.5 doc 用·
  §5.4.2 L2166  ch._inPrison           → '不召'·入狱·走狱中问对
  §6 L2939      _inPrison, _exiled, _dingyou, _sick, _retired, _fled, _missing,
```

**修法**·全替换 doc 内 `_inPrison` → `_imprisoned`·grep 2 处·30s。

### 2.2 (medium)·`_dingyou` (丁忧) 字段 runtime 0 hit

**grep verified**·

```
grep "_dingyou" web/*.js → 0 hit
```

v2.5 §5.4.2 L2167 列 8 类状态·`_dingyou` (丁忧·居丧 27 月) 是其中之一·**runtime 不存在**。

**修法 (2 选)**·

- (A) Slice 2.5 加新建 `_dingyou` 字段·补到死亡 hook + scenario init·~0.1d
- (B) doc 删此 status·改 7 类·缺失"丁忧"靠 `_sick` (告丧假) 代替

**推荐**·**A**·`_dingyou` 是儒家政治史关键·应建。Slice 2.5 子任务表加 2.5.11 (新建 _dingyou 字段) +0.1d·或挪到 Slice 1 一并补字段。

### 2.3 (medium)·`GM._chronicleTracker[]` vs `GM._chronicleTracks[]` 字段名错

**grep verified**·

```
runtime·GM._chronicleTracks (复数·tm-tinyi-v3.js L3378·L3865·tm-chronicle-tracker.js L10·L41)
doc §6 L2881·GM._chronicleTracker[] (单数·错)
```

**修法**·doc §6 L2881 改·`GM._chronicleTracker[]` → `GM._chronicleTracks[]`。0 工时。

---

## 3·low 详

### 3.1 (low)·v3 phase14 用 chaoyi_pending 而非 tingyi_pending

**事实** (verified)·

```
tm-chronicle-tracker.js header·
  tingyi_pending / chaoyi_pending —— 待落实的朝议/廷议（需外部调 upsert）
  (两种类型并列·语义 朝议 vs 廷议)

tm-tinyi-v3.js L3690 (廷议 phase14)·
  type: 'chaoyi_pending',    ← 用 chaoyi (朝议) 类型·不是 tingyi
  sourceType: 'chaoyi_pending',

tm-office-panel.js L1256·sortOrder·
  ['keju','edict','project','pending_memorial','faction_treaty','npc_action',
   'tingyi_pending','chaoyi_pending','dynasty_event','other'];
  (UI sort 同时支持两类·语义 separate)
```

**结论**·v3 phase14 (廷议) 写 chronicle 用 `chaoyi_pending` (朝议) 类型·**语义错位**。UI 渲染时·若按类型 label 显·user 看到的是"朝议待落实"·不是"廷议待落实"·这可能是 user 当时报告 "廷议待落实卡缺" 的真原因——卡在·

- v3 廷议结案·写 `chaoyi_pending`·UI 显"朝议"卡
- user 期望"廷议"卡·实际类型名错·按"廷议"找不到

**修法 (3 选)**·

- (A) v3 phase14 改 type 为 `tingyi_pending`·UI 自动显"廷议"卡 (Slice 11 verify 子任务)
- (B) 保留 `chaoyi_pending`·UI 渲染加 alias 显"廷议"·临时绕开
- (C) 两 type 并存·v3 phase14 同时 upsert 2 entry (chaoyi_pending + tingyi_pending·alias)·UI 不动·redundant

**推荐**·**A**·1 行改 (L3690 + L3692)·语义最对·Slice 11 verify 子任务的复查目标。+0.05d。

### 3.2 (low)·Slice 7.5 工时略低估

**子任务实际**·

| 子任务 | 实际工时 | doc |
|---|---|---|
| 6 动作 trigger + state (廷杖/削籍/摘除/转部议/更议/革职) | 0.4d | 0.3d |
| 5 ceremony CSS (锤击/黑屏/简短/sound/字幕) | 0.3d | 0.3d |
| 6 pendingEvents 入队 + schema (跟 §5.4.15 schema fence 对齐) | 0.15d | 0.1d |
| prison 集成·`_imprisoned=true` + `_imprisonReason` + `_imprisonedTurn` (廷杖入诏狱) | 0.1d | (隐) |
| atmosphere 字段更新 (削籍 → 全场 cautious) | 0.05d | (隐) |
| smoke + integration test | 0.1d | 0.1d |
| **小计** | **~1.1d** | **0.8d** |

**修法**·Slice 7.5 工时 0.8d → **1.0d** (+0.2d·prison 集成 + atmosphere 字段)。子任务表补 2 项。

---

## 4·建议的 v2.5 → v2.6 调整

| # | 改动 | 工时影响 |
|---|---|---|
| 1 | **Slice 3 工时 + paradigm decision**·1.5d → 2.5-3.0d·加子任务 3.0 (paradigm A/B/C 讨论) + 3.5 (prompt 改) | **+1.0-1.5d** |
| 2 | §6 affinity number 单值 + 注释 enforced | 0 |
| 3 | doc 全替换 `_inPrison` → `_imprisoned` (2 处) | 0 |
| 4 | Slice 2.5 / Slice 1 加 `_dingyou` 新建 | +0.1d |
| 5 | §6 `GM._chronicleTracker[]` → `GM._chronicleTracks[]` | 0 |
| 6 | Slice 11 verify 子任务·`chaoyi_pending` → `tingyi_pending` 改名 | +0.05d |
| 7 | Slice 7.5 工时 + 2 子任务 (prison / atmosphere) | +0.2d |
| **合计** | | **+1.35-1.85d** |

**v2.5 总工时·22.4-25.7d → v2.6·23.75-27.55d**·近 v1.5 原 23-26d·更准。

---

## 5·DoD 影响

| Slice | v2.5 DoD | v2.6 改后 |
|---|---|---|
| Slice 3 | 4 项 | 5 项 (新加 "stance paradigm 锁定·A/B/C") |
| Slice 7.5 | 3 项 | 4 项 (新加 "prison 集成·_imprisoned + _imprisonReason + _imprisonedTurn 写入") |
| Slice 11 | 6 项 | 6 项·#3 加 "chaoyi_pending → tingyi_pending 改名 verify" |
| Slice 2.5 (或 1) | 13 项 | 14 项 (新加 "_dingyou 字段建·8 类 status 全 verified") |

---

## 6·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **批准·写 v2.6** | 7 处修订·**含 Slice 3 paradigm decision A/B/C** — 这是先讨论后写最佳 |
| **B** | 先 Slice 3 stance paradigm 讨论·user 选 A/B/C·再写 v2.6 | doc 改动 deps 在 paradigm decision·先选再写 |
| **C** | 不再 audit·按 v2.5 开工 | 2 hard 接受·implementation 时撞墙·Slice 3 paradigm 实施者自决可能差·Slice 8 affinity internal contradiction 实施者必撞 |
| **D** | 全 audit 总结 + 入 memory·写 sprint-ready 摘要 | 5 轮 audit 总计 37 处 finding·写一份给后续 implementer 看的总结 |
