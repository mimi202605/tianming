# 科举·Stage 2·Phase G·**G3·武举 mini-keju** (max-scope·14 sub-slice·文武呈现差异化)

> ⚠ 死码清除（2026-07-07）：本文提及的 _kjG3DeriveStance 已删除（全仓零引用）。

**date**·2026-05-25
**status**·**v3·RAA 18 项 + RBB 14 项全修·ship-ready** (1 G3 + 4 BB·HIGH + 7 M·MID + 3 L·LOW + 18 RAA 全过 smoke 135 PASS / 0 FAIL)
**smoke**·`smoke-g3-wuju.js` 135 PASS·**G2 enke main 155 / G1 51 / L1-L12 共 1000+ PASS 全 0 FAIL·零回归**
**estimated**·**doc 1.8-2.3 d·实施 17-21 d·总 ~19-23 d** (跟 v1 同·因 audit 修主要是 doc / call 签名·不增 sub-slice)
**dependency**·G1 spawn (已 ship·wuju trigger 现存) + G2 paradigm 复用 (event hook / 3 路径 / 4 档贬值架构 / tinyi tag 集成 / 诏令 EDICT_TYPES) + keyi callback chain + L4 wendui cedui mode (archetype='兵部') + GM.officeTree 武职树 + GM.armies 边镇
**flag gate**·`P.conf.useNewKejuG3=false` 默认 off (依赖 D2 已开)

**红线 reminder**·
- 复用·G1 / G2 paradigm 80%·新作 ~20% (校阅大典 / 派镇 / 战功 / 武勋世家 / 字段深生成)
- 自然军政触发·war_state ≥60 / 缺将 generals<5 / periodic·**严禁玄幻**·non 彗星
- 失败禁玄幻惩罚·**军心动摇 / 边镇怒 / 武将不服**·全自然军政后果
- 工具 vs 系统·武举系统型·走 keyi 议政 + chars 武进士长尾 + war_state 联动
- 9 朝代 preset·**元朝无武举 + 清末 1901 废**·era + year 双 gate
- audit-first·v1 → audit → v2 → implement

---

## ★·v2 修订摘要 (audit pickup·16 项)

| # | severity | 编号 | v1 问题 | v2 修法 |
|---|---|---|---|---|
| 1 | **CRITICAL** | C1 | `openKeyiSession({...object})` 假签名·真 `openKeyiSession(topicType, topicData)` 2 positional | §10.2 改 `openKeyiSession('reform', { theme:'废武举·改新军', ... })` positional |
| 2 | **CRITICAL** | C2 | 9 边镇 hard-list (宣府/大同/etc) grep 0 matches·真 scenarios 无 enum | §7.1 改 scan GM.officeTree (含 "镇/营/卫" keyword 的 office nodes) + fallback "京营" stub (元/非边境剧本) |
| 3 | **CRITICAL** | C3 | "总兵/提督/游击" 字段错位·真 game 是 `char.stance` ("主战·游击") 字段·非 GM.officeTree position node | §7.2 改·`wujinshi.officialTitle = '宣府游击'` 字符串字段 (跟现 chars 一致)·**不动 GM.officeTree** |
| 4 | HIGH | H1 | 武勋派 grep 0·G3 doc 假设 pre-exists 错 | doc §5.1 明·G3 自创 `GM._wujuParty` 命名空间 + tinyi tag·**不动 GM.parties** |
| 5 | HIGH | H2 | 兵谏假设 F4c paradigm·真函数 `_kjSpawnYanguanQingyi(party, attackedMember, eventDetail)` 3 positional | §5.2 加 3-arg 真签名·避 G2 RBB·BB1 重演 |
| 6 | HIGH | H3 | "改 G2 callback" 没指 patch 位置 | §1.3 明·patch `tm-keju-enke.js` 内 `_kjG2SpecialExamKeyiCallback`·加 wuju route |
| 7 | MID | M1 | 清末 1898 hardcode·era format 不一致 (`'清·乾隆'` vs `'清'`) | §10.1 加 regex `/清|qing/i` + year>=1898 (光绪 24 戊戌) |
| 8 | MID | M2 | 历史武状元 pool 'qing: 108' 未列 | §11.3 注·实施 10-20 典型·非全 108·避空指针 |
| 9 | MID | M3 | birthYear 字段 | 已对齐·无改 |
| 10 | MID | M4 | EDICT keyword "选武" 可能跟"选兵"撞 | §14.3 加 strong keyword required (武举/武科/募将 至少一) |
| 11 | MID | M5 | 派镇 UI 走 `_kjpReformPanel`·已被 G2 RAA-C2 删 button | §7.3 改·走 desk template suggestion paradigm (跟 G2 Path C 一致) |
| 12 | MID | M6 | 赐物字段·未指 path | §6.2 明 `wujinshi.resources.privateWealth.money += 100` 等·跟 G2 schema 修后对齐 |
| 13 | MID | M7 | _wujuPeacefulCounter 跨剧本未 reset | §3.1 加·复用 G2 `_kjG2MaybeResetCrossScenarioFields` 同 paradigm·加 `_wujuPeacefulCounter` 字段 |
| 14 | LOW | L1 | LLM cost 数字·OK | 不改 |
| 15 | LOW | L2 | 14 sub-slice vs G2 9-12 d 不 parity | user 已选 max·doc 记 |
| 16 | LOW | L3 | doc flow OK | 不改 |

---

## ★·武举 vs 文举·**呈现形式 12 维差异** (G3 核心卖点)

| 维度 | **文举 (G2 已 ship)** | **武举 (G3 设计)** |
|---|---|---|
| **场地** | 号舍·单人小屋·闭卷三日·静寂 | **校场**·开阔·演武 + 兵法默写·**动·围观·喝彩** |
| **时长** | 一场 3 天·闭场不出·一锤定音 | **多日分场**·骑射 / 步射 / 技勇 / 策论各占一日 |
| **氛围** | 肃穆·闻笔声 | **鼓声·箭矢破空·喝彩**·京营兵丁列队 |
| **观众** | 主考 + 弥封官·孤独 | **圣上亲临御前校阅** + 百官 + 京营·**百千人** |
| **评分** | 主观·8D 偏好阅卷 | **外场客观** (3 矢中红几次·开弓几石·举石几斤) + **内场主观** (策论) |
| **录取数** | 300+ 人 | **50-200 人**·少 |
| **职业去向** | 翰林 / 待铨 / 知县·**文职** | **9 边镇 / 京营 / 提督**·跟现役 hookup·**武职** |
| **服饰** | 青衫·进士袍 | **戎装·披甲** |
| **传记** | "X 科 X 甲 X 名进士及第" | "X 科 X 甲 X 名武进士·**兼授 X 镇 X 营都司**" |
| **大典仪式** | **谢恩大典** — 古文奏疏·叩拜 | **校阅大典** — 御前演武·**赐甲胄/弓/战马/兵符** |
| **科目内容** | 经义 / 策论 / 诗赋 | **孙吴默写 / 边事策 / 守城议**·涉敌情 |
| **传播渠道** | 邸报 + 士林清议 | **邸报 + 军中传扬** (京营操演·边镇兵将传) |
| **失败后果** | 士林失望·prestige -5 | **军心动摇 / 边镇怒** |
| **历史名将** | 多数默默无闻 | **真打过仗** — 郭子仪 / 狄青·**战功 + 武举双重 prestige** |

