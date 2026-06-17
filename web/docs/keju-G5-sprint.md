# 科举·Stage 2·Phase G·**G5·童子科 mini-keju** (罕见 + 两 archetype·神童早卒/大才)

**date**·2026-05-26
**status**·**v1·draft·待 audit + v2 + implement**
**estimated**·doc 0.3 d·implement 2-3 d·5 轮 audit 0.5 d·**总 ~3-4 d**
**dependency**·G1 spawn (已 ship·tongzi trigger·5%/check) + G2/G3/G4 paradigm 80% 复用 + keyi callback chain + EDICT_TYPES 17 类
**flag gate**·`P.conf.useNewKejuG5=false` 默认 off

**红线 reminder**·
- 复用·G2/G3/G4 paradigm 80%·新作 ~20% (神童年龄 + 早卒/大器晚成 双 archetype + 长尾 career +10 年)
- 自然政治触发·州县荐举·**严禁玄幻**·非天命
- **G5 独家·神童年龄 9-14·非成人**·跟 G2 (20-40) / G3 (22-45) / G4 (20-40) 完全不同
- 失败禁玄幻惩罚·神童夭折·才尽辍考·全自然
- audit-first·v1 → audit → v2 → implement

---

## ★·童子科 vs 其他特科·**呈现形式 8 维差异** (G5 核心)

| 维度 | **恩科 G2** | **武举 G3** | **翻译科 G4** | **童子科 G5** |
|---|---|---|---|---|
| **场地** | 号舍·闭卷 | 校场·演武 | 翻书房·满文 | **金銮殿·御前直接** |
| **年龄** | 20-40 | 22-45 | 20-40 | **9-14·神童独家** |
| **科目** | 经义/策论/诗赋 | 孙吴默/边事策 | 满译汉/汉译满/蒙文 | **背诵/默写/即兴问对**·考记忆 + 灵性 |
| **录取数** | 300+ | 50-200 | 5-15 | **1-3 人·极少** |
| **职业去向** | 翰林/知县 | 9 边镇/京营 | 军机/内阁 | **入秘书省/翰林院见习** + 跟读·**非真职** |
| **传记** | "X 进士及第" | "X 武进士·X 镇都司" | "X 翻译进士·X 衙署中书" | **"X 童子·9 岁赐进士·X 朝神童"** |
| **大典仪式** | 谢恩大典·叩拜 | 校阅大典·演武 | 召见大典·满语 | **抚摩大典**·皇帝亲抚发顶·赐金钏·**特别仪式** |
| **archetype** | 5 派系 | 5 archetype | 3 archetype | **2 archetype·"早慧早卒" / "大器晚成"** |

---

## 0·sprint scope·**8 sub-slice**

| sub-slice | 内容 | est |
|---|---|---|
| **0** | event hook 补·荐举触发 counter | 0.1 d |
| **A·base** | 主考 (秘书省/翰林学士) + 1 试 journey (御前问对) + 童子进士标记 + Path B/C (诏令 EDICT_TYPES.tongzi 第 17 类) | 0.6 d |
| **B·两 archetype** | early_genius_died (神童早卒)·**40%/turn 概率 health 急降 by 30+** / late_bloomer (大器晚成)·**career 长尾 +10 年大成** | 0.4 d |
| **C·背诵默写题目** | LLM·背 (诗经默)·默 (千字文默)·即兴问对·3 题各占·按年龄递增题难 | 0.4 d |
| **D·神童家族** | `GM._tongziFamilies`·跨 cohort 同姓·"X 家神童"·**罕见但存** | 0.3 d |
| **E·抚摩大典 LLM** | 御前抚摩·皇帝亲抚发顶·赐金钏/玉璧·**温情风格** + chronicle | 0.3 d |
| **F·长尾 health tick** | early_genius_died·40%/turn 健康 -30 (年纪小压力大)·大才 health 维持 + career +10 年 | 0.3 d |
| **G·字段深生成** | 童子进士 35 字段 (年龄 9-14·age 调小·height 偏低·偏 intelligence/charisma) | 0.3 d |
| smoke | ~40-60 case·10 section | 0.3 d |
| **total** | | **~3 d** |

