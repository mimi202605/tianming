# 廷议·六轮 audit·§5.1 玩家发言 + §10 smoke 表 + §14 v3 亮点

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "B·进六轮"·v2.6 写完后剩余 shared design + smoke + 亮点 audit
**方法**·亲读 §5.1 phase 分发 + §10 smoke 10 case + §14 11 项亮点·grep verify runtime / scenario data

---

## TL;DR·4 hard + 1 medium

| # | 严重 | 问题 | 区域 |
|---|---|---|---|
| 1 | **hard** | `CY._ty3.currentPhase` v3 只 init 一次 'opening'·后续从不更新·Slice 4.5 §5.1.3 8 phase 分发永远 fallback default | Slice 4.5 |
| 2 | **hard** | smoke 10 议题 topic 跟剧本数据完全错位·"九边粮饷/南迁/钞法/盐法/诛戮魏珰" 0/10 在 scenarios 存在·DoD #8 不能跑 | §10 |
| 3 | **hard** | smoke scenario id 5/5 全错·`tianqi-7-9` 实际 `sc-tianqi7-1627`·`chongzhen-1` 实际 `scn_1774945158308`·等 | §10 |
| 4 | **hard** | 5 剧本无 1 有 `scenario.tinyi.convening` config·Slice 2.5.5 朝代差异化全要新建·Slice 1 应一并补 | Slice 1·2.5.5 |
| 5 | medium | 崇祯.json vs 挽天倾.json·剧本 id 重复 `scn_1774945158308`·data bug | scenarios |

**verify pass**·§14.A 党派进化 4 API (_ty3_partySpawn / Dispose / EvolutionTick / GM._partyEvolutionState) + §14.G `TM.ClassEngine.applyPartyOutcomeToClasses` + §14.B NpcMemorySystem.remember + ChronicleTracker.upsert·这 4 项 v3 亮点 spot-check 全对。

---

## 1·hard 详

### 1.1 (hard)·`CY._ty3.currentPhase` 不更新·phase 分发失效

**事实** (grep verified)·

```
tm-tinyi-v3.js L1780  currentPhase: 'opening',    ← init 1 处
grep "_ty3.currentPhase\s*=" web/tm-tinyi-v3.js → 0 hit (后续从不 update)
```

**Slice 4.5 §5.1.3 假设**·

```js
switch (CY._ty3.currentPhase) {
  case 'preAudit':  return _ty3_onSpeakPreAudit(text);
  case 'seating':   return _ty3_onSpeakSeating(text);
  case 'debate':    return _ty3_onSpeakDebate(text);
  case 'confront':  return _ty3_onSpeakConfront(text);
  case 'vote':      return _ty3_onSpeakVote(text);
  case 'archon':    return _ty3_onSpeakArchon(text);
  case 'draft':     return _ty3_onSpeakDraft(text);
  case 'seal':      return _ty3_onSpeakSeal(text);
  default:          return _ty3_onSpeakDebate(text);  // ← 实际所有玩家输入都走这
}
```

**结论**·`currentPhase === 'opening'` 不在 8 case 内·永远 fallback default → debate handler。**preAudit / seating / vote / archon / draft / seal 6 handler 全失效**。

**修法 (3 选)**·

| | 方案 | 工时 |
|---|---|---|
| **A** | Slice 4.5 加 8 处 v3 phase update·每个 phase enter 时·`CY._ty3.currentPhase = 'preAudit' \| 'seating' \| ...` | +0.3d |
| **B** | `_ty3_onPlayerSpeak` 改自己推断 phase·按 CY._ty3 state (preAuditModal open? debateInProgress? archonShown? etc.) | +0.2d |
| **C** | 简化·只 default debate handler·删 7 phase 特化 (跟 v3 模拟力大幅缩) | -0.5d |

**推荐**·**A**·完整·每 phase 切换时同步 currentPhase·deterministic·测试性好。Slice 4.5 工时 1.5d → **1.8d**。

