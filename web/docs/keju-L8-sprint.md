# Phase L·L8·LLM 演化推演 + 改革志 + 跨代承袭·sprint plan v4

> **date**·2026-05-24 (v4·**a-f + RAA + RBB 全 ship·~5 h total**·等 user pass)
> **status**·**core + RAA 11 BUG + RBB 5 BUG done·smoke 67/67·全 regression 零回归 (825/825)**·见 §15 RAA + §16 RBB 对照
> **预算·v4 实测**·**~5 h total** (3.3 d v2 估·复用 L7 paradigm 紧凑 + 两轮 audit BUG 实施)
> **依赖**·L1 (_reformChronicle / _reformInProgress / history ✅) + L7 (history entry 全字段 ✅·TickRampingReform ✅·**AppendReformChronicleStub 需 schema migrate**) + 新 `tm_keju_inheritance_archive` localStorage namespace
> **paradigm 一句话**·**L8 = 2 LLM helper + 1 endTurn evolution tick + 1 跨代 hook + 1 cross-scenario persistence 层**·复用率 ~70%

---

## §0·L8 真做什么

| Path | AI · | 触发 | 内容 |
|---|---|---|---|
| **A·年度演化** | AI·4 | ramping/active phase 内·按 year cooldown | LLM 推该年改革实施·写入 `_reformChronicle[histId][year]` ~150 字 |
| **B·跨代承袭** | AI·8 | new scenario load 后·`_kjpL8MaybeApplyInheritance` 查 localStorage archive | LLM 推三态 + 旨意 200 字·入新 paradigm._inheritance |
| **C·persistence** | (无 LLM) | reform matured 时·_kjpL8ArchiveMatured 写 localStorage | 跨剧本 snapshot {era, year, subjects, ideology, mode hint} |

→ **L8 让 _reformChronicle 真活 + 跨剧本改革遗产真"传"过 process boundary。**

---

## §1·复用清单·8 现机制 + 1 新 persistence 层·net-new 仅 2 helper

| 现机制 | 来源 | L8 用 |
|---|---|---|
| `callAISmart` + `_kjpHasAI` + `_kjpParseJson` | L3 | LLM helper paradigm |
| `_kjpL7AppendReformChronicleStub` | L7·stub | **L8 migrate stub schema 入 [histId][year]·替为真 LLM** |
| `_reformChronicle` | L1 ship·**schema v0**·`{year: {...}}`·**改 schema v1**·`{histId: {year: {...}}}` | RBB·B1 fix·see §6.5 migration |
| `_kjpL7TickRampingReform` | L7·endTurn 调 | L8 hook 在其之后调 `_kjpL8EvolveTick` |
| L7 history entry 全字段 | L7 ship | LLM context |
| endTurn pipeline 两路 | tm-endturn-pipeline-steps.js | L8 跟 L7 同 hook 点·**B4 throttle·一 endTurn 1 LLM call·round-robin reform** |
| `GM._chronicle.push` (type=keju-reform-*) | core·grep 验·**无专适配·通用 render**·非 break | 新 type=keju-reform-evolution / inheritance·non-render-breaking |
| `_kjpInitParadigm` (tm-keju-runtime.js initKejuSystem 调) | core | 在其之后·`_kjpL8MaybeApplyInheritance` chain 调 |
| **`localStorage['tm_keju_inheritance_archive']`** | **新·L8 引入** | cross-scenario 改革 snapshot ledger·见 §6.5 |

**net-new (3)**·
- `_kjpL8LlmEvolveYear(histEntry, year)` — async 返该年 evolution
- `_kjpL8LlmInheritanceVerdict(archive, currentScenario)` — async 返三态 + 旨意
- `_kjpL8EvolveTick / _kjpL8MaybeApplyInheritance / _kjpL8ArchiveMatured` — 调度层 (非 LLM)

---

## §2·LLM helpers spec (RBB·B2/B3/B8 fix)

### 2.1 `_kjpL8LlmEvolveYear(histEntry, year)` (L8·a·0.5 d)

```javascript
async function _kjpL8LlmEvolveYear(histEntry, year) {
  if (!histEntry || !year) return null;
  // RBB·B7·typeof defensive
  if (typeof GM === 'undefined' || !GM) return null;
  var fallback = _kjpL8EvolveFallback(histEntry, year);
  if (!_kjpHasAI()) return fallback;

  var paradigm = GM._kejuParadigm || {};
  var diffSnippet = (histEntry.magnitudeDescriptor || '改革');
  var sup = (histEntry.supportNpcs || []).slice(0, 3);
  var opp = (histEntry.opposeNpcs || []).slice(0, 3);
  var allNpcsForReact = sup.concat(opp);   // RBB·B3·npcReact 必绑此 pool
  var elapsedYears = year - (histEntry.year || year);
  var stage = (paradigm._reformInProgress && paradigm._reformInProgress.stage) || 'unknown';
  // RBB·B8·新 subjects 历史出处·入 prompt (L6 BB-A1/A2 fix 后真有 historicalAnalog 字段)
  var newSubjectsLine = '';
  var addedSubjects = (histEntry.diff && histEntry.diff.subjects && histEntry.diff.subjects.added) || [];
  if (addedSubjects.length) {
    newSubjectsLine = '【新科出处】' + addedSubjects.slice(0, 3).map(function(s) {
      return s.name + '·' + (s.historicalAnalog || '无先例');
    }).join('·') + '\n';
  }

  var prompt =
    '【改革】' + diffSnippet + '·' + (histEntry.method || '') + '\n' +
    '【支持】' + (sup.join('、') || '无') + '\n' +
    '【反对】' + (opp.join('、') || '无') + '\n' +
    newSubjectsLine +
    '【施行】第 ' + elapsedYears + ' 年·阶段·' + stage + '\n' +
    '【当年】' + year + '·朝代·' + (paradigm.initEra || '') + '\n\n' +
    '请按真历史 paradigm·写该年改革实施 1 事·\n' +
    '- 150 字古文·叙事简练·若新政见效写 1 喜·若反弹写 1 事·若顺则写 1 衍\n' +
    '- 真历史素材·王安石青苗法第 2 年河北饥 / 张相考成第 3 年御史劾 / 戊戌第 100 日变\n' +
    '- 不写未发生事 / 不预言后果·只写该年实情\n' +
    '- npcReact 只可用·' + (allNpcsForReact.join('、') || '(无)') + '·不可凭空起人名\n\n' +
    '返 JSON·{\n' +
    '  text: "150 字古文",\n' +
    '  snippets: ["人 + 事 + 地·15 字 / 条·1-3 条"],\n' +
    '  dimDelta: {\n' +
    '    loyaltyAccum: -10~10,        // 朝中支持累积\n' +
    '    corruptionAccum: -10~10,     // 吏治变化\n' +
    '    civilianReact: -10~10,       // 民间反响\n' +
    '    factionTension: -10~10       // 党争紧张\n' +
    '  },\n' +
    '  npcReact: [{name (必从上述 pool), reaction (15 字), action ("劾" / "议" / "辞" / "贺" / "默")}]\n' +
    '}';
  try {
    var raw = await callAISmart(prompt, 1000, { maxRetries: 1, priority: 'low', timeoutMs: 25000 });
    var parsed = _kjpParseJson(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.text) return fallback;
    return _kjpL8NormalizeEvolution(parsed, histEntry, year);
  } catch(e) {
    try { console.warn('[L8·a] LLM fail', e); } catch(_){}
    return fallback;
  }
}
```