---

## 0·sprint scope·**14 sub-slice·max-scope**

| sub-slice | 内容 | est |
|---|---|---|
| **0** | event hook 补·war_state delta watcher (G1 wuju trigger 已 ship) | 0.3 d |
| **A·base** | 兵部主考 (朝代-aware regex) + 3 试 journey (内+外场) + 武进士标记 + Path B/C (诏令 EDICT 14 类·6 keyword) | 2.5-3 d |
| **B·和平期贬值** | `GM._wujuPeacefulCounter`·war_state <30 长期 → 武进士档次降·"入伍无战场·转文 / 失意" | 0.8 d |
| **C·兵议体题目** | LLM·孙吴默写 / 边事策 / 守城议·涉敌情·2 subtype (战时/平时) | 1 d |
| **D·武勋派 + 文武不和** | `GM._wujuParty` + 跟文官派 tension + **重·包括兵谏黑天鹅** + tinyi tag | 2-2.5 d |
| **E·校阅大典 LLM** | 御前演武 LLM·铺陈 + 圣上点评 + **赐甲胄/弓/战马/兵符** + chronicle | 1.2 d |
| **F·派镇系统** | 武进士·按外场成绩 + 现 9 边镇 GM.officeTree match·**user 手选 + 自动 hybrid UI** | 2-2.5 d |
| **G·战功联动** | war_state + martial_power + 朝代权重·dynamic 概率·战功累记·武勋派 prestige | 1.5-2 d |
| **H·武勋世家** | 跨 cohort·≥2 武进士同姓 → 世家·**军职荫袭 paradigm + 杨家将/岳家军 chronicle** | 1.5 d |
| **I·清末废武举** | 清剧本·1898 自动 spawn keyi 议程 + user 拍板·**改新军 paradigm 长尾** | 1 d |
| **J·武进士字段深生成** | **40+ 字段·跟 G2 schema 错位修后对齐·valor/military 顶级·resources.* 嵌套·5 archetype·4 类武origin·历史武状元 draw** | 1.5-2 d |
| **K·LLM dialog 口吻区分** | LLM prompt builder·若 ch._origin='wuju'·tone hint "军人·末将·直爽"·sc1q / 廷议 / 等所有 NPC speech | 0.8 d |
| **L·武进士长尾·战死 + 荫袭** | health 损耗机制 + 死亡 chronicle (战死/殉国/老死) + 荫袭 hook | 0.8 d |
| smoke | ~80-95 case·14 section | 0.8-1 d |
| **total** | | **~17-21 d** |

---

## 1·hookup·**3 路径** (复用 G2 paradigm)

### 1.1·现 G1 wuju spawn 已 ship

G1 `_kjCheckWujuTriggers` (tm-keju-special-exams.js:124) 已 trigger·war_state ≥60 / 缺将 generals<5 / periodic。G3 不重做 trigger·复用。

### 1.2·**3 路径·按代价升序**

| 路径 | 发起者 | UX 入口 | 代价 | 适用 |
|---|---|---|---|---|
| **A·被动** | 系统 G1 trigger·兵部上奏 | changchao agenda → keyi 投票 | 0 + reject 代价 | 战时 / 缺将自然触 |
| **B·半主动·兵部 wendui** | user 暗示兵部尚书 | changchao NPC list → 兵部尚书 → wendui '议·开武举' | 1 wendui call + 兵部反 -10 affinity | user 想开但无 war crisis·需兵部背书 |
| **C·主动·下诏** | user 在 desk 写诏令·或点 template suggestion | **御案 desk → 诏令 textarea·5 template (war-crisis / general-shortage / periodic / muster-warriors / 强发) + EDICT_TYPES.wuju 第 14 类** | lifecycleDays:1095·resistance 文官+清议·affectedClasses 军-15/国库-15 | user 无 war 强开 / 被兵部劝阻后强发 |

### 1.3·KEYI_TOPIC_TYPES `special_exam` 复用 G2 注册 (已 ship)·**H3 fix**

**v2·明指 patch 位置**·`tm-keju-enke.js` 内 `_kjG2SpecialExamKeyiCallback` 函数·改·

```js
// 现 G2 ship 内·~line 850
function _kjG2SpecialExamKeyiCallback(method, opts) {
  if (!_isG2Enabled()) return;
  opts = opts || {};
  var td = opts.topicData || opts;
  var examType = td.examType || 'enke';
  // **v2·G3 wuju route**
  if (examType === 'wuju') {
    if (typeof window !== 'undefined' && typeof window._kjG3OnWujuApproved === 'function') {
      // 注·outcome 派生跟 enke 同 paradigm (method=council/edict/defy + outcome)
      var outcome = opts.outcome;
      if (!outcome) {
        if (method === 'council' || method === 'edict' || method === 'defy') outcome = 'approve';
        else outcome = 'reject';
      }
      if (outcome === 'approve') return window._kjG3OnWujuApproved(td.subtype, td);
      if (outcome === 'reject')  return window._kjG3OnWujuRejected(td);
      if (outcome === 'defer')   return window._kjG3OnWujuDeferred(td);
    }
    return;
  }
  // 现 enke route 不变
  if (examType !== 'enke') return;
  // ...
}
```

`tm-keju-enke.js` patch 行数·~5 行 (插 wuju route block)。

---

## 2·**A·base·主考 + 3 试 journey + 校阅大典**

### 2.1·主考·朝代-aware regex (兵系·非礼系)

```js
var WUJU_CHIEF_EXAMINER_TITLE_REGEX = {
  tang:    /兵部尚书|大将军|节度使|招讨使/,
  song:    /枢密使|签书枢密院事|兵部尚书|经略安抚使/,
  ming:    /兵部尚书|总督|提督|总兵|协办大学士/,
  qing:    /兵部尚书|大学士|军机大臣|提督|总督/,
  default: /兵部|枢密|总督|提督|总兵|大将军/
};
```

**注·元朝无武举·skip era gate** (见 §12)。

### 2.2·journey·3 试

- **童试 (清专)**·豁免 (G3 简化)
- **乡试**·**外场**·骑射 / 步射 / 技勇
- **会试**·**外场 + 内场**·策论默孙吴
- **殿试**·**御前校阅**·演武·圣上钦点 (跟谢恩大典对比)

### 2.3·武进士标记·_kjG3MarkWujinshi

```js
function _kjG3MarkWujinshi(wujinshi, examYear, examiner, td, exteriorScores) {
  wujinshi._specialExamType = 'wuju';
  wujinshi._wujuYear = examYear;
  wujinshi._wujuExaminer = examiner.name;
  wujinshi._wujuInitiative = (td && td.initiative) || 'passive';
  wujinshi._wujuSubtype = (td && td.subtype) || 'periodic';
  // 外场考成绩 (G3 J 字段深生成 §11)
  wujinshi._arrowHits3 = exteriorScores.arrowHits3;   // 0-3
  wujinshi._bowStrength = exteriorScores.bowStrength;  // 1/3/5 石档
  wujinshi._stoneLift = exteriorScores.stoneLift;      // 100/200/300 斤档
  wujinshi._horseRiding = exteriorScores.horseRiding;  // '上'/'中'/'下'
  // graduateTitle·按外场总分排名定
  wujinshi.graduateTitle = _kjG3DeriveWujuTitle(exteriorScores);
  // '武状元' / '武榜眼' / '武探花' / '武进士'
  wujinshi.keju_status = '武进士';
  // archetype·按 valor / military / personality 3 维派生
  wujinshi._wuArchetype = _kjG3DeriveWuArchetype(wujinshi);
  // memorySeed
  wujinshi.memorySeed = '蒙陛下钦点·武科及第·誓效死命';
  // _origin
  wujinshi._origin = 'wuju';
  // 入武勋派
  if (typeof window._kjG3WujinshiJoinParty === 'function') {
    window._kjG3WujinshiJoinParty(wujinshi, examYear);
  }
  // 派镇·(F 系统)
  if (typeof window._kjG3AssignWujinshiToDepot === 'function') {
    window._kjG3AssignWujinshiToDepot(wujinshi, exteriorScores);
  }
}
```