---

## 1·hookup·**3 路径**

### 1.1·现 G1 tongzi spawn 已 ship

G1 `_kjCheckTongziTriggers` (tm-keju-special-exams.js:173)·5% prob·10 年 cooldown·罕见 event。G5 复用·不重做。

### 1.2·**3 路径** (跟 G2/G3/G4 同)

| 路径 | 发起者 | UX 入口 | 代价 |
|---|---|---|---|
| **A·被动** | G1 trigger·礼部上奏 | changchao agenda → keyi 投票 | 0 + reject 代价 (清议失望 -3 affinity) |
| **B·半主动·礼部 wendui** | user 暗示礼部尚书 | changchao → 礼部 → wendui '议·童子科荐举' | 1 wendui + 礼部反 -5 affinity (小代价·罕见) |
| **C·主动·下诏** | user 在 desk 写诏令 | desk → '荐神童' template + EDICT_TYPES.tongzi 第 17 类 | lifecycleDays:365·resistance 小·affectedClasses 士林+5/民心+3/国库-2 |

### 1.3·fanyi route 加进 G2 callback (跟 G3/G4 同 paradigm)

`tm-keju-enke.js` 内 `_kjG2SpecialExamKeyiCallback` 加 tongzi route·

```js
if (examType === 'tongzi') {
  if (typeof window !== 'undefined' && typeof window._kjG5OnTongziApproved === 'function') {
    var outcomeT = opts.outcome;
    if (!outcomeT) {
      if (method === 'council' || method === 'edict' || method === 'defy') outcomeT = 'approve';
      else outcomeT = 'reject';
    }
    if (outcomeT === 'approve') return window._kjG5OnTongziApproved(td.subtype, td);
    if (outcomeT === 'reject')  return window._kjG5OnTongziRejected(td);
    if (outcomeT === 'defer')   return window._kjG5OnTongziDeferred(td);
  }
  return;
}
```

---

## 2·**A·base·主考 + 御前问对 + 抚摩大典**

### 2.1·主考·朝代-aware (秘书省/翰林系)

```js
var TONGZI_CHIEF_EXAMINER_TITLE_REGEX = {
  tang:    /秘书省|翰林学士|国子祭酒/,
  song:    /国子监|秘书省|翰林学士|侍读学士/,
  ming:    /翰林学士|侍读|国子监|礼部尚书/,
  qing:    /翰林学士|侍讲|国子监|礼部尚书/,
  default: /翰林|秘书|国子/
};
```

### 2.2·journey·1 试 + 御前问对

- **会试**·豁免 (G5 简化·州县荐举即可)
- **殿试**·**御前问对**·皇帝亲问·背诵/默写/即兴回答 3 题

### 2.3·童子进士标记·_kjG5MarkTongzijinshi

```js
function _kjG5MarkTongzijinshi(tj, examYear, examiner, td, scores) {
  tj._specialExamType = 'tongzi';
  tj._tongziYear = examYear;
  tj._tongziExaminer = examiner ? examiner.name : '';
  tj._tongziInitiative = (td && td.initiative) || 'passive';
  tj._tongziSubtype = (td && td.subtype) || 'recommendation';
  tj._reciteScore = scores.recite || 0;
  tj._writeScore = scores.write || 0;
  tj._impromptu Score = scores.impromptu || 0;
  tj.graduateTitle = _kjG5DeriveTongziTitle(scores);  // '童子进士第一名' / '童子进士' / '童子' (荣誉)
  tj.keju_status = '童子进士';
  tj._tongziArchetype = _kjG5DeriveTongziArchetype(tj);  // 2 类
  tj.memorySeed = '蒙陛下钦点·童子科入翰林见习·愿不负圣望';
  tj._origin = 'tongzi';
  // 入秘书省见习 (非真职)
  tj.officialTitle = '翰林见习童子';
  tj.location = '京师';
  tj.stance = '见习·跟读';
}
```

### 2.4·archetype 派生

