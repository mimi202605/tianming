# Phase L·L9·LLM 命名 + 改革黑天鹅·sprint plan v3

> **date**·2026-05-25 (v3·**a-e 全 ship + v2 12 fix 全落地·等 user pass**)
> **status**·**core a-e done·smoke 42/42·全 regression 零回归 (867/867)**·见 §16 落地段
> **预算·v3 实测**·**~3 h total** (v2 估 2.1 d·实复用 L7/L8/L5 paradigm 紧凑·实施层无大坑)
> **依赖**·L7 (commit chain ✅·entry schema·StartRamping ✅·ApplyCharsImpact ✅·NpcMemorySystem) + L8 (EvolveTick ✅·round-robin·ApplyEvolutionDeltas ✅·_reformChronicle\[histId\]\[year\] ✅·ChronicleModal ✅) + L5 (_kjSpawnReformMemorial paradigm)
> **paradigm 一句话**·**L9 = 2 LLM helper + L7 commit chain 加一 chain + L8 EvolveTick 加 black swan probe**·复用率 **~92%**·**0 new module file**·**0 new modal**·**0 new tick**

---

## §0·L9 真做什么

按 Stage 2 plan §7.5 AI·6 + AI·7·

| AI · | 触发 | 内容 |
|---|---|---|
| **AI·6·命名 + 史评** | L7 commit + outcome.passed 时 | LLM 给 5-12 字 canonicalName (王安石/张相/戊戌 paradigm) + 50 字史评·写 entry.canonicalName + entry.historicalEvaluation |
| **AI·7·黑天鹅** | L8 EvolveTick 内·概率 ≤18% (按 stage / radical / faction tension 加权) | LLM 推 4 type 意外·{examiner_corrupt / student_boycott / reformer_illness / finance_diversion}·应用真 game state (corruption / minxin / NPC retire / _applyDelay) |

→ **L9 让 reform 有名 + 有意外·实质化 L7/L8 已建的政治世界·non-new system。**

---

## §1·复用清单·8 现机制 + net-new 仅 2 LLM helper

| 现机制 | 来源 | L9 怎么用 |
|---|---|---|
| **L7·`_kjReformKeyiCallback` commit chain** | tm-keju-reform-apply.js·step 4 `_kjpL7AppendHistory` 后 | **step 4.5 chain**·调 `_kjpL9MaybeNameReform(histEntry)`·async·non-blocking |
| **L7·entry schema** | id/magnitudeDescriptor/method/year/diff/supportNpcs/opposeNpcs/status | **extend 2 字段**·`canonicalName` + `historicalEvaluation`·non-new schema |
| **L8·`_kjpL8EvolveTick`** | tm-keju-reform-evolution.js·round-robin·flag gate·cooldown | **piggyback**·evolve LLM 之后 chain `_kjpL9MaybeSpawnBlackSwan(entry, year)`·non-new tick |
| **L8·`_reformChronicle[histId][year]`** | L8 ship | 黑天鹅作 `specialEvent: {...}` 字段·non-new chronicle layer |
| **L8·`_kjpL8ApplyEvolutionDeltas`** | L8 ship·corruption.trueIndex / minxin.trueIndex / _factionTension | 黑天鹅 dimDelta 走此 helper·复用·non-new dim apply |
| **L7·`_kjpL7ApplyCharsImpact`** pattern (NpcMemorySystem.remember + ch._retired + ch.loyalty 调) | L7 ship | 黑天鹅 'reformer_illness' 复用·NPC ill / retire·non-new health system |
| **L5·`_kjSpawnReformMemorial`** | tm-keju-reform-memorial.js | 黑天鹅 'examiner_corrupt' / 'student_boycott' 触发 NPC 上奏 memorial·non-new memorial path |
| **L8·`_kjpRenderL8ChronicleBody`** | tm-keju-paradigm-panel.js | render·按 reform 顶 banner 显 canonicalName·年度 entry 加 ⚠️ chip·non-new modal |
| **callAISmart / _kjpHasAI / _kjpParseJson** | L3 / L8 | L9 LLM helper 跟 L8 同 paradigm |

**net-new**·
- `_kjpL9LlmNameReform(entry)` — async 返 `{canonicalName, historicalEvaluation}`
- `_kjpL9LlmBlackSwan(entry, year)` — async 返 `{type, severity, target, narrative, dimDelta?, npcImpact?, memorialTrigger?}`
- `_kjpL9MaybeNameReform / _kjpL9MaybeSpawnBlackSwan / _kjpL9ApplyBlackSwan` — 调度·非 LLM
- `_kjpL9NormalizeNaming / _kjpL9NormalizeBlackSwan` + 2 fallback

---

## §2·LLM helpers spec

### 2.1·`_kjpL9LlmNameReform(entry)` (L9·a·0.4 d)

L7 commit 后调·outcome.passed 时·命名风格匹配真历史。

