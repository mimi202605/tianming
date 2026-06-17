# 科举·Stage 2·Phase H·**私学 / 书院 mini-system** (v2 max-scope·12 维深嵌入·11 sub-slice)

**date**·2026-05-26
**status**·**v3·全 11 sub-slice ship-ready** + small audit RAA (8 fix) + 5 轮 audit (R1-R5·共修 7 项)·**smoke 158 PASS·全 regression 1280+ PASS / 0 FAIL·零回归**
**actual time**·**自 H0 启 ~6h** (复用度高·G2/G3 paradigm 80%)
**estimated**·**~27-36 d** (深嵌入·跟 Phase G 全 sub-phase 同量级·audit fix 不增 sub-slice)
**dependency**·G1 / G2 / G3 paradigm 80% 复用·L1 paradigm `_basePresetSnapshot.schoolNetworkInit`·L7 reform-apply 引擎·F1 disciple-graph·F4c yanguan-qingyi·tinyi v3·EDICT_TYPES 14→15 类·9 朝代 preset `schoolNetworkInit`
**flag gate**·`P.conf.useNewKejuH=false` 默认 off

**红线 reminder** (跟 G3 同)·
- **复用** G/F/L paradigm 80%·新作 ~20% (山长 NPC schema / lineage chain / 学说改 paradigm.subjects / 讲会 LLM / 反馈循环)
- **自然政治触发**·founding 由 NPC 学术声望 + 时代驱动·禁讲学由 corruption / 党争触·禁玄幻
- **失败禁玄幻惩罚**·禁讲学失败 → 士林大乱·非"上天降罚"
- **山长是真 NPC**·非数据字段·真上人物面板·真被弹劾 / 押 / 赐死
- **党派真 spawn 进 GM.parties**·走 `_ty3_partySpawn(opts)`·tinyi v3 真见·**非 G3 _wujuParty 隔离 namespace**
- 9 朝代 differ·**汉无书院·元官化·清初禁讲学**
- audit-first·v1 → audit → v2 → implement

---

## ★·v2 修订摘要 (audit pickup·17 项)

| # | severity | 编号 | v1 问题 | v2 修法 |
|---|---|---|---|---|
| 1 | **CRITICAL** | CR1 | §H3 "bypassUserApproval: true·school-driven 直 apply"·绕 keyi 议政·user 无感知 | **拆 2 路**·(a) 显式 paradigm shift·走 `_kjReformKeyiCallback` keyi 议政·(b) 隐式 weight tick·小幅 (±2) 累积·绕 keyi OK·doc 标 |
| 2 | **CRITICAL** | C1 | §H3 假 `_kjpApplyReform(reformObj)` 不存·真接口 `_kjpL7ApplyDiffToParadigm(diff, intent, outcome, ctx)` 4 positional | §H3 改·走 `_kjReformKeyiCallback(method, ctx)` callback chain·跟 L7 paradigm 一致 |
| 3 | **CRITICAL** | C2 | §H3 假 diff shape `subjects.理学.weight +20` 错 | 真 shape `{added:[{id,name,weight,ideology,format,maxScore,historicalAnalog,rationale,introducedYear,introducedBy,customFields}], removed:[{id}], weightChanged:[{id,newW}]}` |
| 4 | **CRITICAL** | C3 | §H2 假 `_kjpAddDiscipleToShanzhang(shanzhang, name)` 不存·真 `_kjAddDiscipleEdge(disciple, mentor, cohortYear, addedTurn)` 4 positional | 改·`_kjAddDiscipleEdge(discipleName, shanzhang.name, foundedYear, GM.turn)` |
| 5 | HIGH | H1 | §H1 山长 `faction:'在野'` 字段值假设·grep 0·非有效 faction key | 改·`faction: ''` 空·或 `_inFaction: 'literati'` 自定标签·非真 faction |
| 6 | HIGH | H2 | §H7 假 `GM.vars['民心(士)']` 不存·真只 `GM.vars['民心']` 单一 | 改·影响 `GM.vars['民心']` ±5·或不动 vars 改影响 chronicle 士论 text |
| 7 | HIGH | H3 | §H7 假 "解额 +5%"·真接口 `eb.kejuQuota` 是 province level | 改·影响 `prov._bonusInfra.kejuQuota`·或 paradigm.quota.geo 改 paradigm 全局·按 prefecture-aware 选 |
| 8 | HIGH | H4 | §H8 反馈循环·"corruption≥60+tension≥70 → 触民间书院兴"·race·同 turn 多 fire | 加 cooldown + per-turn guard·跟 G3 BB6 同 paradigm |
| 9 | HIGH | H5 | §H6 山长被押 → spawn 反弹党·chain reaction·≥3 山长被押 → ≥3 反弹党 `GM.parties` 爆炸 | 加 cap·max 1 反弹党 per watershed·或 merge 同期反弹 (东林+复社 → "东林复社联党") |
| 10 | HIGH | H6 | §H9 watershed event spawn 党·跟 G2 enke `_academyOrigin` 自动 spawn 双触风险 | watershed event 内·若 party 已存·skip spawn·不 chronicle (`_ty3_partySpawn` 内已 dedupe by name·此处显式 check) |
| 11 | MID | M1 | §H5 没明 EDICT_TYPES.school 加位 | v2 明·加进 `tm-edict-lifecycle.js`·`var EDICT_TYPES = { ...wuju..., school: {...} }`·**第 15 类** |
| 12 | MID | M2 | §H5 没说 `KEYI_TOPIC_TYPES.school_ban` 已 reserve·真在 `tm-keju-topic-router.js:94-101`·sliceOwner='H3' | v2 §H5 注·**复用预留 topicType·非新建**·callback `_kjSchoolBanKeyiCallback` 实施时 fill |
| 13 | MID | M3 | §H1 山长 `_origin: 'shanzhang'` 字段值新加·grep 现 list 无 | v2 § 字段表·`_origin` 枚举·enke / wuju / shanzhang / disciple |
| 14 | MID | M4 | §H6 _ty3_partySpawn opts 漏字段 `currentAgenda / desc / status` | v2 完整 opts·`{name, founders, faction, initialInfluence, initialCohesion, ideology, policyStances, reason, agenda, parentParty, desc, status, leaderName}` |
| 15 | MID | M5 | §H3 学说 subjects.added 字段·`introducedYear` / `introducedBy` 漏 | v2 注·`introducedYear: foundedYear, introducedBy: '朱熹白鹿洞 1180'` (含书院名) |
| 16 | MID | M6 | §H11 smoke 不含 cross-scenario reset 测试·H 加新字段必 入 reset list | v2 §H11 加 §M reset case·跟 G3 M7 同 paradigm |
| 17 | MID | M7 | §H0 没说 flag gate default off + user toggle 在哪 | v2 §0a flag gate·`P.conf.useNewKejuH=false`·user 在 settings panel 6 决定 toggle |
| 18 | LOW | S1 | UI label "学政" 现游戏 grep 0·朝代差异未注 | label 按朝代·汉/唐"礼部·议讲学"·宋后"学政"·清"督学使" |
| 19 | LOW | S2 | desk template suggestion 5 类 `_schoolSubtype` 没列出 | v2 §H5 加 5 subtype 表·`ban / restore / found / promote / lecture` |