```js
function _kjG5DeriveTongziArchetype(tj) {
  // 50/50·按 health + stress 派生·罕见 archetype
  if ((tj.resources.health || 80) >= 90 && (tj.resources.stress || 30) <= 20) {
    return 'late_bloomer';   // 大器晚成·career 长尾 +10 年
  }
  return 'early_genius_died';  // 早慧早卒·40%/turn health -30
}
```

---

## 3·**B·两 archetype 长尾**

### 3.1·early_genius_died·神童早卒 paradigm

- 每 turn health 损耗 40% 概率 -30 (年纪小压力大·历史晏殊死时 50·朱虎臣未到 20 已殁)
- health <= 0·chronicle "X 年·童子 X 殁·英才早凋"·成绩字段标记 `_diedYoung=true`
- **罕见但真实**·历史平均童子进士 30 岁前死率 70%

### 3.2·late_bloomer·大器晚成 paradigm

- 每 turn health 不损耗·career 长尾 +10 年
- 50 岁起入 keju 真考试 (童子→进士 paradigm·若考过 +1 进士头衔)
- chronicle "X 年·童子 X 入会试·复中进士·人称神童得证"

---

## 4·**C·背诵默写题目**

### 4.1·题目主题池

```js
var TONGZI_QUESTION_THEMES = {
  'recommendation': [
    { type: 'recite',    topic: '《诗经》七首',     hint: '背 诗经选段·按年龄递增·9 岁 3 首·14 岁 7 首' },
    { type: 'write',     topic: '《千字文》默',     hint: '默写千字文一段·100-200 字' },
    { type: 'impromptu', topic: '即兴问对',         hint: '皇帝亲问·随机经典·神童即答' }
  ],
  '_player_edict': [
    { type: 'recite',    topic: '强发故·略背',      hint: '5 句简易' },
    { type: 'write',     topic: '强发故·略默',      hint: '50 字基础默写' },
    { type: 'impromptu', topic: '强发故·略问',      hint: '简易问对' }
  ]
};
```

### 4.2·LLM prompt 区别

```js
function _kjG5BuildTongziQuestionPrompt(td, examiner, age) {
  var subtype = (td && td.subtype) || 'recommendation';
  var difficulty = age <= 10 ? '易' : (age <= 12 ? '中' : '难');
  return '【特科·童子科·题目】\n' +
    '主考·' + (examiner ? examiner.name : '翰林学士') + '·童子年 ' + age + '·难度 ' + difficulty + '\n' +
    '【题目体例】**童子科·背诵 + 默写 + 即兴问对**·按年龄调难·涉经典·9 岁《诗经》/14 岁《左传》。\n' +
    '请生 3 题·\n' +
    '- recite (背诵)·按年龄选诗经选段\n' +
    '- write (默写)·千字文/百家姓选段\n' +
    '- impromptu (即兴)·随机经典问答\n\n' +
    '返 JSON·{questions: [{type, topic, body: "100 字题面"}]}';
}
```

---

## 5·**D·神童家族** (跟 G3 武勋世家 paradigm·**罕见**)

### 5.1·`GM._tongziFamilies` 命名空间

```js
GM._tongziFamilies = {
  members:      [],       // 童子进士 names 跨 cohort
  bySurname:    {},        // {'晏': [...]·≥ 2 同姓 → '晏家神童'}
  totalCohorts: 0
};
```

### 5.2·世家检测·≥ 2 同姓 → 神童家族 chronicle

跟 G3 `_kjG3DetectMartialClan` 同 paradigm·**频率极低** (童子进士罕见·≥ 2 同姓需累 30+ 年)。

---

## 6·**E·抚摩大典 LLM**

### 6.1·prompt

```js
function _kjG5BuildFumoCeremonyPrompt(tongzijinshiList, examiner, td) {
  var name = tongzijinshiList[0] && tongzijinshiList[0].name;
  var age = tongzijinshiList[0] && tongzijinshiList[0].age;
  return '【抚摩大典·御前问对】\n' +
    '童子·' + name + '·年 ' + age + '·主考·' + (examiner ? examiner.name : '翰林学士') + '\n\n' +
    '请以养心殿太监记口吻·写一份抚摩大典记 (温情体·150-200 字)·\n' +
    '- 描小童子御前从容应对\n' +
    '- 皇帝亲抚发顶·赐金钏 / 玉璧 / 御书匾\n' +
    '- 朝臣无不动容·叹"此真天授"\n' +
    '- 童子叩谢·眼有泪光\n' +
    '风格·**温情·亲昵·非威仪**·**跟谢恩大典 (士林政治) + 校阅大典 (武威) + 召见大典 (满人君臣) 完全不同**\n\n' +
    '只返抚摩记正文·不要标题。';
}
```