```javascript
async function _kjpL9LlmNameReform(entry) {
  if (!entry || !entry.magnitudeDescriptor) return null;
  if (typeof GM === 'undefined' || !GM) return null;
  var fallback = _kjpL9NameFallback(entry);
  if (!_kjpHasAI()) return fallback;

  var paradigm = GM._kejuParadigm || {};
  var added = (entry.diff && entry.diff.subjects && entry.diff.subjects.added) || [];
  var addedLine = added.length ? added.map(function(s) {
    return (s.name || '') + (s.historicalAnalog ? '·' + s.historicalAnalog : '');
  }).join('·') : '(无新科)';

  var prompt =
    '【改革】' + entry.magnitudeDescriptor + '·' + (entry.method || '') + '\n' +
    '【朝代】' + (paradigm.initEra || '') + '·年 ' + (entry.year || '') + '\n' +
    '【主导】' + (entry.by || '陛下') + '\n' +
    '【新加科】' + addedLine + '\n\n' +
    '请按真历史命名 paradigm 起改革之名 (5-12 字)·\n' +
    '- 风格·"熙宁变法" / "张居正考成法" / "戊戌新政" / "百日维新" / "庆历新政"\n' +
    '- 若主导有名·头冠主导者姓 (e.g. "张居正X")·若年号·冠年号 (e.g. "熙宁X")·若核心方·冠"X 法"\n' +
    '- 史评·客观持中·50 字·非褒非贬·叙述方向 + 后世评价倾向\n\n' +
    '返 JSON·{\n' +
    '  canonicalName: "5-12 字 改革名",\n' +
    '  historicalEvaluation: "50 字 史评"\n' +
    '}';
  try {
    var raw = await callAISmart(prompt, 600, { maxRetries: 1, priority: 'low', timeoutMs: 20000 });
    var parsed = _kjpParseJson(raw);
    if (!parsed || !parsed.canonicalName) return fallback;
    return _kjpL9NormalizeNaming(parsed);
  } catch(e) {
    try { console.warn('[L9·a] LLM fail', e); } catch(_){}
    return fallback;
  }
}
```

### 2.2·`_kjpL9LlmBlackSwan(entry, year)` (L9·b·0.5 d)

L8 EvolveTick 内·概率 gate 过后调·4 type enum·LLM 推真情。

```javascript
// 4 type·全 historical-grounded·非玄幻
var BLACK_SWAN_TYPES = {
  examiner_corrupt:    '主考贿赂·考场舞弊',
  student_boycott:     '考生罢考·士林请愿',
  reformer_illness:    '改革主导者病·或殁',
  finance_diversion:   '外族用兵·改革财政被挪'
};

async function _kjpL9LlmBlackSwan(entry, year) {
  if (!entry || !year) return null;
  if (typeof GM === 'undefined' || !GM) return null;
  var fallback = _kjpL9BlackSwanFallback(entry, year);
  if (!_kjpHasAI()) return fallback;

  var paradigm = GM._kejuParadigm || {};
  var sup = (entry.supportNpcs || []).slice(0, 3);
  var opp = (entry.opposeNpcs || []).slice(0, 3);
  var pool = sup.concat(opp);

  var prompt =
    '【改革】' + (entry.magnitudeDescriptor || '改革') + '·施行第 ' +
    (year - (entry.year || year)) + ' 年·阶段 ' +
    ((paradigm._reformInProgress && paradigm._reformInProgress.stage) || '?') + '\n' +
    '【支持】' + (sup.join('、') || '无') + '\n' +
    '【反对】' + (opp.join('、') || '无') + '\n' +
    '【朝代】' + (paradigm.initEra || '') + '·年 ' + year + '\n\n' +
    '请按真历史 paradigm·推该年 1 个改革实施意外·\n' +
    '- type·"examiner_corrupt" (主考贿赂) / "student_boycott" (考生罢考)\n' +
    '       / "reformer_illness" (改革者病殁) / "finance_diversion" (财政挪用)\n' +
    '- severity·"low" / "mid" / "high"\n' +
    '- target·若 npc 类·必从·' + (pool.join('、') || '(无)') + '·选\n' +
    '- narrative·80 字古文叙事·非玄幻 (无彗星天命)·真政治事件\n' +
    '- dimDelta·按 type·corruption / civilianReact / factionTension·-15~15\n' +
    '- npcImpact·仅 reformer_illness type·{name, healthDelta:-30~-10, retire:bool}\n' +
    '- memorialTrigger·examiner_corrupt + student_boycott·{topic, ideologyHint}\n\n' +
    '返 JSON·{type, severity, target, narrative, dimDelta?, npcImpact?, memorialTrigger?}';
  try {
    var raw = await callAISmart(prompt, 900, { maxRetries: 1, priority: 'low', timeoutMs: 25000 });
    var parsed = _kjpParseJson(raw);
    if (!parsed || !parsed.type) return fallback;
    return _kjpL9NormalizeBlackSwan(parsed, entry);
  } catch(e) {
    try { console.warn('[L9·b] LLM fail', e); } catch(_){}
    return fallback;
  }
}
```