### 2.2 `_kjpL8LlmInheritanceVerdict(archive, currentScenario)` (L8·c·0.4 d)

```javascript
// RBB·C1/C2/C3 fix·archive 是 localStorage 抽取·currentScenario 用真存在字段
async function _kjpL8LlmInheritanceVerdict(archive, currentScenario) {
  if (!archive || !currentScenario) return null;
  if (typeof GM === 'undefined' || !GM) return null;
  var fallback = _kjpL8InheritanceFallback(archive, currentScenario);
  if (!_kjpHasAI()) return fallback;

  var prevEra = archive.era || '';
  var newEra = currentScenario.era || currentScenario.dynasty || '';
  var lastInfo = archive.magnitudeDescriptor || '前朝改革';
  // RBB·C3·用真存在字段·P.playerInfo.coreContradictions (L6 已用) + scenario.dynastyPhaseHint
  var newIdeologyHints = [];
  try {
    var cc = (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.coreContradictions) || [];
    cc.slice(0, 2).forEach(function(c) { newIdeologyHints.push(c.dimension + ':' + c.title); });
    var dph = currentScenario.dynastyPhaseHint || '';
    if (dph) newIdeologyHints.push('期·' + dph);
  } catch(_){}

  var prompt =
    '【前朝】' + prevEra + '·已成改革·' + lastInfo + '\n' +
    '【新朝】' + newEra + '·' + (newIdeologyHints.join('·') || '(无 hint)') + '\n' +
    '【前朝新加科】' + ((archive.addedSubjectNames || []).join('·') || '(无)') + '\n\n' +
    '请按真历史 paradigm·新朝看前朝改革·推三态·\n' +
    '- mode·"inherit" (承袭·清承明八股) / "reject" (反对·明罢宋经义考) / "compromise" (折中·汉折秦三公九卿)\n' +
    '- 旨意·200 字古文·诏书风·头"诏曰"·尾"钦此"\n' +
    '- compromise 时·指 keep 哪几科·remove 哪几科\n\n' +
    '返 JSON·{\n' +
    '  mode: "inherit" / "reject" / "compromise",\n' +
    '  edict: "200 字诏书",\n' +
    '  keepSubjects: ["科名"],    // compromise 时·从 archive.addedSubjectNames 选\n' +
    '  removeSubjects: ["科名"],\n' +
    '  rationale: "100 字解读"\n' +
    '}';
  try {
    var raw = await callAISmart(prompt, 1500, { maxRetries: 1, priority: 'low', timeoutMs: 30000 });
    var parsed = _kjpParseJson(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.mode) return fallback;
    return _kjpL8NormalizeInheritance(parsed, archive, currentScenario);
  } catch(e) {
    try { console.warn('[L8·c] LLM fail', e); } catch(_){}
    return fallback;
  }
}
```

### 2.3 fallback + normalize·**RBB·B5 给完整 body**

```javascript
function _kjpL8EvolveFallback(entry, year) {
  var elapsed = year - (entry.year || year);
  return {
    text: '(无 LLM·' + (entry.magnitudeDescriptor || '改革') + '·施行第 ' + elapsed + ' 年·朝野循常·待真演化)',
    snippets: [],
    dimDelta: { loyaltyAccum: 0, corruptionAccum: 0, civilianReact: 0, factionTension: 0 },
    npcReact: []
  };
}
function _kjpL8InheritanceFallback(archive, currentScenario) {
  return {
    mode: 'compromise',
    edict: '诏曰·前朝改革有得有失·朕酌行之·钦此',
    keepSubjects: (archive.addedSubjectNames || []).slice(0, Math.ceil((archive.addedSubjectNames||[]).length/2)),
    removeSubjects: [],
    rationale: '(无 LLM·默 compromise·留半数)'
  };
}
function _kjpL8NormalizeEvolution(p, entry, year) {
  var allowedActions = ['劾','议','辞','贺','默'];
  var supOpp = ((entry.supportNpcs||[]).concat(entry.opposeNpcs||[]));
  var supOppSet = {}; supOpp.forEach(function(n){ supOppSet[n]=true; });
  var dd = p.dimDelta || {};
  return {
    text: String(p.text || '').slice(0, 300),
    snippets: (Array.isArray(p.snippets) ? p.snippets : []).slice(0, 3)
              .map(function(s) { return String(s||'').slice(0, 30); }),
    dimDelta: {
      loyaltyAccum: Math.max(-10, Math.min(10, parseInt(dd.loyaltyAccum, 10) || 0)),
      corruptionAccum: Math.max(-10, Math.min(10, parseInt(dd.corruptionAccum, 10) || 0)),
      civilianReact: Math.max(-10, Math.min(10, parseInt(dd.civilianReact, 10) || 0)),
      factionTension: Math.max(-10, Math.min(10, parseInt(dd.factionTension, 10) || 0))
    },
    // RBB·B3·post-validate·LLM 返 npc 不在 pool·skip (避乱起人名)
    npcReact: (Array.isArray(p.npcReact) ? p.npcReact : []).slice(0, 2)
              .filter(function(r) { return r && r.name && supOppSet[r.name]; })
              .map(function(r) {
                return {
                  name: r.name,
                  reaction: String(r.reaction || '').slice(0, 20),
                  action: allowedActions.indexOf(r.action) >= 0 ? r.action : '默'
                };
              })
  };
}
function _kjpL8NormalizeInheritance(p, archive, currentScenario) {
  var allowedModes = ['inherit','reject','compromise'];
  var availSubjects = archive.addedSubjectNames || [];
  return {
    mode: allowedModes.indexOf(p.mode) >= 0 ? p.mode : 'compromise',
    edict: String(p.edict || '').slice(0, 400),
    keepSubjects: (Array.isArray(p.keepSubjects) ? p.keepSubjects : [])
                  .filter(function(n) { return availSubjects.indexOf(n) >= 0; }),
    removeSubjects: (Array.isArray(p.removeSubjects) ? p.removeSubjects : [])
                    .filter(function(n) { return availSubjects.indexOf(n) >= 0; }),
    rationale: String(p.rationale || '').slice(0, 200),
    fromArchive: archive.archiveKey || '',
    by: currentScenario.emperor || '陛下',
    year: GM.year || currentScenario.startYear || 0
  };
}
```

