# 廷议·七轮 audit·§5.4 召集制深 audit + trait naming convention

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "B·进七轮"·v2.7 写完后 §5.4 召集制 algorithm + helper + 5.5 trait bias 深 audit
**方法**·亲读 §5.4.3 / 5.4.13 / 5.5.2 + grep runtime helper 和 trait naming

---

## TL;DR·3 hard + 2 medium + 2 low (含 1 catastrophic)

| # | 严重 | 问题 | 区域 |
|---|---|---|---|
| 1 | **catastrophic** | **14 trait naming convention 跟 runtime 完全不一致**·doc 用 `trait_xianliang/chunzheng/yaohua/xueshi` (中文拼音前缀)·runtime fill-shaosong-traits.js 用 `brave/craven/scholar/schemer` (英文 SI)·14/14 全部不存在·**Slice 1 / 3 / 6 / 10 / §5.4.14 全 spec broken** | §5.5.2·§5.4.14·trait bias |
| 2 | **hard** | §5.4.3 L2440 `ch.affinity.toEmperor` 重现·跟 v2.3/v2.6 修过的 number paradigm 矛盾·**doc internal contradiction 又一处** | §5.4.3 |
| 3 | **hard** | `crossPartyRatio` 算法 bug·`Math.min(...counts.values()) / Math.max(...counts.values())` 当 counts.size===1 时 ratio=1·tilt='balanced'·实际应是 oneParty | §5.4.3 |
| 4 | medium | 5 处 `_ty3_v15_*` helper 假设新建·doc 措辞含糊·应明 (countByParty / findMissedRequired / addSickLeaveEvent / addResignMemorial / pushClearOpinionEvent) | §5.4.3 |
| 5 | medium | §5.4.13 `proposer.dims?.honor` 直接用 `dims` 字段·跟 v2.3 修过的"用 `_ty3_getDims()` helper"不一致 | §5.4.13 |
| 6 | low | §5.4.13 `GM._urgentBorderAffairs` runtime 0 hit·新建·没 spec | §5.4.13 |
| 7 | low | §5.4.13 urgency clamp 0-10·"10 伏阙急谏" 太松·任何 4-5 条件累加都到 10·算法过宽 | §5.4.13 |

---

## 1·catastrophic 详

### 1.1 (CATASTROPHIC)·trait naming convention 跟 runtime 完全不一致

**事实** (grep verified)·

**doc v2.7 §5.5.2 14 trait bias**·

```js
const TRAIT_TO_MODE_BIAS = {
  'trait_xianliang':     { mode: 'rebut' },
  'trait_chunzheng':     { mode: 'martyr' },
  'trait_yiqi':          { mode: 'confront' },
  'trait_jinshen':       { mode: 'soften' },
  'trait_yaohua':        { mode: 'pivot' },
  'trait_gangzhi':       { mode: 'martyr' },
  'trait_guangying':     { mode: 'second' },
  'trait_jiengong':      { mode: 'augment' },
  'trait_xueshi':        { mode: 'cite_classic' },
  'trait_quan':          { mode: 'rebut' },
  'trait_jian':          { mode: 'martyr' },
  'trait_meng':          { mode: 'confront' },
  'trait_lian':          { mode: 'martyr' },
  'trait_diao':          { mode: 'soften' }
};
```

**runtime tool·`web/tools/fill-shaosong-traits.js` L24-103 TRAIT_KEYWORDS**·

