# 科举·Stage 2·Phase G·**G2·恩科 mini-keju** (A+B+C+D+E 全维度)

**date**·2026-05-25
**status**·**draft v3.1·Path C 接入诏令系统** (基于 v3·user 提"C·主动应与诏令系统结合")
**estimated**·**9.5-12.5 d** (v3 9-12 d → v3.1·Path C 改诏令集成·新增 edict type + parser keyword + applyEdictActions hook + desk template suggestion·略加 0.5 d)
**dependency**·G1 spawn (已 ship) + keyi callback chain (复用 L7 paradigm) + 现 keju runtime + E2 cohort meet + tinyi v3 + L7 reform memorial paradigm + L4 wendui 'cedui' mode + **诏令系统** (`tm-edict-lifecycle.js` 12 类 + `tm-edict-parser.js` 17 type + `applyEdictActions` Phase 2.5 + `GM._edictTracker` + `_renderEdictSuggestions` desk UI + `aiEdictEfficacyAudit`)
**flag gate**·`P.conf.useNewKejuG2=false` 默认 off (依赖 D2 已开)

**红线 reminder**·
- 复用·走现 keyi → callback → keju runtime → exam 流程·非自建 runner
- 自然政治触发·5 类·**严禁玄幻**·非天命非彗星
- 失败禁玄幻惩罚·prestige / minxin / 党争·全自然政治后果
- 工具 vs 系统·恩科是**系统型**·**所有 3 路径都挂代价·不能搞工具型零代价 fire**
- 9 朝代 preset·各朝触发频率不同·清最 dense·宋偏特奏名变体
- audit-first·v1 → audit → v2 → **v3 (current)** → implement

---

## ★★★·v3.1 修订摘要 (基于 v3·user 提"Path C 应接入诏令系统")

| # | 题源 | v3 状态 | v3.1 修法 |
|---|---|---|---|
| **v3.1-1** | user·"C·主动应与诏令系统结合" | Path C 走 `_kjpReformPanel` 加 button + 自管 cost·**绕开现 12 类 edict lifecycle / parser / tracker / efficacy audit** | **§2.0a Path C 重写**·**新加 `enke` 为 EDICT_TYPES 第 13 类** + parser keyword·走 `applyEdictActions` 标准 hook·`GM._edictTracker` 自动 track·chronicle "陛下诏令" source 自动 surface·**desk 加 5 自然 trigger template + "无故强发" template** (复用 `_renderEdictSuggestions`)·删 reform-panel button |
| **v3.1-2** | 顺带 | edict 类型 enke 的代价需跟 lifecycle paradigm 一致 | **§3.8 新加**·`lifecycleDays:730` (2 年 phased) + `resistance:{清议:30, 常科派:40, 礼部:50}` + `unintendedRisk:'enke_abuse_party'` + `affectedClasses:{士林:+10, 官僚:-5, 国库:-8}`·走 `aiEdictEfficacyAudit` 让 LLM 评效果 |
| **v3.1-3** | 顺带 | 5 自然 trigger 时·desk 应主动 suggest | **§2.0a.3 新加**·`_kjG2OnNaturalTriggerEnqueueDeskSuggestion`·5 trigger SET 字段时·自动 push 到 `_renderEdictSuggestions` source pool·desk tab 见 "本朝可开恩科·登基恩科 template" 按钮·click 填入 textarea |

---

## ★★·v3 修订摘要 (基于 v2·user 提出 2 新需求·v3.1 保留)

| # | 题源 | v2 状态 | v3 修法 |
|---|---|---|---|
| **v3-1** | user·"滥开贬值如何体现" | §3 只 prestige multiplier·UX 单一 | **§3.3-3.5 加 3 维 UX 体现**·LLM 上奏措辞 4 档 + chronicle 措辞 4 档 + 言官清议触发率 4 档 |
| **v3-2** | user·"滥开贬值通过生成的人物数值水平等体现" | jinshi 仅 prestige 受 mult | **§3.6 新加·jinshi quality degradation 5 维**·fame/virtue base mult + historicalFigurePolicy 切断 + learning_traits 偏负 + archetype sycophant + name 池二线化 |
| **v3-3** | user·"玩家怎么恩科" | 仅 path A 被动 | **§1.2 + §2.0a 加 3 路径**·A 被动 + B 半主动 (礼部 wendui) + C 主动 (**v3.1 改诏令**) |
| v3-4 | 顺带补 | §3 reject 是否 +1 counter 未明 | **§3.7 明指·reject 不 +1 counter** |

---

## ★·v2 修订摘要 (audit pickup·15 项·v3 保留)

| # | severity | 编号 | 原 v1 问题 | v2 修法 |
|---|---|---|---|---|
| 1 | **CRITICAL** | B1 | `_lastReignChangeYear` / `_lastImperialWeddingYear` **只读·零处 SET**·4 of 5 enke trigger 永远死 | **§2.0 新增 event hook 模块**·登基 / 改元 / 大婚 / 平大乱 / 瑞祥 5 类事件源·在固定 hook 点 SET 字段 |
| 2 | HIGH | A1 | Path A·changchao 自然议假设有 `resolution: approve/reject/defer`·grep 0 matches | **Path B·正式 keyi 投票**·切换·复用 L7 memorial / 廷议 paradigm |
| 3 | HIGH | C1 | 同 A1·outcome routing 路径不通 | 同 A1·Path B 一并解决 |
| 4 | HIGH | D1 | 同 A1·enke approve callback 调不到 | 同 A1 |
| 5 | MID | B2 | 主考 regex `/大学士\|礼部尚书\|内阁/` 唐宋无内阁 | **朝代-aware regex**·9 朝代 preset 各自字典 |
| 6 | MID | B3 | prestige multiplier 应用点未明 | **§3.2 明指**·`_kjG2MarkEnkeJinshi` 内·一处 apply |
| 7 | MID | C2 | 谢恩大典若跨 turn LLM 异步·jinshi 未标 | **§2.3a 加状态机** + 重入保护 |
| 8 | MID | D2 | LLM 成本未量化·恩科党 NPC tinyi 每议 +1 LLM call | **§9 cost 表**·恩科党 trait 静态 affinity·零 LLM call |
| 9 | MID | D3 | 9 朝代 preset 未 enumerate | **§2.5 preset 补表**·9 剧本 enke_triggers 字段值 |
| 10 | MID | A4 | 恩科党 UI 入口未明 | **§5.6 加 4 入口** |
| 11 | MID | E2 | 宋特奏名 age 字段 source 未明 | **§6.0 fix**·三层 fallback |
| 12 | MID | playerBirth | `P.playerInfo.birthYear` 不存在 | **§2.0.3 三层 fallback** |
| 13 | LOW | doc-1 | smoke section 数错 | **§7.11 统一 11 section** |
| 14 | LOW | doc-2 | post-G2 未列 G1 已 ship | **§11 改** |
| 15 | LOW | doc-3 | v1 §12 ready 验数错 | **§12 校正** |

---

## 0·sprint scope·v3 估时

