#!/usr/bin/env node
// smoke-minxin-ledger-six-stage.js - unified minxin ledger, matrix, perception, uprising, integrations, UI hooks.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function load(name, sandbox) {
  const file = path.join(ROOT, name);
  assert(fs.existsSync(file), name + ' should exist');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: name });
}

const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: fn => { if (typeof fn === 'function') fn(); return 1; },
  clearTimeout() {},
  addEB() {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture() {}, captureSilent() {} } };
sandbox.IntegrationBridge = {
  getLeafDivisions(adminHierarchy) {
    const out = [];
    function walk(nodes) {
      (Array.isArray(nodes) ? nodes : []).forEach(node => {
        if (!node || typeof node !== 'object') return;
        const kids = node.children || node.divisions || node.subs || [];
        if (kids.length) walk(kids);
        else out.push(node);
      });
    }
    Object.keys(adminHierarchy || {}).forEach(k => walk((adminHierarchy[k] || {}).divisions || []));
    return out;
  },
  aggregateRegionsToVariables() {}
};
sandbox.GM = {
  turn: 33,
  classes: [
    { id: 'farmers', name: 'Farmers', satisfaction: 36, influence: 70, size: '70%', regionalVariants: [{ region: 'Canal Ward', satisfaction: 32 }] },
    { id: 'scholars', name: 'Scholars', satisfaction: 58, influence: 55, size: '8%' }
  ],
  corruption: { trueIndex: 72, perceivedIndex: 48 },
  minxin: { trueIndex: 50, perceivedIndex: 58, byRegion: {}, byClass: {}, sources: {}, uprisingCandidates: [] },
  adminHierarchy: {
    player: {
      divisions: [
        { id: 'canal', name: 'Canal Ward', minxin: 45, minxinLocal: 45, population: 10000, minxinDetails: { trueIndex: 45 } },
        { id: 'mountain', name: 'Mountain County', minxin: 22, minxinLocal: 22, population: 5000, minxinDetails: { trueIndex: 22 } }
      ]
    }
  },
  _pendingTinyiTopics: []
};

vm.createContext(sandbox);
load('tm-minxin-ledger.js', sandbox);

const ML = sandbox.TM.MinxinLedger;
assert(ML && typeof ML.recordAndApply === 'function', 'TM.MinxinLedger.recordAndApply should exist');
assert(typeof ML.rebuildMatrix === 'function', 'TM.MinxinLedger.rebuildMatrix should exist');
assert(typeof ML.updatePerception === 'function', 'TM.MinxinLedger.updatePerception should exist');
assert(typeof ML.advanceUprisingChain === 'function', 'TM.MinxinLedger.advanceUprisingChain should exist');
assert(typeof ML.diagnosticsText === 'function', 'TM.MinxinLedger.diagnosticsText should exist');

const result = ML.recordAndApply(sandbox.GM, {
  sourceSystem: 'fiscal',
  kind: 'taxation',
  targetRegions: ['Canal Ward'],
  targetClasses: ['Farmers'],
  deltaTrue: -4,
  intensity: 0.8,
  confidence: 0.9,
  reason: 'emergency levy hit Canal Ward Farmers',
  linkedIssue: 'issue-levy'
}, { turn: 33, source: 'smoke-six-stage' });

assert(result && result.applied, 'recordAndApply should apply signal');
assert(sandbox.GM._minxinLedger.items.length === 1, 'ledger should store one signal');
assert(sandbox.GM._minxinLedger.items[0].applied === true, 'ledger row should be marked applied');
const canal = sandbox.GM.adminHierarchy.player.divisions[0];
const mountain = sandbox.GM.adminHierarchy.player.divisions[1];
assert(canal.minxin === 41 && canal.minxinDetails.trueIndex === 41, 'regional true minxin should be written back to division');
assert(mountain.minxin === 22, 'unaffected region should not move');
assert(sandbox.GM.minxin.sources.taxation === -4, 'source accumulator should record taxation delta');