(实际 17 项·M3/M4/M5 合并为 3 字段补·S1/S2 为 surface·总 audit checklist 19 ↑·doc 内 17 项 fold)

---

## 1·12 维深嵌入对照表 (v1 浅 vs v2 深)

| # | 维度 | v1 浅 (G3-style·会被 user 拒) | v2 深 (本 plan·真嵌游戏循环) |
|---|---|---|---|
| 1 | 山长 NPC | academy.founder = '顾宪成' string | 走 char schema 全 spawn·8D + resources + party + lineage·**真上人物面板** |
| 2 | 邸报 / chronicle | 仅 chronicle 内部 | founding / 讲会 / 禁 / 复立·**走 chaoyi source pool + 邸报头条** |
| 3 | 学说改 paradigm.subjects | 无 | 朱熹书院盛 5 年 → `理学.weight +20`·王阳明 → 加 `心学` subject·**真改科举学说** |
| 4 | 山长被押 → F4c | 无 | 禁讲学 → 山长被押 → `_kjSpawnYanguanQingyi('阉党', shanzhang.name, ...)` 真触清议 |
| 5 | 党派 spawn | _schoolNetwork 内部 namespace | **走 `_ty3_partySpawn({name:'东林党', founders:[...], ideology:'实学', ...})` 真进 GM.parties** |
| 6 | 地理 + 民心 | 无 | academy.region attach·`GM.vars['民心(士)']` +5·解额加成 + `_academyOrigin` 进士字段 |
| 7 | 反馈循环 | 无 | corruption≥60 + tension≥70 → 触 "民间书院兴" event·F1<30 → 罢考请愿 spawn 自书院 |
| 8 | tinyi v3 决策 | 仅 tag 加 | NPC `ch.party='东林党'` → 议题 anti-东林 自动 -50 affinity·**真改 NPC vote** |
| 9 | L4 forecast / L7 改革 | 列名 | "禁讲学" 走 L4 forecast (东林 NPC 必 oppose) + L7 apply (真 close + ch._retired) |
| 10 | disciple → 进士优先权 | 无 | G2 jinshi 加 `_academyOrigin='东林'`·入党 + factionBias 影响 examiner |
| 11 | lineage chain | founder 字段 | 朱熹 → 弟子 → 弟子的弟子 mentor chain·复用 F1 disciple-graph |
| 12 | watershed event | timeline 标 | 1654 顺治禁讲学·真 close all + spawn 反清遗党·走 L10 paradigm |

---

## 2·11 sub-slice 详细 (~27-36 d)

### H0·event-hook 前置 + flag gate (0.5 d)

**M7 fix·flag gate**·`P.conf.useNewKejuH=false` 默认 off·user 在 **settings panel 6 决定** toggle (跟 G2/G3 同 paradigm)·所有 `_kjpH*` 函数 entry 先查 `_isHEnabled()`·flag off 全 noop

复用 G2/G3 `tm-keju-event-hooks.js` 同 paradigm·加 watcher·
- `_lastSchoolFoundedYear`·SET on founding event·跟 `_lastReignChangeYear` 同位
- `_lastSchoolBannedYear`·SET on ban event
- **H2 fix·影响 `GM.vars['民心']` 单一字段** (`民心(士)` 不存)·book flourishing ±5
- **`_lastSchoolNetworkTier`** (nascent/active/dominant/banned)·tier delta watcher (跟 G3 peaceful counter 同 paradigm)

**红线**·event-hook 仅 SET 字段·不直 spawn·跟 G2 BB1 paradigm 一致

---

### H1·主 runner + 山长 NPC spawn (4-5 d·**v2 核心**)

**新文件**·`web/tm-keju-school-network.js` (~700-900 行·跟 G3 wuju.js 同量级)

**5 类 academy 层级**·
| 类 | 例 | 朝代 | 触发 |
|---|---|---|---|
| 太学 (官学·最高) | 汉太学 / 唐国子学 / 宋国子监 | 全朝 | preset 已 setup |
| 郡学 / 府学 | 汉郡学 / 明府学 | 汉-清 | preset 部分 |
| **私学** (个人讲学) | 王阳明书院 / 朱熹精舍 | 宋-明 | founding event |
| **书院** (大型私学+议政) | 东林 / 复社 / 白鹿洞 | 宋-明清 | founding event |
| **讲会** (临时聚会) | 鹅湖之会 / 东林讲会 | 宋-明 | 讲会 event |

**Lifecycle 5 阶段**·
1. **founding** (创建)·NPC 学术声望累 + 时代触发·真 spawn 山长 NPC
2. **flourishing** (盛)·讲会 + disciple 增长·影响 paradigm.subjects
3. **official** (官化)·朝廷指派山长 (元 1290 / 清 1742)·影响力降
4. **banned** (禁)·禁讲学 event·山长被押 / 流放·spawn 反弹党
5. **restored** (复立) / **abolished** (废)·watershed event