### 2.3·fallback + normalize (4 函数)

```javascript
function _kjpL9NameFallback(entry) {
  // 按 method + magnitude 简命名
  var prefix = (entry.year || '') + '年';
  var midPart = (entry.method === 'edict' ? '诏行' : entry.method === 'defy' ? '强推' : '议定');
  return {
    canonicalName: prefix + midPart + ((entry.magnitudeDescriptor || '改革').slice(0, 4)),
    historicalEvaluation: '(无 LLM·simple naming·' + (entry.magnitudeDescriptor || '改革') + ')'
  };
}

function _kjpL9BlackSwanFallback(entry, year) {
  // 默 low severity·examiner_corrupt (最 generic)
  return {
    type: 'examiner_corrupt',
    severity: 'low',
    target: '(unknown)',
    narrative: '(无 LLM·' + year + '年·改革施行中·偶有舞弊·朝中议)',
    dimDelta: { corruption: 3 }
  };
}

function _kjpL9NormalizeNaming(p) {
  return {
    canonicalName: String(p.canonicalName || '').slice(0, 12).trim() || '未名改革',
    historicalEvaluation: String(p.historicalEvaluation || '').slice(0, 100)
  };
}

function _kjpL9NormalizeBlackSwan(p, entry) {
  var allowedTypes = ['examiner_corrupt', 'student_boycott', 'reformer_illness', 'finance_diversion'];
  var allowedSev = ['low', 'mid', 'high'];
  var pool = ((entry.supportNpcs || []).concat(entry.opposeNpcs || []));
  var poolSet = {}; pool.forEach(function(n) { poolSet[n] = true; });
  return {
    type: allowedTypes.indexOf(p.type) >= 0 ? p.type : 'examiner_corrupt',
    severity: allowedSev.indexOf(p.severity) >= 0 ? p.severity : 'low',
    target: (p.target && poolSet[p.target]) ? p.target : '(unknown)',
    narrative: String(p.narrative || '').slice(0, 200),
    dimDelta: p.dimDelta ? {
      corruption: Math.max(-15, Math.min(15, parseInt((p.dimDelta || {}).corruption, 10) || 0)),
      civilianReact: Math.max(-15, Math.min(15, parseInt((p.dimDelta || {}).civilianReact, 10) || 0)),
      factionTension: Math.max(-15, Math.min(15, parseInt((p.dimDelta || {}).factionTension, 10) || 0))
    } : null,
    // npcImpact 仅 reformer_illness·post-validate target in pool
    npcImpact: (p.type === 'reformer_illness' && p.npcImpact && poolSet[p.npcImpact.name]) ? {
      name: p.npcImpact.name,
      healthDelta: Math.max(-30, Math.min(0, parseInt(p.npcImpact.healthDelta, 10) || -10)),
      retire: !!p.npcImpact.retire
    } : null,
    memorialTrigger: ((p.type === 'examiner_corrupt' || p.type === 'student_boycott') && p.memorialTrigger) ? {
      topic: String((p.memorialTrigger || {}).topic || '').slice(0, 30),
      ideologyHint: String((p.memorialTrigger || {}).ideologyHint || 'traditional')
    } : null
  };
}
```

---

## §3·概率 gate + dispatcher (L9·b·non-LLM)

```javascript
function _kjpL9MaybeSpawnBlackSwan(entry, year) {
  if (!entry || !year) return;
  if (typeof P === 'undefined' || !P || !P.conf || P.conf.useNewKejuL9 !== true) return;
  // 一 reform 一年 1 个·检 chronicle.specialEvent
  var chronicle = (GM._kejuParadigm && GM._kejuParadigm._reformChronicle) || {};
  var yearEntry = chronicle[entry.id] && chronicle[entry.id][year];
  if (yearEntry && yearEntry.specialEvent) return;

  // 基础 5%
  var prob = 0.05;
  var stage = (GM._kejuParadigm._reformInProgress && GM._kejuParadigm._reformInProgress.stage) || '';
  if (stage === 'ramping') prob += 0.03;
  var radical = (entry.magnitudeParsed && entry.magnitudeParsed.radical) || 0;
  if (radical > 70) prob += 0.05;
  var ft = parseInt(GM._factionTension, 10) || 0;
  if (ft > 50) prob += 0.05;
  prob = Math.min(0.18, prob);
  if (Math.random() > prob) return;

  _kjpL9LlmBlackSwan(entry, year).then(function(event) {
    if (!event) return;
    _kjpL9ApplyBlackSwan(entry, year, event);
  }).catch(function(){});
}
```

---

## §4·apply 路径 (L9·c·复用 L7/L8/L5)