---

## §3·endTurn evolution tick·**RBB·B1/B4/B6 fix** (L8·b·0.3 d)

```javascript
function _kjpL8EvolveTick() {
  // RBB·B7·typeof defensive
  if (typeof GM === 'undefined' || !GM || !GM._kejuParadigm) return;
  if (typeof P === 'undefined' || !P || !P.conf || P.conf.useNewKejuL8 !== true) return;
  var year = GM.year || 0;
  if (!year) return;
  var history = (GM._kejuParadigm.history || []);
  // RBB·B1·schema v1·_reformChronicle[histId][year] = {...}
  var chronicle = (GM._kejuParadigm._reformChronicle = GM._kejuParadigm._reformChronicle || {});

  // RBB·B4·throttle·一 endTurn 最多 1 LLM call·round-robin reform
  // (10 ramping reform 时·30y 后才各覆盖一遍·但避免 token 燃爆 + UI 卡)
  var activeReforms = history.filter(function(e) {
    return e && (e.status === 'ramping' || e.status === 'active');
  });
  if (!activeReforms.length) return;

  // round-robin·按 _l8RoundRobinIdx 旋转
  GM._kejuParadigm._l8RoundRobinIdx = ((GM._kejuParadigm._l8RoundRobinIdx || 0) + 1) % activeReforms.length;
  var entry = activeReforms[GM._kejuParadigm._l8RoundRobinIdx];
  if (!entry || !entry.id) return;

  // RBB·B1·schema·entry-keyed·确保 sub-dict 存
  if (!chronicle[entry.id]) chronicle[entry.id] = {};
  // 该年已写真 (非 stub)·skip
  if (chronicle[entry.id][year] && !chronicle[entry.id][year]._stub) return;
  // RBB·B6·cooldown 语义清·至少 0 年间隔 (即 same year skip 已写者)·intended
  var lastYear = entry._lastEvolveYear || 0;
  if (lastYear === year) return;   // 同年只调 1 次·避双跑

  // 调 LLM·async·写回
  _kjpL8LlmEvolveYear(entry, year).then(function(evo) {
    if (!evo) return;
    chronicle[entry.id][year] = Object.assign({}, evo, {
      histId: entry.id, by: entry.by, _stub: false
    });
    entry._lastEvolveYear = year;
    // apply dimDelta 入 game state·见 §3.1
    _kjpL8ApplyEvolutionDeltas(entry, evo);
    // push GM._chronicle·邸报可见
    try {
      if (Array.isArray(GM._chronicle) && evo.text) {
        GM._chronicle.push({
          turn: GM.turn || 1, type: 'keju-reform-evolution',
          text: year + '年·改革志·' + evo.text.slice(0, 60) + '…',
          tags: ['科举','reform','evolution'], reformId: entry.id
        });
      }
    } catch(_){}
  }).catch(function(){});
}
```

### 3.1·apply dimDelta 入 game state

```javascript
function _kjpL8ApplyEvolutionDeltas(entry, evo) {
  if (!evo || !evo.dimDelta) return;
  var d = evo.dimDelta;
  try {
    // loyaltyAccum → support NPC ch.loyalty
    if (d.loyaltyAccum && Array.isArray(entry.supportNpcs)) {
      entry.supportNpcs.forEach(function(n) {
        var ch = (typeof findCharByName === 'function') ? findCharByName(n) : null;
        if (ch) ch.loyalty = Math.max(0, Math.min(100, (parseInt(ch.loyalty,10)||50) + d.loyaltyAccum));
      });
    }
    // corruptionAccum → GM.vars.corruption (若存)
    if (d.corruptionAccum && GM.vars && GM.vars['corruption']) {
      GM.vars['corruption'].value = Math.max(0, Math.min(100,
        (GM.vars['corruption'].value || 0) + d.corruptionAccum));
    }
    // civilianReact → GM.vars.minxin (若存)
    if (d.civilianReact && GM.vars && GM.vars['民心']) {
      GM.vars['民心'].value = Math.max(0, Math.min(100,
        (GM.vars['民心'].value || 0) + d.civilianReact));
    }
    // factionTension → GM._factionTension (G2 已派生)
    if (d.factionTension && typeof GM._factionTension === 'object') {
      GM._factionTension._l8Accumulator = (GM._factionTension._l8Accumulator || 0) + d.factionTension;
    }
  } catch(_){}
}
```

→ hook 入 endTurn pipeline 两路 (跟 L7 tick 同·**在 L7 tick 之后**)·确保 ramping→active→matured 状态推进先于 L8 evolution。

---

## §4·跨代承袭 hook·**RBB·C1/C2/C4/C5 fix** (L8·d·0.3 d)

### 4.1 真 hook 点