**山长 NPC schema** (跟 G2 jinshi 同深度·真走 char system)·
```js
var shanzhang = {
  // top-level 11 维·儒者偏 intelligence/integrity/charisma·低 valor/military
  name: founder_name,
  age: 50 + Math.floor(Math.random()*15),
  gender: '男',
  birthYear: examYear - age,
  birthplace: academy.region || '京师',
  ethnicity: '汉',
  faith: '儒',
  culture: '汉',
  learning: '理学' / '心学' / '实学' / ...,
  appearance: '清癯·须长·目有神光',
  diction: '引经据典·必称圣贤·语必中规',
  personality: '刚毅 / 守道 / 不容奸',
  loyalty: 50,    // 对当朝皇帝中等·真心忠学不忠权
  ambition: 30,   // 非求权位·求道
  intelligence: 85 + Math.floor(Math.random()*10),    // 山长必高智
  valor: 20,
  military: 20,
  administration: 40,
  management: 60,
  charisma: 70 + Math.floor(Math.random()*15),
  diplomacy: 50,
  benevolence: 70,
  integrity: 80 + Math.floor(Math.random()*15),       // 山长必高节
  // resources·士林 fame 高
  resources: {
    privateWealth: { money: 500, grain: 100, cloth: 50 },
    publicPurse:   { money: 0, grain: 0, cloth: 0 },
    fame:          60 + Math.floor(Math.random()*20),  // 学术声望
    virtue:        70 + Math.floor(Math.random()*20),  // 操守
    health:        70 + Math.floor(Math.random()*20),
    stress:        20
  },
  traits: ['scholar', 'reformist'(if 实学), 'traditional'(if 理学), 'iconoclast'(if 心学)],
  // 派系·真走 GM.parties (H2)
  // H1 fix·faction 字段·grep 现 game 无"在野"·改空·或用 player.faction 默认 (跟 G2/G3 山长视为本朝官·真朝代 chars 一致)
  faction: (P.player && P.player.faction) || '',
  _inFaction: 'literati',                              // M3·H 自定标签·跟 _origin 平行·非真 GM.factions key
  party: '东林党' / '复社' / '理学派' / '心学派' / '阳明学',
  partyRank: '首领',
  family: name.charAt(0) + '氏',
  familyTier: 'scholar-lineage',
  familyRole: '山长',
  clanPrestige: 70,
  mentor: '',     // 山长无 mentor (是最上游)
  hobbies: '讲学 / 著书 / 游学',
  innerThought: '愿以一书院之力·正士林·振世道。',
  personalGoal: '复古道·正学风',
  stressSources: ['朝政日非', '阉党当道', '学说不行'],
  // 职衔·**non-朝廷·特殊**
  officialTitle: '致仕·' + academy.name + '山长',
  title: '山长',
  bio: academy.foundedYear + '年立 ' + academy.name + '·主讲' + learning,
  class: 'scholar-lineage',
  source: '私学',
  recruitTurn: GM.turn || 0,
  isHistorical: !!(academy.founder && historicalFoundersList.includes(academy.founder)),
  alive: true,
  career: [{
    year:      academy.foundedYear,
    title:     '山长',
    note:      academy.foundedYear + '年·' + academy.name + '·立',
    date:      academy.foundedYear + '年',
    desc:      '创' + academy.name,
    milestone: true
  }],
  // H 私有 _ 字段·M3·_origin 枚举·跟 G2 'enke' / G3 'wuju' 平行·新加 'shanzhang' + 'disciple'
  _origin:           'shanzhang',          // 山长 NPC
  _academyName:      academy.name,
  _academyType:      academy.type,        // 太学/郡学/私学/书院/讲会
  _lectureLearning:  learning,             // 理学/心学/实学/朴学
  _disciples:        [],                   // 弟子 char names (lineage chain·F1 disciple-graph 真存)
  _academyLifecycle: 'founding'            // founding/flourishing/official/banned/restored/abolished
};

// 弟子 spawn schema (跟 山长 同 paradigm·_origin='disciple')
// 通过 G2 enke spawn 时·若 birthplace == academy.region·自动 ch._academyOrigin = academy.name
// F1 disciple-graph 真链·_kjAddDiscipleEdge(disciple.name, shanzhang.name, academy.foundedYear, GM.turn)
```

**真上人物面板**·`GM.chars.push(shanzhang)`·直现 user 面板。

**Public API** (跟 G3 wuju.js 同 paradigm)·
```
_kjpOnSchoolFounding(academyConfig)              // 主入口·founding event
_kjpOnSchoolBanned(academyName, reason)          // 禁讲学
_kjpOnSchoolRestored(academyName)                // 复立
_kjpOnSchoolOfficialized(academyName)            // 官化 (元 1290)
_kjpSpawnShanzhang(academyConfig)                // spawn 山长 NPC
_kjpAddDiscipleToShanzhang(shanzhang, discipleName)
_kjpCalcSchoolNetworkTier()                      // nascent/active/dominant/banned
_kjpGetActiveAcademies()
_kjpInitSchoolNetwork()                          // GM._schoolNetwork init
_kjpResumeIfPending()                            // resume hook
```

---

### H2·党派真 spawn + lineage chain (4-5 d)

**核心**·**走 `_ty3_partySpawn(opts)` 真进 GM.parties**·跟 tinyi v3 NPC 真 wire

**5 类 party 触发**·
| 党 | 触发 | founders |
|---|---|---|
| **东林党** | 东林书院 founding + 同期 ≥3 进士书院出身 | 顾宪成 + 高攀龙 + 钱一本 |
| **复社** | 复社 founding (1629 张溥) | 张溥 + 张采 + ... |
| **阉党** (反向·跟 H6 联动) | 司礼监权 ≥60 + 党争 ≥70 | 魏忠贤 + 客氏 + ... |
| **理学派** (宋) | 朱熹书院盛 + 同期 ≥5 进士理学出身 | 朱熹 + 张栻 + ... |
| **心学派** (明) | 王阳明书院盛 + 同期 ≥3 进士 | 王阳明 + 王畿 + 王艮 + ... |

**spawn 调用** (M4 fix·完整 opts·真 `_ty3_partySpawn` 签名)·
```js
_ty3_partySpawn({
  name:    '东林党',
  founders: [shanzhang.name, ...topDisciples],
  leaderName: shanzhang.name,            // M4·leader 真名 (默认取 founders[0])
  faction:  '',                          // H1·空·非 '在野' (避无效 key)·tinyi v3 内自动 fallback player.faction
  initialInfluence: 30,
  initialCohesion:  85,                  // 学派党高凝聚
  ideology: '实学·议政清议',
  policyStances: ['anti-阉党', 'pro-清议', 'pro-民意'],
  parentParty: null,                     // M4·null·非分裂出·真新建
  reason: '东林书院 ' + foundedYear + '·讲会议政·结党',
  agenda: '正士风·清浊流',                 // currentAgenda
  desc: '东林学派议政·讥时清议',
  status: 'active'
});
// 返 newParty | null (若已存)
```