| sub-slice | 内容 | v2 est | **v3 est** | Δ 原因 |
|---|---|---|---|---|
| **0·B1 event hook 前置** | 5 类事件源 SET 字段 + 6 hook 点 + birthYear fallback | 0.8-1 d | 0.8-1 d | — |
| **A·base** | 5 触发 + 礼部主导 + 谢恩大典 + 特赐进士 + 帝党 + 不办惩罚 + Path B keyi 投票 | 2.2-2.7 d | 2.2-2.7 d | — |
| **0a·player initiative B+C** | **新·礼部 wendui (B) + 改革面板手谕 (C)**·复用 L4 cedui mode + `_kjpReformPanel` | — | **1.2-1.5 d** | **v3 新** |
| **B·滥开贬值·数值** | counter + multiplier + 朝代-aware regex | 0.6 d | 0.6 d | — |
| **B-UX·滥开贬值·UX 三维** | **新·LLM 上奏措辞 4 档 + chronicle 措辞 4 档 + 言官清议触发率 4 档** | — | **0.6-0.8 d** | **v3 新** |
| **B-deep·jinshi quality degradation** | **新·fame/virtue base mult + historicalFigure 切断 + learning_traits 偏负 + archetype sycophant 倾向** | — | **0.7-1 d** | **v3 新** |
| **C·歌颂体题目** | LLM prompt 区别·主题池 + 跨turn 状态机 | 0.8-1.1 d | 0.8-1.1 d | — |
| **D·恩科党** | 跨 cohort + 5 派系 + tinyi 静态 trait + UI 4 入口 | 1.6-2.1 d | 1.6-2.1 d | — |
| **E·宋特奏名变体** | 宋剧本 + 年龄 fallback | 0.7-1 d | 0.7-1 d | — |
| smoke | ~70-85 case·14 section (扩) | 0.6-0.8 d | **0.8-1 d** | section 加 |
| **total** | | 6.5-8.5 d | **~9-12 d** | **+2.5-3.5 d** (3 块新加·都是 user 提的) |

---

## 1·hookup·**3 路径 (v3 扩)**

### 1.1·现 G1 spawn → keyi agenda 路径已 wired

G1 `_kjConsumeSpecialExamForAgenda` 输入 _cc2 source pool·LLM 改写礼部 NPC 上奏·user 在 changchao 见 "礼部·恩科·恭逢圣寿 60·礼部请开恩科"。

### 1.2·**(v3 大改)·3 路径列表·按代价升序**

| 路径 | 发起者 | UX 入口 | 代价 | 适用场景 |
|---|---|---|---|---|
| **A·被动** (v2 已有) | 系统 G1 trigger·礼部上奏 | changchao agenda → keyi 投票 | 0 (system spawn) + keyi reject 代价 (§2.6) | 5 自然事件·user 拍板 |
| **B·半主动·礼部 wendui** (v3 新) | user 暗示礼部 | changchao NPC list → 礼部尚书 → wendui 话题选 "开恩科" | 1 wendui call + 礼部若反 -10 affinity·若强行进 C 路径 -20 affinity | user 想开但无自然 trigger·需礼部背书 |
| **C·主动·下诏 (v3.1 改·诏令系统)** | user 在 desk 御案写诏令·或点 template suggestion | **御案 desk → 诏令 textarea·5 template + "无故强发" template (复用 `_renderEdictSuggestions`)·parser 识别 → applyEdictActions trigger enke** | 诏令 lifecycle 自带·**resistance 60% (清议30+常科派40+礼部50)·unintendedRisk='enke_abuse_party'·affectedClasses (士林+10 / 官僚-5 / 国库-8)·lifecycleDays 730 (2 年 phased)·aiEdictEfficacyAudit LLM 评效果** + 若是"无故强发"·走 §3.6 最差档 + 永入 `GM._edictTracker` + chronicle "陛下诏令" source 自动 surface | user 无自然 trigger 强开·或被礼部 reject 后强发·或想用 5 自然 trigger template 一键 |

**all 3 路径都 honor 红线** (memory `feedback_tool_vs_system_costs`)·**全是系统型·都挂政治后果**·非工具型零代价 fire。

### 1.3·**KEYI_TOPIC_TYPES 注册·special_exam** (v2 不变)

```js
special_exam: {
  title: function(td) { return '议·' + (({ enke:'恩科', wuju:'武举', fanyi:'翻译科', tongzi:'童子科' })[td && td.examType] || '特科'); },
  shortLabel: '特科·议开',
  threshold: 0.4,
  callback: '_kjG2SpecialExamKeyiCallback',
  description: '议特科开闭·允/驳/推迟',
  sliceOwner: 'G2'
}
```

### 1.4·spawn → keyi promote bridge (v2 不变)

```js
function _kjG2DecorateSpawnedEntryForKeyi(entry) {
  entry._kjPromoteToKeyi = true;
  entry._kjKeyiTopicType = 'special_exam';
  entry._kjKeyiTopicData = {
    examType: entry.type,
    subtype: entry.detail && entry.detail.subtype,
    reason: entry.reason,
    spawnYear: entry.spawnedYear,
    detail: entry.detail,
    initiative: entry._kjInitiative || 'passive'  // **v3·标 path A/B/C**
  };
  return entry;
}
```

### 1.5·keyi callback (v2 不变)

```js
function _kjG2SpecialExamKeyiCallback(session) {
  if (!session || !session.topicData) return;
  var td = session.topicData;
  if (td.examType !== 'enke') return;
  if (session.outcome === 'approve') _kjG2OnEnkeApproved(td.subtype, td);
  else if (session.outcome === 'reject') _kjG2OnEnkeRejected(td);
  else if (session.outcome === 'defer') _kjG2OnEnkeDeferred(td);
}
```

---

## 2·**A·base + 谢恩大典**

### 2.0·event hook 模块 (v2·不变)

#### 2.0.1·新文件·`tm-keju-event-hooks.js` (~150-200 行)

```js
function _kjEventOnReignChange(newEmperorName, year) {
  if (typeof GM === 'undefined') return;
  GM._lastReignChangeYear = year || GM.year || 0;
  GM._currentReignName = newEmperorName || '';
  if (typeof window._kjG2ResetEnkeAbuseOnReignChange === 'function') {
    window._kjG2ResetEnkeAbuseOnReignChange();
  }
}
function _kjEventOnImperialWedding(year, spouseName) {
  if (typeof GM === 'undefined') return;
  GM._lastImperialWeddingYear = year || GM.year || 0;
  GM._lastImperialSpouse = spouseName || '';
}
function _kjEventOnPlatformDisasterResolved(year, disasterType) {
  if (typeof GM === 'undefined') return;
  GM._lastPlatformDisasterYear = year || GM.year || 0;
  GM._lastPlatformDisasterType = disasterType || '';
}
function _kjEventOnAuspicePortent(year, portentDesc) {
  if (typeof GM === 'undefined') return;
  GM._lastAuspicePortentYear = year || GM.year || 0;
  GM._lastAuspicePortentDesc = portentDesc || '';
}
```

#### 2.0.2·call site·6 hook 点 (v2·不变·见 §2.0.2 v2 表)

#### 2.0.3·player birthYear 三层 fallback (v2·不变)

```js
function _kjG2GetEmperorBirthYear() {
  var emp = (GM.chars || []).find(function(c) {
    return c && c.alive !== false && (c._isPlayerEmperor || c._isCurrentEmperor);
  });
  if (emp && emp.birthYear) return emp.birthYear;
  if (P && P.playerInfo && P.scenario) {
    var startAge = P.playerInfo.startAge || P.playerInfo.age;
    var startY = P.scenario.startYear || (P.time && P.time.year);
    if (startAge && startY) return startY - startAge;
  }
  return null;
}
```

