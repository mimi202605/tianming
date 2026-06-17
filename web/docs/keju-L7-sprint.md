# Phase L·L7·改革 apply diff·sprint plan v7

> **date**·2026-05-24 (v7·**RAA + RBB 全修全 ship**·待 user pass)
> **status**·**core + deepen + RAA 8 + RBB 6 BUG fix done·smoke 159/159 全过·零回归**·见 §17 真实落地 + §20 RAA + §21 RBB 全修对照
> **预算·v7 实测**·**~5.6 h total** (v4 估 3.5-5 d·实施快 due to 复用率高)·net ~1600 行
> **依赖**·L1 (paradigm + 3 留字段 ✅) + L2 (diff/draft ✅) + L3 (magnitude/pilot/court ✅) + L4 (reformLean writer + reputation stub + chronicleTracker ✅) + F2 (memorial paradigm ✅) + F4 (yanguan spawn ✅) + B3 (callback 路由 ✅) + NpcMemorySystem (Stage 1 ✅)
> **paradigm 一句话**·**改革 apply diff = 复用 L1 留 3 字段 (_reformInProgress / _applyDelay / _reformChronicle) + 复用 _kjpAccumReformLean / NpcMemorySystem / _retired / GM.prestige / GM._factionTension + 复用 F2 memorial source-pool paradigm + 复用 F4 yanguan extreme spawn + fill L1 lint stub + fill L4·g1 audit stub**·**几乎 0 net-new 概念**。

---

## §0·v3 → v4·27 项 audit 修订·一览

| # | v3 错·改 | 类 |
|---|---|---|
| **A1** | `_findCharByName` → **`findCharByName`** (无下划线) | 命名 |
| **A2** | `_kjpBumpReformLean` → **`_kjpAccumReformLean(npc, delta, curTurn)`** (panel.js:1191) | 命名 |
| **A3** | 自加 `_reformVersion` / `_lastReformTurn` → **L1 已 ship `paradigm.version` + `_reformInProgress` + `_applyDelay` + `_reformChronicle`** 直用 | 概念复用 |
| **A4** | `diff.examiner` → **`diff.examinerRules`** | 命名 |
| **A5** | `diff.allocation` → **`diff.allocationRules`** | 命名 |
| **A6** | `diff.penalty` → **`diff.penalties`** | 命名 |
| **A7** | `diff.identity / linkage / meta` (3 假族) → **9 flat top-level keys** (graduateTitle / cohortBondStrength / mentorLineage / schoolIntegration / taxPrivilege / shadow / clanPrivilege / ideology / language) | 命名·shape |
| **A8** | `P._dynasty` → **`paradigm.initEra`** | 命名 |
| **A9** | `P.playerInfo.prestige` → **`GM.prestige`** (top-level 皇威) | 命名 |
| **A10** | `hist.diff._paradigmDigest` → **L7 自调 `_kjpSummarizeDiff(diff)`** 派生 | 命名·派生 |
| **A11** | `subjects.list / tiers.list` → **subjects {added/removed/weightChanged}·tiers {changed/oldCount/newCount/oldNames/newNames}** | shape |
| **B1** | `_kjpAuditForecastAccuracy(entry, actualOutcome, score, npc)` → **`(chronicleEntry, actualOutcome)` 返 score·真填 stub + 拆 npc-write helper** | 签名 |
| **B2** | `_cc2_pushAgendaSource(sources, {...})` → **`(out, seen, row)` 3 args** | 签名 |
| **B3** | `_kjpLintAgainstStage1(paradigm, diff)` 返 array → **改签名 `(paradigm, diff)` 返 `{ok, warnings}`** (现 stub 无 args) | 签名 |
| **B4** | `_kjSpawnYanguanQingyi(party, member, detail)` ✓ | 签名 OK |
| **B5** | `_cc2_collectAgendaSources({max, includeHeld})` ✓ | 签名 OK |
| **C1** | 自加 `history[*].status='ramping/active/matured'` → **`paradigm._reformInProgress: {stage, startYear, ...}`** (L1 已留) | 概念 |
| **C2** | 自加 `_pendingReform / effectiveTurn` → **`paradigm._applyDelay: 0`** (L1 已留·int) | 概念 |
| **C3** | 自建 chronicle 写"reform-applied" → **`paradigm._reformChronicle: {year → 改革志}`** (L1 已留·dict by year) | 概念 |
| **C4** | `_kjpBumpReformLean` 自写 → **`_kjpAccumReformLean`** (L4 已 expose global) | 概念 |
| **C5** | 自建 "11 字段族" → **`_kjpClassifyDiffTags(diff)`** (panel.js:1639·20+ tag) | 概念 |
| **C6** | F4 自调 + 反弹 helper → **F4c `_ty3_phase12_onAccusationApproved` 自动 chain** | 概念 |
| **D1** | `_cc2_pushAgendaSource(sources, {...})` → 必在 `_cc2_collectAgendaSources` 内有 `out`·`seen` 两 context arg | 错引 |
| **D2** | memorial `attackTargets` 字段 → F2 memorial schema 无·**只 leader/cosigners**·target LLM 改写时自然推 | 错引 |
| **D3** | `_kjpL7BuildMemorialDetail(hist)` 返中文 → verify 不被 `_cc2_cleanAgendaText` slice(0,120) 截 | 错引 |
| **D4** | F2 trigger 字段 `mentor / triggerType / leaderDisciple / cosigners` → L7 memorial 用 `reformId / triggerType / leaderOpposer / cosigners` 对应 | shape align |
| **D5** | F2 `cooldown` per-mentor → L7 `cooldown` per-reformId·MAX_SPAWN_PER_TURN=1 同 | shape align |

---

## §1·复用清单 (32 现机制·net-new 仅 4)

| 现机制 | 来源 | L7 怎么用 |
|---|---|---|
| **`paradigm._reformInProgress: null`** ✅ | L1·tm-keju-paradigm.js:184 | **核心**·ramping 改革直存这个·非自建 state machine |
| **`paradigm._applyDelay: 0`** ✅ | L1·tm-keju-paradigm.js:183 | **核心**·ramp-up 倒数年数·int·非自建 effectiveTurn |
| **`paradigm._reformChronicle: {}`** ✅ | L1·tm-keju-paradigm.js:182 | **核心**·改革志·dict by year·非 GM._chronicle 混 |
| **`paradigm.history: []`** ✅ | L1·tm-keju-paradigm.js:181 | 完成的 reform 入此·`{year, by, field, oldValue, newValue, reason}` |
| **`paradigm.version`** | L1·PARADIGM_VERSION | L7 不动·migration 用 |
| **`paradigm.initEra`** | L1 | restoration 用·非 _dynasty |
| **`_kjpResetToPreset(era)`** | L1 | restoration 路径直调 |
| **`_kjpValidateParadigm(p)`** | L1 | apply 后 sanity check |
| **`_kjpLintAgainstStage1()`** stub | L1·:606 | **L7 fill body**·改签名 `(paradigm, diff)` 返 `{ok, warnings}` |
| **`_kjpInitParadigm(opts)`** | L1 | L7 间接·migration safe |
| **`_kjpAccumReformLean(npc, delta, turn)`** ✅ | L4·panel.js:1191·global | chars impact write reformLean |
| **`_kjpAuditForecastAccuracy(entry, actualOutcome)`** stub | L4·panel.js:2142 | **L7 fill body**·返 score 0-100 |
| **`_kjpBumpForecastReputation(npc, turn)`** | L4·panel.js:2115 | reputation 自动 derive·L7 不动 |
| **`_kjpComputeDiff(draft)`** | L2·panel.js:1504 | L7 read shape (22+ flat key) |
| **`_kjpSummarizeDiff(diff)`** | L2 | L7 派生 paradigmDigest |
| **`_kjpClassifyDiffTags(diff)`** | L2·panel.js:1639 | L7 用 tag·非自分 family |
| **`_kjpDiffMagnitude(diff)`** | L2·panel.js:1694 | L7 read radical |
| **`_cc2_collectAgendaSources(opts)`** | chaoyi.js:424 | L7 加 reform-memorial 消费段 |
| **`_cc2_pushAgendaSource(out, seen, row)`** | chaoyi.js:400 | L7 memorial push 用·3 args |
| **`_kjConsumeDiscipleMemorialsForAgenda` paradigm** | F2 | L7 mirror = `_kjConsumeReformMemorialsForAgenda` |
| **`_kjCheckDiscipleMemorialTriggers` paradigm** | F2 | L7 mirror = `_kjCheckReformMemorialTriggers` |
| **`GM._pendingTinyiTopics` escalate** | F2 | L7 跨党 + cosigners≥5 同 escalate |
| **`window._kjSpawnYanguanQingyi(party, member, evt)`** | F4 | L7 extreme path·非常态 |
| **`_ty3_phase12_onAccusationApproved`** | F4c | L7 memorial → 准奏弹劾 → F4 自动 chain |
| **`_ty3_applyReformLeanModulator`** | L4·c | L7 写 reformLean 后·tinyi v3 自动消费 |
| **`NpcMemorySystem.remember(name, text, '中文 emo', weight, source)`** | Stage 1 | 5 positional·中文 emotion·chars impact 写 |
| **`findCharByName(name)`** | tm-index-world | NPC lookup·无下划线 |
| **`ch._retired / _retireReason / _retiredTurn`** | game existing | 守旧致仕·写 field·**game 现已处理** |
| **`ch.loyalty / .party / .alive / .officialTitle`** | game existing | 直接 r/w |
| **`GM.prestige`** | game core | **皇威**·非 P.playerInfo.prestige |
| **`GM._factionTension`** | C2 | L7 写·朝局动荡 |
| **`GM._chronicle`** | Stage 1 | L7 push 'keju-reform-applied' 邸报 cosmetic |
| **`GM.parties` / `P.playerInfo.characterName/factionName`** | core | 派生 reform leader / 党争 |
| **B3 callback 路径** | runtime.js:2421 | callbackName='_kjpL7ApplyReformAfterKeyi'·不动 runtime |

**net-new (4)**·
- `_kjpL7ApplyReformAfterKeyi(method, ctx)` — entry callback
- `_kjpL7DeriveOutcome(method, passed, intent, mag, ctx)` — pure derive
- `_kjpL7MergeDiff(paradigm, diff)` — apply 22+ flat fields shallow merge
- `_kjSpawnReformMemorial` / `_kjConsumeReformMemorialsForAgenda` / `_kjCheckReformMemorialTriggers` — F2 镜像 (~150 行 module)

---

## §2·callback 注册 (L7·a·0.2 d)

### 2.1 改 `_kjpSubmitReform` (panel.js·+1 行)

```javascript
openKeyiSession({
  topicType: 'reform',
  topicData: topicData,
  callbackName: '_kjpL7ApplyReformAfterKeyi'   // ← 新加·B3 路径自动 dispatch
});
```

### 2.2 主体 (新文件 tm-keju-reform-apply.js)

