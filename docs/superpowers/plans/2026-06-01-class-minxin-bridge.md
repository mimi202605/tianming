# Class Minxin Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect class satisfaction/unrest with the existing minxin true ledger, without collapsing minxin into a single public score or double-counting the same pressure.

**Architecture:** Add a small bridge module between the existing class engine and the existing authority/minxin engine. The bridge first keeps `GM.minxin.byClass` synchronized with `GM.classes[]`; then it records bounded, deduplicated class-pressure deltas into regional `div.minxin` leaves where evidence exists, letting `IntegrationBridge.aggregateRegionsToVariables()` remain the source of global `GM.minxin.trueIndex`.

**Tech Stack:** Vanilla browser JavaScript under the `TM` namespace, existing `GM` runtime state, existing `IntegrationBridge`, `AuthorityEngines`, `TM.ClassEngine`, `TM.SocialPoliticalSignals`, smoke scripts run by Node.

---

## Research Summary

Current minxin already has a true-account spine:

- `web/tm-authority-engines.js`: `GM.minxin.trueIndex/perceivedIndex/phase/sources/byRegion/byClass/revolts`; `AuthorityEngines.adjustMinxin()` writes the true ledger and spreads deltas to player leaf divisions.
- `web/tm-integration-bridge.js`: `IntegrationBridge.getLeafDivisions()` and `aggregateRegionsToVariables()` aggregate leaf `div.minxin` into global trueIndex and region mirrors.
- `web/tm-endturn-ai.js`: prompts already include global minxin, `GM.minxin.byClass`, minxin sources, and local administrative minxin.
- `web/tm-endturn-province.js` and `web/phase8-formal-map.js`: local `div.minxin` already drives stability/unrest and map mood display.

Current class system has a separate political-social spine:

- `web/tm-class-engine.js`: `classes[].satisfaction`, `influence`, `demands`, `unrestLevels`, `revoltState`, `supportingParties`, `regionalVariants`.
- `web/tm-social-political-signals.js`: player/runtime/turn-result signals can move class satisfaction and unrest.
- `web/tm-party-class-action-scheduler.js`: class/party actor actions become signals and now feed court issues.
- `web/tm-party-class-llm-calibrator.js`: LLM player-action calibration can update class fields.

Main gap:

- `classes[].satisfaction/unrestLevels` and `GM.minxin.byClass.*.index` coexist, but they are not one account.
- Class pressure does not yet write local `div.minxin`, `provinceStats.stability/unrest`, or regional map support.
- Local `div.minxin` can trigger minxin revolts, but low local minxin is not reliably fed back into class pressure because `readLocalRevoltRisk()` misses `adminHierarchy` leaves.

Design rule from `C:\Users\37814\Desktop\工作方案\设计方案-民心系统.md`:

- Preserve true vs perceived minxin.
- Preserve region x class detail.
- Treat minxin as physical consequences: tax efficiency, conscription, fugitives, rumors, local defection, uprising chain.
- Avoid free "raise minxin" buttons; all interventions must have cost and trace.

---

## File Map

- Create: `web/tm-class-minxin-bridge.js`
  - Owns class key normalization, `GM.minxin.byClass` sync, class-pressure ledger, regional minxin application, prompt formatting, and diagnostics.

- Create: `web/scripts/smoke-class-minxin-bridge.js`
  - Red-green smoke for byClass sync, regional leaf minxin writeback, dedupe, and prompt evidence.

- Modify: `web/index.html`
  - Load `tm-class-minxin-bridge.js` after `tm-authority-engines.js` / `tm-class-engine.js` and before systems that consume bridge summaries.

- Modify: `web/tm-class-engine.js`
  - Call the bridge after `applyClassChange()`, `applyPartyOutcomeToClasses()`, `refreshClassPhase()`, and `finalizeTurn()`.

- Modify: `web/tm-social-political-signals.js`
  - Improve `readLocalRevoltRisk()` to read `GM.adminHierarchy` leaf minxin.
  - Call the bridge after deterministic class impacts, with signal IDs for dedupe.