```javascript
function _kjpL9ApplyBlackSwan(entry, year, event) {
  if (!entry || !event || typeof GM === 'undefined' || !GM) return;
  if (!GM._kejuParadigm) return;
  var chronicle = (GM._kejuParadigm._reformChronicle = GM._kejuParadigm._reformChronicle || {});
  if (!chronicle[entry.id]) chronicle[entry.id] = {};
  if (!chronicle[entry.id][year]) chronicle[entry.id][year] = {};
  // 写 specialEvent 到 chronicle (跟 L8 evolution 同 entry·non-new layer)
  chronicle[entry.id][year].specialEvent = {
    type: event.type, severity: event.severity, target: event.target,
    narrative: event.narrative
  };

  // 1·dimDelta·复用 L8 ApplyEvolutionDeltas (corruption / minxin / factionTension)
  if (event.dimDelta) {
    // 直 inline (L8 helper 字段名跟 L9 不同·corruption vs corruptionAccum)·non-coupling
    try {
      if (event.dimDelta.corruption && GM.corruption && typeof GM.corruption.trueIndex === 'number') {
        GM.corruption.trueIndex = Math.max(0, Math.min(100,
          GM.corruption.trueIndex + event.dimDelta.corruption));
      }
      if (event.dimDelta.civilianReact && GM.minxin && typeof GM.minxin.trueIndex === 'number') {
        GM.minxin.trueIndex = Math.max(0, Math.min(100,
          GM.minxin.trueIndex + event.dimDelta.civilianReact));
      }
      if (event.dimDelta.factionTension) {
        var ft = parseInt(GM._factionTension, 10) || 0;
        GM._factionTension = Math.max(-100, Math.min(100, ft + event.dimDelta.factionTension));
      }
    } catch(_){}
  }

  // 2·npcImpact·reformer_illness·复用 L7 NpcMemorySystem + ch._retired pattern
  if (event.npcImpact && event.npcImpact.name) {
    try {
      var ch = (typeof findCharByName === 'function') ? findCharByName(event.npcImpact.name) : null;
      if (ch) {
        ch.health = Math.max(0, (parseInt(ch.health, 10) || 50) + event.npcImpact.healthDelta);
        if (event.npcImpact.retire || ch.health === 0) {
          ch._retired = true;
          ch._retiredReason = event.narrative;
        }
        // NpcMemorySystem.remember (跟 L7 paradigm 同)
        if (typeof NpcMemorySystem !== 'undefined' && NpcMemorySystem.remember) {
          NpcMemorySystem.remember(ch.name,
            '改革 ' + (entry.magnitudeDescriptor || '') + '·' + event.narrative,
            '哀', Math.abs(event.npcImpact.healthDelta), 'L9-blackswan');
        }
      }
    } catch(_){}
  }

  // 3·memorialTrigger·examiner_corrupt / student_boycott·复用 L5/L7 _kjSpawnReformMemorial
  // **C1 fix**·传 ctx.bypassCooldown=true·L9 黑天鹅事件应即时 spawn·非被 15 turn cooldown 吞
  // **B2 fix**·ideologyHint + topic 真传入·_kjSpawnReformMemorial 改 honor (v2 改 helper 签名)
  if (event.memorialTrigger) {
    try {
      if (typeof window !== 'undefined' && typeof window._kjSpawnReformMemorial === 'function') {
        window._kjSpawnReformMemorial(entry, {
          source: 'L9-blackswan',
          bypassCooldown: true,
          forcedTopic: event.memorialTrigger.topic,
          forcedIdeology: event.memorialTrigger.ideologyHint
        });
      }
    } catch(_){}
  }

  // 4·push GM._chronicle 邸报可见·type=keju-reform-blackswan
  try {
    if (Array.isArray(GM._chronicle)) {
      GM._chronicle.push({
        turn: GM.turn || 1, type: 'keju-reform-blackswan',
        text: year + '年·改革黑天鹅·' + ({
          examiner_corrupt: '主考贿赂', student_boycott: '考生罢考',
          reformer_illness: '改革者病', finance_diversion: '财政挪用'
        }[event.type] || event.type) + '·' + (event.narrative || '').slice(0, 40) + '…',
        tags: ['科举', 'reform', 'blackswan'],
        reformId: entry.id, severity: event.severity
      });
    }
  } catch(_){}
}
```

---

## §5·hook 点·L7 commit + L8 EvolveTick·~10 行

### 5.1·L7 commit chain (tm-keju-reform-apply.js)

**C2 fix·hook 位置精确**·在 step 4 (AppendHistory) 后·step 5 (StartRamping) 之前·这样 step 8 (邸报 push) 能用 canonicalName 做标题。
**B1 fix·strict gate** `outcome && outcome.passed === true`·拒 reject 改革入志。

```javascript
// step 4 后·step 5 之前·entry 已立·canonicalName 立后 step 5-8 全可用
var histEntry = _kjpL7AppendHistory(diff, intent, mag, pilot, method, outcome, ctx, applyResult);

// L9·step 4.5·命名 (strict gate)·async non-block
if (outcome && outcome.passed === true && applyResult && applyResult.applied &&
    typeof window._kjpL9MaybeNameReform === 'function') {
  try { window._kjpL9MaybeNameReform(histEntry); } catch(_){}
}

// step 5 onwards...
```