### 2.0a·**(v3 新加)·player initiative 模块** (Path B + Path C)

#### 2.0a.1·新文件·`tm-keju-enke-player-initiative.js` (~200-280 行)

**Path B·礼部 wendui (复用 L4 cedui mode)**·

```js
function _kjG2OpenLibuEnkeWendui() {
  // gate·若已开过同年 wendui·禁重复
  var thisYear = GM.year || 0;
  if (GM._enkeLibuWenduiLastYear === thisYear) {
    _toast('本年已问过礼部·明岁再议');
    return;
  }
  // pick 礼部尚书·走 §2.1 朝代-aware regex
  var libuLeader = _kjG2PickLibuLeader();
  if (!libuLeader) {
    _toast('朝中无主礼部之人·恩科不可议');
    return;
  }
  // 复用 L4 wendui cedui mode (跟改革问对同框架·archetype = '礼部')
  _kjpOpenWendui({
    mode: 'cedui',
    advisor: libuLeader,
    topic: '开恩科',
    archetype: '礼部',
    topicContext: {
      subtype: '_player_initiated',
      reason: '陛下问·今岁可开恩科否',
      enkeAbuseCount: (GM._enkeAbuseCounter && GM._enkeAbuseCounter.enkeCount) || 0
    },
    onOutcome: function(result) {
      _kjG2HandleLibuWenduiOutcome(libuLeader, result);
    }
  });
  GM._enkeLibuWenduiLastYear = thisYear;
}

function _kjG2HandleLibuWenduiOutcome(libuLeader, result) {
  // LLM 返 stance·'support' / 'oppose' / 'caveat'
  if (result.stance === 'support') {
    // 礼部背书·spawn G1 entry·走 path B
    _kjSpawnSpecialExam('enke', '礼部 (' + libuLeader.name + ') 议·' + (result.reason || '可开'), {
      subtype: 'libu-backed',
      libuLeader: libuLeader.name,
      _playerInitiated: true
    });
    // 自动 promote keyi·跟 path A 汇合
    if (typeof _kjG2DecorateSpawnedEntryForKeyi === 'function') {
      var sp = (GM._specialExamCalendar && GM._specialExamCalendar.spawned) || [];
      if (sp.length) {
        sp[sp.length - 1]._kjInitiative = 'libu_wendui';
        _kjG2DecorateSpawnedEntryForKeyi(sp[sp.length - 1]);
      }
    }
  } else if (result.stance === 'oppose') {
    // 礼部反·affinity -10·写 chronicle
    if (libuLeader._enkeAffinity == null) libuLeader._enkeAffinity = 0;
    libuLeader._enkeAffinity -= 10;
    if (typeof _logChronicle === 'function') {
      _logChronicle({
        kind: 'enke_libu_oppose',
        title: '礼部劝阻',
        body: '陛下问开恩科·礼部 ' + libuLeader.name + ' 劝阻·' + (result.reason || '今岁不宜'),
        year: GM.year || 0
      });
    }
    // user 可走 path C 强发·见 §2.0a.2
    _kjG2MaybeOfferPathCFallback(result);
  } else {
    // caveat·条件性支持·user 决定
    _kjG2HandleLibuCaveat(libuLeader, result);
  }
}
```

**Path C·下诏 (v3.1 重写·诏令系统集成)**·

**v3 错·**v3 用 `_kjpReformPanel` 加 button + 自管 cost·绕开现 12 类 edict lifecycle / parser / tracker / efficacy audit。

**v3.1 修·**Path C 走标准诏令流程·user 像下其他诏令一样下"开恩科"诏·

##### 2.0a.2·新加·EDICT_TYPES 第 13 类 `enke` (in `tm-edict-lifecycle.js`)

```js
// EDICT_TYPES (现 12 类·扩 13)
enke: {
  label: '恩科',
  lifecycleDays: 730,                  // 2 年完成 (筹备 + 乡试 + 会试 + 殿试 + 谢恩)
  immediate: false,
  phased: true,                         // 分阶段·跟 admin_reform / economic_reform 同
  historyPaths: [
    '登基恩科',          // 自然 trigger·subtype: 'reign-change'
    '寿诞恩科',          // subtype: 'birthday'
    '大婚恩科',          // subtype: 'wedding'
    '平乱恩科',          // subtype: 'platform-disaster'
    '瑞祥恩科',          // subtype: 'auspice'
    '无故强发'           // path C only·subtype: '_player_edict'
  ],
  affectedClasses: {
    '士林':  +10,        // 士子蒙恩感激
    '官僚':  -5,         // 常科派资源被分
    '国库':  -8          // 取士+赏赐费
  },
  resistance: {
    '清议士林':  30,     // 讥滥赏
    '常科派':    40,     // 资源争
    '礼部':      50      // 越级或例行不快
  },
  unintendedRisk: 'enke_abuse_party',   // 滥开 → 恩科党尾大不掉 (跟现 'middlemen_skim' / 'elite_backlash' 同 paradigm)
  keywords: ['特赐', '恩科', '开恩', '士子', '恩荣', '蒙恩', '科赐', '钦取']
}
```

##### 2.0a.3·desk template suggestion (复用 `_renderEdictSuggestions`)

5 自然 trigger SET 字段时 (§2.0 event hook)·自动 push suggestion 到 desk·

```js
function _kjG2OnNaturalTriggerEnqueueDeskSuggestion(subtype, detail) {
  if (!GM._edictSuggestions) GM._edictSuggestions = [];
  var template = _kjG2GetEnkeEdictTemplate(subtype, detail);
  GM._edictSuggestions.push({
    category: 'enke',
    badge: '🎓',
    label: template.label,         // "登基恩科" / "60 寿诞恩科" / etc
    body:  template.body,          // 古文诏令文·LLM-pregenerated
    severity: 'normal',
    historyPath: template.path,    // "登基恩科"
    expireAtYear: (GM.year || 0) + 2
  });
}

function _kjG2GetEnkeEdictTemplate(subtype, detail) {
  var TEMPLATES = {
    'reign-change': {
      label: '登基恩科',
      path: '登基恩科',
      body: '朕初膺天命·登基改元·士林翘首·特开恩科一次·以广圣德·凡天下举子·均得与试。礼部尚书主之·限本年内开科。钦此。'
    },
    'birthday': {
      label: '圣寿 ' + (detail.age || '六十') + ' 恩科',
      path: '寿诞恩科',
      body: '朕躬康健·恭逢圣寿' + _kjG2NumToCn(detail.age || 60) + '·士林同庆·特开恩科一次·以光天恩·凡天下举子·均得与试。礼部尚书主之·限本年内开科。钦此。'
    },
    'wedding': {
      label: '大婚恩科',
      path: '大婚恩科',
      body: '朕大婚之喜·普天同庆·特开恩科一次·士子同沾恩荣·限本年内开科。钦此。'
    },
    'platform-disaster': {
      label: '平乱恩科',
      path: '平乱恩科',
      body: '朕赖天地祖宗保佑·' + (detail.disasterType || '逆乱') + '已平·四海归心·特开恩科一次·以慰士民。钦此。'
    },
    'auspice': {
      label: '瑞祥恩科',
      path: '瑞祥恩科',
      body: '朕仰承天庇·' + (detail.portentDesc || '瑞应') + '现·实为吉兆·特开恩科一次·以应天瑞。钦此。'
    },
    '_player_edict': {
      label: '⚠ 无故强发恩科',
      path: '无故强发',
      body: '朕意已决·开恩科一次·礼部速办·勿议。钦此。'   // 短促·无 historyPath·LLM efficacy 会判 -20%
    }
  };
  return TEMPLATES[subtype] || TEMPLATES['_player_edict'];
}
```