- Modify: `web/tm-party-class-llm-calibrator.js`
  - After LLM class updates, call the bridge with a calibration source key so player-action class changes can be reflected in minxin.

- Modify: `web/tm-endturn-ai.js` or `web/tm-endturn-core.js`
  - Add `TM.ClassMinxinBridge.formatForPrompt()` to the turn prompt.

- Modify: `web/tm-var-drawers.js`
  - Show class-minxin divergence: class satisfaction, minxin.byClass true/perceived, nearest regional pressure, last cause.

- Optional later: `web/phase8-formal-map.js`
  - Add a class-pressure map overlay once the ledger is stable.

---

## Stage Goals

### Stage 1: Shared Ledger, No Regional Damage Yet

Build `TM.ClassMinxinBridge.syncByClass(root)` so `GM.minxin.byClass` mirrors `GM.classes[]` with trace fields:

```js
GM.minxin.byClass[classKey] = {
  index: 42,
  true: 42,
  perceived: 50,
  className: 'Canal Tenants',
  satisfaction: 42,
  influence: 62,
  unrestPhase: 'brewing',
  demand: 'reduce emergency levy',
  populationShare: 0.18,
  lastSyncTurn: 52,
  source: 'class-minxin-bridge'
};
```

This stage must not change `div.minxin`. It only prevents the two class ledgers from drifting silently.

### Stage 2: Bounded Class Pressure Into Local Minxin

Add `TM.ClassMinxinBridge.applyClassPressure(root, payload)`:

```js
TM.ClassMinxinBridge.applyClassPressure(GM, {
  className: 'Canal Tenants',
  satisfactionDelta: -8,
  unrestDelta: { grievance: -4, petition: -3 },
  linkedIssue: 'issue-levy',
  regionWeights: [{ region: 'Huai'an', weight: 0.7 }],
  sourceSystem: 'social-political-signal',
  sourceId: 'signal-52-7',
  reason: 'tax pressure'
});
```

Rules:

- Deduplicate by `sourceSystem/sourceId/classKey/turn`.
- Cap each class source to `abs(globalEquivalentDelta) <= 2` per turn.
- Prefer `classes[].regionalVariants` or payload `regionWeights` for local leaf writes.
- If no region evidence exists, only update `GM.minxin.byClass`; do not blindly punish every province.
- When writing local leaves, write `div.minxin`, then call `IntegrationBridge.aggregateRegionsToVariables()`; do not directly overwrite `GM.minxin.trueIndex`.
- Skip reverse propagation for sources already derived from minxin, such as `local-revolt-risk`, unless the payload explicitly says `allowMinxinFeedback: true`.

### Stage 3: Local Minxin Feeds Class Pressure

Upgrade `readLocalRevoltRisk()` and add a bridge snapshot so low `div.minxin` can become class pressure:

- `div.minxin < 45`: creates class social-political pressure.
- `div.minxin < 30`: favors tenant/peasant/soldier/refugee classes if tags match region economy or population keys.
- `div.minxin < 25`: can push `revoltState` toward brewing, but should not directly duplicate `GM.minxin.revolts`.

### Stage 4: Prompt And UI Visibility

Expose cause chains:

- Turn prompt section: `=== Class Minxin Bridge ===`.
- Top minxin drawer: show byClass rows with class satisfaction, true/perceived minxin, difference, last source.
- Right rail class cards: add "民心账" near cause, only as explanation, not as direct player control.

### Stage 5: Court/Uprising Hooks

Only after the bridge is stable:

- Low class-minxin divergence creates `_pendingTinyiTopics`.
- Brewing/uprising class pressure can become `GM.minxin.uprisingCandidates`, then later merge with existing `GM.minxin.revolts`.
- Keep `revolts` and future `uprisings` compatible; do not rename public state in this stage.

---

## Task 1: Red Smoke For Bridge Contract

**Files:**
- Create: `web/scripts/smoke-class-minxin-bridge.js`
- Create later: `web/tm-class-minxin-bridge.js`

- [ ] **Step 1: Write the failing smoke**

The smoke should load `tm-class-minxin-bridge.js` after it exists and assert:

```js
const root = {
  turn: 61,
  minxin: {
    trueIndex: 66,
    perceivedIndex: 72,
    byClass: {
      tenants: { index: 70, perceived: 74 }
    },
    sources: {}
  },
  adminHierarchy: {
    player: {
      divisions: [{
        name: 'Huai River Circuit',
        children: [
          { name: 'Canal North', minxin: 58, population: { mouths: 100000 }, children: [] },
          { name: 'Canal South', minxin: 62, population: { mouths: 100000 }, children: [] }
        ]
      }]
    }
  },
  classes: [{
    name: 'Canal Tenants',
    key: 'tenants',
    satisfaction: 38,
    influence: 61,
    demands: 'reduce emergency levy',
    regionalVariants: [{ region: 'Canal North', weight: 1 }],
    unrestLevels: { grievance: 30, petition: 36, strike: 70, revolt: 82 },
    _populationShare: 0.24
  }]
};

const synced = Bridge.syncByClass(root, { turn: 61, source: 'smoke' });
assert(root.minxin.byClass.tenants.true === 38, 'byClass true should mirror class satisfaction');
assert(root.minxin.byClass.tenants.index === 38, 'legacy index should mirror true value for current UI');
assert(synced.divergences.length === 1, 'sync should report old minxin/class divergence');

const applied = Bridge.applyClassPressure(root, {
  turn: 61,
  sourceSystem: 'smoke',
  sourceId: 'sig-tenant-tax-1',
  className: 'Canal Tenants',
  satisfactionDelta: -10,
  regionWeights: [{ region: 'Canal North', weight: 1 }],
  linkedIssue: 'issue-levy',
  reason: 'heavy levy pressure'
});

assert(applied.appliedRegions.length === 1, 'regional class pressure should hit matching leaf');
assert(root.adminHierarchy.player.divisions[0].children[0].minxin < 58, 'local leaf minxin should fall');
assert(root.adminHierarchy.player.divisions[0].children[1].minxin === 62, 'unmatched leaf minxin should remain unchanged');
assert(root._classMinxinBridgeLedger.length === 1, 'bridge should record one ledger entry');

Bridge.applyClassPressure(root, {
  turn: 61,
  sourceSystem: 'smoke',
  sourceId: 'sig-tenant-tax-1',
  className: 'Canal Tenants',
  satisfactionDelta: -10,
  regionWeights: [{ region: 'Canal North', weight: 1 }],
  reason: 'duplicate'
});
assert(root._classMinxinBridgeLedger.length === 1, 'duplicate source should not double count');

const prompt = Bridge.formatForPrompt(root, { limit: 5 });
assert(/Class Minxin Bridge/.test(prompt), 'prompt section should exist');
assert(/Canal Tenants/.test(prompt) && /Canal North/.test(prompt), 'prompt should include class and region evidence');
```

- [ ] **Step 2: Run it red**

Run:

```powershell
node web\scripts\smoke-class-minxin-bridge.js
```

Expected: fails because `tm-class-minxin-bridge.js` does not exist or `TM.ClassMinxinBridge` is missing.

---

## Task 2: Create `TM.ClassMinxinBridge`

**Files:**
- Create: `web/tm-class-minxin-bridge.js`
- Modify: `web/index.html`

- [ ] **Step 1: Implement bridge helpers**

Core API:

```js
TM.ClassMinxinBridge = {
  syncByClass: syncByClass,
  applyClassPressure: applyClassPressure,
  snapshot: snapshot,
  formatForPrompt: formatForPrompt,
  _classKeyOf: classKeyOf,
  _resolveRegionWeights: resolveRegionWeights
};
```

Required behavior:

- `classKeyOf(cls)` prefers `cls.key`, `cls.id`, `cls.populationKeys[0]`, then normalized class name.
- `syncByClass(root, options)` updates `GM.minxin.byClass[key]` from class satisfaction, not from old `byClass` values.
- `applyClassPressure(root, payload)` writes byClass and local leaf `div.minxin` only when region evidence exists.
- `snapshot(root)` returns recent ledger rows and divergence rows.
- `formatForPrompt(root)` emits concise class-minxin rows.

- [ ] **Step 2: Load in `index.html`**