```javascript
window._kjpL7ApplyReformAfterKeyi = function(method, ctx) {
  // method·'council' / 'edict' / 'defy'
  // ctx·{topicType, topicData, opposingMinisters[], opposingParties[], breakdown, support, passed}
  if (!P.conf || P.conf.useNewKejuL7 !== true) return;   // gate
  try {
    var diff   = ctx.topicData.paradigmDiff;
    var intent = ctx.topicData.intent || 'reform';
    var mag    = ctx.topicData.magnitudeParsed || {};
    var pilot  = ctx.topicData.pilotScope || {};

    // 1·derive outcome
    var outcome = _kjpL7DeriveOutcome(method, !!ctx.passed, intent, mag, pilot);

    // 2·若过·overlap detect (深扩 h)
    if (outcome.passed && !_kjpL7CheckOverlapAccept(outcome)) {
      // user cancel overlap·rollback to rejected
      outcome.passed = false;
      outcome.kind = 'rejected_overlap';
    }

    // 3·apply diff (内含 lint·post-validate)
    var applyResult = outcome.passed ? _kjpL7ApplyDiffToParadigm(diff, intent, outcome, ctx) :
                                       { applied: false, reason: 'not_passed' };

    // 4·history append (用 paradigm.history L1 字段)
    var histEntry = _kjpL7AppendHistory(diff, intent, mag, pilot, method, outcome, ctx, applyResult);

    // 5·set _reformInProgress (用 L1 字段) / _applyDelay
    if (outcome.passed && applyResult.applied) {
      _kjpL7StartRamping(histEntry, outcome);
    }

    // 6·chars impact (复用 _kjpAccumReformLean / NpcMemorySystem / _retired)
    _kjpL7ApplyCharsImpact(ctx, outcome, histEntry);

    // 7·反弹·走奏疏 source pool (Layer 1) + F4 极端 (Layer 2)
    _kjpL7MaybeTriggerReformReaction(histEntry, ctx);

    // 8·chronicle 邸报 cosmetic·非历史志
    _kjpL7WriteChronicleSummary(histEntry, ctx);
  } catch(e) {
    try { console.warn('[L7·a] _kjpL7ApplyReformAfterKeyi fail', e); } catch(_){}
  }
};
```

---

## §3·outcome derive (L7·b·0.4 d) ★ 2 axis·非 5 enum

```javascript
function _kjpL7DeriveOutcome(method, passed, intent, mag, pilot) {
  var basePassed = passed || method === 'edict' || method === 'defy';
  var resistanceMultiplier = { council:1, edict:1.5, defy:2 }[method] || 1;
  var radical = parseInt(mag && mag.radical, 10) || 0;
  var pilotShrink = (pilot && pilot.kind && pilot.kind !== 'national') ? 0.7 : 1.0;

  // ramp-up·radical/15 × resistance·1-10 年·写 L1 _applyDelay
  var rampUpYears = basePassed ? Math.max(1, Math.min(10, Math.round((radical / 15) * resistanceMultiplier))) : 0;

  return {
    kind: !basePassed ? 'rejected_court'
        : intent === 'restoration' ? 'restoration_passed'
        : 'reform_passed',
    passed: basePassed,
    method: method,
    intent: intent,
    resistanceMultiplier: resistanceMultiplier,
    pilotShrink: pilotShrink,
    rampUpYears: rampUpYears,

    // 3 layer prestige delta (写 GM.prestige·非 playerInfo)
    prestigeDelta: {
      immediate: _kjpL7CalcImmediatePrestige(method, basePassed, intent),  // ±2~5·小
      onMatured: _kjpL7CalcMaturedPrestige(method, basePassed, radical),   // ±10~20·中
      historical: null                                                      // L8 LLM 演化推后填·大
    },

    factionTensionDelta: _kjpL7CalcFactionTension(method, mag, intent),

    forecastsSettled: false   // matured 时 settle·L4·g1 backfill 触发
  };
}

function _kjpL7CalcImmediatePrestige(method, passed, intent) {
  if (!passed)             return -3;
  if (method === 'defy')   return -3;     // 逆众·当时损名望
  if (method === 'edict')  return +2;     // 决断
  if (intent === 'restoration') return +5; // 复古立威
  return +3;                               // 顺议·小赏
}
function _kjpL7CalcMaturedPrestige(method, passed, radical) {
  if (!passed) return 0;
  var base = Math.round(radical / 5);                // 0-20·按 magnitude
  if (method === 'defy')   return base + 10;          // 成则千古
  if (method === 'edict')  return base + 5;
  return base;
}
function _kjpL7CalcFactionTension(method, mag, intent) {
  var base = mag && mag.radical ? Math.round(mag.radical / 10) : 0;
  if (method === 'edict')  base += 5;
  if (method === 'defy')   base += 15;
  if (intent === 'restoration') base -= 3;
  return base;
}
```

---

## §4·apply diff + `_kjpLintAgainstStage1` 真填 (L7·c·0.6 d) ★ L1 stub fill

### 4.1 主 apply 函数

```javascript
function _kjpL7ApplyDiffToParadigm(diff, intent, outcome, ctx) {
  if (!GM._kejuParadigm) return { applied: false, reason: 'no_paradigm' };
  var paradigm = GM._kejuParadigm;

  // 0·L7 真填 _kjpLintAgainstStage1
  var lintResult = _kjpLintAgainstStage1(paradigm, diff);
  if (!lintResult.ok) {
    // 阻 apply·写 lint 错入 chronicle
    GM._chronicle.push({
      turn: GM.turn || 1,
      type: 'keju-reform-lint-fail',
      text: '改革议过·但 lint 不通·' + lintResult.warnings.map(function(w) { return w.msg; }).join('·'),
      tags: ['科举', 'paradigm', 'lint-fail']
    });
    return { applied: false, reason: 'lint_failed', errors: lintResult.warnings };
  }

  // 1·restoration·复用 L1 _kjpResetToPreset
  if (intent === 'restoration') {
    var targetEra = ctx.topicData.restorationDynasty || paradigm.initEra || 'tang';
    _kjpResetToPreset(targetEra);   // 保留 history + _reformChronicle
    paradigm = GM._kejuParadigm;    // re-grab
  }

  // 2·apply diff (22+ flat field shallow merge)
  _kjpL7MergeDiff(paradigm, diff);

  // 3·apply 后 sanity check
  var v = _kjpValidateParadigm(paradigm);
  if (v && v.ok === false) {
    // post-validate fail·log warn 不 rollback (validation 是软警告)
    try { console.warn('[L7·c] post-apply validate warn', v); } catch(_){}
  }

  return { applied: true, lintWarnings: lintResult.warnings };
}
```

### 4.2 `_kjpL7MergeDiff`·22+ flat fields ★ 按 _kjpComputeDiff 真 shape

```javascript
function _kjpL7MergeDiff(paradigm, diff) {
  if (!paradigm || !diff) return;

  // subjects·{added[], removed[], weightChanged[]}
  if (diff.subjects) {
    (diff.subjects.added || []).forEach(function(s) {
      paradigm.subjects.push({ id:s.id, name:s.name, weight:s.weight, ideology:'reformist',
                               format:'', maxScore:100, introducedYear:GM.year || 0 });
    });
    (diff.subjects.removed || []).forEach(function(s) {
      var idx = paradigm.subjects.findIndex(function(x) { return x.id === s.id; });
      if (idx >= 0) paradigm.subjects.splice(idx, 1);
    });
    (diff.subjects.weightChanged || []).forEach(function(s) {
      var subj = paradigm.subjects.find(function(x) { return x.id === s.id; });
      if (subj) subj.weight = s.newW;
    });
  }

  // examInterval / retakePolicy·{old, new}
  if (diff.examInterval && diff.examInterval.new != null) paradigm.examInterval = diff.examInterval.new;
  if (diff.retakePolicy && diff.retakePolicy.new) paradigm.retakePolicy = diff.retakePolicy.new;

  // tiers·{changed, oldCount, newCount, oldNames, newNames}·L3 实际不支持改 tier (UI readonly)·此处 skip
  // tiers 修留 L20 国子监·此处 noop·若 diff.tiers.changed true → 写 chronicle warn

  // examinerRules·flat keys·blindScoring / blindCopying / mentorBondStrength / inspectionLevel / leakPenalty / minYears / type / avoidanceRules
  if (diff.examinerRules) {
    Object.keys(diff.examinerRules).forEach(function(k) {
      if (k === 'type' && Array.isArray(diff.examinerRules.type)) {
        paradigm.examinerRules.type = diff.examinerRules.type.slice();
      } else if (k === 'avoidanceRules' && diff.examinerRules.avoidanceRules) {
        paradigm.examinerRules.avoidanceRules = paradigm.examinerRules.avoidanceRules || {};
        Object.keys(diff.examinerRules.avoidanceRules).forEach(function(ak) {
          paradigm.examinerRules.avoidanceRules[ak] = diff.examinerRules.avoidanceRules[ak];
        });
      } else {
        paradigm.examinerRules[k] = diff.examinerRules[k];
      }
    });
  }

  // candidateRules·flat keys·allowForeigner / allowMinority / requireRecommendation / requirePrefecture / minAge / maxAge / feeReimbursement / excludedClasses
  if (diff.candidateRules) {
    Object.keys(diff.candidateRules).forEach(function(k) {
      if (k === 'excludedClasses') {
        // {added[], removed[]}
        var cur = paradigm.candidateRules.excludedClasses || [];
        (diff.candidateRules.excludedClasses.added || []).forEach(function(c) { if (cur.indexOf(c) < 0) cur.push(c); });
        (diff.candidateRules.excludedClasses.removed || []).forEach(function(c) {
          var i = cur.indexOf(c); if (i >= 0) cur.splice(i, 1);
        });
        paradigm.candidateRules.excludedClasses = cur;
      } else {
        paradigm.candidateRules[k] = diff.candidateRules[k];
      }
    });
  }

  // quota·{total:{old,new}, ratios:{geo, class, party, ...}}
  if (diff.quota) {
    if (diff.quota.total && diff.quota.total.new != null) paradigm.quota.total = diff.quota.total.new;
    if (diff.quota.ratios) {
      paradigm.quota.ratios = paradigm.quota.ratios || {};
      Object.keys(diff.quota.ratios).forEach(function(dim) {
        paradigm.quota.ratios[dim] = diff.quota.ratios[dim];
      });
    }
  }

  // rankingRule·{old, new}
  if (diff.rankingRule && diff.rankingRule.new) paradigm.rankingRule = diff.rankingRule.new;

  // allocationRules·firstClass / secondClass / thirdClass / waitingYears / imperialReviewRequired / posthumousAdjustment
  if (diff.allocationRules) {
    Object.keys(diff.allocationRules).forEach(function(k) {
      if (k === 'waitingYears' && diff.allocationRules.waitingYears.new != null) {
        paradigm.allocationRules.waitingYears = diff.allocationRules.waitingYears.new;
      } else if (k === 'firstClass' || k === 'secondClass' || k === 'thirdClass') {
        paradigm.allocationRules[k] = diff.allocationRules[k];   // {count, positions}
      } else {
        paradigm.allocationRules[k] = diff.allocationRules[k];
      }
    });
  }

  // 9 top-level flat·ideology / graduateTitle / cohortBondStrength / mentorLineage / schoolIntegration / taxPrivilege / shadow / clanPrivilege / language
  ['ideology','graduateTitle','cohortBondStrength','schoolIntegration','shadow','language'].forEach(function(k) {
    if (diff[k] && diff[k].new) paradigm[k] = diff[k].new;
  });
  if (typeof diff.mentorLineage === 'boolean') paradigm.mentorLineage = diff.mentorLineage;
  if (typeof diff.clanPrivilege === 'boolean') paradigm.clanPrivilege = diff.clanPrivilege;
  if (diff.taxPrivilege) {
    paradigm.taxPrivilege = paradigm.taxPrivilege || {};
    Object.keys(diff.taxPrivilege).forEach(function(k) {
      paradigm.taxPrivilege[k] = diff.taxPrivilege[k];
    });
  }

  // ceremony·flat·palaceTest / rosterRelease / flowerRiding / nameStele / bondingBanquet / kowtowRound
  if (diff.ceremony) {
    paradigm.ceremony = paradigm.ceremony || {};
    Object.keys(diff.ceremony).forEach(function(k) {
      paradigm.ceremony[k] = diff.ceremony[k];
    });
  }

  // penalties·flat·cheating / leak / taboo / bribery
  if (diff.penalties) {
    paradigm.penalties = paradigm.penalties || {};
    Object.keys(diff.penalties).forEach(function(k) {
      paradigm.penalties[k] = diff.penalties[k];
    });
  }
}
```