##### 2.0a.4·parser 识别 (in `tm-edict-parser.js`)

加 enke type·parser 见 keyword `特赐|恩科|开恩|...` + body 含"开科"等 verb·识别为 type=enke·extract subtype·

```js
function _kjG2ParseEnkeEdict(text) {
  if (!/特赐|恩科|开恩|科赐|钦取/.test(text)) return null;
  var subtype = '_player_edict';
  if (/登基|改元|初膺天命/.test(text)) subtype = 'reign-change';
  else if (/圣寿|寿诞|万寿/.test(text)) subtype = 'birthday';
  else if (/大婚|册立|大典/.test(text)) subtype = 'wedding';
  else if (/平|乱|平定|逆/.test(text)) subtype = 'platform-disaster';
  else if (/瑞|祥|应|降甘露|麒麟/.test(text)) subtype = 'auspice';
  return {
    type: 'enke',
    category: 'enke',
    subtype: subtype,
    text: text,
    historyPath: ({ 'reign-change':'登基恩科', 'birthday':'寿诞恩科', 'wedding':'大婚恩科',
                    'platform-disaster':'平乱恩科', 'auspice':'瑞祥恩科',
                    '_player_edict':'无故强发' })[subtype]
  };
}
```

##### 2.0a.5·applyEdictActions hook (in pipeline-steps Phase 2.5·apply 后)

```js
// post-ai-edict step 内·applyEdictActions(ea) 之后
for (var i = 0; i < ea.length; i++) {
  if (ea[i].type === 'enke' && typeof window._kjG2OnEnkeApprovedViaEdict === 'function') {
    window._kjG2OnEnkeApprovedViaEdict(ea[i]);
  }
}
```

```js
function _kjG2OnEnkeApprovedViaEdict(edictAction) {
  // skip keyi 投票·直 OnEnkeApproved·但标 initiative='edict' + subtype 来自 parser
  var td = {
    examType: 'enke',
    subtype: edictAction.subtype || '_player_edict',
    reason: '陛下下诏·' + (edictAction.historyPath || ''),
    initiative: 'edict',
    edictRef: edictAction,
    detail: {
      _forceCensorialQuestions: edictAction.subtype === '_player_edict',
      _affinityHalved: edictAction.subtype === '_player_edict'
    }
  };
  _kjG2OnEnkeApproved(td.subtype, td);
  // chronicle 自走 "陛下诏令" source·GM._edictTracker 自动 push (现 paradigm)
}
```

##### 2.0a.6·UI 入口·3 处 (复用现 desk + suggestion·无新 UI)

| 入口位置 | 触发 | 路径 |
|---|---|---|
| changchao NPC 列表·礼部尚书条目 | 右键 / 点击 "问对·开恩科" | Path B |
| **御案 desk·诏令 textarea + suggestion strip** | **5 自然 trigger 时自动 push 5 template + 永久显 "无故强发" template·点 → 填入 textarea + endTurn 时 parser 识别** | **Path C (v3.1)** |
| Path B 礼部 oppose 时·toast 提示 "可于御案下诏强发" | user 点击 → 直接 focus desk + 自动 fill "无故强发" template | Path B → C |

**关键复用·**`GM._edictTracker` / `aiEdictEfficacyAudit` / chronicle "陛下诏令" source / `GM._edictRelations` (supersedes 链)·**全自动 paradigm 承接**·G2 不重做。

### 2.1·主考·朝代-aware regex (v2·不变)

```js
var CHIEF_EXAMINER_TITLE_REGEX = {
  tang: /礼部侍郎|知贡举|尚书省/,
  song: /权知贡举|翰林学士|礼部尚书|知制诰/,
  yuan: /礼部尚书|翰林国史院|集贤院/,
  ming: /内阁大学士|大学士|礼部尚书|礼部侍郎|翰林学士/,
  qing: /内阁大学士|大学士|礼部尚书|礼部侍郎|军机大臣/,
  default: /礼部|大学士|翰林|知贡举/
};
// _kjG2PickEnkeChiefExaminer·_kjG2PickLibuLeader (path B 用)·全用此 regex
```

### 2.2·journey·**v3 加 `initiative` 字段** (v2 复用 keju runtime)

journey 调用·`startKejuByMethod` 时 `opts.examType='enke'` + `opts.initiative=td.initiative`·下传给 §3.6 jinshi quality scaler。

### 2.3·谢恩大典·LLM 古文 (v2 不变·§2.3a 跨turn 状态机不变)

### 2.4·进士标记·**v3 加 quality degradation 入口** (v2 §2.4 扩)

```js
function _kjG2MarkEnkeJinshi(jinshi, examYear, examiner, td) {
  jinshi._specialExamType = 'enke';
  jinshi._enkeYear = examYear;
  jinshi._enkeExaminer = examiner.name;
  jinshi._enkeInitiative = (td && td.initiative) || 'passive';  // **v3 加**
  jinshi.memorySeed = '蒙陛下不次之恩·特赐进士';
  // B·prestige multiplier
  var mult = _kjG2CalcEnkePrestigeMultiplier();
  // **v3·若 path C 手谕·multiplier 额外 ×0.5** (§2.0a.1 cost.jinshiAffinityMult)
  if (jinshi._enkeInitiative === 'player_edict') mult *= 0.5;
  if (typeof jinshi.prestige === 'number') {
    jinshi.prestige = Math.round((jinshi.prestige || 0) * mult);
  }
  if (jinshi.graduateMeta && typeof jinshi.graduateMeta.prestigeBoost === 'number') {
    jinshi.graduateMeta.prestigeBoost = Math.round(jinshi.graduateMeta.prestigeBoost * mult);
  }
  // **v3 新·apply §3.6 jinshi quality degradation**
  _kjG2ApplyJinshiQualityDegradation(jinshi, mult);
  // affinity 帝党
  var affinityBoost = Math.round(10 * mult);
  var party = (GM.parties || []).find(function(p) { return /帝党|皇室/.test(p.name); });
  if (party) jinshi._enkeAffinity = (jinshi._enkeAffinity || 0) + affinityBoost;
  jinshi.graduateTitle = '特赐进士';
  if (mult <= 0.5) {
    jinshi.memorySeed = '圣恩犹隆·然士论已轻 (恩科累计 ' + (GM._enkeAbuseCounter && GM._enkeAbuseCounter.enkeCount || '?') + ' 次)';
  }
  _kjG2EnkeJinshiJoinParty(jinshi, examYear);
}
```

### 2.5·9 朝代 preset 补表 (v2 不变·见 v2 §2.5)

### 2.6·不办惩罚 + reject / defer handlers (v2 不变)

---