```javascript
// tm-keju-runtime.js initKejuSystem 尾部·_kjpInitParadigm({initBy:'init'}) 之后调
// RBB·C2·真存在 hook·非凭推 tm-keju-loader.js
function _initKejuL8Hook() {
  // RBB·C4·确保 init 完成后调·非 init 中
  if (!GM._kejuParadigm) return;
  if (!P.conf || P.conf.useNewKejuL8 !== true) return;
  setTimeout(function() {
    try { _kjpL8MaybeApplyInheritance(); } catch(e) { try { console.warn('[L8·d]', e); } catch(_){} }
  }, 0);
}

function _kjpL8MaybeApplyInheritance() {
  if (!GM._kejuParadigm) return;
  // RBB·C1·从 localStorage 读 archive·非凭 prevParadigm in memory
  var archive = _kjpL8FindMatchingArchive();
  if (!archive) return;
  var scenario = (typeof P !== 'undefined' && P && P.scenario) || {};
  // 已 apply 过 (跨 reload 防重)·skip
  if (GM._kejuParadigm._inheritance && GM._kejuParadigm._inheritance.fromArchive === archive.archiveKey) return;

  _kjpL8LlmInheritanceVerdict(archive, scenario).then(function(verdict) {
    if (!verdict) return;
    if (!GM._kejuParadigm) return;
    GM._kejuParadigm._inheritance = verdict;
    _kjpL8ApplyInheritanceMode(verdict, archive);
    try {
      if (Array.isArray(GM._chronicle)) {
        GM._chronicle.push({
          turn: GM.turn || 1, type: 'keju-reform-inheritance',
          text: '新朝承前·' + verdict.mode + '·' + (verdict.edict || '').slice(0, 60) + '…',
          tags: ['科举','reform','inheritance'], mode: verdict.mode
        });
      }
    } catch(_){}
  }).catch(function(){});
}

// RBB·C5·apply mode 3 路径·dedup against 现 paradigm subjects (跟 L6 BB-A4 同 paradigm)
function _kjpL8ApplyInheritanceMode(verdict, archive) {
  if (!GM._kejuParadigm) return;
  var subjects = GM._kejuParadigm.subjects = GM._kejuParadigm.subjects || [];
  var existingNames = {};
  subjects.forEach(function(s) { if (s && s.name) existingNames[s.name] = true; });

  if (verdict.mode === 'inherit') {
    // 复 archive.subjectsSnapshot 入新·dedup by name
    (archive.subjectsSnapshot || []).forEach(function(s) {
      if (!s || !s.name || existingNames[s.name]) return;
      subjects.push(Object.assign({}, s, {
        introducedYear: GM.year || 0,
        introducedBy: '新朝承前·' + (s.introducedBy || '前朝'),
        _inheritedFrom: archive.archiveKey
      }));
      existingNames[s.name] = true;
    });
  } else if (verdict.mode === 'reject') {
    // 不做·只记录 verdict.edict 进 chronicle·warning user 新朝清前朝
  } else if (verdict.mode === 'compromise') {
    var keep = verdict.keepSubjects || [];
    (archive.subjectsSnapshot || []).forEach(function(s) {
      if (!s || !s.name || existingNames[s.name]) return;
      if (keep.indexOf(s.name) < 0) return;
      subjects.push(Object.assign({}, s, {
        introducedYear: GM.year || 0,
        introducedBy: '新朝折中·' + (s.introducedBy || '前朝'),
        _inheritedFrom: archive.archiveKey
      }));
      existingNames[s.name] = true;
    });
  }
}
```

---

## §5·UI·改革志 modal·**A1/A2/A3 fix** (L8·e·0.5 d)

### 5.1 入口·明定

L7 改革面板 (`_kjpRenderProposalHtml`) 顶部 "已成改革" section 旁·新加按钮 "改革志 (L8)"·click 弹独立 modal `kjp-l8-chronicle-modal`。

### 5.2 CSS 5 class·明定

```css
#kjp-l8-chronicle-modal { /* modal frame·跟 kjp-reform-modal 同 paradigm */ }
.kjp-l8-inheritance-banner { background:#3a2e20; color:#f8f0e0; padding:12px; border-bottom:1px solid #5a4a30; }
.kjp-l8-reform-section { margin:12px 0; padding:10px; border:1px solid #5a4a30; border-radius:4px; }
.kjp-l8-year-entry { margin:8px 0 8px 16px; padding:6px 0; border-left:2px solid #8a7050; padding-left:10px; }
.kjp-l8-year-entry .year-label { font-weight:bold; color:#e8d8b0; }
.kjp-l8-snippets { color:#a09080; font-size:0.85em; margin-top:4px; }
.kjp-l8-npc { color:#90a080; font-size:0.85em; font-style:italic; margin-top:4px; }
.kjp-l8-text { color:#f0e0c0; margin-top:4px; line-height:1.5; }
```

### 5.3 render·按 reform-grouped·**RBB·B1 schema v1**

```javascript
function _kjpRenderL8ChronicleModal(paradigm) {
  if (!P.conf || P.conf.useNewKejuL8 !== true) return '<div>L8 未启·设 P.conf.useNewKejuL8=true</div>';
  var html = '';
  // 跨代承袭顶 banner
  if (paradigm._inheritance) {
    var i = paradigm._inheritance;
    html += '<div class="kjp-l8-inheritance-banner">' +
      '<b>新朝承前·' + i.mode + '</b><br>' + _escHtml(i.edict || '') +
      (i.rationale ? '<div style="margin-top:6px;font-size:0.9em;opacity:0.8;">' + _escHtml(i.rationale) + '</div>' : '') +
      '</div>';
  }
  // RBB·B1·schema v1·_reformChronicle[histId][year]
  var chronicle = paradigm._reformChronicle || {};
  var histById = {};
  (paradigm.history || []).forEach(function(h) { if (h && h.id) histById[h.id] = h; });
  var histIds = Object.keys(chronicle);
  if (!histIds.length) {
    html += '<div class="kjp-muted">(无改革志·改革施行后会逐年累积)</div>';
    return html;
  }
  histIds.forEach(function(histId) {
    var entry = histById[histId] || { magnitudeDescriptor: '(未知改革)', method: '' };
    html += '<div class="kjp-l8-reform-section">' +
      '<b>' + _escHtml(entry.magnitudeDescriptor || '') + '</b>·' + _escHtml(entry.method || '') +
      '·' + _escHtml(entry.status || '');
    var years = Object.keys(chronicle[histId]).map(Number).sort(function(a,b){ return a-b; });
    years.forEach(function(y) {
      var e = chronicle[histId][y];
      if (!e || e._stub) return;   // skip stub·L8 真填后才显
      html += '<div class="kjp-l8-year-entry">' +
        '<span class="year-label">' + y + '年</span>' +
        '<div class="kjp-l8-text">' + _escHtml(e.text || '') + '</div>' +
        (e.snippets && e.snippets.length ? '<div class="kjp-l8-snippets">· ' + e.snippets.map(_escHtml).join('·') + '</div>' : '') +
        (e.npcReact && e.npcReact.length ?
          '<div class="kjp-l8-npc">[NPC] ' + e.npcReact.map(function(r) {
            return _escHtml(r.name) + '·' + _escHtml(r.action) + '·' + _escHtml(r.reaction);
          }).join('·') + '</div>' : '') +
        '</div>';
    });
    html += '</div>';
  });
  return html;
}
```