### 4.3 `_kjpLintAgainstStage1` 真填 ★ 改 L1 stub·~70 行·9 invariant

```javascript
// 改 tm-keju-paradigm.js L606·L7 真填·替换 stub
function _kjpLintAgainstStage1(paradigm, diff) {
  var warnings = [];
  if (!paradigm || !diff) return { ok: true, warnings: warnings };

  // Inv 1·D4 殿试代主 6 身份硬码男·candidateRules.excludedClasses 删 '女子' → 准女子卷·D4 chars filter 是男·会崩
  if (diff.candidateRules && diff.candidateRules.excludedClasses &&
      Array.isArray(diff.candidateRules.excludedClasses.removed) &&
      diff.candidateRules.excludedClasses.removed.indexOf('女子') >= 0) {
    warnings.push({ code:'D4_GENDER_BREAK', severity:'fatal',
      msg:'D4 殿试 6 身份硬码男·准女子卷需 _timeAnomaly 标记·否则 chars filter 崩' });
  }

  // Inv 2·ideology→modern·但 allocationRules.firstClass.positions 仍包含传统馆职·E2 党派派生会崩
  if (diff.ideology && diff.ideology.new === 'modern' && paradigm.allocationRules &&
      paradigm.allocationRules.firstClass &&
      JSON.stringify(paradigm.allocationRules.firstClass.positions || []).indexOf('翰林') >= 0) {
    warnings.push({ code:'E2_MODERN_HANLIN', severity:'warn',
      msg:'modern ideology·但一甲仍授翰林·建议同步改授新派职' });
  }

  // Inv 3·mentorLineage=false·但 GM._discipleGraph 已有数据·F1 数据会孤儿
  if (diff.mentorLineage === false && GM._discipleGraph && GM._discipleGraph.byMentor &&
      Object.keys(GM._discipleGraph.byMentor).length > 0) {
    warnings.push({ code:'F1_DISCIPLE_ORPHAN', severity:'warn',
      msg:'禁 mentor lineage·但 GM._discipleGraph 已有 ' + Object.keys(GM._discipleGraph.byMentor).length + ' mentor·历史关系保留 read-only' });
  }

  // Inv 4·tiers 改·L3 panel readonly·改 tier 暂走 L20 国子监·此处 warn 不 fatal
  if (diff.tiers && diff.tiers.changed) {
    warnings.push({ code:'L20_TIER_CHANGE', severity:'warn',
      msg:'tier 增删暂走 L20 国子监改革·L7 仅 noop·diff.tiers 不 apply' });
  }

  // Inv 5·subjects 总权重 sum·过 200 → B3 题目选择算法溢出
  if (diff.subjects && (diff.subjects.added.length || diff.subjects.weightChanged.length)) {
    var futureSubjects = (paradigm.subjects || []).slice();
    (diff.subjects.added || []).forEach(function(s) { futureSubjects.push(s); });
    (diff.subjects.weightChanged || []).forEach(function(s) {
      var subj = futureSubjects.find(function(x) { return x.id === s.id; });
      if (subj) subj.weight = s.newW;
    });
    var sum = futureSubjects.reduce(function(a, x) { return a + (parseInt(x.weight, 10) || 0); }, 0);
    if (sum > 200) {
      warnings.push({ code:'B3_WEIGHT_OVERFLOW', severity:'fatal',
        msg:'subjects 总权重 ' + sum + '% > 200·B3 题目选择算法不可预测·请调权重' });
    }
  }

  // Inv 6·examinerRules.minYears>30·剧本若无 senior NPC·主考算法 fall to null
  if (diff.examinerRules && diff.examinerRules.minYears > 30) {
    warnings.push({ code:'C1_EXAMINER_NONE_RISK', severity:'warn',
      msg:'主考 minYears>30·若剧本无足资历 NPC·考试 abort' });
  }

  // Inv 7·quota.total=0·E3 选官分配崩
  if (diff.quota && diff.quota.total && diff.quota.total.new === 0) {
    warnings.push({ code:'E3_ZERO_QUOTA', severity:'fatal',
      msg:'录取 quota=0·废科举·建议走 intent=restoration 或专门 废除 path·非 diff' });
  }

  // Inv 8·candidateRules.minAge>50·候选池可能 0 人
  if (diff.candidateRules && diff.candidateRules.minAge > 50) {
    warnings.push({ code:'CANDIDATE_NONE_RISK', severity:'warn',
      msg:'最小年龄>50·候选池可能 0 人·会试 abort' });
  }

  // Inv 9·ceremony 全禁·D5 进士 crystallization 简化·non-fatal
  if (diff.ceremony && diff.ceremony.palaceTest === false && diff.ceremony.rosterRelease === false) {
    warnings.push({ code:'D5_NO_CEREMONY', severity:'warn',
      msg:'禁殿试 + 放榜·D5 簪花跨马叙事缺·建议留 1-2 ceremony' });
  }

  var hasFatal = warnings.some(function(w) { return w.severity === 'fatal'; });
  return { ok: !hasFatal, warnings: warnings };
}
```

---

## §5·history + state machine·**用 L1 留 3 字段** (L7·d·0.3 d) ★ 真复用

### 5.1 _reformInProgress·ramping 改革直存

```javascript
function _kjpL7StartRamping(histEntry, outcome) {
  if (!GM._kejuParadigm) return;
  // 用 L1 留字段·非自建 status state machine
  GM._kejuParadigm._reformInProgress = {
    stage: 'ramping',
    startYear: GM.year || 0,
    startTurn: GM.turn || 1,
    rampUpYears: outcome.rampUpYears,
    matureYear: (GM.year || 0) + outcome.rampUpYears + 30,
    histId: histEntry.id,
    method: outcome.method,
    intent: outcome.intent,
    forecastsSettled: false
  };
  // L1 _applyDelay·剩余倒数
  GM._kejuParadigm._applyDelay = outcome.rampUpYears;
}
```

### 5.2 history append·**对齐 L1 schema** `{year, by, field, oldValue, newValue, reason}`

```javascript
function _kjpL7AppendHistory(diff, intent, mag, pilot, method, outcome, ctx, applyResult) {
  if (!GM._kejuParadigm) return null;
  var hist = GM._kejuParadigm.history;
  if (!Array.isArray(hist)) { GM._kejuParadigm.history = []; hist = GM._kejuParadigm.history; }

  // L1 schema·{year, by, field, oldValue, newValue, reason}
  // L7 扩 (向后兼容)·非破 schema
  var paradigmDigest = (typeof _kjpSummarizeDiff === 'function')
    ? String(_kjpSummarizeDiff(diff) || '').slice(0, 100) : '';
  var tags = (typeof _kjpClassifyDiffTags === 'function') ? _kjpClassifyDiffTags(diff) : ['reform'];
  var entry = {
    // L1 schema 字段 (必填)
    year: GM.year || 0,
    by: (P.playerInfo && P.playerInfo.characterName) || '陛下',
    field: tags.join('·'),                                   // 用 tag 简写·非自分 family
    oldValue: '...',                                          // 摘要·非全 paradigm copy·避免巨大
    newValue: paradigmDigest,
    reason: ctx.topicData.topic || (intent === 'restoration' ? '复古' : '改革'),

    // L7 扩 (新加·不破 L1)
    id: 'reform_' + (GM.year || 0) + '_' + (hist.length || 0),
    turn: GM.turn || 1,
    intent: intent,
    method: method,
    magnitudeDescriptor: ctx.topicData.magnitudeDescriptor || '',
    magnitudeParsed: mag,
    pilotScope: pilot,
    paradigmDigest: paradigmDigest,
    tags: tags,
    supportNpcs: _kjpL7ListFromBreakdown(ctx.breakdown, 'support'),
    opposeNpcs: _kjpL7ListFromBreakdown(ctx.breakdown, 'oppose'),
    cedui: _kjpL7ListCeduiAdvisorsForDigest(paradigmDigest),
    outcome: outcome,
    status: outcome.passed ? 'ramping' : 'rejected',
    rampUpStartYear: outcome.passed ? (GM.year || 0) : null,
    matureYear: outcome.passed ? (GM.year || 0) + outcome.rampUpYears + 30 : null,
    applied: !!(applyResult && applyResult.applied),
    lintWarnings: (applyResult && applyResult.lintWarnings) || [],
    prev: _kjpL7FindPrevReformId(),     // 深扩 l·auto-link
    next: null,
    memorialId: null,                    // §7 spawn 后填
    yanguanReactionId: null,             // §7 extreme spawn 后填
    forecastsSettled: false              // §8 backfill 后改 true
  };
  hist.push(entry);

  // 反向 link prev.next
  if (entry.prev) {
    var prev = hist.find(function(h) { return h.id === entry.prev; });
    if (prev) prev.next = entry.id;
  }
  return entry;
}

function _kjpL7ListFromBreakdown(breakdown, stanceKind) {
  if (!breakdown || typeof breakdown !== 'object') return [];
  var out = [];
  Object.keys(breakdown).forEach(function(name) {
    var s = breakdown[name];
    if (!s) return;
    var matches = (stanceKind === 'support' && s.stance === 'support') ||
                  (stanceKind === 'oppose'  && s.stance === 'oppose');
    if (matches) out.push(name);
  });
  return out;
}

function _kjpL7ListCeduiAdvisorsForDigest(paradigmDigest) {
  if (!paradigmDigest) return [];
  var key = paradigmDigest.slice(0, 40);
  var entries = (typeof window !== 'undefined' && window.ChronicleTracker &&
                 window.ChronicleTracker.listVisible) ? window.ChronicleTracker.listVisible() : [];
  return entries
    .filter(function(e) { return e.sourceType === 'kjp-cedui' && (e.sourceId || '').indexOf(key) >= 0; })
    .map(function(e) { return e.actor; })
    .filter(function(name, i, a) { return name && a.indexOf(name) === i; });
}

function _kjpL7FindPrevReformId() {
  var hist = (GM._kejuParadigm && GM._kejuParadigm.history) || [];
  for (var i = hist.length - 1; i >= 0; i--) {
    if (hist[i].status === 'ramping' || hist[i].status === 'active' || hist[i].status === 'matured') {
      return hist[i].id;
    }
  }
  return null;
}
```