**lineage chain** (C3 fix·真签名 4 positional)·复用 F1 disciple-graph paradigm·
- 山长 → 直接弟子 (顾宪成 → 高攀龙)·`_kjAddDiscipleEdge('高攀龙', '顾宪成', 1580, GM.turn)`
- 弟子 → 再传弟子·`_kjAddDiscipleEdge('钱一本', '高攀龙', 1604, GM.turn)`
- chain 写进 `GM._discipleGraph.byMentor[mentor].disciples[]` / `byCohort[year]` / `byDisciple[name]`·跟 E1/F1 mentor-index 真互通

**4 archetype 山长** (跟 G3 5 archetype 同 paradigm)·
| archetype | 例 | 学说 | tone |
|---|---|---|---|
| **传统理学** | 朱熹 | 理学 | 平和·讲究·"格物致知" |
| **激进心学** | 王阳明 | 心学 | 反传统·"知行合一" |
| **议政实学** | 顾宪成 | 实学 | 议政·"风声雨声读书声" |
| **遗民守节** | 黄宗羲 | 反思 | 悲愤·"明儒学案" |

---

### H3·学说改 paradigm.subjects (3-4 d·**v2 核心**)

**触发**·书院 flourishing ≥ 5 年 + lineage 弟子 ≥10 人 + 学说连续讲

**CR1 fix·拆 2 路 paradigm shift**·

**Path α·显式 paradigm shift** (大幅·走 L7 keyi 议政·user 知情)·
- 触发·书院 dominant tier·学派显学化 (理学/心学)·影响 subjects[].weight ≥10·**走 keyi 议政**
- 路径·`_kjpL7ApplyDiffToParadigm` 不能直 call·必须走 keyi callback chain·此处·
  1. spawn 一个 keyi `topicType='reform'` (复用 KEYI_TOPIC_TYPES.reform·callback=`_kjReformKeyiCallback`)
  2. `topicData.paradigmDiff` 真填·**user 见议程"理学官学化·调权重 +20"·议程通过 → L7 apply diff 真生效**
  3. 失败·学说停滞·不改 paradigm

**Path β·隐式 weight tick** (小幅·绕 keyi·school-driven·non paradigm shift)·
- 触发·书院 flourishing 每 5 年 + 学派弟子 ≥10·**小幅 ±2 weight 累积**·跟时间慢漂移
- 不走 L7 keyi·直 mutate `GM._kejuParadigm.subjects[idx].weight += 2`·**doc 标·非真 paradigm change·user 仅 chronicle 见**
- 上限·±10/朝代 (避无限漂)

**真接口** (C1+C2 fix)·

```js
// Path α·显式·走 _kjReformKeyiCallback (跟 L7 callback chain)
// 真 spawn 一个 reform keyi·callback 通过后 _kjpL7ApplyDiffToParadigm 自动 fire
// (此处仅 prep topicData·非直 call apply)
var topicData = {
  topic:      '理学官学化·朱熹白鹿洞 1180-1185',
  intent:     'reform',
  paradigmDiff: {
    subjects: {
      weightChanged: [
        { id: 'lixue',  newW: 50 },          // 理学 +20
        { id: 'bagu',   newW: 60 }           // 八股 -10
      ],
      added: [],
      removed: []
    }
  },
  magnitudeParsed: { magnitude: 'medium', impact: 'subjects-shift' },
  pilotScope: {},
  // H 自定·source 标
  _sourceSchoolH: { academyName: '白鹿洞书院', shanzhang: '朱熹', year: 1185 }
};
// spawn keyi (跟 G2 enke spawn topicType='reform' paradigm 同)·user 议程见

// 王阳明书院盛·加 subject·真 shape (C2 fix)
var diff_addSubject = {
  subjects: {
    added: [{
      id: 'xinxue',
      name: '心学',
      weight: 5,
      ideology: 'reformist',
      format: '论述',
      historicalAnalog: '王阳明致良知',
      rationale: '王阳明书院盛·心学起·士林讨论',
      maxScore: 100,
      introducedYear: 1510,                       // M5·补
      introducedBy: '王阳明 / 龙岗书院',          // M5·补 (含书院名)
      customFields: { _academyOrigin: '龙岗' }
    }],
    weightChanged: [],
    removed: []
  }
};

// Path β·隐式·小幅累积·non-paradigm shift
GM._kejuParadigm.subjects.forEach(function(s) {
  if (s.id === 'lixue' && _isLixueAcademyFlourishing()) {
    s.weight = Math.min(100, s.weight + 2);   // 慢漂
  }
});
```

**学说档表**·
| 学说 | 触发 | 真改 | path |
|---|---|---|---|
| 理学 | 朱熹/张栻 lineage 盛·dominant | weightChanged +20 (上限 50) | **α**·走 keyi |
| 心学 | 王阳明 lineage 盛·dominant | added·5→30 | **α**·走 keyi |
| 实学 | 东林/复社 盛·dominant | weight +10 / added | **α**·走 keyi |
| 朴学 (考据) | 乾嘉书院·flourishing | weight +5 漂 | **β**·绕 keyi |

**联动 L7** (Path α)·真走 L7 callback chain·user 见议程·投票·apply·**真 paradigm 演变 timeline**·非 hardcode·非外挂。

---

### H4·讲会 event LLM (2-3 d)

**`_kjpRunLectureMeetingLLM(shanzhang, opposingShanzhang, topic, ...)`**·复用 G2 谢恩大典 / G3 校阅大典 LLM paradigm·

**5 类讲会** (历史名场面)·
| 讲会 | 主 | 客 | 题 | 朝代 |
|---|---|---|---|---|
| **鹅湖之会 1175** | 朱熹 | 陆九渊 | 道问学 vs 尊德性 | 南宋 |
| **东林讲会** | 顾宪成 | (士子) | 讽议朝政 | 明末 |
| **白鹿洞讲会 1175** | 朱熹 | (士子) | 学规 / 四书 | 南宋 |
| **泰州学派 1530+** | 王艮 | (民间) | 百姓日用即道 | 明中 |
| **复社虎丘大会 1630** | 张溥 | 二千余士 | 复古·讥时 | 明末 |