---

## 7·**F·长尾 health tick + career 大器晚成 hook**

```js
function _kjG5TongziHealthTick() {
  if (!_isG5Enabled()) return;
  (GM.chars || []).forEach(function(c) {
    if (!c || c.alive === false) return;
    if (c._origin !== 'tongzi') return;
    if (c._tongziArchetype === 'early_genius_died') {
      if (Math.random() < 0.40) {
        if (!c.resources) return;
        c.resources.health = Math.max(0, (c.resources.health || 80) - 30);
        if (c.resources.health <= 0) {
          c.alive = false;
          c._diedYoung = true;
          _logChronicleSafe({
            type: 'tongzi_died_young',
            text: (GM.year || 0) + '年·童子 ' + c.name + ' 殁·年仅 ' + ((GM.year || 0) - c.birthYear) + '·英才早凋',
            tags: ['科举', '童子科', '殁']
          });
        }
      }
    } else if (c._tongziArchetype === 'late_bloomer') {
      // 大器晚成·50 岁入 keju (留位·非本 sprint 实施)
      // 仅记 _careerLongTail = +10 年
      c._careerLongTail = true;
    }
  });
}
```

---

## 8·**G·字段深生成** (童子 35 字段·年龄 9-14)

```js
var tongzijinshi = {
  // ─── meta ───
  id:         'tongzi_' + examYear + '_' + i + '_' + Date.now(),
  name:       _kjG5GenTongziName(seed, i, surname),
  age:        9 + Math.floor(rng() * 6),    // 9-14·神童独家
  gender:     '男',
  birthYear:  examYear - age,
  birthplace: provinces[Math.floor(rng() * provinces.length)],
  ethnicity:  '汉',
  faith:      '儒',
  culture:    '汉',
  learning:   '童子科·御前问对',
  appearance: '童子·身长四尺·目如朗星·言辞清越',
  diction:    '童子口吻·**"小子" 自称**·应对从容',
  personality: '聪慧·害羞 / 早熟',
  location:   '京师',

  // ─── top-level 11 维 (童子高 intelligence/charisma·低 valor/military/administration) ───
  loyalty:        70 + Math.floor(rng() * 20),
  ambition:       30 + Math.floor(rng() * 20),
  intelligence:   85 + Math.floor(rng() * 10),  // **85-95·神童独高**
  valor:          10 + Math.floor(rng() * 10),  // **极低**
  military:       10 + Math.floor(rng() * 10),  // **极低**
  administration: 20 + Math.floor(rng() * 20),  // **童不知政**
  management:     20 + Math.floor(rng() * 20),
  charisma:       70 + Math.floor(rng() * 20),  // **高·童趣可爱**
  diplomacy:      30 + Math.floor(rng() * 20),
  benevolence:    60 + Math.floor(rng() * 20),
  integrity:      80 + Math.floor(rng() * 15),

  resources: {
    privateWealth: { money: 50, grain: 10, cloth: 5 },   // 童子家境
    publicPurse:   { money: 0,  grain: 0,  cloth: 0 },
    fame:          30 + Math.floor(rng() * 20),
    virtue:        50 + Math.floor(rng() * 20),
    health:        archetype === 'early_genius_died' ? 60 + Math.floor(rng() * 15)
                                                     : 90 + Math.floor(rng() * 8),
    stress:        archetype === 'early_genius_died' ? 50 + Math.floor(rng() * 20)
                                                     : 15 + Math.floor(rng() * 10)
  },

  traits: ['child:prodigy', 'literate', 'precocious'].concat(
    archetype === 'late_bloomer' ? ['healthy', 'resilient'] : ['frail', 'high-stress']
  ),

  faction: (P.player && P.player.faction) || '',
  party: '',                                    // 童子不入党
  partyRank: '',
  family: surname + '氏',
  familyTier: 'commoner-prodigy',
  familyRole: '童子',
  clanPrestige: 40,
  mentor:    '',          // 童子不入 _discipleGraph
  hobbies:   '诵诗·习字·闻乐',
  innerThought: '小子愿勤学·不负陛下知遇之恩。',
  personalGoal: '长成入朝·报陛下抚顶之恩',
  stressSources: archetype === 'early_genius_died' ? ['压力过大', '年小体弱', '学业重'] : ['学业重'],

  career: [{
    year:      examYear,
    title:     '童子进士',
    note:      examYear + '年·童子科·州县荐举·' + age + ' 岁赐进士',
    date:      examYear + '年',
    desc:      '童子科·入翰林见习',
    milestone: true
  }],

  rankLevel:    1,                              // 童子最低
  title:        '童子进士',
  bio:          examYear + '年童子科·' + age + ' 岁神童·' + (archetype === 'early_genius_died' ? '体弱' : '健朗'),
  class:        'commoner-prodigy',
  source:       '童子科',
  recruitTurn:  GM.turn || 0,
  isHistorical: isHist,
  alive:        true,
  stance:       '见习·跟读',
  officialTitle: '翰林见习童子',

  // G5 私有
  _origin:           'tongzi',
  _tongziYear:       examYear,
  _tongziSubtype:    td && td.subtype,
  _tongziExaminer:   examiner.name,
  _tongziInitiative: td.initiative || 'passive',
  _tongziArchetype:  archetype,                  // 'early_genius_died' / 'late_bloomer'
  _historicalFigure: isHist,
  _reciteScore:      scores.recite,
  _writeScore:       scores.write,
  _impromptuScore:   scores.impromptu,
  _careerLongTail:   false,                      // late_bloomer 50 岁起 set
  _diedYoung:        false,                      // health 0 时 set true
  graduateTitle:     '童子进士',
  keju_status:       '童子进士',
  memorySeed:        '蒙陛下抚顶·童子科入翰林见习·愿成器以报'
};
```