### 5.3 endTurn tick·`_kjpL7TickRampingReform`

跟 F2/F3/F4c 同 pattern·写到 runtime.js endTurn·~5 行调用·**未改 endTurn pipeline 主结构·跟 project_endturn_pipeline 不冲突**·

```javascript
function _kjpL7TickRampingReform() {
  if (!GM._kejuParadigm) return;
  var ip = GM._kejuParadigm._reformInProgress;
  if (!ip) return;

  // 推 _applyDelay
  if (GM._kejuParadigm._applyDelay > 0) GM._kejuParadigm._applyDelay--;

  var hist = (GM._kejuParadigm.history || []).find(function(h) { return h.id === ip.histId; });
  if (!hist) { GM._kejuParadigm._reformInProgress = null; return; }

  var curYear = GM.year || 0;
  if (ip.stage === 'ramping' && curYear >= ip.startYear + ip.rampUpYears) {
    // → active
    ip.stage = 'active';
    hist.status = 'active';
    GM._chronicle.push({ turn: GM.turn || 1, type: 'keju-reform-active',
      text: '改革 (' + hist.id + ')·' + hist.magnitudeDescriptor + '·已稳定施行',
      tags: ['科举','reform','active'] });
  }

  if (ip.stage === 'active' && curYear >= ip.matureYear) {
    // → matured
    ip.stage = 'matured';
    hist.status = 'matured';
    // 1·apply onMatured prestige delta
    GM.prestige = (GM.prestige || 0) + (hist.outcome.prestigeDelta.onMatured || 0);
    // 2·trigger L4·g1 backfill (forecast 准度真填)
    _kjpL7BackfillForecastsForReform(hist);
    // 3·done·clear _reformInProgress (history 留)
    GM._kejuParadigm._reformInProgress = null;
    GM._chronicle.push({ turn: GM.turn || 1, type: 'keju-reform-matured',
      text: '改革 (' + hist.id + ')·' + hist.magnitudeDescriptor + '·施行 30 年·朝野稳·名望 +' + (hist.outcome.prestigeDelta.onMatured || 0),
      tags: ['科举','reform','matured'] });
  }
}
```

### 5.4 `_reformChronicle` (L1 字段)·写改革志

```javascript
// 完成 matured 时·写改革志条 (年度文 ~150 字古文·L8 真做 LLM·L7 留 stub)
function _kjpL7AppendReformChronicleStub(hist) {
  if (!GM._kejuParadigm._reformChronicle) GM._kejuParadigm._reformChronicle = {};
  var year = GM.year || 0;
  GM._kejuParadigm._reformChronicle[year] = {
    histId: hist.id,
    text: hist.magnitudeDescriptor + '·施行已 30 年·朝野稳·待后世评',   // L8 LLM 真填
    by: hist.by,
    _stub: true   // L8 接·替换为真改革志
  };
}
```

---

## §6·chars impact·**3 现 helper 复用** (L7·e·0.4 d)

```javascript
function _kjpL7ApplyCharsImpact(ctx, outcome, hist) {
  if (!hist) return;
  var deltas = _kjpL7DeriveCharsDeltas(outcome);
  var turn = GM.turn || 0;

  (hist.supportNpcs || []).forEach(function(name) {
    var ch = (typeof findCharByName === 'function') ? findCharByName(name) : null;
    if (!ch) return;
    ch.loyalty = Math.max(0, Math.min(100, (parseInt(ch.loyalty, 10) || 50) + deltas.supLoyalty));
    if (typeof _kjpAccumReformLean === 'function') _kjpAccumReformLean(ch, deltas.supLean, turn);
    _kjpL7RememberNpc(ch.name, '陛下采纳·' + _kjpL7MethodLabel(hist.method) + '·' + (hist.magnitudeDescriptor || ''),
      deltas.supLoyalty > 0 ? '喜' : '敬', Math.abs(deltas.supLoyalty));
  });

  (hist.opposeNpcs || []).forEach(function(name) {
    var ch = (typeof findCharByName === 'function') ? findCharByName(name) : null;
    if (!ch) return;
    ch.loyalty = Math.max(0, Math.min(100, (parseInt(ch.loyalty, 10) || 50) + deltas.oppLoyalty));
    if (typeof _kjpAccumReformLean === 'function') _kjpAccumReformLean(ch, deltas.oppLean, turn);
    _kjpL7RememberNpc(ch.name, '陛下不顾老臣议·' + (hist.magnitudeDescriptor || ''), '怨', Math.abs(deltas.oppLoyalty));

    // 高 resistance + 低 loyalty·按概率致仕·**复用 _retired field·非自建**
    if (outcome.passed && outcome.resistanceMultiplier >= 1.5 && parseInt(ch.loyalty, 10) < 20) {
      if (Math.random() < 0.1) {
        ch._retired = true;
        ch._retireReason = '不忍见祖制更易';
        ch._retiredTurn = turn;
        GM._chronicle.push({
          turn: turn, type: 'reform-retirement',
          text: ch.name + '·' + (ch.officialTitle || ch.title || '') + '·致仕·疏曰"老臣不忍见祖制更易"·' + hist.id,
          tags: ['科举', 'reform', 'retirement']
        });
      }
    }
  });

  // GM.prestige (immediate layer·matured 时再加 onMatured)
  GM.prestige = (GM.prestige || 0) + (outcome.prestigeDelta.immediate || 0);
  // GM._factionTension
  GM._factionTension = (GM._factionTension || 0) + (outcome.factionTensionDelta || 0);
}

function _kjpL7DeriveCharsDeltas(outcome) {
  var d = { supLoyalty:+5, supLean:+10, oppLoyalty:-5, oppLean:-10 };
  if (!outcome.passed)            return { supLoyalty:-2, supLean:+5, oppLoyalty:+3, oppLean:-5 };
  if (outcome.method === 'edict') return { supLoyalty: 0, supLean:+15, oppLoyalty:-15, oppLean:-20 };
  if (outcome.method === 'defy')  return { supLoyalty:+10, supLean:+20, oppLoyalty:-25, oppLean:-30 };
  if (outcome.intent === 'restoration') return { supLoyalty:+20, supLean:-20, oppLoyalty:-25, oppLean:+20 };
  return d;
}

function _kjpL7RememberNpc(name, text, emotion, weight) {
  if (typeof NpcMemorySystem === 'undefined' || !NpcMemorySystem.remember) return;
  try {
    NpcMemorySystem.remember(name, text, emotion, Math.max(1, weight),
      (P.playerInfo && P.playerInfo.characterName) || '陛下');
  } catch(_){}
}

function _kjpL7MethodLabel(method) {
  return { council:'依议', edict:'下诏', defy:'断然' }[method] || method;
}
```

---

## §7·反弹·走奏疏 source pool·**新文件 tm-keju-reform-memorial.js** (L7·f·0.6 d) ★ F2 paradigm 镜像

### 7.1 双层路径·先奏疏·后言官

```
Layer 1·所有反弹·_kjSpawnReformMemorial → GM._kjReformMemorials 队列 → endTurn cooldown 兜底
       → _cc2_collectAgendaSources 消费 → 常朝 source pool → LLM 改写为 NPC 上奏
       → 准奏弹劾·走 _ty3_phase12_onAccusationApproved → F4 自动 spawn 言官清议
Layer 2·magnitude>=80 + defy·F4 直 spawn·绕过 source pool (10-40% 极端·非常态)
```

### 7.2 文件主体 (~150 行·跟 F2 同 paradigm)

```javascript
/**
 * tm-keju-reform-memorial.js
 * Phase L·L7·改革反弹奏疏·走常朝 source pool (跟 F2 disciple-memorial 同 paradigm)
 *
 * 触发·改革 status=ramping/active + (method=edict|defy OR magnitude>=60) + 反对派活
 * cooldown·同 reformId·5 turn
 *
 * 输出·GM._kjReformMemorials 队列·_cc2_collectAgendaSources 消费
 * escalate·cosigners≥5 + 跨党 → push GM._pendingTinyiTopics
 *
 * red line·flag gate useNewKejuL7 / 不发 modal / 不直 spawn / 走 _cc2_pushAgendaSource
 */
(function() {
  'use strict';

  var COOLDOWN_TURNS = 5;
  var MIN_COSIGNERS = 2;
  var ESCALATE_TINYI_COSIGNERS = 5;
  var MAX_SPAWN_PER_TURN = 1;
  var MAX_CONSUME_PER_AGENDA = 2;
  var NEUTRAL_PARTIES = ['中立', '无党', '无党派'];

  function _isL7Enabled() {
    if (typeof P === 'undefined' || !P || !P.conf) return false;
    return P.conf.useNewKejuL7 === true;
  }

  /** L7 apply 后直调·入 queue·cooldown 内 */
  function _kjSpawnReformMemorial(hist, ctx) {
    if (!_isL7Enabled()) return null;
    if (!hist || !hist.id) return null;
    if (!GM._kjReformMemorials) GM._kjReformMemorials = [];
    if (!GM._kjReformMemorialCooldown) GM._kjReformMemorialCooldown = {};

    // cooldown per-reformId
    var lastSpawn = GM._kjReformMemorialCooldown[hist.id] || 0;
    var turn = (GM.turn || 0);
    if (lastSpawn && (turn - lastSpawn) < COOLDOWN_TURNS) return null;

    // 反对派 alive filter
    var aliveOpposers = (hist.opposeNpcs || []).filter(function(name) {
      var ch = (typeof findCharByName === 'function') ? findCharByName(name) : null;
      return ch && ch.alive !== false && !ch._retired && !ch._exiled && !ch._imprisoned;
    });
    if (aliveOpposers.length < MIN_COSIGNERS) return null;

    var leader = aliveOpposers[0];
    var cosigners = aliveOpposers.slice(0, 10);

    var memorial = {
      reformId: hist.id,
      reformMagnitudeDescriptor: hist.magnitudeDescriptor || '',
      method: hist.method,
      intent: hist.intent,
      triggerType: hist.method === 'defy' ? 'defy_reform' : hist.method === 'edict' ? 'edict_reform' : 'radical_reform',
      leaderOpposer: leader,
      cosigners: cosigners,
      spawnedTurn: turn,
      detail: _kjpL7BuildMemorialDetail(hist)
    };
    GM._kjReformMemorials.push(memorial);
    GM._kjReformMemorialCooldown[hist.id] = turn;

    // escalate·跨党 + cosigners≥5 → push GM._pendingTinyiTopics
    if (cosigners.length >= ESCALATE_TINYI_COSIGNERS && _kjIsCrossPartyReformMemorial(memorial)) {
      if (!Array.isArray(GM._pendingTinyiTopics)) GM._pendingTinyiTopics = [];
      GM._pendingTinyiTopics.push({
        title: '反改革议·' + (hist.magnitudeDescriptor || '改革') + '·' + leader + '等联名',
        topic: memorial.detail,
        from: leader + '等反改革官联名 (' + cosigners.length + '人)',
        dept: '言官·廷议',
        importance: 8
      });
    }
    return memorial;
  }

  function _kjpL7BuildMemorialDetail(hist) {
    var prefix = hist.method === 'defy' ? '逆众议' :
                 hist.method === 'edict' ? '不依议' : '议过';
    var suffix = hist.intent === 'restoration' ? '复古·恐祖制重违' : '改科举·恐古制坏';
    var detail = prefix + '·' + (hist.magnitudeDescriptor || '改革') + '·' + suffix + '·伏请陛下察';
    // detail 会被 _cc2_cleanAgendaText slice(0, 120)·控长度
    return detail.slice(0, 110);
  }

  function _kjIsCrossPartyReformMemorial(memorial) {
    if (!memorial || !memorial.leaderOpposer) return false;
    var ch = (typeof findCharByName === 'function') ? findCharByName(memorial.leaderOpposer) : null;
    if (!ch || !ch.party) return false;
    return NEUTRAL_PARTIES.indexOf(ch.party) < 0;
  }

  /** endTurn 兜底·扫 history·补 spawn missed (apply 时 cooldown miss / NPC 后续 alive 变) */
  function _kjCheckReformMemorialTriggers() {
    if (!_isL7Enabled()) return 0;
    if (typeof GM === 'undefined' || !GM || !GM._kejuParadigm) return 0;
    var hist = GM._kejuParadigm.history || [];
    var spawned = 0;
    for (var i = hist.length - 1; i >= 0; i--) {
      if (spawned >= MAX_SPAWN_PER_TURN) break;
      var h = hist[i];
      if (h.status !== 'ramping' && h.status !== 'active') continue;
      // 触发门槛
      var radical = (h.magnitudeParsed && h.magnitudeParsed.radical) || 0;
      if (h.method !== 'edict' && h.method !== 'defy' && radical < 60) continue;
      var memorial = _kjSpawnReformMemorial(h, { topicData: { topic: h.reason || '改革' } });
      if (memorial) spawned++;
    }
    return spawned;
  }

  /** _cc2_collectAgendaSources 调·消费队列 (MAX 2) */
  function _kjConsumeReformMemorialsForAgenda() {
    if (!_isL7Enabled()) return [];
    if (typeof GM === 'undefined' || !GM) return [];
    if (!GM._kjReformMemorials || !GM._kjReformMemorials.length) return [];
    var out = GM._kjReformMemorials.slice(0, MAX_CONSUME_PER_AGENDA);
    GM._kjReformMemorials = GM._kjReformMemorials.slice(MAX_CONSUME_PER_AGENDA);
    return out;
  }

  if (typeof window !== 'undefined') {
    window._kjSpawnReformMemorial = _kjSpawnReformMemorial;
    window._kjCheckReformMemorialTriggers = _kjCheckReformMemorialTriggers;
    window._kjConsumeReformMemorialsForAgenda = _kjConsumeReformMemorialsForAgenda;
    window._kjIsCrossPartyReformMemorial = _kjIsCrossPartyReformMemorial;
  }
})();
```