### 5.2·L8 EvolveTick chain (tm-keju-reform-evolution.js)

**C3 fix·sync probe·async LLM·跟 evolve 并行 OK**·non-block evolve。

```javascript
// EvolveTick 内·LLM evolve .then() 之外 (并行)·sync probability gate·async LLM
// 两 LLM call 同年并行 (evolve + blackSwan)·race 但不互相 mutate (evolve 写 evo·blackSwan 写 specialEvent·同 chronicle[id][year] 不同字段)
_kjpL8LlmEvolveYear(entry, year).then(function(evo) { ... });
_kjpL9MaybeSpawnBlackSwan(entry, year);   // sync gate·async LLM 独立
```

### 5.3·L8 evolve prompt 加 `_retired` filter (C4 fix)

`_kjpL8LlmEvolveYear` 内·`var sup = (entry.supportNpcs || []).slice(0, 3)`·改 filter alive non-retired·避免 L8 prompt 含 L9 已 retire 的 NPC。

```javascript
var sup = (entry.supportNpcs || []).filter(function(n) {
  var ch = (typeof findCharByName === 'function') ? findCharByName(n) : null;
  return ch && !ch._retired && ch.alive !== false;
}).slice(0, 3);
// opp 同 filter
```

非 hard-couple·typeof check + try/catch·**L9 flag off 全 noop**。

---

## §6·UI·canonicalName + blackSwan chip·~20 行

修 `_kjpRenderL8ChronicleBody`·

```javascript
// reform-section header·若 entry.canonicalName·顶 banner 显
var nameBanner = entry.canonicalName ?
  '<div class="kjp-l9-canonical-name">📜 ' + _escHtml(entry.canonicalName) + '</div>' +
  (entry.historicalEvaluation ? '<div class="kjp-l9-hist-eval">' + _escHtml(entry.historicalEvaluation) + '</div>' : '') : '';

// year-entry·若 e.specialEvent·加 chip
var swanChip = e.specialEvent ?
  '<span class="kjp-l9-swan-chip kjp-l9-sev-' + e.specialEvent.severity + '">⚠️ ' +
    ({examiner_corrupt:'主考贿赂', student_boycott:'考生罢考',
      reformer_illness:'改革者病', finance_diversion:'财政挪用'}[e.specialEvent.type] || '意外') +
  '</span>' : '';
```

加 CSS·5 class·**A1+A2 fix·hex 全指定** (跟 L8 paradigm 一致)·

```css
.kjp-l9-canonical-name {
  font-size: 1.1em; font-weight: bold;
  color: #e8d8b0; background: #3a2e20;
  padding: 6px 10px; border-radius: 4px;
  margin: 4px 0;
}
.kjp-l9-hist-eval {
  font-style: italic; font-size: 0.85em;
  color: #a09080; padding: 4px 10px 8px 10px;
}
.kjp-l9-swan-chip {
  display: inline-block; padding: 2px 6px; border-radius: 3px;
  font-size: 0.8em; margin-left: 6px;
}
.kjp-l9-sev-low  { background: #4a4030; color: #e8d8b0; }
.kjp-l9-sev-mid  { background: #6a4030; color: #f0e0c0; }
.kjp-l9-sev-high { background: #8a3030; color: #f8f0e0; }
```

---

## §7·新文件 + 改文件

| 文件 | 改 | 行 |
|---|---|---|
| **`web/tm-keju-reform-evolution.js`** | **加 L9 段·~280 行**·2 LLM helper + dispatcher + apply + 2 fallback/normalize + BLACK_SWAN_TYPES + expose·**non-new file·复用 L8 IIFE + _hasAI / _parseJson** |
| `web/tm-keju-reform-apply.js` | `_kjReformKeyiCallback` step 4 后·`_kjpL9MaybeNameReform(histEntry)` chain·~5 行 |
| `web/tm-keju-reform-evolution.js`·EvolveTick 末 | chain `_kjpL9MaybeSpawnBlackSwan(entry, year)`·~3 行 (同文件) |
| `web/tm-keju-paradigm-panel.js` | `_kjpRenderL8ChronicleBody` canonicalName banner + swan chip·~25 行 |
| `web/tm-keju-paradigm-panel.css` | .kjp-l9-* 5 class·~25 行 |
| **`scripts/smoke-l9-naming-blackswan.js`** | **新·~300 行** | ~30 case |

**total net·~640 行**·复用率 ~92%·**0 new module file**

---

## §8·smoke (L9·e·0.3 d) ~30 case