---

## 3·**B·和平期贬值** (跟 G2 滥开贬值反向 paradigm)

### 3.1·counter + cross-scenario reset (M7)

```js
GM._wujuPeacefulCounter = {
  reignStartYear: 1722,
  peacefulYears: 0,             // 当朝累计 war_state <30 年数
  lastEvalYear: 1722,
  reignName: '雍正'
};
```

**M7·跨剧本 reset**·复用 G2 paradigm`_kjG2MaybeResetCrossScenarioFields`·G3 实施时 patch 该函数·加 `_wujuPeacefulCounter` 字段·

```js
// tm-keju-event-hooks.js·_kjG2MaybeResetCrossScenarioFields 内
['_lastReignChangeYear', ..., '_wujuPeacefulCounter'].forEach(function(k) {
  // 若 obj 含 reignStartYear > P.scenario.startYear + 10·清
  if (GM[k] && GM[k].reignStartYear > startY + thresholdYears) delete GM[k];
});
```

### 3.2·peaceful tier 4 档

```js
function _kjG3CalcWujuPeacefulMultiplier() {
  var n = (GM._wujuPeacefulCounter && GM._wujuPeacefulCounter.peacefulYears) || 0;
  if (n < 5)  return 1.0;        // 战时 / 短和平
  if (n < 10) return 0.8;        // 中期和平
  if (n < 20) return 0.5;        // 长期和平·武进士转文
  return 0.3;                     // 超长和平·武举形式化
}
```

### 3.3·影响·武进士入伍后

- **战时 (mult 1.0)·**武进士直入边镇·war_state 高·5%/turn 战功
- **中期和平 (0.8)·**武进士入伍·prestige base × 0.8·战功 3%/turn
- **长期和平 (0.5)·**部分武进士转文 (officialTitle 改文职)·失意
- **超长和平 (0.3)·**武举武进士仅形式·入伍无具体职位·跟历史明末武举闲置 paradigm 一致

---

## 4·**C·兵议体题目**

### 4.1·题目主题池·按 subtype + war_state

```js
var WUJU_QUESTION_THEMES = {
  'war-crisis': [
    { type: 'cefū',  topic: '边事策',  hint: '议边镇危急·守城/出击/和谈·涉敌情·100-150 字' },
    { type: 'mowrite', topic: '孙吴默', hint: '默孙子兵法/吴起兵法节选·考兵法熟练度' }
  ],
  'general-shortage': [
    { type: 'cefū',  topic: '将才论',  hint: '论选将之道·吕望/韩信典·100-150 字' },
    { type: 'mowrite', topic: '孙吴默', hint: '默孙子' }
  ],
  'periodic': [
    { type: 'cefū',  topic: '守城议',  hint: '议守城之法·瓮城/曦门/壕沟·100-150 字' },
    { type: 'mowrite', topic: '孙吴默', hint: '默兵法' }
  ],
  '_player_edict': [
    // Path C 强发·force 简单题目·避显武人浅
    { type: 'cefū',  topic: '兵议',    hint: '议兵事·100 字·强发故·避具体' },
    { type: 'mowrite', topic: '孙吴默', hint: '默兵法节选' }
  ]
};
```

### 4.2·LLM prompt 区别 (vs G2 歌颂体)

```js
function _kjG3BuildWujuQuestionPrompt(td, examiner) {
  var subtype = (td && td.subtype) || 'periodic';
  var themes = _kjG3GetWujuQuestionThemes(subtype);
  var path = (td && td.historyPath) || '武举';
  var examName = examiner ? examiner.name : '兵部';
  return '【特科·武举·题目】\n' +
    '路径·' + path + '·主考·' + examName + '\n' +
    '【题目体例】**兵议体·涉敌情·务实**·跟文举歌颂体相反·参考历史武举真题。\n' +
    '请生 ' + themes.length + ' 题·按主题池·\n' +
    themes.map(function(t) {
      return '- ' + t.type + '·' + t.topic + ' (' + t.hint + ')';
    }).join('\n') + '\n\n' +
    '返 JSON·{questions: [{type, topic, body: "200 字题面·古文体"}]}';
}
```

---

## 5·**D·武勋派 + 文武不和** (跟 G2 恩科党 5 派系 tension 平行)

### 5.1·`GM._wujuParty` 命名空间·**H1·G3 自创·不动 GM.parties**

**H1 fix·**grep 真 scenarios 0 matches "武勋派"·G3 自创 `GM._wujuParty` 命名空间·**不 push 入 `GM.parties`** (避混 base 派系)。

```js
GM._wujuParty = {
  members:        [],            // 武进士 names 跨 cohort
  cohorts:        {},            // {1735: [...]}
  totalCohorts:   0,
  prestige:       0,
  lastCohortYear: 0,
  tier:           'nascent'      // nascent / established / dominant (武勋)
};
// 注·tinyi v3 集成走 _facIndex hook (跟 G2 _kjG2GetEnkePartyTinyiAffinityBonus 同 paradigm)
// 而非 push 入 GM.parties·避破现派系平衡
```

### 5.2·跟文官派 tension·**3 联动 + 1 黑天鹅**

| 派系互动 | mechanic |
|---|---|
| **武勋派 ↔ 文官派** | tinyi 中·文官 NPC 议武进士·常贬抑 ("武人粗鄙·不堪大任")·武勋派 NPC 反 ("尔等握笔之徒·岂知边事") |
| **武勋派 ↔ 帝党** | 武进士天然亲帝党 (皇威钦点)·tinyi affinity +20·跟 G2 恩科党类似但 base affinity 更高 |
| **武勋派 ↔ 清流** | 清流议·武人邀宠·tinyi affinity -20 |
| **🔥 武勋哗变 (黑天鹅)** | 文官弹劾武进士累计 ≥10·武勋派 prestige ≥80·**2% 概率/turn 触发兵谏** — 武勋派威胁带兵进京·剧本式 dramatic event。**H2 fix·复用 `_kjSpawnYanguanQingyi(party, attackedMember, eventDetail)` 3 positional args** (跟 G2 RBB·BB1 同·真函数 tm-keju-yanguan-qingyi.js:96)·party='武勋派'·attackedMember=触发武进士名·eventDetail="武勋派威胁带兵进京·X 镇 X 营调动 / 兵谏" |

### 5.3·tinyi v3 集成·静态 trait