### 7.3 `_kjpL7MaybeTriggerReformReaction` 主体·apply.js

```javascript
function _kjpL7MaybeTriggerReformReaction(hist, ctx) {
  // Layer 1·所有反弹·走奏疏
  if (typeof window._kjSpawnReformMemorial === 'function') {
    var memorial = window._kjSpawnReformMemorial(hist, ctx);
    if (memorial) hist.memorialId = memorial.reformId + '_T' + memorial.spawnedTurn;
  }

  // Layer 2·极端·F4 直 spawn·绕过 source pool
  var extremeProb = 0;
  if (hist.method === 'defy' && hist.magnitudeParsed && hist.magnitudeParsed.radical >= 80) {
    extremeProb = 0.4;
  } else if (hist.method === 'edict' && hist.magnitudeParsed && hist.magnitudeParsed.radical >= 90) {
    extremeProb = 0.2;
  }
  if (Math.random() < extremeProb) {
    var leadingOpposerName = (hist.opposeNpcs || [])[0] || '';
    var ch = leadingOpposerName ? findCharByName(leadingOpposerName) : null;
    var leadingOpposerParty = (ch && ch.party) || '';
    var detail = {
      source: 'L7·reform-extreme-reaction',
      reformId: hist.id,
      reformText: ctx.topicData.topic,
      method: hist.method,
      magnitudeDescriptor: hist.magnitudeDescriptor || ''
    };
    if (typeof window._kjSpawnYanguanQingyi === 'function') {
      window._kjSpawnYanguanQingyi(leadingOpposerParty, leadingOpposerName, detail);
    }
    hist.yanguanReactionId = 'extreme_T' + (GM.turn || 0);
  }
}
```

### 7.4 chaoyi.js 加 reform-memorial 消费段·~10 行

写到 `_cc2_collectAgendaSources` 内·跟 F2/F3/F4c 同位·

```javascript
// L7·改革反弹奏疏·走源 pool·LLM 改写为反对派 NPC 上奏
if (typeof _kjConsumeReformMemorialsForAgenda === 'function') {
  var reformMemorials = _kjConsumeReformMemorialsForAgenda();
  reformMemorials.forEach(function(m) {
    _cc2_pushAgendaSource(out, seen, {       // 3 args·非 2 (audit D1)
      type: 'reform-memorial',
      from: m.leaderOpposer + '等反改革官 (' + m.cosigners.length + '人联名)',
      title: '反改革议·' + (m.reformMagnitudeDescriptor || '改革'),
      detail: m.detail,
      dept: '言官·礼部·吏部',
      importance: 7,
      ref: m.reformId
    });
  });
}
```

---

## §8·L4·g1 backfill·**fill stub** (L7·g·0.4 d)

### 8.1 改 `_kjpAuditForecastAccuracy` body·真填 (L4 line 2142)

```javascript
// 改 panel.js L2142·替换 stub·signature 不变 (chronicleEntry, actualOutcome)·返 0-100
function _kjpAuditForecastAccuracy(chronicleEntry, actualOutcome) {
  if (!chronicleEntry || !actualOutcome) return 0;

  // L7 真填·5 因子 weighted·0-100
  var weights = { method:20, passed:30, prestige:15, yanguan:20, rampSpan:15 };
  var score = 0;

  // forecast 字段 (L4 写 cedui 时 narrative 含 hint·digest 完整存)
  // L4 cedui 时·forecast 隐含·"chosen archetype + paradigm 严重度"·非具体 method 预测
  // L7 backfill 时·按 advisor archetype 的"典型预测"vs actual 对比·非硬要 advisor 写明 method
  var advisorArchetype = _kjpExtractArchetypeFromEntry(chronicleEntry);
  var typical = _kjpL7ArchetypeTypicalForecast(advisorArchetype, actualOutcome.diffApplied);

  // 1·method match (archetype 倾向 vs actual)
  if (typical.predictedMethod === actualOutcome.method) score += weights.method;
  else if (typical.predictedMethod === 'any') score += weights.method * 0.5;

  // 2·passed match
  if (typical.predictedPassed === actualOutcome.passed) score += weights.passed;

  // 3·prestige direction match·绝对值<5 → 满分·同向 → 半分
  if (typeof typical.predictedPrestigeDelta === 'number') {
    if (Math.sign(typical.predictedPrestigeDelta) === Math.sign(actualOutcome.prestigeDelta)) {
      score += weights.prestige *
        (Math.abs(typical.predictedPrestigeDelta - actualOutcome.prestigeDelta) < 5 ? 1 : 0.5);
    }
  } else {
    score += weights.prestige * 0.5;   // 中性 = 半分
  }

  // 4·yanguan match
  if (typical.predictedYanguan === actualOutcome.yanguanSpawned) score += weights.yanguan;

  // 5·ramp span match·误差<2 → 满分·<5 → 半分
  if (typeof typical.predictedRampUpYears === 'number') {
    var diff = Math.abs(typical.predictedRampUpYears - actualOutcome.rampUpYears);
    if (diff < 2) score += weights.rampSpan;
    else if (diff < 5) score += weights.rampSpan * 0.5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function _kjpExtractArchetypeFromEntry(entry) {
  // narrative format·"archetype·label·digest..."·L4·b2 写
  var narr = (entry && entry.narrative) || '';
  var m = narr.match(/^(A[1-8]_[a-z]+)/);
  return m ? m[1] : 'A3_pragmatic';
}

function _kjpL7ArchetypeTypicalForecast(archetype, diff) {
  // 8 archetype·典型预测 map·L7 lookup
  var typicalMap = {
    A1_radical:    { predictedMethod:'edict',   predictedPassed:true,  predictedPrestigeDelta:+15, predictedYanguan:true,  predictedRampUpYears:3 },
    A2_conservative:{ predictedMethod:'council', predictedPassed:false, predictedPrestigeDelta:-5,  predictedYanguan:false, predictedRampUpYears:1 },
    A3_pragmatic:  { predictedMethod:'council', predictedPassed:true,  predictedPrestigeDelta:+5,  predictedYanguan:false, predictedRampUpYears:3 },
    A4_chronicler: { predictedMethod:'any',     predictedPassed:true,  predictedPrestigeDelta:+0,  predictedYanguan:false, predictedRampUpYears:5 },
    A5_celestial:  { predictedMethod:'any',     predictedPassed:false, predictedPrestigeDelta:-10, predictedYanguan:true,  predictedRampUpYears:7 },
    A6_frontier:   { predictedMethod:'edict',   predictedPassed:true,  predictedPrestigeDelta:+10, predictedYanguan:false, predictedRampUpYears:2 },
    A7_imperial_kin:{ predictedMethod:'council', predictedPassed:true,  predictedPrestigeDelta:+5,  predictedYanguan:false, predictedRampUpYears:4 },
    A8_recluse:    { predictedMethod:'any',     predictedPassed:false, predictedPrestigeDelta:-5,  predictedYanguan:true,  predictedRampUpYears:5 }
  };
  return typicalMap[archetype] || typicalMap.A3_pragmatic;
}
```

### 8.2 backfill trigger·matured 时调

```javascript
function _kjpL7BackfillForecastsForReform(hist) {
  if (!hist || hist.forecastsSettled) return;
  var actualOutcome = {
    diffApplied: hist.diff || null,
    method: hist.method,
    passed: hist.status !== 'rejected',
    prestigeDelta: (hist.outcome.prestigeDelta.immediate || 0) + (hist.outcome.prestigeDelta.onMatured || 0),
    factionTensionDelta: hist.outcome.factionTensionDelta || 0,
    yanguanSpawned: !!(hist.memorialId || hist.yanguanReactionId),
    rampUpYears: hist.outcome.rampUpYears
  };

  (hist.cedui || []).forEach(function(advisorName) {
    var npc = (typeof findCharByName === 'function') ? findCharByName(advisorName) : null;
    if (!npc) return;
    var key = (hist.paradigmDigest || '').slice(0, 40);
    var forecasts = (typeof window !== 'undefined' && window.ChronicleTracker &&
                     window.ChronicleTracker.listVisible) ?
      window.ChronicleTracker.listVisible() : [];
    forecasts.filter(function(c) {
      return c.sourceType === 'kjp-cedui' && c.actor === advisorName &&
             (c.sourceId || '').indexOf(key) >= 0;
    }).forEach(function(entry) {
      // call stub (now real)·返 score
      var score = _kjpAuditForecastAccuracy(entry, actualOutcome);
      // npc 写·非 entry 写 (避复杂回写 ChronicleTracker)
      _kjpL7WriteNpcReputationFromScore(npc, score);
    });
  });
  hist.forecastsSettled = true;
}

function _kjpL7WriteNpcReputationFromScore(npc, score) {
  if (!npc || !npc._forecastReputation) return;
  var rep = npc._forecastReputation;
  rep.accurateForecasts = (rep.accurateForecasts || 0) + (score >= 60 ? 1 : 0);
  var prevTotal = (rep.averageScore || 0) * Math.max(1, (rep.totalForecasts || 1) - 1);
  rep.averageScore = Math.round((prevTotal + score) / Math.max(1, rep.totalForecasts || 1));
  // re-derive label (L4 algorithm)
  var t = rep.totalForecasts || 0, a = rep.accurateForecasts || 0, avg = rep.averageScore || 0;
  if (t === 0) rep.reputation = 'new';
  else if (avg === 0 && a === 0) rep.reputation = 'unaudited';
  else if (avg >= 70 && a/t >= 0.6) rep.reputation = 'reliable';
  else if (avg >= 40) rep.reputation = 'mixed';
  else rep.reputation = 'unreliable';
}
```