---

## §6·新文件 + 改文件

| 文件 | 改 | 行 |
|---|---|---|
| **`web/tm-keju-reform-evolution.js`** | **新**·L8 主模块·2 LLM helper + tick + inheritance + persistence helper + 4 fallback/normalize + expose | **~360** |
| **`web/tm-keju-paradigm.js`** | **migrator v0→v1·_reformChronicle schema** (year-keyed → histId-keyed)·见 §6.5·~25 行 |
| **`web/tm-keju-reform-apply.js`** | `_kjpL7AppendReformChronicleStub` schema 改 (写 `[histId][year]`)·`_kjpL8ArchiveMatured` 入 localStorage·matured 时调·~15 行 |
| **`web/tm-endturn-pipeline-steps.js`** | `_kjpL8EvolveTick` hook 在 L7 tick 之后·2 处·~10 行 |
| **`web/tm-keju-runtime.js`** | initKejuSystem 尾部 `_initKejuL8Hook()` 调·~5 行 |
| **`web/tm-keju-paradigm-panel.js`** | 改革面板加 "改革志 (L8)" 按钮 + modal 弹 + `_kjpRenderL8ChronicleModal`·~80 行 |
| **`web/tm-keju-paradigm-panel.css`** | .kjp-l8-* 7 class·~40 行 |
| **`scripts/smoke-l8-evolution.js`** | **新** | **~380 行·~40 case** |

**total net·~915 行**·复用率 ~70%·**1 new module + 1 new smoke file**

---

## §6.5·cross-scenario persistence·**RBB·C1/C2 fix·新设计**

### 6.5.1 schema

```javascript
// localStorage key·'tm_keju_inheritance_archive'
// value·JSON·{ entries: [{ archiveKey, ts, ...snapshot }] }·max 50 entries·LRU
{
  entries: [
    {
      archiveKey: "ming_崇祯_格致科改革_1635",   // 唯一·era + emperor + reformDesc + year
      ts: 1738912345678,
      era: "ming",
      emperor: "崇祯",
      year: 1635,
      magnitudeDescriptor: "增格致科·改八股权重",
      ideology: "modern",
      mode: "edict",
      addedSubjectNames: ["格致科", "实学", "西学"],
      subjectsSnapshot: [                         // L6 BB-A1 rich fields 全保
        { id, name, weight, ideology, format, historicalAnalog, rationale, introducedBy, customFields }
      ],
      examInterval: 3,
      retakePolicy: "free",
      ideologyShift: "modern"
    }
  ]
}
```

### 6.5.2 write·`_kjpL8ArchiveMatured(entry)`

```javascript
// L7·matured 时调 (在 _kjpL7AppendReformChronicleStub 之后)
function _kjpL8ArchiveMatured(entry) {
  if (typeof localStorage === 'undefined') return;
  if (!entry || !GM._kejuParadigm) return;
  var paradigm = GM._kejuParadigm;
  var added = (entry.diff && entry.diff.subjects && entry.diff.subjects.added) || [];
  // 仅 archive 有 subject changes 的 reform·空 reform 不存
  if (!added.length && entry._dimVar && Object.keys(entry._dimVar).length === 0) return;

  var key = (paradigm.initEra || 'unknown') + '_' + (entry.by || '陛下') + '_' +
            (entry.magnitudeDescriptor || 'reform').slice(0, 10) + '_' + (entry.year || 0);
  var snapshot = {
    archiveKey: key,
    ts: Date.now(),
    era: paradigm.initEra || '',
    emperor: entry.by || '',
    year: entry.year || 0,
    magnitudeDescriptor: entry.magnitudeDescriptor || '',
    ideology: paradigm.ideology || '',
    mode: entry.method || '',
    addedSubjectNames: added.map(function(s) { return s.name; }),
    subjectsSnapshot: added.map(function(s) { return Object.assign({}, s); }),
    examInterval: paradigm.examInterval,
    retakePolicy: paradigm.retakePolicy,
    ideologyShift: paradigm.ideology
  };
  try {
    var raw = localStorage.getItem('tm_keju_inheritance_archive');
    var ledger = raw ? JSON.parse(raw) : { entries: [] };
    if (!Array.isArray(ledger.entries)) ledger.entries = [];
    // dedup by key·重存覆盖
    ledger.entries = ledger.entries.filter(function(e) { return e.archiveKey !== key; });
    ledger.entries.push(snapshot);
    // LRU·keep last 50
    if (ledger.entries.length > 50) ledger.entries = ledger.entries.slice(-50);
    localStorage.setItem('tm_keju_inheritance_archive', JSON.stringify(ledger));
  } catch(e) { try { console.warn('[L8·archive write]', e); } catch(_){} }
}
```

### 6.5.3 read·`_kjpL8FindMatchingArchive()`

