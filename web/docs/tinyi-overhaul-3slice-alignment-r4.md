# 廷议·四轮 audit·Slice 0 / 0.5 / 1 / 2 / 11

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "A·进四轮"·v2.4 写完后 audit·setup + 收口 5 slice
**方法**·亲读 v2.4 doc + grep v3 现状·重点·gate paradigm / ChronicleTracker API / tool script / chars 数据

---

## TL;DR·2 hard + 2 medium + 2 low

| # | 严重 | 问题 | slice |
|---|---|---|---|
| 1 | **hard** | v3 **不是 OFF·当前已是 active default**·v2.4 TL;DR "gate=false" 0 hit·v3 L1534 IIFE 加载就无条件接管·灰度 paradigm 错位 | 0·TL;DR |
| 2 | **hard** | Slice 11 chronicleTracker 桥接 patch broken + 任务无效·`ChronicleTracker.push` 不存在 (API 是 add/upsert)·**v3 phase14 已调 `upsert({type:'chaoyi_pending'})`·桥接没断** | 11 |
| 3 | medium | Slice 1 tool 路径错·`web/tools/calibrate-derived-health.js` 不存在·实际在 `web/scripts/` | 1 |
| 4 | medium | Slice 10a tool `web/tools/fill-tianqi-mentors.js` 不存在·doc 写 "复用"·实际全新建 | 10a |
| 5 | low | Slice 1 doc 写 "晋 (1) / 大明 (1)" → 实际 5 剧本中 2 个 = 0 chars (空剧本)·总 121 chars 非 ~123 | 1 |
| 6 | low | Slice 0 patch 1 抄 v3 现有 L1545-1552 暗示 "新加"·实际是 "改 v3 现有 override" | 0 |

---

## 1·hard 详

### 1.1 (hard)·v3 当前 active default·非 OFF

**事实** (grep verified)·

```
grep "useTinyiV3|P.conf.useTinyiV3|tinyiV3" web/*.js → 0 hit (整个 codebase 无此 flag)

tm-tinyi-v3.js L1534-1556  (function _ty3_overrideTinyiRoute() { ... })()
  L1545  window._cy_pickMode = function(mode) {
  L1546    if (mode === 'tinyi') {
  L1547      if (typeof CY !== 'undefined') CY.mode = mode;
  L1548      _ty3_open();              // ← 当前·无条件走 v3
  L1549      return;
  L1550    }
  L1551    return orig.apply(this, arguments);
  L1552  };

tm-chaoyi.js L353  if (mode === 'tinyi')  { _ty2_openSetup(); return; }
  ← v2 入口·但被 v3 L1545 override 永远不可达
```

**vs v2.4 TL;DR 写**·

```
基础·`tm-tinyi-v3.js` 3942 行·**已是完整 8 阶段政治模拟 system**·gate=`P.conf.useTinyiV3=false`
                                                                      ↑↑ 0 hit·不存在
```

**结论**·v3 不是 "被 gate off 等激活"·**已是当前 active default**·v2 (`_ty2_openSetup`) 是 dead code 永远走不到。

**整 sprint paradigm 影响**·

v2.4 doc 假设 (错)·

```
当前·v2 active·v3 等激活
sprint 路径·Slice 0 加 gate (默认 v2)·测 v3·全绿后反转默认 true
```

实际状态 (verified)·

```
当前·v3 已是 active·v2 dead code
sprint 路径·两 paradigm 候选·
  A·sprint 改 v3·万一砸了加 gate 开关 fallback 到 dead-code v2·但 v2 可能本身就 broken (多年没维护)
  B·v3-only paradigm·删 v2 fallback·sprint 改 v3·砸了就回滚 commit
  C·sprint 前先 verify v2 是否能跑 (临时 enable v2 入口测一下)·若 v2 fully broken → 走 B
```

**风险**·按 v2.4 doc 默认 v2 paradigm·sprint 砸时 toggle 关 v3·走 v2·若 v2 broken·**廷议彻底死**·user 无法用任何路径触发廷议。

**修法**·

1. **v2.4 doc TL;DR 改**·"v3 当前已是 active·v2 dead code (可能 broken)"
2. **Slice 0 patch 1 改**·先 verify v2 还能跑·再决定 sprint 期间 paradigm·若 v2 broken·走 v3-only·去掉 toggle (UI 也去掉)
3. **Slice 0 加新子任务 0.0** (0.3d)·"verify v2 廷议入口能否单跑"·临时 force `_cy_pickMode = orig` 跑 5 case·有 fatal error → v2-only paradigm 死亡·sprint 走 v3-only