---

## §9·深扩 5 维 (L7·h-l·1.0 d)

### 9.1 overlap detect (L7·h·0.2 d) — 用 L1 `_reformInProgress` 字段

```javascript
function _kjpL7CheckOverlapAccept(outcome) {
  var ip = GM._kejuParadigm && GM._kejuParadigm._reformInProgress;
  if (!ip) return true;   // 无重叠·OK
  // 有重叠·confirm
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    var msg = '前次改革仍在生效（剩 ' + (GM._kejuParadigm._applyDelay || 0) + ' 年至稳定）·新改革叠加·阻力 ×1.5·确定?';
    if (!confirm(msg)) return false;
  }
  // overlap·boost resistance
  outcome.resistanceMultiplier *= 1.5;
  outcome.rampUpYears = Math.max(1, Math.min(10, Math.round(outcome.rampUpYears * 1.3)));
  return true;
}
```

### 9.2 reformLean decay endTurn (L7·i·0.2 d) — 复用 `_kjpAccumReformLean`

```javascript
function _kjpL7TickReformLeanDecay(turn) {
  if (typeof GM === 'undefined' || !Array.isArray(GM.chars)) return;
  var DECAY_PER_TURN = 0.5;
  GM.chars.forEach(function(ch) {
    if (!ch || !ch._kjpReformLean) return;
    var lean = ch._kjpReformLean;
    var turnDist = turn - (parseInt(lean.lastTurn, 10) || turn);
    if (turnDist <= 0) return;
    var val = parseInt(lean.value, 10) || 0;
    if (val === 0) return;
    var decay = Math.min(Math.abs(val), DECAY_PER_TURN * turnDist);
    // 朝 0 衰减·正→负方向 / 负→正方向
    if (val > 0 && typeof _kjpAccumReformLean === 'function') _kjpAccumReformLean(ch, -decay, turn);
    else if (val < 0 && typeof _kjpAccumReformLean === 'function') _kjpAccumReformLean(ch, decay, turn);
  });
}
```

### 9.3 prestige 3 layer (L7·j·0.2 d)·已嵌·见 §5.3 `_kjpL7TickRampingReform` matured 时 apply onMatured

### 9.4 chronicle voice (L7·k·0.2 d)

```javascript
function _kjpL7WriteChronicleSummary(hist, ctx) {
  if (!Array.isArray(GM._chronicle)) return;
  var voice = _kjpL7GetEmperorVoice(GM._kejuParadigm.initEra);
  var verb = hist.outcome.passed ? '准' :
             hist.outcome.kind === 'rejected_overlap' ? '搁议·前改未稳' : '罢议';
  var text = voice + '·' + verb + '·' +
             (hist.intent === 'restoration' ? '复古·' : '改科举·') +
             (hist.magnitudeDescriptor || '') + '·' + _kjpL7MethodLabel(hist.method);
  GM._chronicle.push({
    turn: GM.turn || 1,
    date: GM._gameDate || '',
    type: hist.outcome.passed ? 'keju-reform-applied' : 'keju-reform-rejected',
    text: text,
    tags: ['科举', 'paradigm', hist.intent, hist.outcome.kind],
    reformId: hist.id,
    rampUpYears: hist.outcome.rampUpYears
  });
}

function _kjpL7GetEmperorVoice(era) {
  // 8 朝代 voice·真有差异
  var voiceMap = {
    han:'诏曰', tang:'敕命', song:'圣旨', yuan:'圣旨', ming:'谕旨',
    qing:'上谕', jin:'诏曰', sui:'敕命', zhou:'王命', shang:'王命', xia:'王命'
  };
  return voiceMap[era] || '上谕';
}
```

### 9.5 prev/next auto-link (L7·l·0.2 d)·已嵌·见 §5.2 `_kjpL7AppendHistory`

---

## §10·新文件 + 改文件

| 文件 | 改类 | 改幅 |
|---|---|---|
| **`web/tm-keju-reform-apply.js`** | **新** | ~260 行·callback + outcome derive + apply + lint + history + chars impact + 反弹 dispatch + tick + backfill + chronicle voice |
| **`web/tm-keju-reform-memorial.js`** | **新** | ~150 行·跟 F2 同 paradigm |
| `web/tm-keju-paradigm.js` | 改 | `_kjpLintAgainstStage1` 真填 body·~70 行替换 stub |
| `web/tm-keju-paradigm-panel.js` | 改 | `_kjpAuditForecastAccuracy` 真填 body·~50 行替换 stub·`_kjpSubmitReform` 加 callbackName·1 行 |
| `web/tm-keju-runtime.js` | 改 | endTurn tick `_kjpL7TickRampingReform` + `_kjpL7TickReformLeanDecay` + `_kjCheckReformMemorialTriggers` 调入·~15 行 |
| `web/tm-chaoyi.js` | 改 | `_cc2_collectAgendaSources` 加 L7 memorial 消费段·~10 行 |
| `web/index.html` | 改 | +2 script src (apply / memorial) |
| `scripts/smoke-l7-apply-reform.js` | **新** | ~700 行·~120 case |

**total net-new + 改·~555 行 net-new + 145 行改 = ~700 行**

---

## §11·smoke ~120 case (L7·m·0.5 d)

| § | 内容 | case |
|---|---|---|
| A | callback 注册 + B3 路由 + gate | 6 |
| B | outcome derive·method×passed×intent 8 axis | 10 |
| C | apply diff·22+ flat field·_kjpL7MergeDiff | 18 |
| D | `_kjpLintAgainstStage1` 9 invariant·fatal vs warn | 14 |
| E | history append + L1 schema 兼容·prev/next link | 8 |
| F | `_reformInProgress` ramping state·_applyDelay 倒数·matured 触发 | 12 |
| G | chars impact·_kjpAccumReformLean / NpcMemorySystem / _retired·GM.prestige / GM._factionTension | 12 |
| H | 反弹 Layer 1·memorial spawn / cooldown / cosigners filter / escalate 廷议·_cc2_pushAgendaSource 3 args | 14 |
| I | 反弹 Layer 2·F4 extreme prob + backref | 5 |
| J | L4·g1 backfill·fill stub·5 因子 score·NPC reputation 真改 | 10 |
| K | restoration 路径·preset reset + overlay + 派系 | 4 |
| L | 深扩·overlap detect / lean decay / prestige 3 layer / voice / prev-next | 12 |
| **total** | | **~125 case** |

---

## §12·预算

| Slice | 内容 | 估时 |
|---|---|---|
| L7·a | callback 注册 + 主体 dispatch | 0.2 d |
| L7·b | outcome derive·method×passed×intent | 0.4 d |
| L7·c | apply diff + `_kjpLintAgainstStage1` 真填 | 0.6 d |
| L7·d | history + state machine·用 L1 _reformInProgress / _applyDelay | 0.3 d |
| L7·e | chars impact·复用 _kjpAccumReformLean + NpcMemorySystem + _retired | 0.4 d |
| L7·f | 反弹·走奏疏 source pool·新文件 tm-keju-reform-memorial.js | 0.6 d |
| L7·g | L4·g1 backfill·fill stub | 0.4 d |
| L7·h | overlap detect | 0.2 d |
| L7·i | reformLean decay | 0.2 d |
| L7·j | prestige 3 layer | 0.2 d |
| L7·k | chronicle voice | 0.2 d |
| L7·l | prev/next auto-link | 0.2 d |
| L7·m | smoke ~125 case + 全 regression | 0.5 d |
| **核心 (a-g + m)** | | **3.5 d** |
| **核心 + 深扩 (a-m)** | | **5.0 d** |

---

## §13·red line 守

| Rule | 守 |
|---|---|
| 1·复用·非自建 | ✅ 32 现机制 reuse·net-new 仅 4 函数 + 1 module |
| 2·不重写 keyi 800 行 | ✅ |
| 3·失败禁玄幻 | ✅ 全自然政治·_retired / loyalty / NPC 弹劾 |
| 4·9 朝代 preset 可改 | ✅ restoration 走 _kjpResetToPreset·non-hardcode·voice 8 朝 map |
| 5·党争走 GM.parties | ✅ supporters 从 breakdown 派生·非 hardcode |
| 6·走常朝 source pool | ✅ 反弹走奏疏·非 modal·F2 同 paradigm |
| 7·flag gate | `P.conf.useNewKejuL7=false` 默认 off·全 no-op |
| 8·编辑器+运行时+AI 三面 | 运行时面 ✅·AI 面 (§8 L4·g1 backfill + §5.4 L8 留 hook)·编辑器面留 L18 |
| 9·_timeAnomaly·虚构剧本 | ✅ lint Inv 1 准女子卷需 _timeAnomaly |

---

## §14·候选·next step

- **A·doc v4 入卷 (本)·立即开 L7·a-g 核心 (3.5 d)·然后再开 h-l 深扩** (推荐)
- **B·doc v4 入卷·立即开 L7·a-m 完整 (5 d)·一波 ship**
- **C·doc v4 入卷·user 审一轮·补 audit·然后开**

我推荐 **A**·跟 L4 sprint 同 paradigm·核心先·验证 paradigm 立·深扩跟着加。

---

## §15·post-L7·解锁

| 后续 | L7 解锁了 |
|---|---|
| **L4·g1 真生效** | reputation chip 从 'unaudited' → 真 'reliable'/'mixed'/'unreliable' |
| **L8 LLM 演化推演** | history.diff 入 prompt·_reformChronicle text 真填 |
| **L11 rollback** | history.prev / next + status 真撤销前 reform |
| **L12 改革 timeline UI** | history visualization·timeline anchor |
| **L18 科举志** | _reformChronicle dict + history + LLM 改革者传记 |

---

## §16·version 史