```js
// _kjG3GetWujuPartyTinyiAffinityBonus(charName, topicOrText)
// 1·若 charName ∈ GM._wujuParty.members·议题含 武举/武进士/边事/兵 → +25 support
// 2·议题含 反武举/罢武人/裁武 → -30 strongly oppose
// 3·tinyi v3 _ty3_inferTopicTags 加 'wuju' / 'anti-wuju' tag (跟 G2 'enke' tag 平行)
```

---

## 6·**E·校阅大典 LLM** (替谢恩大典·完全不同风格)

### 6.1·prompt

```js
function _kjG3BuildWuJiaoyueDaCeremonyPrompt(wujinshiList, examiner, td) {
  var names = (wujinshiList || []).slice(0, 5).map(function(j) { return j.name; }).join('、');
  var year = _getCurYear();
  var path = td && td.historyPath || '武举';
  return '【校阅大典·御前演武】\n' +
    '年·' + year + '·路径·' + path + '·主考·' + (examiner ? examiner.name : '兵部') + '\n' +
    '武进士代表·' + names + (wujinshiList && wujinshiList.length > 5 ? '等' + wujinshiList.length + '人' : '') + '\n\n' +
    '请以御前校阅书记官口吻·写一份校阅记 (古文铺陈体·200-300 字)·\n' +
    '- 描武进士演武·箭中红心·开弓负重·骑射纵横\n' +
    '- 圣上点评·赐甲胄 / 弓矢 / 战马 / 兵符\n' +
    '- 京营观礼·百官失色\n' +
    '风格·铺陈式·避白话·不可批评朝政·**跟谢恩大典叩拜风格完全相反**\n\n' +
    '只返校阅记正文·不要标题。';
}
```

### 6.2·赐物机制·**M6 fix**·explicit resources.* 路径

```js
function _kjG3ApplyWuxiangshiRewards(wujinshi) {
  if (!wujinshi.resources) wujinshi.resources = {
    privateWealth: { money:0, grain:0, cloth:0 },
    publicPurse:   { money:0, grain:0, cloth:0 },
    fame:0, virtue:0, health:80, stress:0
  };
  var t = wujinshi.graduateTitle;
  // M6·explicit resources.privateWealth 路径 (跟 G2 修后 schema 一致)
  if (t === '武状元') {
    wujinshi.resources.privateWealth.money += 500;
    wujinshi.resources.fame += 30;
    wujinshi._gifts = ['金甲', '玉弓', '战马', '银符'];
  } else if (t === '武榜眼') {
    wujinshi.resources.privateWealth.money += 300;
    wujinshi.resources.fame += 20;
    wujinshi._gifts = ['银甲', '角弓', '战马'];
  } else if (t === '武探花') {
    wujinshi.resources.privateWealth.money += 200;
    wujinshi.resources.fame += 15;
    wujinshi._gifts = ['皮甲', '步弓', '战马'];
  } else {  // 武进士
    wujinshi.resources.privateWealth.money += 100;
    wujinshi.resources.fame += 8;
    wujinshi._gifts = ['皮甲'];
  }
}
```

chronicle 记赐物事件 (跟 G2 谢恩大典 ceremony 同 paradigm)。

### 6.3·跨turn 状态机 (复用 G2 §2.3a 同 paradigm)

`GM._wujuCeremonyQueue` 平行 `GM._enkeXieendaQueue`·resume hook 同位 wire。

---

## 7·**F·派镇系统** (G3 核心·G2 无)

### 7.1·**边镇 scan**·C2 fix·走 GM.officeTree + fallback

**C2 fix·**9 边镇 hard-list grep 0 matches·真 game scenarios 用 `GM.officeTree` (line 17657 绍宋剧本) 官制树。**v2 改 scan**·

```js
function _kjG3GetAvailableDepots() {
  // 1·从 GM.officeTree scan 含 "镇/营/卫/边" keyword 的 office node
  var depots = [];
  function _scan(nodes) {
    if (!Array.isArray(nodes)) return;
    nodes.forEach(function(n) {
      if (!n) return;
      var nm = n.name || '';
      if (/镇|营|卫|关|塞|府/.test(nm) && /兵|军|武|戍|防|守/.test(nm + (n.desc||''))) {
        depots.push({
          name:    nm,
          region:  n.region || nm,
          tier:    n.tier || (/京|京营/.test(nm) ? '营卫' : '边镇'),
          source:  'officeTree',
          node:    n
        });
      }
      if (n.subs) _scan(n.subs);
    });
  }
  _scan(GM.officeTree || []);
  // 2·若 scan 0 (元剧本 / 非边境剧本)·fallback stub
  if (depots.length === 0) {
    depots.push({ name:'京营', region:'京师', tier:'营卫', source:'stub' });
  }
  return depots;
}
```

### 7.2·派镇·**C3 fix**·officialTitle 字符串字段·不动 officeTree

**C3 fix·**真 game 武职在 `char.officialTitle` 字符串 + `char.stance`·**不动 GM.officeTree position node** (避破坏现 office 系统)。

```js
function _kjG3AssignWujinshiToDepot(wujinshi, exteriorScores) {
  // 1·按外场成绩派
  var score = (exteriorScores.arrowHits3 || 0) * 10 +
              (exteriorScores.bowStrength || 0) * 8 +
              (exteriorScores.stoneLift || 0) / 30;
  var depots = _kjG3GetAvailableDepots();
  var depot;
  if (score >= 50) depot = depots.find(function(d) { return d.tier === '边镇'; }) || depots[0];
  else if (score >= 30) depot = depots.find(function(d) { return d.tier === '要塞' || d.tier === '边镇'; }) || depots[0];
  else depot = depots.find(function(d) { return d.tier === '营卫'; }) || depots[depots.length - 1];
  // 2·user 手选 override (Desk template suggestion 走·M5)
  if (GM._wujuPendingDepotAssignments && GM._wujuPendingDepotAssignments[wujinshi.name]) {
    depot = GM._wujuPendingDepotAssignments[wujinshi.name];
  }
  wujinshi._assignedDepot = depot.name;
  wujinshi.location = depot.region;
  // C3·officialTitle 字符串字段·不动 officeTree
  var rank = _kjG3DeriveRankFromGraduateTitle(wujinshi.graduateTitle);  // 都司/游击/守备/把总
  wujinshi.officialTitle = depot.name + (rank || '游击');                 // "宣府游击"
  wujinshi.stance = '保边·' + depot.region;                                // 跟现 char.stance 一致 paradigm
  // chronicle
  GM._chronicle.push({
    turn: GM.turn || 1,
    type: 'wuju_depot_assignment',
    text: _getCurYear() + '年·' + wujinshi.name + '·' + wujinshi.graduateTitle +
          '·派 ' + depot.name + '·任 ' + wujinshi.officialTitle,
    tags: ['科举', '武举', '派镇']
  });
}
```

### 7.3·user UI·派镇·**M5 fix**·走 desk template suggestion paradigm

**M5 fix·**`_kjpReformPanel` 已被 G2 RAA-C2 删 button·v2 改走 desk template suggestion (跟 G2 Path C 一致)·

- 武举 spawn 后·`_kjG3OnWujuApprovedPushDeskSuggestion` 自动 push N 条到 `GM._edictSuggestions`·每 武进士一条·
  - `source: '武举·派镇'`
  - `topic: 武进士 X 名 (武状元/榜眼/...)`
  - `content: '默 ' + auto 派镇·或选 X 镇 / Y 关'`·user 见 desk·一键摘入诏令 textarea 即可手选派镇