**工时影响**·+0.3d (Slice 0 新子任务) 或 -0.1d (去掉 toggle UI 实现)·**净 +0.2d** 或更高。

### 1.2 (hard)·Slice 11 chronicleTracker 桥接 patch broken + 任务无效

**事实** (grep verified)·

```
tm-chronicle-tracker.js L22-30  API·
  ChronicleTracker.add(track)            ← 新增 (自动 id)
  ChronicleTracker.update(id, updates)   ← 更新现有
  ChronicleTracker.upsert(track)         ← 按 sourceType+sourceId 幂等
  ChronicleTracker.complete(id, result)  ← 标记完成
  ChronicleTracker.abort(id, reason)     ← 中止
  ChronicleTracker.getVisible() / getAll() / getAIContextString() / tick()

grep "ChronicleTracker\.push" web/*.js → 0 hit (push 不存在·doc 假设错)

tm-tinyi-v3.js L3648-3667  _ty3_phase14_recordChaoyiSummary 已调·
  _ty3_syncChaoyiChronicleTrack({
    trackId: item.chaoyiTrackId,
    topic: topic, ...
  });

tm-tinyi-v3.js L3684-3713  _ty3_syncChaoyiChronicleTrack·
  ChronicleTracker.upsert({type: 'chaoyi_pending', sourceType: 'chaoyi_pending', ...})
  ← 桥接已存在·"廷议待落实" 卡入 ChronicleTracker
```

**vs Slice 11 doc L1364-1388 patch**·

```js
// "_ty3_phase14_recordChaoyiSummary 末尾·L3676 之前追加·v2.1 改·调 ChronicleTracker.push"
if (typeof ChronicleTracker !== 'undefined' && typeof ChronicleTracker.push === 'function') {
  ChronicleTracker.push({ ... });   // ← .push 不存在·typeof === 'function' 永 false·patch silent no-op
}
```

**结论**·Slice 11 桥接 patch·

- 调用名错 (`push` 不存在·应是 `add` 或 `upsert`)
- 即便改成 `add` / `upsert`·**v3 phase14 已经在调** (L3648)·重复调会创建 2 个 entry
- doc 标注的 "桥接断" 是 **事实错误**·桥接没断

**Slice 11 DoD #3** ("chronicleTracker 桥接·廷议待落实 卡入 _chronicleTracker") **已自动满足**·无需 patch。

**修法**·

1. **删 Slice 11 §11.3 chronicleTracker 桥接 patch** (1 段 ~25 行)·改 DoD #3 为 "verify v3 phase14 已调 _ty3_syncChaoyiChronicleTrack → ChronicleTracker.upsert(type='chaoyi_pending')·smoke 5 case·GM._chronicleTracks 含 chaoyi_pending entry"
2. **追查 user 当初说"廷议待落实卡缺"是不是别的问题**·可能·
   - (a) UI 渲染 bug·`chaoyi_pending` type 没被 chronicle UI 取来显
   - (b) `type: 'chaoyi_pending'` (snake_case) vs `'tinyi-pending'` (kebab) 不一致·UI filter 漏
   - (c) 是另一个 chaoyi 系统的 bug·跟 ChronicleTracker 无关
3. **Slice 11 工时**·1.8d → **1.5d** (-0.3d·桥接 patch 去掉)·DoD 7 项 → 6 项

**优先修**·#2 验证 user 当时报告的真原因·若是 UI 渲染 bug → 加新子任务 (~0.3d)·若是其他 → 不动 Slice 11。

---

## 2·medium 详

### 2.1 (medium)·Slice 1 tool 路径错

**事实**·

```
ls web/tools/calibrate-derived-health.js → No such file
ls web/scripts/calibrate-derived-health.js → exists
```

Slice 1 doc·"跑 `web/tools/calibrate-derived-health.js`"·**路径错**·应是 `web/scripts/`。

**修法**·doc 改路径·0 工时。

### 2.2 (medium)·Slice 10a tool 不存在

**事实**·

```
ls web/tools/fill-tianqi-mentors.js → No such file (全新建)
ls web/tools/fill-shaosong-traits.js → exists (Slice 1 复用 OK)
```