```js
var TRAIT_KEYWORDS = {
  brave: ['勇敢','勇猛',...], craven: ['怯懦','胆小',...],
  calm: ['冷静','沉稳',...], wrathful: ['暴怒','易怒',...],
  chaste: ['贞洁','贞静',...], lustful: ['好色',...],
  content: [...], ambitious: [...],
  diligent: [...], lazy: [...],
  honest: ['诚实','耿直',...], deceitful: ['狡诈',...],
  generous: [...], greedy: [...],
  gregarious: [...], shy: [...],
  humble: [...], arrogant: [...],
  just: ['公正','秉公',...], arbitrary: ['专断',...],
  patient: [...], impatient: [...],
  temperate: [...], gluttonous: [...],
  trusting: [...], paranoid: [...],
  zealous: [...], cynical: [...],
  forgiving: [...], vengeful: [...],
  compassionate: ['仁善','爱民',...], callous: [...],
  sadistic: ['虐待','狠辣',...],
  stubborn: [...], fickle: [...], eccentric: [...],
  // lifestyle/role
  scholar: ['学问','博学','读书',...],
  theologian: [...],
  schemer: ['阴谋','机变',...],
  diplomat_ls: [...], administrator_ls: [...],
  strategist: ['军事','兵略',...],
  family_first: [...], gallant: [...], august: [...],
  // commander
  aggressive_attacker: [...], unyielding_defender: [...],
  cautious_leader: [...], reckless: [...],
  flexible_leader: [...], organizer: [...], holy_warrior: [...],
  // 健康/特殊
  scarred: [...], depressed: [...]
};
```

**对比**·

| doc trait | runtime equivalent |
|---|---|
| `trait_xianliang` (贤良·良臣) | 跟 `honest` + `just` 相近·非直接对应 |
| `trait_chunzheng` (醇正·端直) | 跟 `honest` + `just` 相近 |
| `trait_yiqi` (义气) | `gallant` |
| `trait_jinshen` (谨慎) | `cautious_leader` + `patient` |
| `trait_yaohua` (摇曳·圆滑) | `fickle` + `gregarious` |
| `trait_gangzhi` (刚直) | `honest` + `just` + `brave` |
| `trait_guangying` (光赢·见利) | `greedy` + `ambitious` |
| `trait_jiengong` (建功) | `aggressive_attacker` + `ambitious` |
| `trait_xueshi` (学士) | `scholar` ⭐ 唯一直接对应 |
| `trait_quan` (权·权术) | `schemer` |
| `trait_jian` (奸) | `deceitful` |
| `trait_meng` (猛) | `aggressive_attacker` + `reckless` |
| `trait_lian` (廉) | `temperate` + `just` |
| `trait_diao` (调·摇摆) | `fickle` + `flexible_leader` |

**结论**·doc 14 trait id **0/14** 跟 runtime 完全一致·这是 ~1 年前 doc 写 spec 时用的中文拼音 naming·后来 fill-shaosong-traits.js 用了完全不同的英文 SI naming convention (P 社风)·doc 没追上。

**影响**·

| 受影响处 | 描述 |
|---|---|
| Slice 1·补 traitIds | 没问题·tool 已用 runtime naming·trait 会正确写入 char.traitIds·**但 Slice 3 / 6 / §5.4.14 读 trait_* 时 0 hit** |
| Slice 3 `_ty3_dimsFromTraits` BIAS table | 全要重写·按 runtime ~50 trait 列 dims mapping |
| Slice 6 §5.5.2 14 trait bias TRAIT_TO_MODE_BIAS | 全要重写 14 trait·或扩到 ~50 |
| Slice 10 mentor / clientelism | 不直接用 trait·OK |
| §5.4.14 NPC 主动议题过期处理·`trait_chunzheng` / `trait_yaohua` | 全要改 runtime trait name (eg. `honest`/`just` / `fickle`) |

**修法**·

| | 方案 | 工时 | 描述 |
|---|---|---|---|
| **A** | doc 全替换·按 runtime ~50 trait 重写 BIAS table | +0.5d | Slice 3 fallback A·Slice 6 trait bias·§5.4.14 全改·doc 整理 |
| **B** | runtime fill tool 改·按 doc 14 trait_* naming 重写 (反向适配) | +1.0d | 改 tool + reload 5 剧本 traitIds·风险大 |
| **C** | 中间·doc 改用 runtime naming 但缩到核心 14 (eg. brave/honest/just/scholar/schemer/gallant/fickle/greedy/ambitious/etc.)·BIAS 表保留 14 名 | +0.3d | 平衡·doc 主流编辑·tool 不动·实施者按 runtime ID 写 BIAS |