```javascript
// 朝代承袭顺序·han < tang < song < yuan < ming < qing
var ERA_ORDER = ['han','tang','song','yuan','ming','qing'];

function _kjpL8FindMatchingArchive() {
  if (typeof localStorage === 'undefined') return null;
  try {
    var raw = localStorage.getItem('tm_keju_inheritance_archive');
    if (!raw) return null;
    var ledger = JSON.parse(raw);
    if (!ledger || !Array.isArray(ledger.entries) || !ledger.entries.length) return null;
    var paradigm = GM._kejuParadigm || {};
    var currentEra = (paradigm.initEra || '').toLowerCase();
    var currentIdx = ERA_ORDER.indexOf(currentEra);
    // 找时间序上 < currentEra 的最近 archive·或 currentEra 同朝 (虚剧本)
    var candidates = ledger.entries.filter(function(e) {
      var prevIdx = ERA_ORDER.indexOf((e.era||'').toLowerCase());
      if (prevIdx < 0 || currentIdx < 0) return false;
      return prevIdx < currentIdx;   // 严格前朝
    });
    if (!candidates.length) return null;
    // 取 ts 最近 (即 user 最近玩过的前朝改革)
    candidates.sort(function(a,b){ return b.ts - a.ts; });
    return candidates[0];
  } catch(e) { try { console.warn('[L8·archive read]', e); } catch(_){} return null; }
}
```

### 6.5.4 migration·`_reformChronicle` v0 → v1

```javascript
// tm-keju-paradigm.js·_paradigmMigrators[1]·或在 _kjpMigrate 中
function _kjpMigrateReformChronicleV1(paradigm) {
  if (!paradigm || !paradigm._reformChronicle) return;
  var keys = Object.keys(paradigm._reformChronicle);
  if (!keys.length) return;
  // detect v0·若 key 是 year-like (1000-3000)·非 hist id
  var isV0 = keys.every(function(k) {
    var n = parseInt(k, 10);
    return n >= 1000 && n <= 3000;
  });
  if (!isV0) return;
  var migrated = {};
  keys.forEach(function(yearStr) {
    var e = paradigm._reformChronicle[yearStr];
    if (!e || !e.histId) return;
    if (!migrated[e.histId]) migrated[e.histId] = {};
    migrated[e.histId][yearStr] = e;
  });
  paradigm._reformChronicle = migrated;
}
```

---

## §7·smoke·40 case (L8·f·0.4 d)

| § | 内容 | case |
|---|---|---|
| A | `_kjpL8EvolveFallback` shape (text/snippets/dimDelta/npcReact) | 3 |
| B | `_kjpL8LlmEvolveYear` LLM mock·返 evo·shape verify·B3 NPC pool 验 (LLM 返 不在 pool 的 npc·skip)·B8 historicalAnalog 入 prompt | 6 |
| C | `_kjpL8NormalizeEvolution` clamp + slice + dim enum 4 类 + npcReact action 5 enum | 6 |
| D | `_kjpL8LlmInheritanceVerdict` 3 mode (inherit/reject/compromise) + keepSubjects pool 限 | 6 |
| E | `_kjpL8EvolveTick` 路径·ramping/active 入·matured/null 不入·**B4 throttle·一 tick 1 reform·round-robin**·**B6 cooldown lastYear===year skip** | 7 |
| F | `_kjpL8MaybeApplyInheritance` apply mode 3 路径·**C5 dedup against 现 subjects** | 4 |
| G | flag gate·useNewKejuL8=false·全 noop | 2 |
| **H** | **persistence·_kjpL8ArchiveMatured 写 localStorage + _kjpL8FindMatchingArchive 读 + ERA_ORDER 严格前朝 + LRU 50** | **4** |
| **I** | **migration v0→v1·_reformChronicle schema 升级** | **2** |

---

## §8·预算

| Slice | 内容 | 估时 |
|---|---|---|
| L8·a | `_kjpL8LlmEvolveYear` + fallback + normalize·B2/B3/B5/B8 | 0.5 d |
| L8·b | `_kjpL8EvolveTick` + applyDeltas·B1/B4/B6/B7 | 0.4 d |
| L8·c | `_kjpL8LlmInheritanceVerdict` + fallback·C3 | 0.4 d |
| L8·d | inheritance hook + applyMode·C1/C2/C4/C5 | 0.3 d |
| **L8·d2** | **cross-scenario persistence·archive write/read/migration·LRU**·C1 全设计 | **0.7 d** |
| L8·e | UI modal + 入口 button + CSS 7 class | 0.5 d |
| L8·f | smoke ~40 case + 全 regression | 0.4 d |
| **核心** | | **~3.2 d** |

跟 v1 估 2.3 d + v2 加 persistence ~1 d → **3.3 d 总**·跟 Stage 2 plan §7.9 估 2-3 d 略超 (因加 persistence 设计·原 plan 略简)。

---

## §9·red line 守

| Rule | 守 |
|---|---|
| 1·复用·非自建 | ✅ 8 现 + 1 localStorage namespace·net-new 3 helper |
| 2·async + fallback | ✅ `_kjpHasAI` gate + 2 fallback·panel 不阻 |
| 3·失败禁玄幻 | ✅ 演化是真历史 paradigm |
| 4·9 朝代 voice | ✅ era + prevEra + newEra + ERA_ORDER 入 prompt + persistence |
| 5·党争·GM.parties | ✅ npcReact 走真 NPC·post-validate filter·skip 不在 pool |
| 6·走常朝 source pool | (L8 是 chronicle / inheritance·非 NPC speech) |
| 7·flag gate | `P.conf.useNewKejuL8=false` 默认 off·全路径 noop |
| 8·三面 | 运行时 ✅·AI 面 ✅·编辑器留 L18 |

---

## §10·post-L8·解锁

| 后续 | L8 解锁 |
|---|---|
| **真"改革活" 体验** | ✅ user 看年度演化 + dimDelta 真入 game state |
| **跨剧本累积** | ✅ localStorage archive·user 玩明朝改革 → 玩清朝时新朝继承提示 |
| **L9 改革命名 + 黑天鹅** | LLM 命名可 ref evolution snippets |
| **L11 改革反复 rollback** | _inheritance.mode='reject' 跟 L11 rollback 联通 |
| **L12 改革后果 UI** | _reformChronicle[histId][year] 是 timeline 数据源 |
| **L35 跨剧本传承** | 升级·从 single archive 到 multi-history archive·已有持久层基础 |

---

## §11·候选·next step

- **A·doc v2 入卷 (本)·然后开 a-f (~3.2 d)** ← 推荐·全 18 项 fix 在·cross-scenario persistence 真落地
- **B·开 a-c (核心 evolve)·跨代留下 phase** (~1.5 d minimal·临时 skip persistence)
- **C·进一步 audit (Round 2)·确认 v2 全覆**

---

## §12·version 史