## 3·**B·滥开贬值·多维体现 (v3 大扩)**

### 3.1·counter (v2 不变)

```js
GM._enkeAbuseCounter = {
  reignStartYear: 1722,
  enkeCount: 2,
  reignName: '雍正'
};
```

### 3.2·prestige scaling·multiplier (v2 不变)

```js
function _kjG2CalcEnkePrestigeMultiplier() {
  var counter = GM._enkeAbuseCounter || { enkeCount: 0 };
  var n = counter.enkeCount;
  if (n <= 2) return 1.0;
  if (n === 3) return 0.7;
  if (n === 4) return 0.4;
  return 0.1;
}
```

### 3.3·**(v3 新)·LLM 上奏措辞 4 档**

`_kjConsumeSpecialExamForAgenda` 内 LLM rewrite prompt·按 enkeCount 注入 toneHint·

```js
function _kjG2GetEnkeMemorialToneHint() {
  var n = (GM._enkeAbuseCounter && GM._enkeAbuseCounter.enkeCount) || 0;
  if (n <= 2) return {
    tone: '虔诚恭敬',
    template: '礼部·恭逢{事由}·伏请陛下开恩科以光天恩·士林翘首',
    sample: '礼部·恭逢圣寿六十·伏请陛下开恩科以光天恩'
  };
  if (n === 3) return {
    tone: '恭敬中带例行',
    template: '礼部·{事由}·虽属恩典惯例·礼部具题请开',
    sample: '礼部·新君改元·虽属恩典惯例·礼部具题请开恩科'
  };
  if (n === 4) return {
    tone: '敷衍援例',
    template: '礼部·{事由}·援例·伏请圣裁',
    sample: '礼部·圣寿七十·援例·伏请圣裁'
  };
  return {
    tone: '套话例行',
    template: '礼部·{事由}·例行具题',
    sample: '礼部·恩例当行·例行具题'
  };
}
```

注入 G1 LLM rewrite prompt·`tone: '...' + template: '...'`·LLM 按 tone 措辞。

### 3.4·**(v3 新)·chronicle 措辞 4 档**

`_kjG2RunXieendaCeremony` + jinshi mark 时·chronicle title/body 按 enkeCount 分档·

```js
function _kjG2GetEnkeChronicleStyle() {
  var n = (GM._enkeAbuseCounter && GM._enkeAbuseCounter.enkeCount) || 0;
  if (n <= 2) return { titlePrefix: '谢恩大典', bodyTone: '士林感激涕零·进士叩谢' };
  if (n === 3) return { titlePrefix: '谢恩大典', bodyTone: '特赐进士 X 等·士论已轻' };
  if (n === 4) return { titlePrefix: '谢恩 (例行)', bodyTone: '特赐进士 X 等·清议讥之' };
  return { titlePrefix: '谢恩 (邸报失载)', bodyTone: '特赐进士 X 等·士不齿之·邸报无名' };
}
```

### 3.5·**(v3 新)·言官清议触发率 4 档**

跟 F4c 言官清议 paradigm 平行·恩科开成后 endTurn render-finalize·

```js
function _kjG2MaybeFireYanguanProtestAfterEnke() {
  var n = (GM._enkeAbuseCounter && GM._enkeAbuseCounter.enkeCount) || 0;
  var probability;
  if (n <= 2) probability = 0;        // 不触发
  else if (n === 3) probability = 0.05;  // 5%
  else if (n === 4) probability = 0.25;  // 25%
  else probability = 0.6;              // 60%
  if (Math.random() < probability) {
    // 复用 F4c 言官清议 spawn paradigm
    if (typeof _kjF4cSpawnYanguanProtest === 'function') {
      _kjF4cSpawnYanguanProtest({
        topic: 'enke_abuse',
        title: '言官奏请节恩典',
        body: '臣等闻·一朝恩科已 ' + n + ' 次·圣恩太厚·士林讥滥赏·伏请陛下慎赏。',
        targetFaction: '恩科党',
        severity: n >= 5 ? 'high' : 'medium'
      });
    }
  }
}
```

### 3.6·**(v3 新加·user 提)·jinshi quality degradation 5 维**

不只动数字·**生成的人物本身**就 reflect 贬值。**5 个 lever**·

```js
function _kjG2CalcEnkeJinshiQualityProfile() {
  var counter = GM._enkeAbuseCounter || { enkeCount: 0 };
  var n = counter.enkeCount;
  // 5 维 lever
  if (n <= 2) return {
    fameVirtueMult:    1.0,       // 基础 fame/virtue (P.keju.attributeBonus) ×
    historicalAllowed: true,       // 允真历史名臣 draw (P.keju.historicalFigurePolicy.enableHistorical)
    traitBias:         null,       // learning_traits 倾向 (null = 中性)
    archetypeBias:     null,       // archetype 倾向 (null = LLM 自由)
    namePoolTier:      'top'       // 名 pool 档 (top / mid / generic)
  };
  if (n === 3) return {
    fameVirtueMult:    0.85,
    historicalAllowed: true,
    traitBias:         { '务实': -0.3 },     // 务实 -30%
    archetypeBias:     'mediocre',           // 倾平庸
    namePoolTier:      'mid'
  };
  if (n === 4) return {
    fameVirtueMult:    0.65,
    historicalAllowed: false,                 // **切断真历史人物**
    traitBias:         { '务实': -0.5, '酬应': +0.3 },
    archetypeBias:     'sycophant',           // 倾趋炎附势
    namePoolTier:      'generic'
  };
  return {
    fameVirtueMult:    0.4,
    historicalAllowed: false,
    traitBias:         { '务实': -0.8, '酬应': +0.5, '颂圣': +0.4 },
    archetypeBias:     'sycophant_heavy',
    namePoolTier:      'generic'
  };
}

function _kjG2ApplyJinshiQualityDegradation(jinshi, mult) {
  var prof = _kjG2CalcEnkeJinshiQualityProfile();
  // 1·fame/virtue base ×
  if (jinshi.graduateMeta) {
    if (typeof jinshi.graduateMeta.fame === 'number') {
      jinshi.graduateMeta.fame = Math.round(jinshi.graduateMeta.fame * prof.fameVirtueMult);
    }
    if (typeof jinshi.graduateMeta.virtue === 'number') {
      jinshi.graduateMeta.virtue = Math.round(jinshi.graduateMeta.virtue * prof.fameVirtueMult);
    }
  }
  if (typeof jinshi.fame === 'number') jinshi.fame = Math.round(jinshi.fame * prof.fameVirtueMult);
  if (typeof jinshi.virtue === 'number') jinshi.virtue = Math.round(jinshi.virtue * prof.fameVirtueMult);
  // 2·历史人物切断 — 在 jinshi 池生成阶段 (keju runtime _kjGenJinshiPool) 前置 hook·
  //    本函数仅 mark·实际切断在 §3.6.1
  jinshi._enkeQualityProfile = prof;
  // 3·learning_traits 调整 (复用 _kjInferLearningTraits 后修)
  if (prof.traitBias && jinshi.learning_traits) {
    _kjG2BiasLearningTraits(jinshi, prof.traitBias);
  }
  // 4·archetype tag (UI / NPC AI 用)
  if (prof.archetypeBias) jinshi._enkeArchetype = prof.archetypeBias;
  // 5·name pool — 已在 jinshi 生成时 apply·见 §3.6.1
}
```