**推荐**·**C** (推荐) 或 **A**·**B** 风险太大不做。**Slice 3 / Slice 6 工时各 +0.2d·doc 修 +0.2d** = **+0.5d 总**。

---

## 2·hard 详

### 2.1 (hard)·§5.4.3 L2440 `ch.affinity.toEmperor` 重现

**事实**·

```
v2.7 §5.4.3 L2440·ch.affinity.toEmperor -= 3 * multiplier * 0.6;
                                                ↑ runtime affinity 是 number·这行会 silent fail (non-strict) / TypeError (strict)

v2.3/v2.6 修过的·
  Slice 8 patch L1045·npc.affinity = Math.max(0, (npc.affinity || 50) - finalRebound * 0.6);
  §6 schema (v2.6)·affinity: 50 // number 单值·禁 .toEmperor 嵌套
```

**结论**·**doc internal contradiction 又一处**·v2.6 修了 2 个 spot 但漏 §5.4.3。

**修法**·§5.4.3 L2440·`ch.affinity.toEmperor -= 3 * multiplier * 0.6;` → `ch.affinity = Math.max(0, (ch.affinity || 50) - 3 * multiplier * 0.6);`。0 工时·doc 改 1 行。

### 2.2 (hard)·`crossPartyRatio` 算法 bug

**事实**·

```js
const counts = _ty3_v15_countByParty(attendees);
const crossPartyRatio = Math.min(...counts.values()) / Math.max(...counts.values());

// 若所有 attendees 都同一党·
//   counts = new Map([['东林', 10]])
//   counts.values() = [10]
//   Math.min(10) = 10·Math.max(10) = 10
//   ratio = 1.0  ← 实际全一党
//   tilt = 'balanced' (ratio > 0.6)   ← BUG·应是 'oneParty' (ratio < 0.2)
```

**结论**·算法 wrong·若 attendees 全同一党·ratio=1·走 'balanced' branch·而实际语义是最极端 oneParty。

**修法**·

```js
// v2.8 改·先判 counts.size === 1·直接 oneParty
const counts = _ty3_v15_countByParty(attendees);
if (counts.size === 1 && attendees.length >= 5) {
  return { tilt: 'fullOneParty', crossPartyRatio: 0, missedHighRank: ... };
}
if (counts.size === 1) {
  return { tilt: 'oneParty', crossPartyRatio: 0, missedHighRank: ... };
}
const values = Array.from(counts.values());
const crossPartyRatio = Math.min(...values) / Math.max(...values);
// ... 剩 oneParty / fullOneParty / megaCeremony 判断
```

0 工时·doc 改 5 行。

---

## 3·medium / low 详

### 3.1 (medium)·`_ty3_v15_*` 5 helper 假设·doc 措辞含糊

**事实**·`_ty3_v15_*` series·

| helper | 用途 | doc 说 | 实际 |
|---|---|---|---|
| `_ty3_v15_countByParty(attendees)` | 党派人数 Map | 出现在 §5.4.3·无 spec | 新建 |
| `_ty3_v15_findMissedRequired(attendees, topic, scenario)` | 漏召大臣 | 同·无 spec | 新建 |
| `_ty3_v15_addSickLeaveEvent(ch, expireTurn)` | 病假入队 | 同·无 spec | 新建 |
| `_ty3_v15_addResignMemorial(ch, expireTurn)` | 辞呈入队 | 同·无 spec | 新建 |
| `_ty3_v15_pushClearOpinionEvent(opposingParties, turn)` | 清议事件入队 | 同·无 spec | 新建 |

