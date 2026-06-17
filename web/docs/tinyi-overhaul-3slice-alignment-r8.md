# 廷议·八轮 audit·§5.1 抢答 + §5.2 UI + §6 schema + §9 工时表

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "B·进八轮"·v2.8 写完后剩余 shared section audit
**方法**·亲读 §5.1.6 / §5.2 / §6.2-6.5 / §9.1-9.2 + grep verify cross-section consistency

---

## TL;DR·2 hard + 3 medium + 3 low

| # | 严重 | 问题 | 区域 |
|---|---|---|---|
| 1 | **hard** | §9.1 工时表 / §9.2 时间线 vs header v2.8 工时不一致·v1.5 原版数字未同步·implementer 看 §9 会误判 23-25d (实际 25-29d) | §9 |
| 2 | **hard** | §6.5 升级路径 L3408 `data.GM._chronicleTracker = []` 重现错字段名·v2.6 修过 _chronicleTracks (复数)·**doc internal contradiction 又一处** | §6.5 |
| 3 | medium | §6.2 GM state vs §5.4.15 schema fence 重复·conveningPolitics/_mentorIndex 等两处列·source of truth 不清 | §6.2·§5.4.15 |
| 4 | medium | §5.1.6 抢答 #9 mentee 抢答用 `GM._mentorIndex`·Slice 4.5 依赖 Slice 10a·没说 lazy guard | §5.1.6 |
| 5 | medium | `P.userConveningPresets[] localStorage 持久化` 自相矛盾·P 是 save·localStorage 是浏览器·两 paradigm 混 | §6.2·Slice 8.5 |
| 6 | low | §6.5 fallback `_buildMentorIndex` vs `_ty3_buildMentorIndex` 命名漂 | §6.5 |
| 7 | low | §9.2 时间线 stale·"Slice 0 完 day 1.0" 漏 0.0a/0.0b | §9.2 |
| 8 | low | §5.1.6 示例 "5 NPC 抢答" 用 4 priority (1/1/2/9/9)·跳 0/3/4/5·doc "6 priority" 标题 vs 示例 gap | §5.1.6 |

---

## 1·hard 详

### 1.1 (hard)·§9 工时表 stale·跟 header 不一致

**事实**·

```
v2.8 header 工时·25.1 - 28.9d
v2.8 关键路径·~15.7d (Slice 0 +0.0a/0.0b)

v2.8 §9.1 工时表 (stale)·
  Slice 0   1.0d   ← v2.5 改 1.3-2.5d (加 0.0a + 0.0b)
  Slice 7.5 (没列)  ← v2.4 加 0.5 → v2.6 1.0d
  Slice 8.5 1.8d   ← 不变
  Slice 10  1.5d   ← v2.2 拆 10a (1.0d) + 10b (0.5d)·没标拆
  Slice 11  1.8d   ← v2.6 改 1.5d → v2.7 1.7d
  总·22.8d·上限 25.8d   ← header 25.1-28.9d·差 ~3d
  关键路径·~14d         ← header ~15.7d·差 ~1.7d

v2.8 §9.2 时间线 (stale)·
  day 0   Sprint kickoff
  day 1.0 Slice 0 完     ← v2.5 加 0.0a (0.3d) + 0.0b (0-1.2d)·应是 day 1.3-2.5
  day 22.8 ship          ← 应 day 25.1-28.9
```

**结论**·**§9 整段是 v1.5 原版·v2.0-v2.8 全没同步**·implementer 看 §9 会以为 23-25d·实际 25-29d·1 周差距。

**修法**·重写 §9.1 工时表 (按 v2.8 spec) + §9.2 时间线·~0.1d·doc 改。

### 1.2 (hard)·§6.5 升级路径 _chronicleTracker 重现错字段名

**事实**·