#### 3.6.1·historicalFigure 切断 + name pool 调档·**hook 进 keju runtime jinshi pool 生成**

在 `_kjGenJinshiPool` (keju runtime) 前置·

```js
// tm-keju-runtime.js·_kjGenJinshiPool 入口加
if (opts && opts.examType === 'enke' && typeof window._kjG2CalcEnkeJinshiQualityProfile === 'function') {
  var prof = _kjG2CalcEnkeJinshiQualityProfile();
  if (!prof.historicalAllowed) {
    // 强 LLM 生成·不查 P.keju._historicalFiguresUsed
    opts._forceLlmGenerated = true;
  }
  if (prof.namePoolTier === 'generic') {
    // 走 LLM 生 generic 二线名·非主流字 (chars 中常见姓·罕用名)
    opts._namePoolTier = 'generic';
  } else if (prof.namePoolTier === 'mid') {
    opts._namePoolTier = 'mid';
  }
}
```

#### 3.6.2·learning_traits bias

```js
function _kjG2BiasLearningTraits(jinshi, traitBias) {
  // jinshi.learning_traits 是数组·每项 { trait, weight }
  // bias = { '务实': -0.5, '酬应': +0.3 } → 调 weight
  if (!Array.isArray(jinshi.learning_traits)) return;
  jinshi.learning_traits.forEach(function(lt) {
    if (lt && traitBias[lt.trait] !== undefined) {
      lt.weight = (lt.weight || 0) * (1 + traitBias[lt.trait]);
      if (lt.weight < 0.05) lt.weight = 0.05;
    }
  });
  // 若 bias 含正向 trait 但 jinshi 没有·添加
  Object.keys(traitBias).forEach(function(t) {
    if (traitBias[t] > 0 && !jinshi.learning_traits.find(function(lt) { return lt.trait === t; })) {
      jinshi.learning_traits.push({ trait: t, weight: traitBias[t] });
    }
  });
}
```

#### 3.6.3·archetype 应用 (UI + NPC AI 用)

`_enkeArchetype` 字段·

- `mediocre` → NPC tinyi 时 LLM tone hint "**寡言·随大流·无定见**"
- `sycophant` → "**颂上·随上意·不与异**"
- `sycophant_heavy` → "**纯颂圣·凡上谕必赞·凡异议必默**"

tinyi v3 NPC prompt 注入 (跟 §5.4 enke_grateful trait 平行)。

### 3.8·**(v3.1 新)·诏令 paradigm 一致性·enke edict 的代价模型**

Path C 走诏令系统后·**cost 由 lifecycle 自带·非 G2 自管**·

| 维度 | v3 自管 (废) | **v3.1·走诏令 paradigm** |
|---|---|---|
| 直 stat hit | minxin -10 / prestige -15 (G2 硬编码) | **affectedClasses** apply·士林 +10 / 官僚 -5 / 国库 -8 (lifecycle 自带·跟 admin_reform / amnesty 同 paradigm) |
| 派系反 | 礼部 -20 affinity (G2 硬编码) | **resistance** dict·清议 30 + 常科派 40 + 礼部 50 (lifecycle 自带·派系 affinity 按 % 实算) |
| 风险 | 无 | **unintendedRisk**: `enke_abuse_party` (跟 'middlemen_skim' / 'peasant_revolt' 同 paradigm·有概率触发"恩科党尾大不掉"事件) |
| 长尾时间 | 立即 fire (1 turn) | **lifecycleDays: 730**·分阶段·跟 admin_reform 1095 / economic_reform 3650 同 paradigm·"恩科 2 年完成" |
| LLM 评效果 | 无 | **`aiEdictEfficacyAudit`** 自然走·LLM 评恩科是否真的达到目的 (士林感激 vs 党争激化) |
| 永久 record | G2 自管 `_logChronicle` _eternal | **`GM._edictTracker.push`** + chronicle "陛下诏令" source 自动 surface (现 paradigm) |
| 关系链 | 无 | **`GM._edictRelations`** 自动·"本朝多次恩科诏令" 形成 supersedes / continues 链 (跟其他诏令一样) |

**好处·**

- **零硬编码 cost**·跟其他 12 类诏令一致体验
- LLM efficacy 反馈 "无故强发恩科" → 给低分·写 "圣意虽决·士论已轻·恩荣不副实"·user 看到自然知错
- chronicle "陛下诏令" source 自动 surface 邸报·user 在常朝见后世评议
- 多次恩科 supersedes 链 → user 可看 "本朝已下 N 次恩科诏" 历史
- L7 reform method='edict' 已用过同模式·零模式风险

### 3.7·**(v3 新·小修)·reject 不 +1 counter** (避免 user 拒掉浪费)

```js
function _kjG2OnEnkeApproved(subtype, td) {
  // ...原 v2 逻辑
  // **+1 counter·只在 approve + journey 完成时**
  if (GM._enkeAbuseCounter) GM._enkeAbuseCounter.enkeCount++;
  // ...trigger §3.5 言官 protest probability
  if (typeof _kjG2MaybeFireYanguanProtestAfterEnke === 'function') {
    _kjG2MaybeFireYanguanProtestAfterEnke();
  }
}

function _kjG2OnEnkeRejected(td) {
  // v2 §2.6 逻辑·**不动 enkeAbuseCounter**
}
```

---

## 4·**C·歌颂体题目** (v2 不变)

### 4.1·题目主题池·按 subtype (v2 §4.1 不变·5 subtype)

### 4.2·LLM prompt 区别 (v2 §4.2 不变)

### 4.3·UI 区别·changchao + 殿试 (v2 §4.3 不变)

**v3 加**·若 td.initiative === 'player_edict' (path C)·**force 全用 cefū·圣德颂 + 万寿赋**·不许出 cefū 新政论 / 平乱赋等"较中性"题目·user 强发的代价之一。

---

## 5·**D·恩科党** (v2 §5 全部不变·包括 §5.4 静态 trait + §5.5 cohort meet + §5.6 4 UI 入口)

---

## 6·**E·宋特奏名变体** (v2 §6 全部不变)

---

## 7·新文件 + 改动文件 (v3)

### 7.1·**新·`tm-keju-event-hooks.js`** (~150-200 行) (v2 不变)

### 7.2·**新·`tm-keju-enke-player-initiative.js`** (~200-280 行)·**(v3 新)**

```
- §0·gate·_isG2Enabled
- §1·_kjG2OpenLibuEnkeWendui (Path B 入口)
- §2·_kjG2HandleLibuWenduiOutcome (LLM stance route)
- §3·_kjG2OpenPlayerEdictForEnke (Path C 入口 + confirm modal)
- §4·_kjG2ApplyPathCCosts + _kjG2DirectFireEnke
- §5·_kjG2PickLibuLeader (朝代-aware regex 复用)
- §6·_kjG2MaybeOfferPathCFallback (Path B oppose 时提示)
- §7·expose (~10 helpers)
```

### 7.3·**新·`tm-keju-enke.js`** (~900-1100 行·v3 +200·因 §3.6 quality degradation + §3.3-3.5 LLM/chronicle/言官 4 档)