| § | 内容 | case |
|---|---|---|
| A | `_kjpL9NameFallback` shape·年号 + method 组合 | 3 |
| B | `_kjpL9LlmNameReform` LLM mock·shape verify·canonicalName slice 12 | 5 |
| C | `_kjpL9BlackSwanFallback` shape | 2 |
| D | `_kjpL9LlmBlackSwan` LLM mock·4 type 全验·NPC pool filter | 6 |
| E | `_kjpL9NormalizeBlackSwan` clamp + type/severity enum + target pool filter + npcImpact only on illness + memorial only on corrupt/boycott | 6 |
| F | `_kjpL9MaybeSpawnBlackSwan` 概率 gate·base 5% + stage/radical/factionTension 累加·max 18%·1/year/reform | 3 |
| G | `_kjpL9ApplyBlackSwan` 4 type 全 apply 路径·corruption.trueIndex / minxin.trueIndex / _factionTension / NPC retire / memorial spawn | 4 |
| H | flag gate·useNewKejuL9=false·全 noop | 1 |

---

## §9·预算

| Slice | 内容 | 估时 |
|---|---|---|
| L9·a | `_kjpL9LlmNameReform` + fallback + normalize·L7 commit hook | 0.4 d |
| L9·b | `_kjpL9LlmBlackSwan` + fallback + normalize·4 type enum | 0.5 d |
| L9·c | `_kjpL9ApplyBlackSwan` — 复用 L7 + L8 + L5·4 apply 路径 | 0.4 d |
| L9·d | UI·canonicalName banner + swan chip + 5 CSS class | 0.3 d |
| L9·e | smoke ~30 case + 全 regression | 0.3 d |
| **核心** | | **~1.9 d** |

跟 Stage 2 plan §7.9 估 **2-3 d** 对齐 (略 under)。

---

## §10·red line 守

| Rule | 守 |
|---|---|
| 1·复用·非自建 | ✅ 8 现机制·net-new 仅 2 LLM helper + dispatcher |
| 2·async + fallback | ✅ `_kjpHasAI` gate + 2 fallback·non-block |
| 3·失败禁玄幻 | ✅ 4 type 全 historical-grounded (主考贿赂 / 考生罢考 / 改革者病 / 财政挪用)·无彗星天命 |
| 4·9 朝代 voice | ✅ era + 真历史命名 paradigm (王安石/张相/戊戌) |
| 5·党争·GM.parties | ✅ memorialTrigger 走 L5 paradigm·NPC 必从 pool |
| 6·走常朝 source pool | ✅ memorial 走 _kjSpawnReformMemorial (已嵌奏疏源池) |
| 7·flag gate | `P.conf.useNewKejuL9=false` 默认 off·两 hook 全 noop |
| 8·三面 | 运行时 ✅·AI 面 ✅·编辑器留 L18 |

---

## §11·跟 user 教训对齐 (memory)

| 教训 | L9 守 |
|---|---|
| `feedback_editor_game_relation` | 编辑器无 ship·L9 是运行时·OK |
| `feedback_tool_vs_system_costs` | naming 是工具型 (LLM 自动·零代价)·black swan 是系统型 (真 game state 改)·两者分明·不混搭 |
| `feedback_no_mystic_penalties` | 4 type 全自然政治 / 健康事件·无天命 |
| `feedback_paradox_ui_unreliable` | UI 复用 L8 ChronicleModal·非凭 P 社推测 |
| `feedback_design_must_audit_v3_first` | doc v1·先 audit 复用面再开 |

---

## §12·候选·next step

- **A·v1 入卷·然后 audit 验复用面 (~0.2 d)·再开 a-e (~1.9 d)** ← 推荐
- **B·直接开 a-e·skip audit** (~1.7 d)
- **C·砍 §2.2 black swan·只 naming** (~0.6 d minimal·快速 ship)
- **D·砍 §2.1 naming·只 black swan** (~1.2 d·跳 commit hook 改)

---

## §13·post-L9·解锁

| 后续 | L9 解锁 |
|---|---|
| **真改革"有名"** | ✅ 改革命名 paradigm·跨剧本传 canonicalName |
| **真改革"有意外"** | ✅ 4 type 黑天鹅·实质化 corruption / minxin / NPC retire |
| **L11 rollback** | canonicalName 入 rollback 候选 list·user 选改革名 rollback |
| **L12 timeline visualization** | canonicalName + specialEvent timeline node·完整数据源 |
| **L18 改革者传记** | historicalEvaluation 是传记基础 |
| **L29 政治暗杀** | reformer_illness 可作 L29 前置 (持续 → 暗杀 trigger) |

---

## §14·version 史

| date | version | 改 |
|---|---|---|
| 2026-05-25 | **v1** | 初稿·2 LLM helper + L7 commit hook + L8 EvolveTick chain + UI + CSS·复用 8 现机制·~640 行·1.9 d 估·**12 项 audit 找出 5 真 BUG** |
| 2026-05-25 | **v2** | **12 项 audit 全修** (1 critical·C1·_kjSpawnReformMemorial 加 ctx.bypassCooldown·1 high·C2·hook step 4.5·1 high·B1·strict outcome.passed===true·1 mid·B2·forcedTopic+forcedIdeology 真 wire·1 mid·C3·sync probe + async LLM 并行·1 mid·C4·L8 prompt filter _retired·余 polish CSS hex)·**额外改 `web/tm-keju-reform-memorial.js`** (~5 行·honor ctx.bypassCooldown / forcedTopic / forcedIdeology)·**~2.1 d**·**等 user 批准开工** |