- 若 user 不操作·`_kjG3AssignWujinshiToDepot` 自动派·user 见 chronicle 一行汇总
- **零新 panel 改 reform-panel button**

---

## 8·**G·战功联动** (G3 核心·G2 无)

### 8.1·dynamic 概率·war_state + martial_power + era

```js
function _kjG3CalcBattleAchievementProb(wujinshi, warVal, era) {
  var base = 0.05;  // 5% base
  var warMul = warVal >= 60 ? 1.5 : (warVal >= 30 ? 1.0 : 0.5);
  var martialMul = ((wujinshi.valor || 50) + (wujinshi.military || 50)) / 100;
  var eraMul = /唐|tang/.test(era) ? 1.2 : (/明|ming/.test(era) ? 1.0 : 1.0);
  return Math.min(0.25, base * warMul * martialMul * eraMul);  // cap 25%
}
```

### 8.2·战功记录

```js
function _kjG3MaybeAddBattleRecord(wujinshi) {
  if (!wujinshi || !wujinshi._battleRecord) wujinshi._battleRecord = [];
  var warVal = (GM.vars && GM.vars['边事']) ? parseInt(GM.vars['边事'].value, 10) : 30;
  var era = (P && P.scenario && P.scenario.era) || '';
  var prob = _kjG3CalcBattleAchievementProb(wujinshi, warVal, era);
  if (Math.random() >= prob) return false;
  var achievement = _kjG3GenAchievement(wujinshi);  // "破贼 X 千" / "守城逾月" / "斩首 X 级"
  wujinshi._battleRecord.push({
    year: GM.year || 0,
    location: wujinshi._assignedDepot,
    achievement: achievement,
    casualtyEnemy: Math.floor(Math.random() * 1000) + 100
  });
  // 武勋派 prestige + 5
  if (GM._wujuParty) GM._wujuParty.prestige = (GM._wujuParty.prestige || 0) + 5;
  // chronicle
  GM._chronicle.push({
    turn: GM.turn || 1,
    type: 'wuju_battle_achievement',
    text: (GM.year || 0) + '年·' + wujinshi._assignedDepot + '·' + wujinshi.officialTitle +
          ' ' + wujinshi.name + '·' + achievement,
    tags: ['科举', '武举', '战功']
  });
  return true;
}
```

### 8.3·名将事件 (累计 ≥3 战功)

```js
function _kjG3MaybeFireFamousGeneralEvent(wujinshi) {
  if (!wujinshi._battleRecord || wujinshi._battleRecord.length < 3) return;
  if (wujinshi._isFamousGeneral) return;  // 幂等
  wujinshi._isFamousGeneral = true;
  // LLM 写名将传 biography
  // chronicle "X 名将·累战功·X 镇威震"
  // tier·武勋派 prestige +20
}
```

---

## 9·**H·武勋世家** (G3 独家·G2 无)

### 9.1·世家形成

```js
function _kjG3DetectMartialClan() {
  if (!GM._wujuParty || !GM._wujuParty.members) return;
  // 按姓 group·≥2 同姓 → 世家
  var bySurname = {};
  GM._wujuParty.members.forEach(function(name) {
    var surname = name.charAt(0);
    if (!bySurname[surname]) bySurname[surname] = [];
    bySurname[surname].push(name);
  });
  Object.keys(bySurname).forEach(function(s) {
    if (bySurname[s].length >= 2) {
      // 世家形成
      var clanName = s + '家';
      if (!GM._martialClans) GM._martialClans = {};
      if (!GM._martialClans[clanName]) {
        GM._martialClans[clanName] = {
          surname: s,
          members: bySurname[s],
          formedYear: GM.year || 0,
          chronicle: clanName + '将·' + bySurname[s].join('、') + '·世为武勋'
        };
        // chronicle
        GM._chronicle.push({
          turn: GM.turn || 1,
          type: 'martial_clan_formed',
          text: (GM.year || 0) + '年·' + clanName + '将形成·' + bySurname[s].length + ' 人',
          tags: ['科举', '武举', '世家']
        });
      }
    }
  });
}
```

### 9.2·军职荫袭

世家子弟·父辈致仕 / 战死·子可继承军职 (跟现 GM.chars 父子关系联动)。

### 9.3·杨家将 / 岳家军 paradigm

若 GM.chars 含 历史名将姓 (杨 / 岳 / 韩)·**LLM 加 chronicle hint** "杨家将复出" / "岳家军再续"。

---

## 10·**I·清末废武举** (类比 G2 §6 宋特奏名 era-gated)

### 10.1·gate·**M1 fix**·era format 灵活

```js
function _kjG3IsQingLateEra() {
  if (!P || !P.scenario) return false;
  // M1·era format 灵活·"清·乾隆" / "清" / "清·光绪" 都 match
  var era = String(P.scenario.era || '');
  if (!/清|qing/i.test(era)) return false;
  // 光绪 24 年戊戌变法·1898
  return (GM.year || 0) >= 1898;
}
```

### 10.2·触发 keyi 议程·**C1 fix**·openKeyiSession positional

```js
function _kjG3CheckWujuAbolitionTrigger() {
  if (!_kjG3IsQingLateEra()) return null;
  if (GM._wujuAbolished) return null;
  // 1898+·5%/turn 触 keyi "废武举·改新军"
  if (Math.random() > 0.05) return null;
  // C1·真签名 openKeyiSession(topicType, topicData)·2 positional
  if (typeof openKeyiSession === 'function') {
    openKeyiSession('reform', {
      theme:    '废武举·改新军',
      reason:   '火器化·武举形式化·宜废',
      callback: '_kjG3OnWujuAbolitionKeyiCallback'
    });
    return true;
  }
  return false;
}
```

### 10.3·改新军 paradigm

若 user approve·`GM._wujuAbolished = true`·新进士池停 spawn·chronicle "光绪 X 年·废武举·设新军"。

---

## 11·**J·武进士字段深生成** (40+ 字段·跟真 schema 100% 对齐)

### 11.1·jinshi 模板