```
- §0·gate
- §1·主考 pick + 朝代-aware regex
- §2·journey runner + initiative 字段
- §3·谢恩大典 + 跨turn 状态机
- §4·进士标记 + B3 multiplier apply + §3.6 quality degradation apply
- §5·keyi callback
- §6·outcome handlers (approve/reject/defer·§3.7 counter only on approve)
- §7·滥开 counter + multiplier
- §8·**(v3 新) §3.3 LLM tone hint + §3.4 chronicle style + §3.5 yanguan protest**
- §9·**(v3 新) §3.6 jinshi quality degradation·5 维 lever + apply + trait bias + archetype**
- §10·歌颂体题目 + path C force topic
- §11·恩科党 init / join / 5 派系
- §12·同恩集会
- §13·UI·特赐进士榜 + tinyi 角标 + chronicle
- §14·E·宋特奏名
- §15·spawn promote
- §16·expose (~40 helpers + 6 namespace)
```

### 7.4·**改·`tm-keju-special-exams.js`** (~35 行·v2 30 + v3 5)

- birthY 取值改 `_kjG2GetEmperorBirthYear()`
- spawn promote 调 `_kjG2DecorateSpawnedEntryForKeyi`
- E·_kjG2CheckTesuomingTrigger 注 enke checker chain
- **(v3 新) LLM rewrite prompt 注入 `_kjG2GetEnkeMemorialToneHint()`**

### 7.5·**改·`tm-keju-runtime.js`** (~30 行·v2 15 + v3 15)

- initKejuSystem 加 G2 init / resume
- **(v3 新) `_kjGenJinshiPool` 入口加 quality profile hook (§3.6.1)**·若 examType='enke'·apply `historicalAllowed` + `namePoolTier`

### 7.6·**改·`tm-chaoyi.js`** (~50 行·v2 40 + v3 10)

- consume cohort meet
- keyi promote
- **(v3 新) 礼部尚书条目加 "问对·开恩科" action button** (Path B 入口)

### 7.7·**(v3.1 废)·~~`tm-keju-paradigm-panel.js`·`_kjpReformPanel` 加 button~~**

**v3.1 删·**Path C 改走诏令系统·`_kjpReformPanel` 不动·避破坏 L 系列改革面板 paradigm。

### 7.7a·**(v3.1 新)·改·`tm-edict-lifecycle.js`** (~25 行)

- `EDICT_TYPES` 加第 13 类 `enke` (见 §2.0a.2)·跟现 12 类同 paradigm (`label/lifecycleDays/phased/historyPaths/affectedClasses/resistance/unintendedRisk/keywords`)

### 7.7b·**(v3.1 新)·改·`tm-edict-parser.js`** (~20 行)

- `extractEdictActions` 入口加 `_kjG2ParseEnkeEdict` 检测 (见 §2.0a.4)·识别后 push to edictActions[]
- `EDICT_TYPES` 详 type 17 → 18 (parser 内部·跟 lifecycle 12 类 + enke 隔离·复 `feedback_paradox_ui_unreliable` 之 P5-γ 教训)

### 7.7c·**(v3.1 新)·改·`tm-endturn-pipeline-steps.js`** (~10 行)

- post-ai-edict step 内·`applyEdictActions(ea)` 后·遍历 ea·if `type==='enke'` → call `_kjG2OnEnkeApprovedViaEdict` (见 §2.0a.5)

### 7.7d·**(v3.1 新)·改·`preview/phase8-edict-ui.js` + suggestion render** (~30 行)

- `_renderEdictSuggestions` 见 category='enke' suggestion 时·badge 🎓 / label "登基恩科" / etc.·click 行为·把 template.body 填入 desk textarea
- 5 自然 trigger SET 字段时·event hook `_kjG2OnNaturalTriggerEnqueueDeskSuggestion` 自动 push (见 §2.0a.3)

### 7.8·**改·`tm-endturn-pipeline-steps.js`** (~30 行·v2 25 + v3 5)

- 现 5 处加 + **(v3 新) render-finalize 加 `_kjG2MaybeFireYanguanProtestAfterEnke`**

### 7.9·**改·`tm-tinyi-v3.js`** (~35 行·v2 25 + v3 10)

- 现 enke_grateful trait + 5 派系
- **(v3 新) `_enkeArchetype` trait·mediocre / sycophant / sycophant_heavy 3 tone hint**·NPC prompt 注入

### 7.10·**改·`tm-keyi-v3.js`** (~30 行·v2 不变)

### 7.11·**改·`tm-wendui.js`** (~10 行·v3 新)

- L4 cedui mode·`archetype = '礼部'` 时 prompt template·"礼部主官·议恩科·按 enkeAbuseCount 决定 stance support / oppose / caveat"

### 7.12·**改·`index.html`** (~3 行)

```html
<script src="tm-keju-event-hooks.js?v=20260525-g2"></script>
<script src="tm-keju-enke-player-initiative.js?v=20260525-g2"></script>
<script src="tm-keju-enke.js?v=20260525-g2"></script>
```

### 7.13·**改·9 剧本 JSON** (v2 不变)

### 7.14·**新 smoke·`scripts/smoke-keju-enke.js`** (~75-90 case·**14 section**·v3 扩 3 section)

- §A·event hook·5 case
- §B·主考 pick·朝代-aware regex·6 case
- §C·journey + 3 path initiative 字段·8 case (v3 +2)
- §D·谢恩大典·LLM + 跨turn·6 case
- §E·进士标记·B3 multiplier·5 case
- §F·Path B·keyi promote + callback·6 case
- §G·滥开 counter + multiplier·5 case
- §H·歌颂体题目·5 case
- §I·恩科党·6 case
- §J·同恩集会·3 case
- §K·E·宋特奏名·6 case
- §L·flag gate + red line·6 case
- **§M·(v3 新) Path B+C·礼部 wendui stance + 改革面板手谕 + cost apply·8 case**
- **§N·(v3 新) §3.3-3.5 LLM tone + chronicle style + 言官触发率·7 case**
- **§O·(v3 新) §3.6 jinshi quality degradation·fame/virtue mult + historicalAllowed + traitBias + archetype·8 case**

---

## 8·实施序·**~9-12 d·9 step·v3**

| step | sub-slice | est | 关键产出 |
|---|---|---|---|
| 0 | event hook 前置 (CRITICAL B1) | 0.8-1 d | hook 模块 + 6 点 |
| a | A·base + Path B + 谢恩大典 C2 | 2.2-2.7 d | enke journey + keyi promote |
| **0a** | **(v3 新) Path B (礼部 wendui) + Path C (手谕)·UI 入口 + cost** | **1.2-1.5 d** | 3 路径全 wired |
| b | B·滥开 counter + 朝代 regex | 0.6 d | — |
| **b-UX** | **(v3 新) §3.3-3.5·LLM tone 4 档 + chronicle 4 档 + 言官 4 档** | **0.6-0.8 d** | — |
| **b-deep** | **(v3 新) §3.6·jinshi quality degradation 5 维 + runtime hook** | **0.7-1 d** | runtime `_kjGenJinshiPool` patch |
| c | C·歌颂体 + path C force | 0.8-1.1 d | — |
| d | D·恩科党 + tinyi + UI 4 入口 | 1.6-2.1 d | — |
| e | E·宋特奏名 + 年龄 fallback | 0.7-1 d | — |
| f | smoke 75-90 case·14 section + 全 regression | 0.8-1 d | PASS + G1 36 不冲突 |
| **total** | | **~9-12 d** | — |