| date | version | 改 |
|---|---|---|
| 2026-05-24 | **v1** | 初稿·2 LLM helper + 1 endTurn tick + 1 跨代 hook + UI tab·复用 8 现机制·~665 行·2.3 d 估·**18 项 audit 找出 4 critical** |
| 2026-05-24 | **v2** | **18 项 audit 全修** (4 critical·B1 schema 改 keyed·C1/C2 cross-scenario persistence·C3 ruler ideology fix)·**加 §6.5 cross-scenario persistence 设计 (~+1d)**·全 spec 给真 body·LLM prompt 真 NPC pool 绑·throttle·migration v0→v1·**~3.3 d**·**待 user 批准开工** |
| 2026-05-24 | **v3** | **a-f 全 ship·smoke 43/43·全 regression 零回归 (801/801)**·然后 **RAA audit (~20 项) → 11 BUG 全修 (4 critical·C1+C2 中文 era 走 ERA_ORDER 永 -1·C3+C5·真路径 GM.corruption.trueIndex / GM.minxin.trueIndex·C4·_factionTension 真是 number·B1 fail backoff·B2 do-while·B4 length===0·C6 inherit toast)**·+16 RAA smoke·smoke 43→59·全 regression 零回归 (817/817)·**待 user pass** |

---

## §13·v1 → v2 audit 对照表 (RBB)

| ID | severity | v1 问题 | v2 fix |
|---|---|---|---|
| **B1** | critical | _reformChronicle[year] 单 key·多 reform 覆 | schema v1·[histId][year] + migrator v0→v1 |
| **C1** | critical | 跨代 trigger 需 prevParadigm in memory·跨剧本不在 | localStorage archive·persistence 层全设计 (§6.5) |
| **C2** | critical | tm-keju-loader.js 不存在 | hook 入 tm-keju-runtime.js initKejuSystem 尾·setTimeout 防 init 同步链 |
| **C3** | critical | newScenario.player.ideology 非真字段 | 改用 P.playerInfo.coreContradictions + scenario.dynastyPhaseHint (已 grep 验存) |
| **B2** | high | dimDelta enum 不明 | 4 enum (loyaltyAccum / corruptionAccum / civilianReact / factionTension)·clamp -10~10 |
| **B3** | high | npcReact 不绑 NPC pool | prompt 显示绑·normalize post-validate filter 不在 pool 者 skip |
| **B4** | high | 10 ramping 并发 LLM 燃 token | round-robin·一 tick 1 reform·_l8RoundRobinIdx 旋转 |
| **C5** | high | apply mode inherit 不 dedup | 跟 L6 BB-A4 同·existingNames 集 + name skip |
| **A1** | mid | modal 入口未定 | 改革面板 "改革志 (L8)" button + 独立 modal |
| **A2** | mid | CSS class 未具体 | 7 class 明定 + 颜色 hex |
| **A3** | mid | UI tab 结构含糊 | 独立 modal·非 inline tab (跟 L7 history 解耦) |
| **B5** | mid | normalize fallback body 未给 | 4 函数全 body 在 §2.3 |
| **B6** | mid | cooldown 语义模糊 | lastYear === year skip·明定"同年 1 次" |
| **B7** | mid | typeof defensive 缺 | 所有 helper 前置 typeof GM check |
| **B8** | mid | LLM 缺新科 historicalAnalog | prompt 加 `【新科出处】`·entry.diff.subjects.added.historicalAnalog 入 |
| **C4** | mid | inheritance hook 顺序未明 | setTimeout(0)·init 完后 microtask 调·非同步 |
| **C6** | mid | L7 modal 现 tab 结构未确认 | 不复用·独立 modal·避免凭推 |
| **C7** | mid | chronicle render 新 type 适配未查 | grep 验·无专适配 readers (通用 render)·新 type 安全 |

**total·18 真改 (4 critical + 5 high + 6 mid + 3 polish skip 'D' 系列)** — D1/D2/D3 留 L8 落地后 v3 处理。

---

## §15·Round AA + RAA 全修·对照表 (v3)

### 15.1·audit ~20 项·真 11 BUG/缺漏

**Layer C·mechanic·跨系统真路径 (4 critical + 1 high + 2 mid)**

| ID | severity | v2 spec 问题 | v3 fix |
|---|---|---|---|
| **C1** | **critical** | `ERA_ORDER` lowercase pinyin·但 `_kjpResolveEra` 返中文 (`明末·天启朝尾`)·`.toLowerCase()` 不动汉字·indexOf 永 -1·**persistence 真游戏永不触发** | 新 helper `_kjpL8EraToKey(eraStr)`·中文 substring 匹配 (含'汉/唐/宋/元/明/清')·pinyin passthrough |
| **C2** | **critical** | archive 写 `era: paradigm.initEra` (中文)·跟 C1 同·read 永 mismatch | archive 加 `eraKey` 字段·`_kjpL8FindMatchingArchive` 用 eraKey·**旧 archive 兼容**·fallback 实时 `_kjpL8EraToKey(e.era)` |
| **C3** | **critical** | `GM.vars['corruption']` — corruption 真游戏在 `GM.corruption.trueIndex` (CorruptionEngine 管)·`GM.vars['corruption']` 永 undefined → **corruptionAccum 永不 apply** | 改 `GM.corruption.trueIndex` (typeof check)·真路径 |
| **C4** | **critical** | `GM._factionTension` 真游戏是 **number** (`tm-keju-reform-apply.js:695`)·L8 当 object 用 `typeof === 'object'`·永 false → **factionTension 永不 apply** | 直 number 加·`(parseInt(GM._factionTension,10) \|\| 0) + delta`·clamp -100~100 |
| **C5** | high | `GM.vars['民心']` — 民心 真路径 `GM.minxin.trueIndex` | 改 `GM.minxin.trueIndex` |
| **C6** | mid | inheritance apply 后无 user feedback | toast `📜 新朝承前·{label}·加 N 科` |
| C7 | mid | (已 ok·跟 C1 解耦) | - |

**Layer B·function (2 high + 2 mid)**