---

## §15·v1 → v2 audit 对照表

| ID | severity | v1 问题 | v2 fix |
|---|---|---|---|
| **C1** | **CRITICAL** | _kjSpawnReformMemorial cooldown (active phase 15 turn) 阻 L9 黑天鹅 memorial·实质废 | **改 `_kjSpawnReformMemorial`·honor ctx.bypassCooldown**·L9 传 bypassCooldown:true·L7 不传 (默认 cooldown 守) |
| **C2** | high | hook 位置 "step 4 后" 模糊·应在 step 8 之前·否则邸报标题用不到 canonicalName | **精确 step 4.5** (AppendHistory 后·StartRamping 之前)·step 5-8 全可用 canonicalName |
| **B1** | high | naming 调用条件 "outcome.passed" 模糊 | strict `outcome && outcome.passed === true && applyResult.applied`·改革 reject / lint fail 不入志 |
| **B2** | mid | memorialTrigger.ideologyHint 是 dead param·_kjSpawnReformMemorial 不消费 | `_kjSpawnReformMemorial` 改 honor ctx.forcedTopic / forcedIdeology·LLM prompt 注入·真用 |
| **C3** | mid | EvolveTick 内 L9 chain 位置模糊 | sync gate·async LLM 跟 evolve 并行·两 LLM call 同年并行·写 chronicle 不同字段·non-race |
| **C4** | mid | L8 prompt 含 L9 已 retire NPC·LLM 提已退人物 | L8 _kjpL8LlmEvolveYear 内·sup/opp filter `!ch._retired && ch.alive !== false`·跟 L7 ApplyCharsImpact 同 paradigm |
| **B3** | low | Math.random non-seedable | (doc 注·跟其他 game state 一致·skip) |
| **B4** | mid | normalize npcImpact·LLM 错 type 但带 npcImpact | normalize 内 type==='reformer_illness' && pool 验·已 cover |
| **B5** | low | prompt 4 type 中英映射缺 | prompt 加 `(examiner_corrupt 主考贿赂 / student_boycott 考生罢考 / reformer_illness 改革者病 / finance_diversion 财政挪用)` 中英 |
| **A1** | low | CSS hex 未指定 | 5 class 全 hex 给·跟 L8 paradigm 一致 |
| **A2** | low | severity 3 色未给 | sev-low #4a4030·sev-mid #6a4030·sev-high #8a3030·渐红 |
| **D1** | low | save/load 兼容 | (no fix·已走 deepClone) |

**total·12 项 → 真 8 修 (1 critical + 2 high + 4 mid + 1 low polish) + 4 polish/non-fix**

### 15.2·额外改文件 (v2)

| 文件 | 改 |
|---|---|
| `web/tm-keju-reform-memorial.js` | `_kjSpawnReformMemorial(hist, ctx)` honor ctx.bypassCooldown + ctx.forcedTopic + ctx.forcedIdeology·cooldown check 改 `if (!ctx \|\| !ctx.bypassCooldown)`·LLM prompt 注入 forcedTopic 提示·~10 行 |
| `web/tm-keju-reform-evolution.js` | _kjpL8LlmEvolveYear 内 sup/opp filter _retired·~5 行 |

---

## §16·真实落地 (v3·2026-05-25)·**core a-e 全 ship**

### 16.1·slice 完成对照

| Slice | 文件 | 行数·v2 估 vs 实 | smoke | 状态 |
|---|---|---|---|---|
| L9·a LLM 命名 + fallback + normalize | tm-keju-reform-evolution.js (extend L8 IIFE)·`_kjpL9LlmNameReform` + `_kjpL9NameFallback` + `_kjpL9NormalizeNaming` + `_kjpL9MaybeNameReform` | 0.4 d → ~70 行 | §A 3·§B 5·8 case | ✅ |
| L9·b LLM 黑天鹅 + fallback + normalize | tm-keju-reform-evolution.js·`_kjpL9LlmBlackSwan` + `_kjpL9BlackSwanFallback` + `_kjpL9NormalizeBlackSwan` + BLACK_SWAN_TYPES enum | 0.5 d → ~100 行 | §C 3·§D 6·§E 6·15 case | ✅ |
| L9·c apply 4 path | tm-keju-reform-evolution.js·`_kjpL9MaybeSpawnBlackSwan` + `_kjpL9ApplyBlackSwan`·复用 L8 dim apply + L7 NPC retire/memory + L5 memorial | 0.4 d → ~90 行 | §F 3·§G 8·11 case | ✅ |
| L9·d UI canonicalName banner + swan chip + CSS | tm-keju-paradigm-panel.js·_kjpRenderL8ChronicleBody 修·~30 行·tm-keju-paradigm-panel.css·.kjp-l9-* 5 class·~25 行 | 0.3 d → ~55 行 | (无 DOM smoke·src check) | ✅ |
| L9·e smoke + 全 regression | scripts/smoke-l9-naming-blackswan.js (新·~330 行·42 case) | 0.3 d → ~330 行 | 42/42 全过 | ✅ |
| L9·hook integration | tm-keju-reform-apply.js·step 4.5 chain MaybeNameReform·tm-keju-reform-evolution.js·EvolveTick chain MaybeSpawnBlackSwan + filter retired·tm-keju-reform-memorial.js·_kjSpawnReformMemorial honor ctx.bypassCooldown + forcedTopic | 0.1 d → ~20 行 | §I 6 case | ✅ |