---

## 9·LLM 调用预算·v3 加 path B (cedui)

| 场景 | LLM call | 平均 token | per-enke 总 |
|---|---|---|---|
| 礼部上奏 (G1)·**v3 加 tone hint** | 1 | 220 | 220 |
| **(v3 新) 礼部 wendui cedui (path B)** | 1 (若 user 走 B) | 600 | 0-600 |
| 歌颂体题目生 | 1 | 500 | 500 |
| 谢恩大典奏疏 | 1 | 400 | 400 |
| 答卷生·n_jinshi=30 | 30 | 300 | 9000 |
| 恩科党 NPC tinyi (静态)·**v3 加 _enkeArchetype tone** | 0 | 0 | 0 |
| **(v3 新) 言官清议 protest (§3.5)** | 0-1 (按 probability·n>=3 才有) | 300 | 0-300 |
| **per 恩科** (n=30·避 path B 不算·言官 0.25 avg) | ~33 + 0.075 | — | **~10,800 token** |
| **per 朝代** (3 次恩科·加 path B 1 次) | ~100 call | — | **~33,000 token** |

---

## 10·red line check·v3

| red line | v3 适应 |
|---|---|
| 复用 first | 复用 keju runtime / tinyi / changchao / keyi v3 / cohort meet / L7 memorial / **L4 cedui mode (path B)** / **F4c 言官 spawn (§3.5)** |
| 自然政治触发 | 5 触发全真历史·瑞祥也是政治表演非天命 |
| 失败禁玄幻惩罚 | reject + path C cost·全自然政治 |
| 工具 vs 系统 | **3 路径全系统型**·都挂代价·path C 重代价 |
| flag gate | useNewKejuG2 默认 off |
| 9 朝代 preset | §2.5 补表 |
| 邸报中文 | 全中文 chronicle + LLM 古文体 |
| audit-first | v1 → audit → v2 → v3 → implement |
| 特科必须独深 | enke 专 runner |
| 谢恩大典 LLM 古文 | 真历史 |
| B·滥开贬值 paradigm | **v3 加多维**·数值 + LLM 措辞 + chronicle + 言官 + jinshi quality |
| C·歌颂体跟常科区分 | UI chip + LLM prompt |
| D·恩科党 cross-faction | 5 tension paths |
| E·宋特奏名 era-gated | 仅宋 |
| **CRITICAL B1·event hook 前置** | **v2 §2.0** |
| **HIGH A1·Path B 切换** | **v2 §1.2-1.4** |
| **MID D2·LLM cost 量化** | **v2 §9·v3 加 path B + 言官** |
| **(v3 新) player initiative 3 路径都挂代价** | **§1.2·复 `feedback_tool_vs_system_costs`** |
| **(v3 新) 滥开贬值多维体现 (5 维)** | **§3.3-3.6·数值 + LLM + chronicle + 言官 + jinshi quality** |
| **(v3 新) jinshi quality 5 lever** | **§3.6·fame/virtue + historicalAllowed + traitBias + archetype + name pool** |

---

## 11·post-G2·next (前置 G1·已 ship)

**G1·special exam shared spawn infra** — **已 ship**·smoke 36 PASS。

- **G2·恩科** — **当前·v3 ready**·~9-12 d
- **G3·武举** (~5-6 d·联动军事)
- **G4·翻译科** (~4-5 d·清专有)
- **G5·童子科** (~3-4 d·罕见 + 长尾深)

**reminder·`feedback_special_exams_per_type_depth`**·G3/4/5 各自 sprint doc。

- Phase H·私学/书院 (~10-14 d)
- Phase I·宦官干预 (~6-9 d)

---

## 12·v3 ready 验

- ✅ 5 sub-slice (A/B/C/D/E) 全 cover·真历史 paradigm 落地
- ✅ B1 CRITICAL fix·event hook 前置
- ✅ Path B 切换·正式 keyi 投票
- ✅ G1 hookup chain 明
- ✅ 新 3 文件 (`event-hooks.js` + `enke-player-initiative.js` + `enke.js` ~900-1100) + 改 9 文件 + 9 剧本 JSON
- ✅ smoke 75-90 case·**14 section**
- ✅ 实施序 10 step·9-12 d
- ✅ red line 21 项·全合规
- ✅ 朝代-aware regex·9 朝代字典
- ✅ B3 multiplier apply 点·一处
- ✅ C2 跨turn 状态机
- ✅ D2 LLM cost 量化·~10.8k/enke
- ✅ D3 preset 补·9 剧本 enke_triggers
- ✅ A4 恩科党 UI 入口·4 处
- ✅ E2 年龄三层 fallback
- ✅ **(v3) player initiative 3 路径**·A 被动 + B 半主动礼部 wendui + C 主动手谕
- ✅ **(v3) 滥开贬值 UX 3 维**·LLM 上奏措辞 + chronicle 措辞 + 言官清议触发率
- ✅ **(v3) jinshi quality degradation 5 lever**·fame/virtue mult + historicalAllowed 切断 + learning_traits 偏负 + archetype sycophant 倾向 + name pool 二线化
- ✅ **(v3) reject 不 +1 counter** (避免 user 拒掉浪费)
- ✅ **(v3) path C 强发额外 ×0.5 multiplier + force 歌颂体题目**

**v3 ship readiness·15 audit items + 4 v3 additions 全 fold·等 user pass + 开工**

---

## 13·**修订日志**

- **v1·2026-05-25**·5 sub-slice (A+B+C+D+E) 全维度·Path A (changchao 自然议)·5.9-7.7 d
- **v2·2026-05-25**·audit pickup·15 项 (1 CRITICAL + 4 HIGH + 7 MID + 3 LOW) 全 fold·**Path A → Path B 切换**·**B1 event hook 前置**·朝代-aware regex / 跨turn 状态机 / LLM cost 量化 / 9 剧本 preset 补·6.5-8.5 d
- **v3·2026-05-25**·**user feedback fold**·**3 路径 player initiative** (A 被动·B 礼部 wendui·C 改革面板手谕·全挂代价)·**滥开贬值多维体现 5 lever** (LLM 上奏措辞 + chronicle 措辞 + 言官清议触发率 + jinshi fame/virtue base + historicalFigure 切断 + learning_traits 偏负 + archetype sycophant + name pool 二线化)·**reject 不 +1 counter**·~9-12 d
- **v3.1·2026-05-25**·**user feedback fold·"C·主动应与诏令系统结合"**·**Path C 重写为诏令集成**·新加 EDICT_TYPES 第 13 类 `enke` (lifecycleDays:730 / phased / resistance 60% / unintendedRisk:enke_abuse_party / affectedClasses 士林+10) + parser keyword 识别 + applyEdictActions Phase 2.5 hook (`_kjG2OnEnkeApprovedViaEdict`) + desk 5 自然 trigger template + "无故强发" template (复用 `_renderEdictSuggestions`)·**删 `_kjpReformPanel` button** (v3 错·应走标准诏令)·零硬编码 cost·复用 `aiEdictEfficacyAudit` / `GM._edictTracker` / `GM._edictRelations` / chronicle "陛下诏令" source·~9.5-12.5 d