**LLM prompt**·
```
【讲会·{academyName}·{year}年】
主讲·{shanzhang.name}·{learning}派
客·{opposingShanzhang.name if any}
听讲·{discipleCount} 人

请以书院讲会记 口吻·写 200-300 字·古文体·
- 描讲会景·两方辩学说
- 听众反应·或服或惑
- 收尾点出本场学术成果

风格·儒林讲学 + 微议政
**禁玄幻**·非天降神物
```

resume hook + fallback (跟 G3 同 paradigm)。

---

### H5·玩家 4 路径议政 (2.5-3 d)

跟 G2/G3 同 paradigm·**3 路径** + desk template + UI button·

**Path A·自然 trigger**·_kjpOnSchoolFounding spawn 进 keyi 议程 → user 议禁/容/扶
- M2 fix·**KEYI_TOPIC_TYPES.school_ban 已 reserve** (在 `tm-keju-topic-router.js:94-101`·sliceOwner='H3')·复用预留 topicType·**非新建**·实施时 fill `_kjSchoolBanKeyiCallback`

**Path B·礼部/学政 wendui** (S1 fix·朝代差异 label)·复用 G2 `_kjG2OpenLibuEnkeWendui` paradigm·
- `_kjpOpenLibuSchoolWendui()` 召学政 / 礼部·label 按朝代·
  - 汉/唐·"问礼部·议讲学"
  - 宋后·"问学政"
  - 清·"问督学使"
- cedui mode·prefill·"今闻 X 书院讲学·清议起·卿之见?"
- archetype tone·严守 / 纵容 / 观望
- response → spawn keyi 议·议禁讲学 / 扶 / 任之

**Path C·诏令御案** (M1 fix·EDICT_TYPES 第 15 类·加进 `tm-edict-lifecycle.js`)·
```js
// tm-edict-lifecycle.js 内·EDICT_TYPES 第 15 类
school: {
  label:'兴学/禁讲学',
  lifecycleDays: 1095,        // 3 年
  immediate: false, phased: true,
  historyPaths: ['兴官学', '禁讲学', '扶书院', '官化书院'],
  affectedClasses: { '士林':±10, '国库':-5, '皇权':+5 (if 禁) },
  resistance: { '士林':50, '在野儒':70 (if 禁), '阉党':30 (if 扶) },
  unintendedRisk: 'literati_revolt',   // 士林反弹
  keywords: ['兴学','建学','禁讲','禁书院','立书院','扶书院']
}
```

**desk template suggestion + F7 UI button**·复用·suggestion 内 `s._schoolSubtype`·click "问学政" 触 `_kjpOpenLibuSchoolWendui()`

**S2 fix·5 类 _schoolSubtype 表**·
| subtype | label | template body |
|---|---|---|
| `ban` | ⚠ 禁讲学 | "朕念书院讲学日炽·议政讥时·特禁讲学·钦此。" |
| `restore` | 复立书院 | "朕念 X 书院昔为正学渊薮·准复立·钦此。" |
| `found` | 立官学 | "朕念兴学育才·立 X 书院·特命学政主之·钦此。" |
| `promote` | 扶书院 | "朕念 X 书院学行可嘉·特赐田产·助其讲学·钦此。" |
| `lecture` | (event-only) | (讲会驱动·non-edict) |

---

### H6·incident hookup 深 (2-3 d·**v2 核心**)

**3 类 incident 真触**·
1. **禁讲学 → 山长被押**·走 `_kjSpawnYanguanQingyi(party, shanzhang.name, '魏珰禁讲学·害正人')` (跟 F4c 同 paradigm)
2. **山长被赐死 → 反弹党 spawn**·走 `_ty3_partySpawn({name:'东林遗党', ideology:'反清议政', ...})`
3. **山长被弹劾**·tinyi v3 `_ty3_buildAccusationMemorialStructured` 内·若 accused.\_origin=='shanzhang'·counter +1 (跟 G3 BB2 同)

**reverse 反清遗党 paradigm** (H5 fix·加 cap)·
- 山长被押 → disciples 走避 → spawn "X 遗党" (e.g. 东林遗党 / 复社遗党)
- 走 _ty3_partySpawn·opposition party·ideology='反阉党·复正统'
- 跟当朝皇帝 affinity 极低·**真改 NPC 决策**
- **H5 cap·max 1 反弹党 per watershed**·若同 watershed 内 ≥3 山长被押·**merge 为联党** (e.g. "东林复社联党")·非 spawn 3 个·避 GM.parties 爆炸
- 实现·`GM._kjpHRebelPartySpawnedThisWatershed = {}`·watershed key 标·已 spawn skip

---

### H7·地理 attach + 民心扩 (2-3 d)

**academy.region attach** preset 已存·
- 东林·无锡
- 应天书院·商丘
- 岳麓·长沙
- 白鹿洞·庐山·南康军
- 嵩阳·登封
- 关中·西安

**真影响** (H2 + H3 fix·真接口)·
- **民心影响** (H2 fix)·真接口·`GM.vars['民心']` 单一字段 (`民心(士)` 不存)·
  - book flourishing → `GM.vars['民心'].value += 5` (max +20 全 sprint)
  - book banned → `GM.vars['民心'].value -= 5` (反弹·士林失望)
  - 或不动 vars 改影响 `GM._chronicle` 士论 text·**doc 标 paradigm 选**·实施时择 user 确认 (preferred·真改 vars + chronicle 双写)
- **解额影响** (H3 fix·真接口)·**双轨**·
  - province level·`prov._bonusInfra.kejuQuota += 1` (按 academy.region 找对应 prov)·真接口 `eb.kejuQuota`
  - paradigm level (若 prov 不对应)·改 `paradigm.quota.geo[南/北/中]` ±2 (复用 L7 paradigm 改革引擎)·
- G2 jinshi spawn 时·若 `academy.region == jinshi.birthplace` → `jinshi._academyOrigin = academy.name` + `jinshi.party = academy.party`

**真上 phase 8 地图准备**·academy 字段 `{lat, lng, region}` 留位·Phase 8 地图 ready 时真 marker (此 sprint 仅留位·非 ship)

---

### H8·反馈循环闭环 (2-3 d·**v2 核心**)

**朝廷腐败 ↔ 书院兴 闭环** (H4 fix·加 cooldown + per-turn guard)·