### 1.2 (hard)·smoke 议题跟剧本数据全错位

**事实** (verified)·

```
v2.6 §10.1 SMOKE_CASES 议题 vs 剧本实际·
  '盐法改革议'   →  天启.json 0 hit
  '诛戮魏珰余孽' →  天启.json 0 hit (但 '魏忠贤' 18 hit)
  '九边粮饷'    →  崇祯.json 0 hit
  '袁崇焕用'    →  崇祯.json 'Yuan Chonghuan' 18 hit (但无议题文本)
  '南迁议'      →  挽天倾.json 0 hit
  '兵部尚书廷推' →  挽天倾.json '兵部尚书' 15 hit (字段·非议题)
  '主战主和'    →  绍宋.json 5 hit ✓
  '黄潜善去留'  →  绍宋.json '黄潜善' 65 hit (人名·非议题文本)
  '钞法'        →  111.json 0 hit
  '勋戚加封'    →  111.json 0 hit

10/10 议题 topic 在 scenario data 不直接存在·只有 '主战主和' 有部分匹配
```

**结论**·smoke "10 case 全 PASS" DoD 不能用现成 scenario events 跑·要么·

- (A) Slice 11 smoke 自己 fabricate 议题 (跟剧本人物 + 时代背景一致就行·非事件)
- (B) 修 SMOKE_CASES 议题清单·按各剧本 events / 历史议题改 (例·天启 → "整顿东厂"·崇祯 → "查抄魏珰家产")
- (C) Slice 1 / 剧本数据扩·加 chaoyi.tinyi.topics 数组·smoke 从那取

**推荐**·**A** + 部分 **B**·sprint 不动剧本 data·smoke 自己 fabricate 议题 + 改部分明显错位的 topic 用近义。Slice 11 加子任务 11.0·"fabricate 10 议题 topic·跟剧本时代 / 人物对齐" (~0.2d)。

### 1.3 (hard)·smoke scenario id 全错

**事实** (verified)·

```
v2.6 §10.1 → 实际 id·
  'tianqi-7-9'     → 'sc-tianqi7-1627'
  'chongzhen-1'    → 'scn_1774945158308'
  'wantianqing'    → 'scn_1774945158308'  ← !! 跟 崇祯 重复·见 #5
  'shaosong-1-8'   → 'sc-jianyan1-1127-shaosong'
  '111'            → 'scn_1775152731923'

5/5 scenario id 错·smoke 按 id load scenario 全 fail
```

**修法**·Slice 11 smoke 改 5 id·或用 `scenario.name` (中文剧本名) 而非 id。SMOKE_CASES 一并修。+0d 工时·doc 改。

### 1.4 (hard)·5 剧本无 1 有 `scenario.tinyi.convening` config

**事实** (verified)·

```
5/5 剧本 `scenario.tinyi` undefined
v2.6 Slice 2.5 §5.4.6 朝代差异化·明 / 宋 / 唐 三套·`scenario.tinyi.convening.requiredCallList` 等
v2.6 §5.4.6 doc 写 JSON 示例 (天启 / 宋 / 唐)·但**实际剧本里这些字段全部不存在·要新建**
```

**Slice 2.5.5 doc 当前**·"朝代差异·明 / 宋 / 唐 三套 JSON" (0.2d)·假设是 3 个示例文件·实际是要把示例 JSON 写入 5 剧本 (天启 / 崇祯 / 挽天倾 / 绍宋 / 111) 的 `scenario.tinyi` 字段。

**修法**·

- Slice 2.5.5 工时 0.2d → **0.4d** (5 剧本 × 写 tinyi config)
- 或 Slice 1 一并·char schema 补 + scenario.tinyi config 补 (`_dingyou` 同批) → Slice 1 +0.2d
- 加 default fallback·若 scenario.tinyi.convening 缺·用 hardcoded "明" template

---

## 2·medium 详