```js
var wujinshi = {
  // ─── meta ───
  id:         'wuju_' + examYear + '_' + i + '_' + Date.now(),
  name:       _kjG3GenWuName(seed, i),
  age:        22 + Math.floor(rng() * 23),       // 22-45·武人偏年轻
  gender:     '男',
  birthYear:  examYear - age,
  birthplace: assignedDepot.region || '京师',
  ethnicity:  (era === '清' && Math.random() < 0.3) ? '满' : '汉',
  faith:      '儒',
  culture:    '汉',
  learning:   '武举·三试',
  appearance: _kjG3GenWuAppearance(),             // "身长八尺·虎背熊腰·目如朗星"
  diction:    _kjG3GenWuDiction(),                // "辞令直爽·声若洪钟"
  personality: _kjG3GenWuPersonality(archetype),  // "勇猛·寡言·重义"
  location:   assignedDepot.location || '京师',

  // ─── top-level 11 维 (武人偏 valor/military/integrity·低 administration/diplomacy) ───
  loyalty:        50 + Math.floor(rng() * 20),
  ambition:       40 + Math.floor(rng() * 30),
  intelligence:   30 + Math.floor(rng() * 40),
  valor:          60 + Math.floor(rng() * 30),    // **60-90·高**
  military:       50 + Math.floor(rng() * 40),    // **50-90·中高**
  administration: 20 + Math.floor(rng() * 30),    // **低**
  management:     30 + Math.floor(rng() * 30),
  charisma:       40 + Math.floor(rng() * 30),
  diplomacy:      20 + Math.floor(rng() * 30),    // **低**
  benevolence:    30 + Math.floor(rng() * 40),
  integrity:      50 + Math.floor(rng() * 30),

  // ─── 嵌套 resources (真 schema) ───
  resources: {
    privateWealth: { money: 200, grain: 50, cloth: 10 },
    publicPurse:   { money: 0, grain: 0, cloth: 0 },
    fame:          20 + Math.floor(rng() * 20),
    virtue:        10 + Math.floor(rng() * 15),
    health:        80 + Math.floor(rng() * 15),   // **武人 80-95·高**
    stress:        20 + Math.floor(rng() * 20)
  },

  // ─── traits·武人特有 ID + 通用 ID ───
  traits: _kjG3PickWuTraits(archetype),
  // e.g. ['martial:archery', 'martial:cavalry', 'loyal', 'brave', 'wrathful']

  // ─── 派系 / 家族 ───
  faction:    'XX 朝廷',
  party:      '武勋派',
  partyRank:  '末等',
  family:     surname + '氏',
  familyTier: 'common',                            // or 'martial-lineage' (世家)
  familyRole: '武进士',
  clanPrestige: 30,
  mentor:     '',
  hobbies:    '骑射·习兵·研武经',
  innerThought: '末将虽小·愿效犬马于陛下·死战不退。',
  personalGoal: '保边镇·扬威漠北 / 倭海',
  stressSources: ['边事吃紧', '武人不为文官所重'],

  // ─── career·array (真 schema) ───
  career: [{
    year:      examYear,
    title:     '武进士',
    note:      examYear + '年·武科及第·' + jiaIdx + '甲第' + rank + '名',
    date:      examYear + '年',
    desc:      '中武进士·钦点 ' + assignedDepot.title,
    milestone: true
  }],

  // ─── meta ───
  rankLevel:   3,                                  // 武进士 base rank
  title:       graduateTitle,                       // 武状元 / 武榜眼 / etc
  bio:         '本科 ' + graduateTitle + '·' + (td && td.historyPath ? td.historyPath : '武举'),
  class:       _kjG3DeriveClass(martialOrigin),    // '行伍' / '军门' / '寒门' / '武勋世家'
  source:      '武举',
  recruitTurn: GM.turn || 0,
  isHistorical: isHist,                             // 若 draw 真历史武状元 (郭子仪 / 狄青 / etc)
  alive:       true,
  stance:      _kjG3DeriveStance(archetype),       // '保边' / '建功' / '安平'

  // ─── G3 私有 _ 字段 ───
  _origin:           'wuju',
  _wujuYear:         examYear,
  _wujuSubtype:      td && td.subtype,             // 'war-crisis' / 'general-shortage' / 'periodic'
  _wujuExaminer:     examiner.name,
  _wujuInitiative:   td.initiative || 'passive',
  _martialOrigin:    martialOrigin,                 // 'army-line' / 'martial-clan' / 'commoner-warrior' / '行伍'
  _wuPartyLineage:   null,                          // 世家形成后 set
  _battleRecord:     [],                            // 长尾
  _arrowHits3:       arrowHits,                     // 0-3·外场考成绩
  _bowStrength:      bowStrength,                   // 1-5 (石档)
  _stoneLift:        stoneLift,                     // 100-300 (斤档)
  _horseRiding:      riding,                        // '上'/'中'/'下'
  _wuArchetype:      archetype,                     // 5 类
  _historicalFigure: isHist,
  _assignedDepot:    depot.name,
  _wujuMartialAffinity: martialAffinity,
  _wujuMultiplier:   mult,
  _isFamousGeneral:  false,                         // 累计 3 战功 → true
  graduateTitle:     graduateTitle,                 // 武状元 / 武榜眼 / 武探花 / 武进士
  keju_status:       '武进士',
  memorySeed:        '蒙陛下钦点·武科及第·誓效死命·镇守 ' + depot.region
};
```

### 11.2·5 archetype 派生

```js
function _kjG3DeriveWuArchetype(wujinshi) {
  var v = wujinshi.valor || 50;
  var m = wujinshi.military || 50;
  var l = wujinshi.loyalty || 50;
  if (v >= 75 && m < 50) return 'brave_brash';      // 莽勇·万人敌型
  if (m >= 75 && v < 60) return 'tactician';         // 智将·韩信型
  if (l >= 70 && v >= 60) return 'loyalist';         // 忠勇·岳飞型
  if (v < 50 && m >= 60) return 'coward_clever';    // 怯弱·官场油子
  return 'mercenary';                                 // 兵痞·只看赏赐
}
```

### 11.3·历史武状元 draw·**M2 fix**·10-20 典型·非全 108

```js
// M2·实施时填 10-20 典型·避全 108 空指针 (清武状元名册仅部分有传记)
var HISTORICAL_WUJUYUAN = {
  tang: ['郭子仪', '徐茂功', '李存孝'],            // 3
  song: ['狄青', '徐徽言', '岳云', '韩世忠'],       // 4
  yuan: [],                                          // 元无武举
  ming: ['徐文炜', '俞大猷', '戚景通'],              // 3
  qing: [
    '马全', '邸飞', '杨谦光', '李宝盛', '汪鸣相',
    '裕昌', '张鸿翥', '黄继昌', '马鸿图', '徐华清',
    '邸建昌', '哈丹巴特尔', '安朝湘', '范廷瑞', '李振祥'
  ]                                                  // 15 典型 (从 108 武状元中选)
};
```

若 `_historicalAllowed=true` (peaceful tier mult >= 0.8)·有 30% 概率 draw·跟 G2 historicalFigure 同 paradigm。

---

## 12·**K·LLM dialog 口吻区分**

### 12.1·tinyi v3 + 全 LLM 系统 prompt 注入

```js
function _kjG3GetWuToneHint(ch) {
  if (!ch || ch._origin !== 'wuju') return '';
  var archetype = ch._wuArchetype || 'mercenary';
  var TONES = {
    brave_brash:     '军人口吻·直爽 / 武断·"末将" / "末将不才"·偶有粗语·**避之乎者也**',
    tactician:       '军人口吻·沉稳 / 谋略·"末将以为" / "依末将拙见"·偶用兵法典',
    loyalist:        '军人口吻·忠义 / 死战·"末将愿效死命" / "末将不敢辱命"',
    coward_clever:   '军人口吻·圆滑 / 闪烁·"末将不才·恐难胜任"',
    mercenary:       '军人口吻·直接 / 利益·"末将愿效力·只求赏厚"'
  };
  return TONES[archetype] || TONES.mercenary;
}
```

注入 sc1q / 廷议 / wendui / 全 LLM prompt builder。

---

## 13·**L·武进士长尾·战死 + 荫袭**

### 13.1·health 损耗机制

每 turn·若 war_state >= 60·武进士 (`_origin='wuju'`) health -= 5% 概率 (5%/turn)·若 health <= 0·**战死**·chronicle "X 镇都司 X 名·阵亡"。