### 16.2·全 stack smoke (post-L9)

```
L1·smoke-l1-paradigm                 95 PASS / 0 FAIL
L2·smoke-l2-paradigm-panel          115 PASS / 0 FAIL
L3·smoke-l3-ai-history-sim          107 PASS / 0 FAIL
L4·smoke-l4-forecast-and-stance     107 PASS / 0 FAIL
L5·smoke-l5-objection               103 PASS / 0 FAIL
L6·smoke-l6-subjects                 72 PASS / 0 FAIL
L7·smoke-l7-apply-reform            159 PASS / 0 FAIL
L8·smoke-l8-evolution                67 PASS / 0 FAIL
L9·smoke-l9-naming-blackswan         42 PASS / 0 FAIL  ★ 本 sprint
─────────────────────────────────────────────────────
                                    867 PASS / 0 FAIL  零回归
```

### 16.3·文件清单·真实

| 文件 | 改类 | 行 v2 估 | 行 v3 实 | 备注 |
|---|---|---|---|---|
| `web/tm-keju-reform-evolution.js` | extend L8 IIFE·加 §L9 段·9 helper + BLACK_SWAN constants + expose 9 globals + TM.Keju.L9 namespace | +280 | **~290** | 跟 v2 估 close·non-new file |
| `web/tm-keju-reform-apply.js` | step 4.5·_kjpL9MaybeNameReform chain·strict gate | +5 | **+5** | exact |
| `web/tm-keju-reform-memorial.js` | _kjSpawnReformMemorial honor ctx.bypassCooldown / forcedTopic / forcedIdeology / source·detail builder 改 | +10 | **+15** | +5·triggerType+l9 字段全 carry |
| `web/tm-keju-paradigm-panel.js` | _kjpRenderL8ChronicleBody·canonicalName banner + swan chip + narrative + L9_SWAN_LABEL | +25 | **+30** | exact |
| `web/tm-keju-paradigm-panel.css` | .kjp-l9-canonical-name / hist-eval / swan-chip / sev-low/mid/high / swan-narr·5 class hex | +25 | **~32** | exact |
| `web/index.html` | tm-keju-reform-evolution.js?v=20260525-l9·cache-bust | +1 | +1 | - |
| `scripts/smoke-l9-naming-blackswan.js` | 新 | ~300 | **~330** | 42 case (vs v2 估 30) |
| **total net** | | **+646** | **~703** | 复用率 ~92% 守 |

### 16.4·user 教训对齐 (落地确认)

| 教训 | v3 守 |
|---|---|
| **复用·非自建** | ✅ 8 现机制·net-new 仅 2 LLM helper + 3 dispatcher·**0 new module file**·**0 new modal**·**0 new tick** |
| **失败禁玄幻** | ✅ 4 type 全 historical-grounded·真政治事件·无天命 |
| **工具型 vs 系统型** | ✅ naming 是工具型 (LLM 自动·零代价) + black swan 是世界系统 (改 corruption/minxin/_factionTension/NPC retire/memorial)·两者分明 |
| **L8 真路径已 RAA fix** | ✅ L9 直复用·corruption.trueIndex / minxin.trueIndex / _factionTension number·无需再修 |
| **memorial cooldown bypass** | ✅ ctx.bypassCooldown 加入·L9 immediate spawn·L7 默认守 cooldown |
| **L8 prompt filter retired** | ✅ L9 reformer_illness retire 后·L8 evolve prompt 不再 mention 已退人物 |

---

## §17·post-L9·解锁

| 后续 | L9 解锁 |
|---|---|
| **真改革"有名"** | ✅ canonicalName + historicalEvaluation·跨剧本 archive 可 carry (L8 archive 加 canonicalName field 之后) |
| **真改革"有意外"** | ✅ 4 type 黑天鹅 + dimDelta apply + NPC retire + memorial spawn·实质化 corruption / minxin / faction tension |
| **L11 rollback** | canonicalName 是 rollback list 候选 (user 见"张居正考成法 ↺ 撤销") |
| **L12 timeline visualization** | canonicalName + specialEvent 是 timeline node 显示数据 |
| **L18 改革者传记** | historicalEvaluation 是 baseline·L18 LLM 写 500 字传记可拓展 |
| **L29 政治暗杀** | reformer_illness 可作 trigger (持续 → 暗杀候选) |