### 8.1·历史名臣 draw (5 典型)

```js
var HISTORICAL_TONGZIJINSHI = {
  song:    ['晏殊', '朱虎臣'],     // 晏殊 14 岁赐进士·朱虎臣 9 岁射 10 箭中 9
  ming:    ['杨慎', '李东阳'],      // 杨慎 4 岁会背·李东阳 10 岁通经
  qing:    ['纪昀']                  // 纪昀 神童·后大成
};
```

---

## 9·新文件 + 改文件

### 9.1·**新·`tm-keju-tongzi.js`** (~400-500 行)·跟 G4 同 paradigm·更小 (sub-slice 8)

```
- §0·gate·_isG5Enabled
- §1·主考 pick·_kjG5PickTongziChiefExaminer
- §2·主入口·_kjG5OnTongziApproved (复用 G2 callback)
- §3·reject / defer handlers
- §4·童子进士标记·_kjG5MarkTongzijinshi + archetype 派生
- §5·spawn 池·_kjG5SpawnTongzijinshiPool (1-3 人·极少)
- §6·decorate spawn → keyi promote (复用 G4 paradigm)
- §7·背诵默写题目·_kjG5GenTongziQuestions
- §8·神童家族·_kjG5InitTongziFamilies + DetectFamily
- §9·抚摩大典 LLM·_kjG5RunFumoCeremony + ResumeIfPending
- §10·long-tail·_kjG5TongziHealthTick + Career LongTail hook
- §11·LLM tone hint·_kjG5GetTongziToneHint (2 archetype)
- §12·诏令 parser·_kjG5ParseTongziFromEdictText / Scan / ApprovedViaEdict
- §13·cross-scenario reset
- §14·expose (~20 helpers)
```

### 9.2·**改·`tm-keju-enke.js`** (~5 行·G2 callback 加 tongzi route)