| date | version | 改 |
|---|---|---|
| 2026-05-24 | **v1** | 初稿·5 outcome enum·自建 state machine |
| 2026-05-24 | **v2** | 复用 paradigm·复用 _kjpReformLean writer / NpcMemorySystem / _retired / 3 layer prestige·-1 d |
| 2026-05-24 | **v3** | 反弹双层·新文件 tm-keju-reform-memorial.js (F2 paradigm 镜像)·+0.3 d |
| 2026-05-24 | **v4** | 27 项 audit 修订·**用 L1 留 3 字段 (_reformInProgress / _applyDelay / _reformChronicle)**·真复用·**diff shape 改 flat 22+ key**·**lint stub 真填 9 invariant**·**audit signature B1/B2/B3 全改** |
| 2026-05-24 | **v5** | **核心 + 深扩全 ship (a-m)**·smoke 125 case 全过·L1/L2/L3/L4 regression 零回归 (L1+L4 各 1 stub-fill 适配 case 更新·非 bug)·见 §17 真实落地·**待 Round AA review** |
| 2026-05-24 | **v6** | **Round AA + RAA 全修 8 BUG (A2/C2 + A4 + C4 false alarm·真 8)**·见 §20 对照·smoke 144/144·+19 RAA case·全 regression 零回归·**待 user pass** |
| 2026-05-24 | **v7** | **Round BB + RBB 全修 6 项 (3 HIGH + 2 MID + 1 LOW)**·见 §21 对照·smoke 159/159·+15 RBB case·零回归·**待 user pass** |

---

## §17·真实落地 (v5·2026-05-24)·**核心 + 深扩全 ship**

### 17.1·slice 完成对照

| Slice | 文件 | 行数·v4 估 vs 实 | smoke | 状态 |
|---|---|---|---|---|
| L7·a callback 注册 + dispatch | `tm-keju-reform-apply.js` _kjReformKeyiCallback | 0.2 d → 实 嵌主文件 | §A 6 case | ✅ |
| L7·b outcome derive | `tm-keju-reform-apply.js` _kjpL7DeriveOutcome + 3 prestige helper | 0.4 d → 实 嵌主文件 | §B 10 case | ✅ |
| L7·c apply diff + lint 真填 | `tm-keju-paradigm.js` (lint stub fill·~120 行)·`tm-keju-reform-apply.js` _kjpL7MergeDiff (~150 行) | 0.6 d → 实 嵌·lint 9 invariant 全 | §C 18·§D 14 | ✅ |
| L7·d history + state·L1 字段真用 | `tm-keju-reform-apply.js` _kjpL7AppendHistory + _kjpL7StartRamping + _kjpL7TickRampingReform + _kjpL7AppendReformChronicleStub | 0.3 d → 实 嵌 (~150 行·_reformInProgress / _applyDelay / _reformChronicle 真用) | §E 8·§F 12 | ✅ |
| L7·e chars impact·复用 3 helper | `tm-keju-reform-apply.js` _kjpL7ApplyCharsImpact + _kjpL7DeriveCharsDeltas + _kjpL7RememberNpc | 0.4 d → 实 嵌·复用 _kjpAccumReformLean / NpcMemorySystem.remember / _retired | §G 12 | ✅ |
| L7·f 反弹·走奏疏 source pool·F2 镜像 | **`tm-keju-reform-memorial.js` 新 (~165 行)** + `tm-keju-reform-apply.js` _kjpL7MaybeTriggerReformReaction + `tm-chaoyi.js` reform-memorial 消费段 | 0.6 d → 实 嵌 | §H 14·§I 5 | ✅ |
| L7·g L4·g1 backfill stub fill | `tm-keju-paradigm-panel.js` _kjpAuditForecastAccuracy 真填 (5 因子)·_kjpExtractArchetypeFromEntry·_kjpArchetypeTypicalForecast·`tm-keju-reform-apply.js` _kjpL7BackfillForecastsForReform + _kjpL7WriteNpcReputationFromScore | 0.4 d → 实 嵌·8 archetype map | §J 10 | ✅ |
| L7·h overlap detect·_reformInProgress | `tm-keju-reform-apply.js` _kjpL7CheckOverlapAccept | 0.2 d → 实 嵌 | §L 3 | ✅ |
| L7·i reformLean decay endTurn | `tm-keju-reform-apply.js` _kjpL7TickReformLeanDecay·复用 _kjpAccumReformLean | 0.2 d → 实 嵌 | §L 3 | ✅ |
| L7·j prestige 3 layer | 嵌 outcome.prestigeDelta {immediate/onMatured/historical} + _kjpL7TickRampingReform matured 时 GM.prestige += onMatured | 0.2 d → 实 嵌 | §L 3 | ✅ |
| L7·k chronicle voice·8 朝代 map | `tm-keju-reform-apply.js` _kjpL7GetEmperorVoice + _kjpL7WriteChronicleSummary | 0.2 d → 实 嵌 | §L 3 | ✅ |
| L7·l prev/next auto-link | 嵌 _kjpL7AppendHistory 内·_kjpL7FindPrevReformId | 0.2 d → 实 嵌 | §E 2 | ✅ |
| L7·m smoke + 全 regression | `scripts/smoke-l7-apply-reform.js` 新 (~470 行) | 0.5 d → 实 嵌 | **125 case 全过** | ✅ |
| L1 + L4 stub-fill 适配 smoke | 2 case 更新 (L7 真填后·原 stub 测试不再适用·改测新行为) | 0.1 h | 各 1 case | ✅ |

### 17.2·全 smoke 状态 (post-L7)

```
L1·smoke-l1-paradigm.js              95 PASS / 0 FAIL  (lint stub 测改"L7 真填·empty diff ok=true·返 {ok,warnings}")
L2·smoke-l2-paradigm-panel.js       115 PASS / 0 FAIL  (零回归)
L3·smoke-l3-ai-history-sim.js       107 PASS / 0 FAIL  (零回归)
L4·smoke-l4-forecast-and-stance.js  107 PASS / 0 FAIL  (audit stub 测改"L7 真填后·真 entry+outcome → score > 0")
L7·smoke-l7-apply-reform.js         125 PASS / 0 FAIL  (本 sprint)
────────────────────────────────────────────────────
                                    549 PASS / 0 FAIL
```

### 17.3·文件清单 (v5 真实)

| 文件 | 改类 | 行数 v4 估 | 行数 v5 实 | 备注 |
|---|---|---|---|---|
| **`web/tm-keju-reform-apply.js`** | **新** | ~260 | **~625** | 含 apply / derive / merge / lint dispatch / history / state / chars / 反弹 dispatch / chronicle voice / backfill / decay·全 12 章节 |
| **`web/tm-keju-reform-memorial.js`** | **新** | ~150 | **~165** | F2 paradigm 镜像·_kjSpawnReformMemorial + _kjCheckReformMemorialTriggers + _kjConsumeReformMemorialsForAgenda + _kjIsCrossPartyReformMemorial |
| `web/tm-keju-paradigm.js` | 改 stub | ~60 | **+120** | _kjpLintAgainstStage1 真填·9 invariant·改签名 `(paradigm, diff)` 返 `{ok, warnings}` |
| `web/tm-keju-paradigm-panel.js` | 改 stub | ~50 | **+60** | _kjpAuditForecastAccuracy 真填·5 因子·_kjpExtractArchetypeFromEntry + _kjpArchetypeTypicalForecast (8 archetype map) |
| `web/tm-keju-paradigm-panel.js` | comment | 1 | **+1** | _kjpSubmitReform comment 改 (callback 走 KEYI_TOPIC_TYPES.reform.callback=`_kjReformKeyiCallback`·L7 expose 这个 global) |
| `web/tm-chaoyi.js` | 加段 | ~10 | **+20** | _cc2_collectAgendaSources 加 L7 reform-memorial 消费段·跟 F2/F3/F4c 同位 |
| `web/tm-endturn-pipeline-steps.js` | 加 hook | ~15 | **+30** | deferred phase5 + render-finalize 2 处·各加 3 hook (_kjpL7TickRampingReform + _kjpL7TickReformLeanDecay + _kjCheckReformMemorialTriggers) |
| `web/index.html` | +script src | 2 | **+2** | reform-memorial + reform-apply |
| **`scripts/smoke-l7-apply-reform.js`** | **新** | ~600 | **~470** | 125 case·§A-L 全覆盖 |
| `scripts/smoke-l1-paradigm.js` | 1 case 更新 | - | **+0** | "lint stub ok" → "lint·empty diff·ok=true" |
| `scripts/smoke-l4-forecast-and-stance.js` | 1 case 更新 | - | **+5** | "stub → 0" → "L7 真填·真 entry+outcome → score > 0" |

**total net·~1493 行·**

### 17.4·27 项 audit 修订·实际落地对照

#### A 命名错·11 项

| # | 改 | 落地位置 |
|---|---|---|
| A1 | `findCharByName` (无 _) | `tm-keju-reform-apply.js` + memorial 全 9 处用对 |
| A2 | `_kjpAccumReformLean` | `tm-keju-reform-apply.js` §7 §11 各 1 处 |
| A3 | L1 留 3 字段真用 | `tm-keju-reform-apply.js` §5 (_reformInProgress)·§6 (_applyDelay)·§5.4 (_reformChronicle) |
| A4 | `diff.examinerRules` (非 examiner) | `_kjpL7MergeDiff` §C·9 字段 |
| A5 | `diff.allocationRules` (非 allocation) | `_kjpL7MergeDiff` §C |
| A6 | `diff.penalties` (非 penalty) | `_kjpL7MergeDiff` §C·4 字段 |
| A7 | 9 flat top-level keys | `_kjpL7MergeDiff` §C·非 nested family |
| A8 | `paradigm.initEra` (非 _dynasty) | restoration § + voice 派生 |
| A9 | `GM.prestige` (top-level) | §6 chars impact + §5.3 matured 加 onMatured |
| A10 | `_kjpSummarizeDiff(diff)` 派生 digest | `_kjpL7AppendHistory` 内 |
| A11 | subjects {added/removed/weightChanged} flat shape | `_kjpL7MergeDiff` subjects 3 操作分开 handle |

#### B 签名错·5 项

| # | 改 | 落地 |
|---|---|---|
| B1 | `_kjpAuditForecastAccuracy(chronicleEntry, actualOutcome)` 2 args 返 score | `tm-keju-paradigm-panel.js` 真填 + `_kjpL7WriteNpcReputationFromScore` 拆 npc-write |
| B2 | `_cc2_pushAgendaSource(out, seen, row)` 3 args | `tm-chaoyi.js` L7 段·3 args 调 |
| B3 | `_kjpLintAgainstStage1(paradigm, diff)` 返 `{ok, warnings}` | `tm-keju-paradigm.js` 真填·9 invariant·改签名 |
| B4 | `_kjSpawnYanguanQingyi(party, member, detail)` 3 args | `tm-keju-reform-apply.js` §8 extreme path 3 args 调 |
| B5 | `_cc2_collectAgendaSources({max, includeHeld})` | unchanged·只读·OK |

#### C 概念可复用·6 项