Slice 10a doc 说·"工具脚本·`web/tools/fill-tianqi-mentors.js`·一次性 batch fill ~30 行·验证 `smoke-mentor-coverage.js`"。措辞 "工具脚本" 暗示已存·实际全新建。

**修法**·Slice 10a doc 改·"**新建** `web/tools/fill-tianqi-mentors.js` (模仿 `fill-shaosong-traits.js` paradigm·~80 行) + 新建 `smoke-mentor-coverage.js`"·工时表加 10a.1.5 子任务 (~0.1d)·总 1.0d → **1.1d**。

---

## 3·low 详

### 3.1 Slice 1 doc "晋 (1) / 大明 (1)" 数字错

**事实** (verified)·

```
scenarios/崇祯.json            45 chars·0 traitIds·要补
scenarios/挽天倾：崇祯死局.json  44 chars·0 traitIds·要补
scenarios/111.json             32 chars·0 traitIds·要补
scenarios/晋.json              0 chars (空剧本)·doc 写 "1" 错
scenarios/大明.json            0 chars (空剧本)·doc 写 "1" 错
scenarios/天启七年·九月（官方）   203 chars·200 traitIds·已 98% 覆盖
scenarios/绍宋·建炎元年八月（官方）98 chars·98 traitIds·100% 覆盖
```

总要补·**121 chars** (非 doc ~123)·全在 3 剧本 (崇祯/挽天倾/111)。

**修法**·Slice 1 doc 改·

```
- 批跑·崇祯 (45) / 挽天倾 (44) / 111 (32) / 晋 (1) / 大明 (1)·共 ~123 chars
+ 批跑·崇祯 (45) / 挽天倾 (44) / 111 (32)·共 121 chars·**晋 (0) / 大明 (0) 空剧本跳过**·官方剧本 (天启 200/203·绍宋 98/98) 已覆盖
```

工时不变 1.5d。

### 3.2 Slice 0 patch 1 措辞模糊

doc patch 1 抄了 v3 L1545-1552 现有 override·暗示 "要加的 patch"·实际应是 "改 v3 现有 override·加 v3On gate check"。

**修法**·doc 改·"**改** tm-tinyi-v3.js L1545·原 `if (mode === 'tinyi') { _ty3_open(); return; }` 加 `var v3On = ...; if (v3On) { _ty3_open(); return; }` gate"。

---

## 4·建议的 v2.4 → v2.5 调整

| # | 改动 | 工时影响 |
|---|---|---|
| 1 | **v3 gate paradigm 重写**·Slice 0 加 0.0 子任务 verify v2·决定 paradigm A/B/C | **+0.2-0.3d** |
| 2 | **Slice 11 删 chronicleTracker patch + DoD #3 改 verify**·若需复查 UI 渲染 bug 加 +0.3d | **-0.3d 或 0d** |
| 3 | Slice 1 calibrate-derived-health.js 路径修 | 0·doc 改 |
| 4 | Slice 10a fill-tianqi-mentors.js 新建说明 + 子任务 | +0.1d |
| 5 | Slice 1 晋/大明 数字修·去掉错统计 | 0·doc 改 |
| 6 | Slice 0 patch 1 措辞修·"加" → "改" | 0·doc 改 |
| **合计** | | **+0.0 - +0.3d** |

**v2.4 总工时·22.4-25.4d → v2.5·22.4-25.7d**·几乎不变。

**最大影响·#1 paradigm 重写**·非工时数字·而是·若 v2 broken·去掉整套灰度 + toggle UI·Slice 0 / Slice 11 都要重写。

---

## 5·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **批准·写 v2.5 + 先 verify v2 状态** | 6 处修订·#1 必须先 verify v2·5 分钟 spot test·决定 paradigm A/B/C·然后写 v2.5 doc |
| **B** | 只修 doc·不 verify v2 (按 v2.4 paradigm) | 风险·sprint 砸时 toggle fallback v2·可能 v2 已 broken·廷议彻底死 |
| **C** | 进五轮·Slice 3·6·8.5·9·12 (剩余未 audit slice) | 已 audit·9/17 slice (剩 8)·还有 1-2 隐坑可能 |
| **D** | 不再 audit·按 v2.4 开工 | 2 hard 接受·implementation 时撞墙再修 |