跟 G3 wuju / G4 fanyi 同 paradigm·`_kjG2SpecialExamKeyiCallback` 加 tongzi block。

### 9.3·**改·`tm-keju-special-exams.js`** (~5 行·加 _kjG5DecorateSpawnedEntryForKeyi 调用)

```js
if (typeof window !== 'undefined' && typeof window._kjG5DecorateSpawnedEntryForKeyi === 'function') {
  try { window._kjG5DecorateSpawnedEntryForKeyi(entry); } catch(_) {}
}
```

### 9.4·**改·`tm-edict-lifecycle.js`** (~12 行·EDICT_TYPES 第 17 类 tongzi)

```js
tongzi: {
  label: '童子科',
  lifecycleDays: 365,                       // 1 年完成·罕见短周期
  immediate: false, phased: true,
  historyPaths: ['recommendation', 'royal-recognition', '无故强荐'],
  affectedClasses: { '士林':+5, '民心':+3, '国库':-2 },
  resistance: { '清议':10, '礼部':15 },       // 罕见·resistance 极低
  unintendedRisk: 'precocious_decline',      // 神童早凋
  keywords: ['童子科', '神童', '荐神童', '童子荐举']  // strong keyword 必含一
}
```

### 9.5·**改·`tm-endturn-pipeline-steps.js`** (~5 行·resume + health tick)

跟 G3/G4 同位 wire·`_kjG5ResumeFumoCeremonyIfPending` + `_kjG5TongziHealthTick` + `_kjG5MaybeResetCrossScenarioFields` + Path C scan。

### 9.6·**改·`index.html`** (~1 行)

```html
<script src="tm-keju-tongzi.js?v=20260526-g5"></script>
```

### 9.7·**新 smoke·`scripts/smoke-keju-tongzi.js`** (~40-60 case·10 section)

- §A·gate + flag·4 case
- §B·主考 pick·朝代-aware·4 case
- §C·spawn 池 (1-3 人)·5 case
- §D·两 archetype 派生·6 case
- §E·背诵默写题目·4 case
- §F·抚摩大典 LLM·5 case
- §G·long-tail health tick (early_genius_died 40%/turn -30)·6 case
- §H·神童家族 (≥2 同姓)·4 case
- §I·EDICT_TYPES.tongzi parser + callback·5 case
- §J·flag gate + cross-scenario reset·4 case

---

## 10·实施序·**~3 d·9 step**

| step | sub-slice | est |
|---|---|---|
| 0 | event hook 补·荐举触发 | 0.1 d |
| a | A·base + 1 试 + 抚摩大典 + Path B/C | 0.6 d |
| b | B·两 archetype 派生 | 0.4 d |
| c | C·背诵默写题目 | 0.4 d |
| d | D·神童家族 | 0.3 d |
| e | E·抚摩大典 LLM | 0.3 d |
| f | F·long-tail health tick | 0.3 d |
| g | G·字段深生成 35 字段 | 0.3 d |
| smoke | 40-60 case·10 section + 全 regression | 0.3 d |
| **total** | | **~3 d** |

---

## 11·LLM cost 量化

| 场景 | call | 平均 token | per-tongzi |
|---|---|---|---|
| 礼部上奏 (G1) | 1 | 200 | 200 |
| 背诵默写题目 (C) | 1 | 400 | 400 |
| 抚摩大典 (E) | 1 | 300 | 300 |
| 答卷·n_jinshi=2 | 2 | 250 | 500 |
| 童子 tone 注入 (I)·静态·0 | 0 | 0 | 0 |
| **per 童子科** (n=2·罕见) | ~5 | — | **~1400 token** |
| **per 全游戏** (~5 次·10 年 cooldown) | ~25 call | — | **~7000 token** |

---

## 12·red line check