| 触发 | 阈 | cooldown | event |
|---|---|---|---|
| 民间书院兴 | corruption≥60 + tension≥70 | 10 年 | spawn "X 学派·民间书院兴" event·真 founding 新 academy |
| 罢考请愿 | F1<30 + 私学占比>40% | 5 年 | spawn "罢考请愿" event·学子 50+ 联名·走 chaoyi |
| 禁讲学反弹 | 禁讲学 后 1-3 年 | 跟随 watershed·非独立 | spawn "X 党遗党反弹" event·走 F4c yanguan-qingyi |
| 改革浪潮 (书院 driven) | 书院 dominant tier + 改革派 NPC≥2 | 15 年 | 加 L7 reform 候选 (复用 L7 callback chain) |
| 党争升级 | 东林 + 阉党 同存 + cohesion≥80 双方 | 5 年 | tinyi `partyStrife` +20·真改党争 level |

**H4 fix·race guard**·
- 每 trigger·`GM._kjpHFeedbackCooldown[triggerKey] = GM.year` SET·`year - lastFire < cooldown` 跳
- 每 turn 单 trigger 上限·`GM._kjpHFeedbackFiredThisTurn = {}` per-turn map·避同 turn 多 fire

**核心**·闭环·腐败 → 书院兴 → 党争 → 朝廷镇压 → 书院亡 → 余波 (遗党反弹) → 再生 → 循环

---

### H9·watershed event (1.5-2 d)

**5 watershed**·真触游戏状态变·

**H6 fix·dedupe check**·watershed event 内 spawn 党时·
```js
function _kjpHWatershedSpawnParty(partyName, ...) {
  if (!Array.isArray(GM.parties)) GM.parties = [];
  if (GM.parties.some(p => p.name === partyName)) {
    // 已存 (可能 G2 enke spawn 时 _academyOrigin 路径预 spawn)·skip
    // 不 chronicle·不 toast
    return null;
  }
  return _ty3_partySpawn({ name: partyName, ... });
}
```

| 年 | event | 真改 |
|---|---|---|
| **1190** (朱熹白鹿洞·重建) | 理学官学化起 | paradigm.subjects.理学.weight +30 |
| **1290** (元至元 27 年·书院官化) | 山长朝廷指派 | 所有 academies.type → 'official'·spawn 反弹 |
| **1500** (王阳明心学起) | 心学加 subject | paradigm.subjects 加 '心学' |
| **1604** (东林书院·顾宪成立) | 东林党 spawn | _ty3_partySpawn('东林党') |
| **1622** (首善书院禁) | 阉党起 | _kjpOnSchoolBanned + 山长 邹元标 去职 |
| **1625** (东林六君子狱) | 反弹党 | spawn 东林遗党·6 山长被押 → F4c |
| **1629** (复社·张溥立) | 复社 spawn | _ty3_partySpawn('复社') |
| **1654** (顺治禁讲学) | 全 close | 所有 active academies → banned·spawn 明遗党 |
| **1742** (乾隆重立省城书院) | 官学化复立 | spawn 'official' academies (山长督抚任) |

**复用 L10 historical preset paradigm**·watershed 真按年触·跟 L10 重大改革 trigger 同 mechanism。

---

### H10·字段深生成 (1.5-2 d)

academy schema 扩深 (跟 G3 wujinshi 同 40+ 字段)·
```js
var academy = {
  // 基本
  name: '东林书院',
  type: '书院',              // 太学/郡学/私学/书院/讲会
  foundedYear: 1604,
  founder: '顾宪成',
  region: '无锡',
  province: '南直隶',
  // 学说
  learning: '实学',           // 理学/心学/实学/朴学
  ideology: 'reformist',
  curriculum: ['四书', '五经', '时务'],
  // 派生·H1 fill
  _shanzhangName: '顾宪成',
  _shanzhangCharId: 'shanzhang_xxx',
  _discipleCount: 30,
  _discipleNames: ['高攀龙', '钱一本', ...],
  _lineage: 'reformist',
  // lifecycle
  lifecycle: 'flourishing',   // founding/flourishing/official/banned/restored/abolished
  influence: 60,               // 0-100·影响 paradigm 力度
  prestige:  70,
  // party (H2)
  associatedParty: '东林党',
  // 地理 (H7)
  lat: null, lng: null,        // Phase 8 真 attach·此 sprint 留 null
  // 历史
  historicalNote: '顾宪成于无锡讲学·"风声雨声读书声·家事国事天下事"',
  // chronicle
  events: [
    { year:1604, type:'founded', text:'顾宪成立·三纲实学' },
    { year:1622, type:'banned',  text:'魏珰禁·首善案' },
    { year:1625, type:'massacre', text:'东林六君子狱·六山长狱死' }
  ]
};
```

5 archetype 山长 tone hint·跟 G3 _kjG3GetWuToneHint 同 paradigm·LLM dialog 4 段 prompt 注入。

---

### H11·smoke + regression + doc (2-3 d)

- `scripts/smoke-h-school.js`·跟 G3 smoke 同结构·130-160 case·12 section (A-L)
- M6 fix·**§M cross-scenario reset case**·验 H 新字段 (`_schoolNetwork / _academyPartyMap / _kjpHFeedbackCooldown / _kjpHRebelPartySpawnedThisWatershed / _lastSchoolFoundedYear / _lastSchoolBannedYear`) 全入 `_kjG2MaybeResetCrossScenarioFields` reset list (跟 G3 BB·M7 同 paradigm)
- 跑 G1/G2/G3/L1-L12/F1-F4c/D1-D5/E3 全 regression·验零回归
- doc 更新·keju-H-sprint.md → v2·反映 audit fix
- 收口 audit (跟 Phase G 同 paradigm·6 视角)

---

## 3·跨系统接口表 (6 强联动)

| 系统 | 联动 | 深度 |
|---|---|---|
| **F1·门生网络** | 山长 → disciples chain·复用 _kjpAddDiscipleToShanzhang·写进 GM._discipleGraph | 强 |
| **F4c·yanguan-qingyi** | 山长被押 → _kjSpawnYanguanQingyi 真触清议 | 强 |
| **L4·改革 forecast** | 禁讲学 forecast 时·东林 NPC 必 oppose·走 hybrid stance | 强 |
| **L7·改革 apply** | 学说升起 / 禁讲学·真 _kjpApplyReform·写 reformChronicle | **核心** |
| **L10·watershed** | 1290 官化 / 1654 禁讲学 等·真按年触 | 强 |
| **tinyi v3 (党争)** | 东林党 真 spawn 进 GM.parties·NPC vote 真改 | 强 |
| **G2 enke** | jinshi 入党时·若 _academyOrigin → 自动入对应党 | 中 |