**修法**·Slice 2.5 §5.4.3 加 5 helper spec·~30 行 code skeleton·~0.1d·doc 改。

### 3.2 (medium)·§5.4.13 `proposer.dims?.honor` 跟 _ty3_getDims helper 不一致

跟 五轮 finding 同类型·v2.6 Slice 8 patch 已修过·这里漏。修法·`proposer.dims?.honor` → `_ty3_getDims(proposer)?.honor`。0 工时·doc 改 2 处。

### 3.3 (low)·`GM._urgentBorderAffairs` 0 hit·没 spec

§5.4.13 用·`if (GM._urgentBorderAffairs) urgency += 3`·这字段 runtime 0 hit·新建·doc 没说什么时候 set true·什么时候 clear。

**修法**·§6 schema 加 spec·`GM._urgentBorderAffairs: boolean` (default false)·由 event "边事告急" 等 hook 设 true·1 turn 后 clear。+0.05d·doc 改。

### 3.4 (low)·§5.4.13 urgency 算法过松

```
type=request_tinyi_inge (+4) + dims honor>=0.7 (+1) + dims boldness>=0.7 (+1) 
  + prestige>=80 (+1) + 离心>30 (+2) + 民意度<-50 (+2)
  = base 5 + 11 = 16 → clamp 10
"10 伏阙急谏" 阈值 太低·任何 inge type + 2 个性格条件都触发
```

**修法**·提高阈值·"伏阙急谏" 改 `urgency >= 9 + 必 type==='request_tinyi_inge' + prestige>=80`·明限 elite。或 clamp 0-15·阈值 12+·0 工时·doc 改。

---

## 4·建议的 v2.7 → v2.8 调整

| # | 改动 | 工时影响 |
|---|---|---|
| 1 | **trait naming convention 收口** (推荐 C 方案·doc 改用 runtime ~50 trait·BIAS 表选核心 14) | **+0.5d** (Slice 3 +0.2 / Slice 6 +0.2 / doc 修 +0.1) |
| 2 | §5.4.3 ch.affinity.toEmperor → number 单值 | 0·doc 改 1 行 |
| 3 | §5.4.3 crossPartyRatio 算法补 counts.size===1 case | 0·doc 改 5 行 |
| 4 | §5.4.3 5 `_ty3_v15_*` helper spec 补 | +0.1d·~30 行 skeleton |
| 5 | §5.4.13 dims → _ty3_getDims | 0·doc 改 2 处 |
| 6 | §5.4.13 GM._urgentBorderAffairs spec 加 + §6 字段加 | +0.05d |
| 7 | §5.4.13 urgency 阈值 / clamp 提高 | 0·doc 改 |
| **合计** | | **+0.65d** |

**v2.7 总工时·24.45-28.25d → v2.8·25.1-28.9d**·依然在 v1.5 估算范围内。

---

## 5·7 轮 audit 累计

| 轮 | finding | hard 计 |
|---|---|---|
| 一轮 | 12 | 3 |
| 二轮 | 6 | 4 |
| 三轮 | 6 | 1 |
| 四轮 | 6 | 2 |
| 五轮 | 7 | 2 |
| 六轮 | 5 | 4 |
| 七轮 | 7 | 3 (含 1 catastrophic) |
| **总** | **49 处** | **19 hard + 16 medium + 14 low** |

**v2.7 → v2.8 工时**·+0.65d → **25.1-28.9d**

---

## 6·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **批准·写 v2.8·trait naming convention 推荐 C 方案** | 7 处修订·+0.65d·doc 收口 |
| **B** | 先讨论 trait naming convention A/B/C 再决定 | A/B/C 选项较有 paradigm 差异 |
| **C** | 进八轮 audit (剩 §5.1 抢答队列 6 priority + 4 加成 + §5.2 UI 元素 + §6 P state) | 还有 ~8 spot 未 audit |
| **D** | 7 轮总结 + memory + handoff doc | 49 finding 总结 |