| ID | severity | v2 问题 | v3 fix |
|---|---|---|---|
| **B1** | high | async LLM fail 时·`_lastEvolveYear` 不更新·每 tick 重打 LLM·token 燃 | `entry._l8FailCount` 累计·≥3 set `_lastEvolveYear = year` skip 本年·成功 reset 0 |
| **B2** | high | inheritance id collision regen 无二次 check (跟 L6 BB-B2 同) | do-while·5 次内 fallback |
| **B3** | mid | keyGen `magnitudeDescriptor.slice(0,10)` 撞 (rare) | (skip·已有 year+by+ts 兜底) |
| **B4** | mid | `idx % 0 = NaN` 语义脏 | explicit `length === 0` early return |
| **B5** | mid | 严格 `prevIdx < currentIdx` 忽略同 era | (skip·doc spec·后续 _timeAnomaly 再扩) |

**Layer A·surface (全 low·skip)**

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| A1-A5 | low | button 位置 / ESC close / empty state hint / hex color / z-index | (全 skip·polish backlog) |

**Layer D·data flow (全 low·skip)**

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| D1-D3 | low | LLM cost meter / save-load idx jump / LLM budget setting | (全 skip·post-ship backlog) |

**total·~20 项 → 真 11 修 (4 critical + 3 high + 4 mid) + 5 polish skip**

### 15.2·smoke·+16 RAA case (43 → 59)

| § | 内容 | case |
|---|---|---|
| **§RAA** | C1·EraToKey 6 case (中文 / pinyin / 大小写 / 空 / null)·C2·真中文 era → archive eraKey 写·清初 find 到 ming archive·C3·corruption.trueIndex 真 += delta·C5·minxin.trueIndex 真 -= delta·C4·_factionTension number 真 +=·clamp 100·B1·failCount=3 backoff·B2·inheritance id 撞 regen·B4·空 history early return·C6·inherit apply 后 toast fired | **+16** |

**total·59/59 PASS·零 fail**·全 regression L1·95·L2·115·L3·107·L4·107·L5·103·L6·72·L7·159·L8·59 → **817/817 PASS 零回归**

### 15.3·改的真实文件 (v3)

| 文件 | 改 |
|---|---|
| `web/tm-keju-reform-evolution.js` | **C1+C2** _kjpL8EraToKey helper + archive eraKey + find 用 eraKey 兼容旧·**C3+C4+C5** _kjpL8ApplyEvolutionDeltas 改真路径·**B1** failCount backoff·**B2** inheritance pushIfNew do-while·**B4** length===0 explicit·**C6** inherit toast·~60 行 |
| `scripts/smoke-l8-evolution.js` | freshGM 改真路径·+16 RAA case·~100 行 |

---

## §16·Round BB + RBB 全修·对照表 (v4)

### 16.1·audit 14 项·真 5 BUG

**Layer A·跨系统 race (1 high)**

| ID | severity | v3 问题 | v4 fix |
|---|---|---|---|
| **BB-A1** | **HIGH** | EvolveTick 无 idempotent guard — endTurn pipeline 两路 (deferred phase5 + render-finalize) 双调·`_l8RoundRobinIdx` 双 +1·**5 reform 时跳半数** | `_lastL8TickTurn` guard·跟 L7 `_lastL7TickTurn` 同 paradigm·防同 turn 双跑 |

**Layer B·function (1 critical + 1 high + 2 mid)**

| ID | severity | v3 问题 | v4 fix |
|---|---|---|---|
| **BB-B1** | **CRITICAL** | **RAA·B1 fix 自己有 BUG·`_l8FailCount=3` 时 backoff·但不 reset → 下年 fresh 时 failCount 仍 3 → 又立即 backoff → 永远不再 LLM 尝试 (forever skip)** | backoff 后 set `_lastEvolveYear` 同时 `_l8FailCount = 0`·下年 fresh attempt |
| **BB-B2** | high | compromise mode + LLM 返 `keepSubjects=[]` → 静默零 inherit·user 看 toast "加 0 科"·非 expected behavior | empty keepSubjects → fallback to `archive.addedSubjectNames` (全 inherit·跟 fallback 半数 spirit 近) |
| **BB-B3** | mid | migrator failed silently 时·chronicle 仍 v1 schema·L8 写 `[histId][year]` 污染·v1 reader 错 | EvolveTick 写前 sanity check·top keys 若全 year-like (1000-3000)·skip 写 + console.warn |
| **BB-B4** | mid | LRU 50 evict 最旧·若 user 长期玩同 era·新 archive 把同 era 旧的 evict 后·跨代 find 找不到那 era | LRU evict 时·**每 era 至少保 1 个 (最新)**·然后 fill ts desc 到 LRU_MAX |

**skip (9 项·polish/non-issue/doc·BB-A2/A3/C1-C4/D1-D3)**

### 16.2·smoke·+8 RBB case (59 → 67)

| § | 内容 | case |
|---|---|---|
| **§RBB** | BB-A1·同 turn 双调 idx 不变·下 turn 推进·BB-B1·failCount=3 backoff·reset 0·_lastEvolveYear set·BB-B2·compromise empty → fallback all·BB-B3·v1 chronicle 检测·skip 写·BB-B4·ming 110 次 + song 1 个 + LRU evict·song 保留 | **+8** |

**total·67/67 PASS·零 fail**·全 regression L1·95·L2·115·L3·107·L4·107·L5·103·L6·72·L7·159·L8·67 → **825/825 PASS 零回归**

### 16.3·改的真实文件 (v4)

| 文件 | 改 |
|---|---|
| `web/tm-keju-reform-evolution.js` | **BB-A1** _lastL8TickTurn guard·**BB-B1** backoff reset failCount=0·**BB-B2** compromise empty fallback·**BB-B3** schema sanity check·**BB-B4** LRU per-era preserve·~50 行 |
| `scripts/smoke-l8-evolution.js` | **§RBB +8 case** + E5 修 (BB-A1 guard 需 turn++)·~85 行 |

### 16.4·BUG vs polish 分类

| 类 | count | 例 |
|---|---|---|
| **真 BUG (运行时数据 / state 问题)** | **3** | BB-B1 backoff forever skip·BB-A1 round-robin skip 半数·BB-B3 schema 污染 |
| **缺漏 (boundary)** | **2** | BB-B2 empty keepSubjects·BB-B4 LRU 误 evict |
| **skip (non-bug / polish)** | 9 | A2/A3 race semantics·C1-C4 UX·D1-D3 budget meter |