```
v2.8 §6.5 L3408 (v2 → v3 升级路径)·
  if (!data.GM._chronicleTracker) data.GM._chronicleTracker = [];
                ↑ 单数·错·跟 v2.6 修过的 _chronicleTracks (复数) 不一致

v3 runtime (verified)·
  GM._chronicleTracks  (tm-tinyi-v3.js L3378·L3865·tm-chronicle-tracker.js L41)
```

**结论**·v2.6 修了 §6.2·但漏 §6.5·**又一处 doc internal contradiction**。

**修法**·§6.5 L3408·`_chronicleTracker` → `_chronicleTracks`。1 行改。

---

## 2·medium 详

### 2.1 (medium)·§6.2 vs §5.4.15 schema fence 重复

**事实**·

| 字段 | §6.2 (v1.4/v1.5 新加 GM state) | §5.4.15 (v2.2 schema fence) |
|---|---|---|
| `CY._ty3.conveningPolitics` | listed (L3318) | listed |
| `GM._convening_民意度` | listed (L3293-3294) | listed |
| `GM._mentorIndex` | listed (L3308) | listed |
| `GM._pendingMartyrEvents` | listed (L3301) | listed |
| `GM._pendingTinyiTopics` | listed (L3293·v1.4 NPC 主动议题) | listed |

**问题**·两处列同样字段·implementer 改字段名要改 2 处·若忘改一处→ doc internal inconsistency。

**修法**·§6.2 加注释·"**字段权威·见 §5.4.15 schema fence·本处仅为 GM state 历史 reference**"·implementer 看 §5.4.15。0 工时·doc 改 1 段。

### 2.2 (medium)·§5.1.6 抢答 mentee 依赖 GM._mentorIndex·没说 lazy

**事实** (verified)·

```
§5.1.6 #9 mentee 抢答·`X 的所有 mentee 按 honor 决定`
  实施时·读 GM._mentorIndex[mentor 名]·Slice 10a 才建

v2.2 §5.4.10 mentor 联动 加了 lazy guard·`if (GM._mentorIndex)`·但 §5.1.6 doc 没说
Slice 4.5 §5.1.6 实施时·若 Slice 10a 没完·mentee 抢答全 silent 失效
```

**修法**·§5.1.6 #9 加注释·"**v2.6·依赖 Slice 10a `GM._mentorIndex`·Slice 4.5 实施时 lazy guard·`if (GM._mentorIndex?.mentor?.[name])` 否则 skip mentee 抢答**"。0 工时·doc 改。

### 2.3 (medium)·`P.userConveningPresets[] localStorage 持久化` 自相矛盾

**事实**·

```
§6.2 L3315·P.userConveningPresets[]  // localStorage 持久化

runtime paradigm·
  P    = 游戏内 state + save game (per slot)
  localStorage = 浏览器持久化 (跨 game session·跨 slot)
  
两 paradigm 不同·一个字段不能同时是 P + localStorage
```

**问题**·

- (A) 若是 P 字段·per-save·切 save slot 时 preset 丢
- (B) 若是 localStorage·全局共享·所有 save 都用同 preset (跨剧本可能不合适·明朝 preset vs 宋朝 preset)

**修法 (2 选)**·

| | 方案 | 描述 |
|---|---|---|
| A | P.userConveningPresets·跟 save 走 | 同 save 共享·切 save 重建·default 空 |
| B | localStorage 'tm.tinyi.userConveningPresets'·跨 save | 全玩家共享·跨剧本可能不合适 |

**推荐**·**A** (P)·跟 save 走·剧本/save 切换时各自 preset 独立·更符合 P 社存档 paradigm。doc §6.2 改注释·`P.userConveningPresets[] // per-save·跟 save 持久化`·Slice 8.5 实施时直接 P 读/写。0 工时·doc 改 1 行。

---

## 3·low 详

### 3.1 (low)·§6.5 _buildMentorIndex vs _ty3_buildMentorIndex 命名漂

**事实**·