Place after authority/class primitives and before late consumers:

```html
<script src="tm-class-minxin-bridge.js"></script>
```

- [ ] **Step 3: Run smoke green**

Run:

```powershell
node --check web\tm-class-minxin-bridge.js
node web\scripts\smoke-class-minxin-bridge.js
```

Expected: syntax check passes; smoke passes.

---

## Task 3: Wire Class Engine To The Bridge

**Files:**
- Modify: `web/tm-class-engine.js`
- Test: `web/scripts/smoke-class-minxin-bridge.js`

- [ ] **Step 1: Add bridge calls after class changes**

Call after `applyClassChange()` computes `result`:

```js
if (TM.ClassMinxinBridge && typeof TM.ClassMinxinBridge.applyClassPressure === 'function') {
  TM.ClassMinxinBridge.applyClassPressure(source, {
    turn: result.turn,
    sourceSystem: options && options.source || 'class-engine',
    sourceId: ['class-change', result.turn, result.classKey, cc.reason || ''].join('|'),
    className: cls.name || cc.name,
    satisfactionDelta: result.applied.satisfaction,
    influenceDelta: result.applied.influence,
    linkedIssue: cc.linkedIssue || cc.issueId || '',
    reason: cc.reason || ''
  });
}
```

Call `syncByClass()` in `finalizeTurn()` or equivalent end-of-class lifecycle:

```js
if (TM.ClassMinxinBridge && typeof TM.ClassMinxinBridge.syncByClass === 'function') {
  TM.ClassMinxinBridge.syncByClass(source, { turn: source.turn, source: 'class-engine-finalize' });
}
```

- [ ] **Step 2: Add tests to the smoke**

Extend the smoke to load `tm-class-engine.js`, call `applyClassChange()`, and assert:

- `GM.minxin.byClass[key].true` follows class satisfaction.
- Ledger has one row.
- Repeating same class change source does not double-write local minxin.

- [ ] **Step 3: Verify**

Run:

```powershell
node --check web\tm-class-engine.js
node web\scripts\smoke-class-minxin-bridge.js
node web\scripts\smoke-party-class-closed-loop.js
```

Expected: all pass.

---

## Task 4: Wire Social Political Signals Without Feedback Loops

**Files:**
- Modify: `web/tm-social-political-signals.js`
- Test: `web/scripts/smoke-social-political-signals.js`
- Test: `web/scripts/smoke-class-minxin-bridge.js`

- [ ] **Step 1: Read local minxin from admin leaves**

Inside `readLocalRevoltRisk(root)`, add `IntegrationBridge.getLeafDivisions(root.adminHierarchy, 'player')` to the value scan.

Rule:

```js
var minxin = Number(leaf.minxin != null ? leaf.minxin : leaf.minxinLocal);
if (isFinite(minxin)) vals.push(clamp((45 - minxin) / 45, 0, 1));
```

- [ ] **Step 2: Bridge class impacts after deterministic application**

After `applyClassImpact()` mutates a class, call:

```js
if (TM.ClassMinxinBridge && typeof TM.ClassMinxinBridge.applyClassPressure === 'function') {
  TM.ClassMinxinBridge.applyClassPressure(root, {
    turn: signal.turn,
    sourceSystem: signal.sourceSystem || 'social-political-signal',
    sourceId: signal.id || [signal.turn, signal.seq, impact.name].join('|'),
    className: impact.name,
    satisfactionDelta: impact.satisfactionDelta || 0,
    unrestDelta: impact.unrestDelta || null,
    linkedIssue: signal.linkedIssue || '',
    reason: impact.reason || signal.reason || '',
    allowMinxinFeedback: !/local-revolt-risk|minxin/i.test(String(signal.kind || signal.sourceSystem || ''))
  });
}
```

- [ ] **Step 3: Verify**

Run:

```powershell
node --check web\tm-social-political-signals.js
node web\scripts\smoke-social-political-signals.js
node web\scripts\smoke-turn-result-social-political-signals.js
node web\scripts\smoke-class-minxin-bridge.js
```

Expected: all pass; low `adminHierarchy` minxin creates class pressure, but class pressure from `local-revolt-risk` does not write back again into local minxin.