### 13.2·荫袭

若武进士 alive=false·世家子弟 (同姓 + 父辈致仕)·**自动 spawn 子 char**·父辈 officialTitle 部分继承 (降一档)。

---

## 14·新文件 + 改文件

### 14.1·**新·`tm-keju-wuju.js`** (~700-900 行)·跟 G2 enke.js 同 paradigm

```
- §0·gate·_isG3Enabled
- §1·主考 pick·_kjG3PickWujuChiefExaminer + 朝代-aware regex
- §2·journey runner·_kjG3RunWujuExam + 校阅大典 LLM
- §3·武进士标记·_kjG3MarkWujinshi
- §4·spawn 池·_kjG3SpawnWujinshiPool (pool size by era)
- §5·主入口·_kjG3OnWujuApproved (复用 G2 callback router)
- §6·reject / defer handlers
- §7·B·和平期 counter·_kjG3CalcWujuPeacefulMultiplier
- §8·C·兵议体题目·_kjG3GenWujuQuestions
- §9·D·武勋派 + 文武 tension·_kjG3InitWujuParty / Join / tinyi affinity
- §10·E·校阅大典 LLM·_kjG3RunWuJiaoyueDaCeremony + ResumeIfPending
- §11·F·派镇·_kjG3AssignWujinshiToDepot + 9 边镇 + hybrid UI hook
- §12·G·战功·_kjG3MaybeAddBattleRecord + FamousGeneral event
- §13·H·世家·_kjG3DetectMartialClan + 荫袭 hook
- §14·I·清末废武举·_kjG3IsQingLateEra + abolition trigger
- §15·J·字段深生成·_kjG3GenWuPersonality / Appearance / Archetype / Traits
- §16·K·LLM tone hint·_kjG3GetWuToneHint
- §17·L·长尾·health 损耗 + 战死 + 荫袭
- §18·expose (~40 helpers)
```

### 14.2·**改·`tm-keju-enke.js`** (~5 行·G2 callback 加 wuju route)

`_kjG2SpecialExamKeyiCallback` 内·`if (td.examType === 'wuju') return _kjG3OnWujuApproved(td.subtype, td);`

### 14.3·**改·`tm-edict-lifecycle.js`** (~15 行·EDICT_TYPES 第 14 类 wuju)·**M4 fix·strong keyword**

```js
wuju: {
  label: '武举',
  lifecycleDays: 1095,
  immediate: false, phased: true,
  historyPaths: ['war-crisis', 'general-shortage', 'periodic', 'muster-warriors', '无故强发'],
  affectedClasses: { '军':+15, '士林':-3, '国库':-15 },
  resistance: { '文官':40, '清议':30, '兵部':20 },
  unintendedRisk: 'military_coup_risk',
  // M4·strong keyword 必含一·避 "选武" 跟 "选兵" 撞
  keywords: ['武举', '武科', '募将', '设武科', '钦点武状元']  // 删 '选武' (撞 '选兵')
}
```

**parser 优先级 (in `tm-keju-wuju.js _kjG3ParseWujuFromEdictText`)·**

```js
function _kjG3ParseWujuFromEdictText(text) {
  if (!text) return null;
  // M4·strong keyword 必含一
  if (!/武举|武科|募将|设武科|钦点武状元/.test(text)) return null;
  // 弱 keyword 单独不够·避 "选武" 跟 "选兵" 撞
  // ... subtype 推断
}
```

### 14.4·**改·`tm-tinyi-v3.js`** (~3 行·加 wuju / anti-wuju tag)

### 14.5·**改·`tm-endturn-pipeline-steps.js`** (~10 行·G3 hooks·peaceful counter / battle achievement / family clan)

### 14.6·**改·`index.html`** (~1 行·script tag)

### 14.7·**新 smoke·`scripts/smoke-keju-wuju.js`** (~80-95 case·14 section)

---

## 15·实施序·**~17-21 d**

| step | sub-slice | est |
|---|---|---|
| 0 | event hook 补 | 0.3 d |
| a | A·base + 主考 + journey + Path B/C | 2.5-3 d |
| b | B·和平期贬值 | 0.8 d |
| c | C·兵议体题目 | 1 d |
| d | D·武勋派 + 文武 tension | 2-2.5 d |
| e | E·校阅大典 LLM | 1.2 d |
| f | F·派镇 + hybrid UI | 2-2.5 d |
| g | G·战功联动 | 1.5-2 d |
| h | H·武勋世家 + 荫袭 | 1.5 d |
| i | I·清末废武举 | 1 d |
| j | J·字段深生成 (40+ 字段) | 1.5-2 d |
| k | K·LLM tone hint | 0.8 d |
| l | L·长尾 (战死 + 荫袭) | 0.8 d |
| smoke | 80-95 case·14 section | 0.8-1 d |
| **total** | | **~17-21 d** |

---

## 16·LLM cost 量化

| 场景 | call | 平均 token | per-wuju |
|---|---|---|---|
| 兵部上奏 (G1) | 1 | 220 | 220 |
| 兵议题目 (C) | 1 | 500 | 500 |
| 校阅大典 (E) | 1 | 400 | 400 |
| 答卷·n_jinshi=20 | 20 | 300 | 6000 |
| 兵议 NPC tone (K)·全 LLM 系统通用·额外 cost·0 (静态 tone hint inject) | 0 | 0 | 0 |
| 名将传 (G·稀)·~1/年 | 0.1 | 500 | 50 |
| **per 武举** (n=20·武状元路径) | ~22 + 0.1 | — | **~7170 token** |
| **per 朝代** (3 次武举) | ~67 call | — | **~21500 token** |

---

## 17·red line check·v1

| red line | v1 适应 |
|---|---|
| 复用 first | 80% G2 paradigm + 20% G3 新 |
| 自然军政触发 | G1 wuju 已 ship·war_state/缺将/periodic |
| 失败禁玄幻惩罚 | 军心动摇·边镇怒·全自然 |
| 工具 vs 系统 | 系统型·keyi + chars 长尾 + war_state 联动 |
| flag gate | useNewKejuG3 默认 off |
| 9 朝代 preset | 元朝无武举 + 清末 1901 废 |
| 邸报中文 | 全中文 |
| audit-first | v1 → audit → v2 → implement |
| 特科必须独深 | G3 独 runner·跟 G2/G4/G5 各独 |
| 校阅大典 LLM 古文 | 真历史风格 |
| 和平期贬值 (vs G2 滥开) | 反向 paradigm |
| 兵议体 (vs G2 歌颂体) | 实务 vs 歌颂相反 |
| 武勋派 cross-faction | 跟文官派 tension + 兵谏黑天鹅 |
| 9 边镇 GM.officeTree 联动 | 派镇真 wire |
| 战功联动 (G3 新) | war_state + martial 派生·真概率 |
| 武勋世家 + 荫袭 | G3 独家 |
| 清末废武举 | era + year gate + keyi |
| 字段深生成 40+ | 跟真 chars schema 100% 对齐 (G2 schema 错位修后参考) |
| LLM dialog 口吻 | 军人独·sc1q / 廷议 / 全 LLM 注入 |
| 长尾·战死 / 荫袭 | health 损耗 + 子继承 |

---

## 18·post-G3·next