```
§6.5 L3405·_buildMentorIndex(data.GM.chars)
Slice 10a spec·_ty3_buildMentorIndex (前缀 _ty3_)
```

**修法**·§6.5 L3405·`_buildMentorIndex` → `_ty3_buildMentorIndex`。0 工时。

### 3.2 (low)·§9.2 时间线 stale

跟 #1 同·v1.5 原版·v2.0-v2.8 全没同步。重写 §9.2·~0.05d·跟 §9.1 一起。

### 3.3 (low)·§5.1.6 示例 priority gap

**事实**·示例 "玩家说严办许显纯" 表·

| priority | NPC | 因为 |
|---|---|---|
| 1 | 许显纯 | 点名 |
| 1 | 王永光 | 点名 |
| 2 | 黄宗周 | punish intent |
| 9 | 田尔耕 | mentee 护师 |
| 9 | 周应秋 | mentee 背师 |

**doc 标 "6 priority + 4 加成 = 10"**·示例只用 4 个 priority (1/2/9/9)·跳过 0/3/4/5。读者会困惑·**举例不全**。

**修法**·示例补 priority 0 (代词识别)·priority 3 (主奏者)·priority 5 (闲人兜底) 3 个 case·完整 10 priority 各 1 NPC。或加注释 "示例仅展示·完整 10 priority 见上文清单"。0 工时·doc 改 1 段。

---

## 4·建议的 v2.8 → v2.9 调整

| # | 改动 | 工时影响 |
|---|---|---|
| 1 | §9.1 工时表 + §9.2 时间线 重写 (按 v2.8 spec) | +0.1d·doc 改 |
| 2 | §6.5 L3408 `_chronicleTracker` → `_chronicleTracks` | 0·1 行 |
| 3 | §6.2 加注释 "字段权威见 §5.4.15"·避 duplicate spec confuse | 0·doc 改 |
| 4 | §5.1.6 #9 mentee 加 lazy guard 注 | 0·doc 改 |
| 5 | §6.2 `P.userConveningPresets` 改 "per-save" 注·去掉 localStorage 字 | 0·doc 改 1 行 |
| 6 | §6.5 `_buildMentorIndex` → `_ty3_buildMentorIndex` | 0·1 行 |
| 7 | §9.2 时间线 stale (跟 #1 同改) | 0·跟 #1 |
| 8 | §5.1.6 示例补 priority 0/3/5 case·完整 10 priority | 0·doc 改 |
| **合计** | | **+0.1d** |

**v2.8 总工时·25.1-28.9d → v2.9·25.2-29.0d**·几乎不变·doc 收口为主。

---

## 5·8 轮 audit 累计

| 轮 | finding | hard 计 |
|---|---|---|
| 一轮 | 12 | 3 |
| 二轮 | 6 | 4 |
| 三轮 | 6 | 1 |
| 四轮 | 6 | 2 |
| 五轮 | 7 | 2 |
| 六轮 | 5 | 4 |
| 七轮 | 7 | 3 (含 1 catastrophic) |
| 八轮 | 8 | 2 |
| **总** | **57 处** | **21 hard + 19 medium + 17 low** |

**v2.8 → v2.9 工时**·+0.1d → **25.2-29.0d**

---

## 6·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **批准·写 v2.9 (推荐)** | 8 处修订·几乎全 doc 改·+0.1d·v2.9 应当是收口版本 |
| **B** | 进九轮 audit | 还有 §7 跨系统·§8 风险 mitigation·§11 backlog·§12 启动 checklist·§13 reference 等没 audit |
| **C** | 8 轮总结 + memory + handoff doc | 57 finding 总结·写给 implementer 的 sprint-ready doc·完结审阶段 |
| **D** | 不再 audit·按 v2.8 开工 | 2 hard (§9 stale / _chronicleTracker 重现) 接受·implementer 看 §9 会误判时间·doc internal contradiction 留 |