---

## 4·9 朝代差异表 (preset 已有·H 真 read)

| 朝代 | preset academies | 真 build (H 实施后) |
|---|---|---|
| **汉** | 太学 (元朔 5 年) | 太学官学·private_schools_active=true·~3 私学 spawn (董仲舒·扬雄 等) |
| **唐** | 国子学 | private_schools_active=true·~2 私学 (韩愈) |
| **北宋** | 应天/岳麓/白鹿洞/嵩阳 4 大书院 | 4 书院 spawn·胡瑗 / 程颢 / 程颐 山长 spawn·理学加 subject |
| **南宋** | 朱熹四书院 | 朱熹 / 陆九渊 / 张栻 山长·**鹅湖之会 1175 讲会 event** |
| **元** | (无 academies) | **1290 watershed·所有官化**·spawn 反弹 |
| **明** | 东林/首善/关中/复社 | **核心**·东林党 + 复社 + 阉党 真 spawn·1622 首善禁·1625 六君子狱 |
| **清** | 岳麓重建 / 省城书院 (官学化) | **1654 watershed·禁讲学**·spawn 反清遗党 (黄宗羲·王夫之) |

---

## 5·LLM cost 量化估算

| 调用 | tokens | 时机 |
|---|---|---|
| founding event 山长 spawn LLM (可选·有 fallback) | ~600-800 | 每 founding (~1/朝) |
| 讲会 LLM | ~600-1000 | 每讲会 (~3-5/朝) |
| 山长 dialog (sc1q / 廷议 / wendui) tone | ~400 (additive) | per turn (when shanzhang in agenda) |
| 弹劾山长 sc16 (复用现有) | 0 (复用) | per 弹劾 |
| watershed event 描述 LLM (可选) | ~500 | per watershed (~5-8/全游戏) |
| **总** | ~4000-7000 / 朝 | (跟 G3 7170 / 朝代同量级) |

---

## 6·复用 vs 新作 占比

**复用 80%·新作 20%**·

| 项 | 复用 from |
|---|---|
| event-hook paradigm | G2 |
| 主 runner paradigm (standalone mini-runner) | G3 wuju.js |
| 3 路径 (A spawn / B wendui / C edict) | G2 + G3 |
| EDICT_TYPES 第 15 类 | G2 enke 加第 13 类 paradigm |
| desk template suggestion + F7 UI button | Phase G 收口 audit F7 |
| keyi callback chain | F4 / G2 / G3 共用 |
| 党派 spawn (`_ty3_partySpawn`) | tinyi v3 真签名 |
| F4c yanguan-qingyi 触发 (`_kjSpawnYanguanQingyi`) | G3 BB3 真签名 |
| L7 reform-apply 引擎 | L7 |
| L10 watershed paradigm | L10 |
| F1 disciple-graph | F1 |
| 9 朝代 preset schoolNetworkInit | 已 setup (9 朝代 preset done) |

**新作**·
- 山长 char schema spawn (跟 jinshi 同 paradigm·新对象·~150 行)
- 学说 → paradigm.subjects 演变机制 (~150 行)
- 讲会 LLM (~100 行)
- 反馈循环 (~100 行)
- watershed event 调度 (~100 行)

---

## 7·v1 ready 验

- ✅ 11 sub-slice (H0-H11) 全 cover·max-scope
- ✅ G/F/L 复用 80%·新作 20%
- ✅ **山长真 char schema spawn** (跟 G2 jinshi 同深度)
- ✅ **党派真 spawn 进 GM.parties** (跟 tinyi v3 真 wire)
- ✅ **学说真改 paradigm.subjects** (跟 L7 共用)
- ✅ **incident 真触 F4c** (山长被押)
- ✅ **反馈循环** (腐败 ↔ 书院兴)
- ✅ **地理 attach** (民心 + 解额)
- ✅ 12 维深嵌入·tinyi / L4 / L7 / G2 / F1 / F4c 全 wire
- ✅ 9 朝代 differ (汉/唐/北宋/南宋/元/明/清 + 辽 / 金)
- ✅ 5 watershed (1190 / 1290 / 1604 / 1654 / 1742)
- ✅ 5 archetype 山长 LLM tone
- ✅ EDICT_TYPES.school 第 15 类
- ✅ LLM cost 量化 ~4000-7000/朝
- ✅ red line 8 项·全合规

**v1 ready·等 user pass + 三层 audit (~1 d) + v2 (audit fix·~0.5-1 d) + implement (~27-36 d)**

---

## 8·修订日志

- **v1·2026-05-25**·首版·max-scope·11 sub-slice·**12 维深嵌入**·山长真 NPC·党派真 spawn·学说真改 paradigm·incident 真触·反馈循环·复用 80% G/F/L·27-36 d 实施