- **G3·武举·当前·**v1 ready·~17-21 d
- G4·翻译科 (~4-5 d·清专有·满汉双语)
- G5·童子科 (~3-4 d·罕见 + 长尾深)
- Phase H·私学/书院 (~10-14 d)
- Phase I·宦官干预 (~6-9 d·明清专有)

---

## 19·v1 ready 验

- ✅ 14 sub-slice (0/A-L) 全 cover·max-scope
- ✅ G2 复用 80%·新作 20% (校阅 / 派镇 / 战功 / 世家 / 字段深 / LLM tone)
- ✅ **武进士字段 40+·跟真 schema 100% 对齐** (避 G2 错位重演)
- ✅ 文举 vs 武举·**呈现差异 14 维表** (G3 卖点)
- ✅ 9 朝代差异·元无 + 清末废
- ✅ 3 路径 + 诏令 EDICT_TYPES.wuju 第 14 类
- ✅ 9 边镇 GM.officeTree 联动 + 派镇 hybrid UI
- ✅ 战功 dynamic 概率 (war_state + martial + era)
- ✅ 武勋世家 + 荫袭 (G3 独家)
- ✅ 清末废武举 keyi 议政 (戊戌后)
- ✅ 5 archetype + 4 武origin + 历史武状元 draw
- ✅ LLM tone hint 5 类·sc1q / 廷议 / wendui / 全注入
- ✅ 长尾·health 损耗·战死·荫袭
- ✅ LLM cost 量化 ~7170/武举
- ✅ red line 21 项·全合规

**v1 ready·等 user pass + audit (跟 G2 同 paradigm 三层 audit·~1 d) + v2 (audit fix·~0.5-1 d) + implement (~17-21 d)**

---

## 20·**修订日志**

- **v1·2026-05-25**·首版·max-scope·14 sub-slice·40+ 字段深生成·跟真 schema 对齐·G3 独家 (校阅大典 / 派镇 / 战功 / 武勋世家 / 荫袭)·17-21 d 实施
- **v2·2026-05-25**·**audit pickup·16 项 fold** (3 CRITICAL + 3 HIGH + 7 MID + 3 LOW)·真函数 / 真 schema verify·C1·openKeyiSession 真签名 positional·C2·9 边镇改 GM.officeTree scan·C3·武职用 char.officialTitle 字符串字段·H1·武勋派 G3 自创·H2·_kjSpawnYanguanQingyi 3 positional·H3·G2 callback patch 位置·M1·era format 灵活·M2·历史武状元 15 典型·M4·EDICT strong keyword·M5·派镇 UI 走 desk paradigm·M6·赐物 explicit resources path·M7·跨剧本 reset 加 _wujuPeacefulCounter·实施时间不变 17-21 d

- **v3·2026-05-25**·**RAA 18 项 + RBB 14 项全修·ship-ready**·smoke 135 PASS / 0 FAIL·零回归·

  **RAA·18 项** (Round AA·全修)·
    - C1·_kjG3ScanCtxInputEdictsForWuju (Path C edict scan 真 wire)·C2·char.party='武勋派' (避 chars 面板派系空)·C3·_kjG3RecordWenguanImpeachment expose (counter helper)·C4·_kjG3CleanupYuanStuckWujuSpawn (元朝 G1 wuju trigger 清)
    - H1·_kjG3OnWujuTriggerEnqueueDeskSuggestion·H2·_kjG3OpenBingbuWujuWendui (Path B 兵部 wendui)·H3·_kjG3ApplyWujuLifecycleCost (EDICT_TYPES.wuju 应用)·H4·_kjG3MaybeUpdatePartyTier (prestige tier 升级)
    - M1·历史武将 valor/military 86-94 boost·M2·_kjG3GenInheritedName (荫袭 name chain 限制 + 数字序号)·M3·M4·M5·M6·M7·_kjG3PushWujuKeyiPromoteQueue (G1 spawn 进 promote queue)
    - parse·'募将' subtype 加入 general-shortage regex·schema 修后 D2 valor 60-95 (允许 hist boost)·116 smoke 全 PASS / 0 FAIL

  **RBB·14 项** (Round BB·跨系统 + edge + race + 数据流深 audit)·
    - **HIGH 4**·
      - **BB1**·`_kjG3NukeStaleWujuWenduiContext` 加·wire 进 pipeline·清 deepClone(GM) 后残 wendui modal context (跟 G2 BB5 同 paradigm)
      - **BB2**·`_kjG3RecordWenguanImpeachment` 真 SET hook·tinyi v3 `_ty3_buildAccusationMemorialStructured` 内 inline·accused.\_origin=='wuju' 且 accuser 非 wuju → counter +1 (避兵谏永不触发)
      - **BB3**·`_kjG3MaybeFireMilitaryCoupRisk` fire 后·`GM._wenguanImpeachmentCount = 0` reset + `GM._wujuCoupFiredTurn` 标 (防同状态下 turn 重复 fire)
      - **BB4**·`_finalize` 闭包 wujinshiList 跨 save/load 丢失·`pending.wujinshiNames` reFind 重建 (LLM async + save 期间崩盘保险)
    - **MID 7**·
      - **M1**·`_kjG3MaybeUpdatePartyTier` 加 doc·prestige OR cohort 任一达档·tier 升·non AND
      - **M2**·荫袭子 age/birthYear 加 ±2 jitter (16-20)·避同年荫袭子全 18 岁
      - **M3**·历史武将 boost 扩 i<3 (前 3 名都可 draw)·i>0 50% gate·重名查 chars + wujinshiList
      - **M4**·`_historicalFigure` G3 私有字段 drop·`isHistorical` 作 canonical (跟 game-wide editor/scenarios 一致)
      - **M5**·`_kjG3SetUserDepotOverride(name, depot)` helper 加·UI 真 wire 入口·_wujuPendingDepotAssignments 真填
      - **M6**·`_kjG3ApplyWujuLifecycleCost` 跟 `_kjG3MaybeFireMilitaryCoupRisk` 同 turn 互斥·`GM._wujuCoupFiredTurn` guard·防 5% lifecycle prob + 2% maybeFire 同 turn 重 fire
      - **M7**·`_kjG2MaybeResetCrossScenarioFields` 扩 G3 字段·新 scenario 强清·`_wujuCeremonyQueue / _wujuPendingDepotAssignments / _wenguanImpeachmentCount / _wujuCoupFiredTurn / _wujuAssignSpinIdx / _wujuBingbuWenduiLastYear`
    - **LOW 3**·
      - **L1**·`_kjG3GetWujuPartyTinyiAffinityBonus` doc 标 DEFERRED (跟 G2 enkeParty affinity L1 同·tinyi v3 整合 backlog)
      - **L2**·`_kjG3AssignWujinshiToDepot` 加 `_wujuAssignSpinIdx` rotate·同 turn 多 wuju 分到不同镇 (防全堆宣府)
      - **L3**·本 doc v3·反映 RAA + RBB 全修
    - **smoke**·`smoke-g3-wuju.js` §S 加 14 case (S1-S19)·116 → 135 PASS·全过·零 regression (G2 enke 155 / G1 51 / L1-L12 1000+ 全 0 FAIL)
    - **ship-ready**·G3 武举完工·待 G4 翻译科 / G5 童子科 启动信号 (科举 keju 全部完工前·按 user 锁·绝不 ship / git commit)