---

## Task 5: Add Prompt And UI Visibility

**Files:**
- Modify: `web/tm-endturn-ai.js` or `web/tm-endturn-core.js`
- Modify: `web/tm-var-drawers.js`
- Optional Modify: `web/phase8-formal-rightrail.js`

- [ ] **Step 1: Add prompt fragment**

Use:

```js
if (typeof TM !== 'undefined' && TM.ClassMinxinBridge && typeof TM.ClassMinxinBridge.formatForPrompt === 'function') {
  var classMinxin = TM.ClassMinxinBridge.formatForPrompt(GM, { limit: 8 });
  if (classMinxin) devText += classMinxin;
}
```

- [ ] **Step 2: Add drawer rows**

In the minxin drawer, show each class row as:

```text
阶层名 true/perceived · 阶层满意 · 差额 · 最近近因
```

Do not add player direct-control buttons here. Player interventions must continue through edicts, memorial replies, court debate, and letters.

- [ ] **Step 3: Verify**

Run:

```powershell
node --check web\tm-endturn-ai.js
node --check web\tm-var-drawers.js
node web\scripts\smoke-endturn-public-contract.js
node web\scripts\smoke-phase8-party-class-nearcauses.js
```

Expected: prompt contract remains valid; class cards and minxin drawer show explainable links.

---

## Task 6: Stage Gate Before Uprising/Court Automation

**Files:**
- No new implementation until Tasks 1-5 are stable.

- [ ] **Step 1: Inspect bridge ledger after a turn smoke**

Required checks:

- `GM.minxin.byClass` matches class satisfaction.
- `GM._classMinxinBridgeLedger` explains why local minxin moved.
- `GM.minxin.trueIndex` is still aggregated from leaves.
- No source writes the same class-minxin delta twice.

- [ ] **Step 2: Only then design uprising candidate bridge**

Future object:

```js
GM.minxin.uprisingCandidates = [{
  id: 'mxuc-61-tenant-canal',
  level: 1,
  className: 'Canal Tenants',
  region: 'Canal North',
  cause: 'heavy levy pressure',
  momentum: 22,
  hidden: true,
  linkedIssue: 'issue-levy'
}];
```

This must remain a candidate queue, not instant `GM.minxin.revolts`, until the existing minxin revolt guard accepts it.

---

## Verification Matrix

Run after Stage 1-4:

```powershell
node --check web\tm-class-minxin-bridge.js
node --check web\tm-class-engine.js
node --check web\tm-social-political-signals.js
node web\scripts\smoke-class-minxin-bridge.js
node web\scripts\smoke-social-political-signals.js
node web\scripts\smoke-turn-result-social-political-signals.js
node web\scripts\smoke-party-class-closed-loop.js
node web\scripts\smoke-party-class-action-scheduler.js
node web\scripts\smoke-party-class-action-tinyi-bridge.js
node web\scripts\smoke-endturn-public-contract.js
```

Manual inspection targets:

- Minxin drawer: byClass rows do not contradict class cards.
- Map mood layer: regional minxin moves only where region evidence exists.
- Turn prompt: AI sees both class satisfaction and class-minxin bridge ledger.

---

## Decisions Locked For This Stage

- `GM.minxin.trueIndex` remains derived from leaf `div.minxin` via `IntegrationBridge.aggregateRegionsToVariables()`.
- `classes[].satisfaction` is the runtime truth for class mood; `GM.minxin.byClass` becomes a minxin-facing projection plus perception layer.
- No direct player buttons like "扶/压/调" are added for class-minxin. Player influence remains through formal routes.
- `publicOpinion` stays faction/local opinion unless a later spec defines conversion to minxin.
- `uprisings` will not replace `revolts` in this stage; add compatibility later.

## Open Questions

- Should `GM.minxin.byClass[key].perceived` be biased by local corruption, central supervision, or both?
- Should class pressure without regional evidence update only `byClass`, or apply a tiny global leaf delta through `AuthorityEngines.adjustMinxin()`?
- Should `regionalVariants` be authored per class in editor before full local propagation becomes default?