### 2.1 (medium)·崇祯 vs 挽天倾·scenario id 重复

**事实**·

```
scenarios/崇祯.json           id = 'scn_1774945158308'
scenarios/挽天倾：崇祯死局.json id = 'scn_1774945158308'   ← 重复
```

**影响**·游戏识别 scenario 按 id·若重复·load / save 可能 confuse·smoke 选剧本时也无法区分。

**修法**·不是 sprint 范围·但 flag 给 user 决定·

- (A) 手改一个 id (eg. 挽天倾 → `scn_1774945158309`)·5s 修
- (B) 留 backlog·非 sprint·user 自查 scenario data 是否 export 时同源

---

## 3·建议的 v2.6 → v2.7 调整

| # | 改动 | 工时影响 |
|---|---|---|
| 1 | Slice 4.5 加 8 处 phase update·1.5d → 1.8d | **+0.3d** |
| 2 | Slice 11 加子任务 11.0·fabricate 10 议题 + 改 5 scenario id | **+0.2d** |
| 3 | Slice 2.5.5 工时 0.2d → 0.4d·5 剧本写 tinyi config + default fallback | **+0.2d** |
| 4 | 崇祯/挽天倾 id 重复·flag 给 user (非 sprint) | 0 |
| **合计** | | **+0.7d** |

**v2.6 总工时·23.75-27.55d → v2.7·24.45-28.25d**·近 v1.5 原 23-26d 上限·更准。

---

## 4·5 轮+ audit 累计·v3 亮点 spot-check pass

| §14 | API verified | 备注 |
|---|---|---|
| §14.A 党派进化 | `_ty3_partySpawn` (L3096) + `_ty3_partyDispose` (L3152) + `_ty3_partyEvolutionTick` (L3273) + `GM._partyEvolutionState` (L3275) | ✅ 4/4 verified |
| §14.B NpcMemorySystem | `NpcMemorySystem.remember` v3 多处调 | ✅ verified |
| §14.C 4 套 chronicle | `ChronicleTracker.upsert` (v3 L3689) | ✅ verified |
| §14.G ClassEngine | `TM.ClassEngine.applyPartyOutcomeToClasses` (v3 L2818·2861) | ✅ verified |

---

## 5·6 轮 audit 累计 总览

| 轮 | finding | 关键 |
|---|---|---|
| 一轮 | 12 (3 hard) | `_ty3_phase6_recordSeal` 未 expose / 2.5→10 倒挂 / endturn decay |
| 二轮 | 6 (4 hard) | Slice 4 patch target / mode cite→augment / _affinityMap / affinity.toEmperor |
| 三轮 | 6 (1 hard) | Slice 8.5 10 ceremony 拆 7.5 |
| 四轮 | 6 (2 hard) | v3 已 active default / Slice 11 桥接 broken |
| 五轮 | 7 (2 hard) | Slice 3 hybrid / §6 affinity 收口 / _inPrison / _dingyou |
| 六轮 | 5 (4 hard) | currentPhase 不更新 / smoke 议题错位 / scenario id 错 / tinyi config 缺 |
| **总** | **42 处** | **16 hard + 14 medium + 12 low** |

**v2.6 → v2.7 工时**·23.75-27.55d → **24.45-28.25d** (+0.7d)

---

## 6·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **批准·写 v2.7** | 4 处修订 (hard #1-4)·+0.7d·doc 收口 |
| **B** | 进七轮·剩余 §5.4 召集制深 audit (民意度 decay / 言官离心 algorithm / 朝代差异化 JSON 详) | 还有 ~5 个 spot 没 audit |
| **C** | 6 轮 audit 全总结·入 memory·写 sprint-ready handoff doc | 42 处 finding 总结·给 implementer 看 |
| **D** | 不再 audit·按 v2.6 开工 | 4 hard 接受·implementation 时撞墙 (currentPhase 必撞·smoke 必撞·tinyi config 必撞) |