- **v2·2026-05-26**·**17 audit fix fold** (3 CRITICAL + 5 HIGH + 7 MID + 2 LOW)·真函数 / 真 schema verify·**等 user 批 → implement**·
  - **CR1**·学说改 paradigm 拆 2 路·Path α 走 keyi 议政 / Path β 隐式 weight tick
  - **C1·真签名 `_kjReformKeyiCallback(method, ctx)`**·非假 `_kjpApplyReform`·走 L7 callback chain
  - **C2·真 diff shape `{added,removed,weightChanged}`**·非假 `subjects.理学.weight +20`
  - **C3·真签名 `_kjAddDiscipleEdge(disciple, mentor, cohortYear, addedTurn)` 4 positional**·非假 `_kjpAddDiscipleToShanzhang`
  - **H1·faction 字段空**·非假"在野"·避无效 GM.factions key
  - **H2·真接口 `GM.vars['民心']` 单一**·非假"民心(士)"
  - **H3·真接口 `eb.kejuQuota` (province) 或 `paradigm.quota.geo`**·非假"解额 +5%"
  - **H4·反馈循环 cooldown + per-turn guard**·防 race
  - **H5·反弹党 cap·max 1 per watershed**·防 GM.parties 爆炸·merge 同期反弹
  - **H6·watershed spawn 党 dedupe check**·避双触
  - **M1·EDICT_TYPES 第 15 类·加进 `tm-edict-lifecycle.js`**·明位置
  - **M2·KEYI_TOPIC_TYPES.school_ban 已 reserve** (line 94-101·sliceOwner='H3')·复用非新建
  - **M3·_origin 枚举·shanzhang / disciple**·跟 enke / wuju 平行
  - **M4·_ty3_partySpawn 完整 opts**·`{name, founders, leaderName, faction, initialInfluence, initialCohesion, ideology, policyStances, parentParty, reason, agenda, desc, status}`
  - **M5·subjects.added 字段·introducedYear / introducedBy 补**
  - **M6·smoke §M cross-scenario reset case**·H 新字段全入 reset list
  - **M7·flag gate `P.conf.useNewKejuH=false`**·settings panel 6 决定 toggle
  - **S1·UI label 朝代差异**·汉/唐礼部·宋后学政·清督学使
  - **S2·5 类 `_schoolSubtype` 表**·ban / restore / found / promote / lecture
  - 实施时间不变·27-36 d (audit fix 主要 doc / call 签名·不增 sub-slice)

- **v3·2026-05-26**·**全 11 sub-slice ship-ready + small audit RAA + 5 轮 audit + ship**·

  **实施 H0-H11 (实际 ~3.5h)**·
    - H0·event-hook + flag gate·_isHEnabled + _lastSchoolFoundedYear/_lastSchoolBannedYear hook
    - H1·主 runner + 山长 NPC spawn (40+ 字段·_origin='shanzhang'·真上人物面板)·9 朝代 preset academies 真读
    - H2·党派真 spawn 进 GM.parties (走 `_ty3_partySpawn`) + F1 disciple lineage (`_kjAddDiscipleEdge`) + 5 archetype tone
    - H3·学说改 paradigm.subjects·**Path α** (走 L7 keyi 议政·CR1) + **Path β** (隐式 weight tick ±2·cap ±10)
    - H4·讲会 event LLM·5 类历史名场面 (鹅湖/白鹿洞/东林/泰州/复社虎丘)·resume + queue + dedupe
    - H5·玩家 4 路径议政·EDICT_TYPES 第 15 类 + KEYI_TOPIC_TYPES.school_ban callback + desk template + Path B 学政 wendui (朝代 label) + UI "问学政" button + parser
    - H6·incident hookup 深·山长被押 → F4c yanguan-qingyi 真触·martyred → 反弹党 spawn (cap)
    - H7·地理 attach·academy.region → prov._bonusInfra.kejuQuota + paradigm.quota.geo·jinshi.\_academyOrigin tag
    - H8·反馈循环·corruption + 党争 + F1 → "民间书院兴" event·cooldown + per-turn guard
    - H9·5 watershed·1190 朱熹/1290 元官化/1500 王阳明/1604 东林/1622 首善禁/1625 六君子/1629 复社/1654 顺治禁讲学/1742 乾隆重立
    - H10·字段深生成·academy schema 详细 (ideology/curriculum/historicalNote/events) + 5 archetype 山长 tone + YIMIN_SCHOLARS
    - H11·smoke 158 PASS·全 regression·零回归

  **small audit RAA (8 fix)·实施后第一轮 audit**·
    - C1·cross-scenario reset 加 6 H 字段·H1·existing dead char skip·H2·existing char \_origin preserve·H3·fallback chronicle 补·M1·wrapper guard·M2·YIMIN_SCHOLARS const·M3·tier change per-turn dedupe·M4·HISTORICAL_LINEAGE keys 自动入 founders

  **5 轮 audit·共修 7 项**·
    - **R1·Surface/Function/Mechanic** (5 fix)·F1·GM.corruption 真接口 (subDepts 派生)·F2·founding 时自动 _kjpHEnrichAcademyFields·M3·banned → 自动 impeach 山长·M4·founding/banned 时自动 _kjpHApplyRegionEffects·M2·_kjpHMaybeAutoTriggerLecture endTurn 自动 5%/5 年触
    - **R2·跨系统/race/edge** (1 fix)·`GM._kjpHPendingParadigmShifts` queue 加 chaoyi consumer + 进 keyi promote queue (走 L7 reform keyi)
    - **R3·与游戏内容结合**·**11 接口点全闭环 verify**·founding/讲会/山长 NPC/党派/学说/incident/民心/解额/反馈/watershed/desk template + Path B button·全真接·user 真在游戏循环里感知
    - **R4·cross-scenario/migration** (1 fix)·8 个 H 新 transient 字段补进 reset list (_kjpHWatershedFired / _kjpHLastAutoLectureYear / _kjpHLectureQueue / _kjpHPendingParadigmShifts / _kjpHLibuWenduiLastYear / _kjpHWeightDriftAccum / _kjpHFeedbackFiredThisTurn) + window._kjpHSchoolWenduiContext nuke
    - **R5·全栈复审**·主流程闭环 + 跨系统接口 + 9 朝代 differ + 复用面 + smoke + cross-scenario reset 全验·零新 finding

  **新文件**·
    - `web/tm-keju-school-network.js` (~1700 行·22 section·77 函数 expose)
    - `scripts/smoke-h-school.js` (~920 行·21 section·158 case)

  **改文件**·
    - `web/tm-edict-lifecycle.js` (EDICT_TYPES 第 15 类 school)
    - `web/tm-keju-event-hooks.js` (cross-scenario reset 加 8 H 字段)
    - `web/tm-endturn-pipeline-steps.js` (wire H resume / weight drift / nuke / feedback / watershed / auto lecture)
    - `web/tm-chaoyi.js` (paradigm shift consumer + keyi promote queue)
    - `web/tm-hongyan-office.js` (desk render·问学政 button)
    - `web/index.html` (script tag)

  **smoke**·158 PASS / 0 FAIL (H 全)·G2 enke 155 / G3 wuju 145 / G2 event-hooks 26 / G2-pl 75 / G1 51-1 / L1 95 / L4 107 / L7 159 / L11 81 / F1-F4c 共 146·**1280+ PASS·零回归**

  **ship readiness**·user 解锁 (科举全完工)·跟 G/H 全 ship-ready·准备 GitHub push + 邸报 changelog + 热更新