| # | 改 | 落地 |
|---|---|---|
| C1 | L1 `_reformInProgress` state·非自建 state machine | §5 _kjpL7StartRamping + §6 _kjpL7TickRampingReform stage 推进·写入 paradigm._reformInProgress |
| C2 | L1 `_applyDelay` 倒数·非 effectiveTurn | §5 _kjpL7StartRamping 写 `paradigm._applyDelay = outcome.rampUpYears` |
| C3 | L1 `_reformChronicle` dict by year | §5.4 _kjpL7AppendReformChronicleStub·L8 LLM 真填 |
| C4 | L4 `_kjpAccumReformLean` writer 复用 | §7 chars impact 直 call |
| C5 | L2 `_kjpClassifyDiffTags` (20+ tag) 非自分 | `_kjpL7AppendHistory` tags 字段直读 |
| C6 | F4c `_ty3_phase12_onAccusationApproved` chain | extreme F4 spawn 后·准奏弹劾走 F4c 现 chain·natural escalation |

#### D 错引·5 项

| # | 改 | 落地 |
|---|---|---|
| D1 | `_cc2_pushAgendaSource(out, seen, ...)` 3 args | `tm-chaoyi.js` L7 段调用 |
| D2 | memorial schema 无 attackTargets | `tm-keju-reform-memorial.js` 内 memorial obj·只 leader/cosigners·LLM 改写自然推 target |
| D3 | detail slice(0, 110) 避 _cc2_cleanAgendaText 截 | `_kjL7BuildMemorialDetail` 内主动 slice |
| D4 | F2 字段对齐·mentor → reformId·leaderDisciple → leaderOpposer | memorial obj shape 跟 F2 镜像但 reform-specific |
| D5 | F2 cooldown per-mentor → per-reformId | `GM._kjReformMemorialCooldown[hist.id]` |

---

## §18·post-L7·解锁状态

| 依赖 L7 | 状态 |
|---|---|
| **L4·g1 真生效** | ✅ reputation chip 'unaudited' → 'reliable'/'mixed'/'unreliable' 真生效·matured 后 |
| **L1 `_kjpLintAgainstStage1`** | ✅ stub 真填·9 invariant·L7 apply 前 lint check + warn 不阻塞 |
| **L8 LLM 演化推演** | ⏳ 留 hook·history.diff + history.cedui 入 prompt·_reformChronicle text 真填 |
| **L11 rollback** | ⏳ history.prev / next + status state 真撤销前 reform·data 全在 |
| **L12 改革 timeline UI** | ⏳ history visualization·data 全在 |
| **L18 科举志** | ⏳ _reformChronicle dict + history + LLM 改革者传记 |

---

## §19·候选·next step

- **A·~~Round AA 三层 audit~~** (✅ done·见 §20)
- **B·~~Round BB 深 audit~~** (✅ done·见 §21)
- **C·~~doc v5 → v7 update~~** (✅ done·本 doc)
- **D·ship 1.2.6.5·tracking L3 + L4 + L7 一并 ship** (await user pass) ← 推荐
- **E·开 L5·LLM 反对奏疏** (L-A Release 剩 slice)
- **F·开 L6·LLM 推荐自定义新 subject** (L-A Release 剩 slice)
- **G·Round CC·再深 (若 user 觉 AA+BB 还不够·diminishing returns 已近)** | 不建议

---

## §20·Round AA + RAA 全修·对照表

### 20.1·audit 12 项·真 8 BUG + 4 false alarm

| ID | severity | 内容 | 类 | 状态 |
|---|---|---|---|---|
| **A1+C5** | critical | overlap reject·resistanceMultiplier 已 boost 不回滚 + confirm throw fallback | BUG | ✅ 修·`_kjpL7CheckOverlapAccept` snapshot + restore + try/catch |
| **A2/C2** | high | save/load·_reformInProgress 不在 _prepareGMForSave | (audit false alarm) | ❌ **non-issue**·`saveData.gameState=deepClone(GM)` 全 clone GM·三字段自动 save (paradigm.js doc 误导) |
| **A3+B3** | mid | restoration paradigm 重·_reformInProgress 指 stale histId·串 | BUG | ✅ 修·`_kjpL7ApplyDiffToParadigm` restoration 后·查 history 找 stale·清 _reformInProgress + _applyDelay |
| **A4** | mid | overlap stacked·subjects sum>200 lint 跨 reform 计漏 | (audit false alarm) | ❌ **non-issue**·L7 apply 是 instant·paradigm.subjects 已含前次 added·lint 自动看到 |
| **A5** | cosmetic | matured '30 年' 硬码 | cosmetic | (skip·非 BUG·若 L8 演化推真 30 年评价仍合·留) |
| **B1** | critical | endTurn pipeline 两路双跑·spawn 重复 | BUG | ✅ 修·`_kjpL7TickRampingReform` 加 `_lastL7TickTurn` idempotent guard·同 turn skip |
| **B2** | critical | _kjpL7TickRampingReform status 转换无 guard·legacy replay 双写 | BUG | ✅ 修·ramping→active 检 `entry.status === 'ramping'`·active→matured 检 `entry.status === 'active'` |
| **B4** | mid | prestige onMatured tick 重写 / 双加 | BUG | ✅ 修·entry._maturedPrestigeApplied 标·skip 二次加 |
| **B5** | mid | memorial cooldown 跨 ramping/active 5 turn 不合理 | BUG | ✅ 修·`tm-keju-reform-memorial.js` 加 COOLDOWN_TURNS_ACTIVE=15·active 状态延长 |
| **B6** | mid | _kjpL7DeriveCharsDeltas council 落 default·非显式 | BUG | ✅ 修·显式 council 分支·default 留未知 method fallback |
| **B7** | mid | archetype regex 单点·narrative format 变 → 全 default A3 | BUG | ✅ 修·fallback 1·entry._archetype 兜底·fallback 2·调 `_kjpInferAdvisorArchetype(npc)` 派生 |
| **C1** | high | overlap 叠加后 _applyDelay 虚高 | BUG | ✅ 修·A1+C5 snapshot/restore 一起解 + matured 时 _applyDelay=0 |
| **C3** | mid | matured 时只 clear _reformInProgress 没 clear _applyDelay | BUG | ✅ 修·matured 时 `_applyDelay = 0` |
| **C4** | mid | 两路 trigger·MAX_SPAWN_PER_TURN=1 保 spawn 不保 cooldown | (audit false alarm) | ❌ **non-issue**·`_kjSpawnReformMemorial` 内 cooldown check·两路调 → 第二次 cooldown 阻 |
| **C5** | mid | confirm 失败 fallback·resistanceMultiplier 不回滚 | BUG | ✅ 修·跟 A1 合·snapshot restore (try/catch) |

**total·12 项 → 真 8 BUG·4 false alarm**·均 ✅ 修。

### 20.2·smoke·+19 RAA case

| § | 内容 | case |
|---|---|---|
| §RAA | A1·overlap reject snapshot restore·C5·confirm throw fallback·B1·idempotent guard·B2·status guard·B4·_maturedPrestigeApplied·C3·_applyDelay=0·A3+B3·stale ip 清·B5·active cooldown 15 turn·B6·council 显式分支 | **+19** |

**total·144/144 PASS·零 fail**·全 regression (L1·95·L2·115·L3·107·L4·107·L7·144) **零回归**。

### 20.3·改的真实文件 (v6)

| 文件 | 改 |
|---|---|
| `web/tm-keju-reform-apply.js` | +B1 idempotent guard / +B2 status guard / +B4 _maturedPrestigeApplied / +C3 _applyDelay=0 / +A3+B3 stale ip clear / +B6 council 显式分支 / +A1+C5 snapshot restore·~30 行 |
| `web/tm-keju-reform-memorial.js` | +B5 COOLDOWN_TURNS_ACTIVE·~3 行 |
| `web/tm-keju-paradigm-panel.js` | +B7 fallback chain (_archetype + _kjpInferAdvisorArchetype)·~15 行 |
| `scripts/smoke-l7-apply-reform.js` | +§RAA 19 case·~100 行·+§F bump turn 2 行 |

---

## §21·Round BB + RBB 全修·对照表

### 21.1·audit 8 项·真 6 BUG + 2 false alarm (cosmetic/non-issue)

| ID | severity | 内容 | 类 | 状态 |
|---|---|---|---|---|
| **BB-A1+C1** | HIGH | sourceId/digest slice 40 → multi-reform 同前 40 char collision | BUG | ✅ 修·panel.js cedui sourceId slice 40 → 80·`tm-keju-reform-apply.js` backfill key slice 40 → 80·multi-consult 自 dedup 仍 40 (不影响 cedui) |
| **BB-A2** | HIGH | save/load·_reformInProgress 三字段不在 _prepareGMForSave | false alarm | ❌ **non-issue**·`saveData.gameState=deepClone(GM)` 全 clone GM·三字段在 paradigm 内·自动 save |
| **BB-A3** | MID | dead NPC forecast backfill·write to dead npc reputation | BUG | ✅ 修·`_kjpL7BackfillForecastsForReform` 加 `if (npc.alive===false || npc._exiled || npc._imprisoned) return;` |
| **BB-B1** | HIGH | overlap rejected·_kjpL7ApplyCharsImpact 仍跑·user 取消该 zero impact | BUG | ✅ 修·`_kjReformKeyiCallback` overlap reject 后 early return + chronicle 写 'keju-reform-cancel-overlap' (user 知) |
| **BB-B2** | LOW | council pass 致仕逻辑 | false alarm | ❌ **non-issue**·condition `resistanceMultiplier>=1.5`·council=1·不触·OK |
| **BB-B3** | LOW | dead NPC decay waste cycle | non-harmful | ❌ **non-issue**·若 dead NPC 无 _kjpReformLean·skip·OK |
| **BB-C2** | MID | entry.diff 永存·history 多 → save size 涨 | BUG | ✅ 修·matured 时 `entry.diff = null; entry._diffPruned = true;`·留 digest/tags/outcome |
| **BB-D2** | LOW | defy label '断然' 含义模糊·与 _keyiPersistToCourtRecords '逆众议' 不一致 | BUG | ✅ 修·`_kjpL7MethodLabel` defy='逆众议' |
| **BB-D3** | LOW | chronicle ID 'reform_1627_0' 英文·user 看怪 | BUG | ✅ 修·active / matured / retirement 三 chronicle 改"X 年改科举·..."·英文 ID 留 entry.reformId 内部 ref |

**total·8 项 → 真 6 BUG fix + 2 false alarm**·均 ✅ 修。

### 21.2·smoke·+15 RBB case

| § | 内容 | case |
|---|---|---|
| §RBB | BB-A3·dead NPC + _imprisoned skip·BB-A1·digest slice 80 不撞·BB-B1·overlap reject zero impact + cancel chronicle·BB-C2·matured diff prune·BB-D2·defy=逆众议·BB-D3·chronicle 中文化 | **+15** |

**total·159/159 PASS·零 fail**·全 regression (L1·95·L2·115·L3·107·L4·107·L7·159) **零回归**。

### 21.3·改的真实文件 (v7)

| 文件 | 改 |
|---|---|
| `web/tm-keju-reform-apply.js` | +BB-A3 alive guard / +BB-A1 digest 80 / +BB-B1 overlap early return + cancel chronicle / +BB-C2 matured prune / +BB-D2 逆众议 / +BB-D3 中文化·~25 行 |
| `web/tm-keju-paradigm-panel.js` | +BB-A1 sourceId slice 80 (upsert + findBySource)·~4 行 |
| `scripts/smoke-l7-apply-reform.js` | +§RBB 15 case·~100 行 |