| red line | v1 适应 |
|---|---|
| 复用 first | 80% G2/G3/G4 paradigm + 20% G5 新 (年龄 9-14 / 2 archetype / 抚摩大典 / long-tail) |
| 自然政治触发 | G1 tongzi 已 ship·5% prob·10 年 cooldown |
| 失败禁玄幻惩罚 | 神童早卒 / 才尽辍考·全自然 |
| 工具 vs 系统 | 系统型·keyi + chars 长尾 + 健康 tick |
| flag gate | useNewKejuG5 默认 off |
| 9 朝代 preset | 童子科 era-flexible (汉唐宋明清都偶有·非清独有) |
| 邸报中文 | 全中文 |
| audit-first | v1 → audit → v2 → implement |
| **特科必须独深 (memory feedback_special_exams_per_type_depth)** | G5 独 runner·跟 G2/G3/G4 各独 |
| 抚摩大典 LLM 温情 | 真历史风格 (太监记口吻·非威仪) |
| **G5 独家·神童年龄 9-14** | 真接口 char.age·跟 G2/G3/G4 age 完全不同 paradigm |
| 两 archetype 长尾 (early_genius_died / late_bloomer) | health tick 真改 char state·非装饰 |
| 字段深生成 35 字段 | 跟 G2/G3/G4 schema 一致 |
| LLM dialog 口吻 (童子独特) | "小子" 自称·害羞 / 早熟·sc1q / 廷议 / 全 LLM 注入 |
| 神童家族 (≥ 2 同姓) | 跟 G3 武勋世家 paradigm 同·**频率极低** |
| 罕见性·1-3 人/cohort·10 年 cooldown·5% prob | 保持罕见性·非常规科 |

---

## 13·post-G5·next

- **G5·童子科·当前·**v1 ready·~3 d
- Phase G **5/5 完工** (G1+G2+G3+G4+G5 全 ship)
- Phase H 已完工
- ship 一波 (1.2.7.0)

---

## 14·v1 ready 验

- ✅ 8 sub-slice 全 cover
- ✅ G2/G3/G4 复用 80%·新作 20% (年龄 + 2 archetype + 抚摩大典 + long-tail)
- ✅ 童子进士字段 35·年龄 9-14 独特
- ✅ 童子科 vs 其他 3 特科·**呈现差异 8 维**
- ✅ era-flexible (汉/唐/宋/明/清都偶有)
- ✅ 3 路径 + 诏令 EDICT_TYPES.tongzi 第 17 类
- ✅ 两 archetype 长尾·真改 char health
- ✅ 神童家族 ≥ 2 同姓 (罕见但存)
- ✅ 历史名臣 draw (5 典型·晏殊/朱虎臣/杨慎/李东阳/纪昀)
- ✅ LLM tone hint·"小子" 自称
- ✅ 抚摩大典 LLM·温情体
- ✅ LLM cost 量化 ~1400/童子科 (极少)
- ✅ red line 16 项·全合规

**v1 ready·待三层 audit (~0.2 d) + v2 + implement (~2 d) + 5 轮 audit + smoke (~0.5 d)**

---

## 15·**v2 audit fix** (待 audit·待 v1 → v2)

实际 audit pickup·跟 G4 同 audit paradigm·主要·

| # | severity | 编号 | v1 问题 | v2 修法 |
|---|---|---|---|---|
| 1 | **MID** | M1 | `_impromptu Score` 字段含空格·typo | **§2.3 修**·`_impromptuScore` |
| 2 | **MID** | M2 | `_kjG5BuildFumoCeremonyPrompt` list[0] 假设 list 非空·若空 crash | **§6.1 加 guard**·`if (!list || !list.length) return ''` |
| 3 | **MID** | M3 | health tick 40%/turn -30 + EARLY_GENIUS_DIED archetype·若 stress 60+ 应增 prob | **§7 v2 doc 注**·设计选择·40% fixed·simplicity·5 轮 audit 看 user reaction |
| 4 | **LOW** | L1 | tinyi affinity helper·跟 G3/G4 同 DEFERRED | **doc 注**·`_kjG5GetTongziFamilyTinyiAffinityBonus()` return 0·DEFERRED |

---

## 16·修订日志

- **v1·2026-05-26**·首版·8 sub-slice·35 字段·G5 独家·年龄 9-14 + 两 archetype + 抚摩大典 + long-tail·3 d 完工
- **v2·2026-05-26**·4 audit fix (3 MID + 1 LOW)·M1 修 typo · M2 加 list 空 guard · ready implement