ML.maintain(sandbox.GM, { turn: 33, source: 'smoke-maintain' });
assert(sandbox.GM.minxin.matrix, 'matrix should exist');
assert(sandbox.GM.minxin.matrix.canal && sandbox.GM.minxin.matrix.canal.farmers, 'matrix should include explicit region/class pair');
assert(sandbox.GM.minxin.matrix.canal.scholars, 'matrix should infer missing class pair dynamically');
assert(sandbox.GM.minxin.byClass.farmers && sandbox.GM.minxin.byClass.farmers.true < 50, 'byClass aggregate should reflect farmer pressure');
assert(sandbox.GM.minxin.byRegion.canal && sandbox.GM.minxin.byRegion.canal.true === 41, 'byRegion should mirror true division value');
assert(sandbox.GM.minxin.perceivedIndex > sandbox.GM.minxin.trueIndex, 'corruption should bias perceived minxin above truth');
assert(sandbox.GM.minxin.visibilityTier !== 'accurate', 'visibility tier should show imperfect court view');
assert((sandbox.GM.minxin.uprisingChain || []).some(x => x.region === 'Mountain County' && x.level >= 1), 'low local minxin should create an uprising chain entry');

load('tm-class-minxin-bridge.js', sandbox);
assert(sandbox.TM.ClassMinxinBridge && typeof sandbox.TM.ClassMinxinBridge.applyClassPressure === 'function', 'class-minxin bridge should load');
sandbox.TM.ClassMinxinBridge.applyClassPressure(sandbox.GM, {
  turn: 33,
  sourceSystem: 'social-political-signal',
  sourceId: 'sig-class-pressure',
  className: 'Farmers',
  satisfactionDelta: -10,
  regionWeights: [{ region: 'Canal Ward', weight: 1 }],
  linkedIssue: 'issue-levy',
  reason: 'class pressure should feed minxin ledger'
});
assert(sandbox.GM._minxinLedger.items.some(x => x.kind === 'class-pressure' && /class pressure should feed/.test(x.reason)), 'class bridge should record into unified minxin ledger');
assert(sandbox.GM.minxin.matrix.canal.farmers.lastReason && /class pressure should feed/.test(sandbox.GM.minxin.matrix.canal.farmers.lastReason), 'matrix should retain latest class pressure reason');

const diag = ML.diagnosticsText(sandbox.GM, { limit: 8 });
assert(/Minxin Ledger Diagnostics/.test(diag), 'diagnostics should identify minxin ledger');
assert(/emergency levy hit Canal Ward Farmers/.test(diag), 'diagnostics should include ledger reason');
assert(/Mountain County/.test(diag) && /uprisingChain/.test(diag), 'diagnostics should include uprising chain');
assert(/issue-levy/.test(ML.formatForPrompt(sandbox.GM, { limit: 8 })), 'prompt formatter should include linked issue');

const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(index.indexOf('tm-minxin-ledger.js') > 0, 'index should load tm-minxin-ledger.js');
assert(index.indexOf('tm-minxin-ledger.js') < index.indexOf('tm-class-minxin-bridge.js'), 'minxin ledger should load before class-minxin bridge');
assert(index.indexOf('tm-minxin-ledger.js') < index.indexOf('tm-authority-engines.js'), 'minxin ledger should load before authority engines');

const authSource = fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8');
assert(/TM\.MinxinLedger\.recordAndApply/.test(authSource), 'AuthorityEngines.adjustMinxin should route through MinxinLedger');

const railSource = fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8');
assert(/Minxin Ledger/.test(railSource), 'right rail debug panel should expose Minxin Ledger');

const topbarSource = fs.readFileSync(path.join(ROOT, 'tm-topbar-vars.js'), 'utf8');
assert(/_renderMinxinLedgerCauses/.test(topbarSource), 'topbar minxin panel should render ledger causes');

console.log('[smoke-minxin-ledger-six-stage] PASS unified minxin six-stage implementation');
