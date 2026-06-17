#!/usr/bin/env node
// smoke-loyalty-attribution.js - locks attributable character loyalty changes.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  assertions++;
}

function fakeEl() {
  return {
    value: '',
    style: {},
    innerHTML: '',
    textContent: '',
    appendChild(){},
    remove(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    classList: { add(){}, remove(){} }
  };
}

const context = {
  console,
  Date,
  JSON,
  Math,
  RegExp,
  Array,
  Object,
  String,
  Number,
  Boolean,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  setTimeout(){},
  clearTimeout(){},
  document: {
    getElementById: () => fakeEl(),
    querySelectorAll: () => [],
    createElement: () => fakeEl(),
    body: fakeEl(),
    addEventListener(){}
  },
  window: null,
  globalThis: null,
  TM: { errors: { capture(){}, captureSilent(){}, getLog(){ return []; } } },
  P: { ai: {}, conf: {}, variables: [] },
  scriptData: {},
  GM: {
    turn: 1,
    chars: [],
    allCharacters: [],
    turnChanges: {},
    _turnReport: [],
    evtLog: []
  },
  addEB(type, text) { context.GM.evtLog.push({ type, text }); },
  _dbg(){},
  toast(){},
  alert(){},
  autoSave(){},
  escHtml(v) { return String(v == null ? '' : v); },
  getTSText(turn) { return 'T' + turn; }
};

context.window = context;
context.globalThis = context;
context.findCharByName = function(name) {
  return (context.GM.chars || []).find(ch => ch && ch.name === name) || null;
};

vm.createContext(context);

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

load('tm-utils.js');
load('tm-ai-change-pathutils.js'); load('tm-ai-change-army.js'); load('tm-ai-change-narrative.js'); load('tm-ai-change-applier.js');

context.GM.chars = [
  { name: 'A', loyalty: 0, alive: true },
  { name: 'B', loyalty: 50, alive: true }
];
context.GM.allCharacters = [
  { name: 'A', loyalty: 0, relationValue: 0 },
  { name: 'B', loyalty: 50, relationValue: 50 }
];

let r = context.adjustCharacterLoyalty('A', -5, '', { source: 'smoke-missing' });
assert(r && r.blocked, 'missing reason should block loyalty delta');
assert(context.GM.chars[0].loyalty === 0, 'blocked delta must not mutate loyalty 0');
assert(Array.isArray(context.GM._loyaltyBlocked) && context.GM._loyaltyBlocked.length === 1, 'blocked delta should be logged');

r = context.adjustCharacterLoyalty('A', 5, '\u6709\u529F\u53D7\u8D4F', { source: 'smoke-award' });
assert(r.ok && context.GM.chars[0].loyalty === 5, 'reasoned non-AI delta should mutate from true zero');
assert(context.GM.allCharacters[0].loyalty === 5, 'allCharacters mirror should sync');
assert(context.GM.turnChanges.characters.some(c => c.name === 'A' && c.changes.some(x => x.field === 'loyalty' && x.oldValue === 0 && x.newValue === 5)), 'reasoned delta should record turnChanges');
assert(context.GM.chars[0]._memory.some(m => /忠诚变化/.test(m.event) && /有功受赏/.test(m.event)), 'reasoned delta should write loyalty memory');
assert(context.GM._memoryArchiveFull.some(m => m.char === 'A' && /有功受赏/.test(m.event)), 'loyalty memory should enter full archive');

r = context.adjustCharacterLoyalty('A', 5, '', { source: 'smoke-ai-award', ai: true });
assert(r.ok && context.GM.chars[0].loyalty === 10 && r.reason === 'AI\u63A8\u6F14', 'AI delta without reason should use default reason');

r = context.adjustCharacterLoyalty('B', 3, '\u540C\u6E90\u4E00\u56DE\u5408', { source: 'same-source', oncePerTurn: true, ai: true });
assert(r.ok && context.GM.chars[1].loyalty === 53, 'first oncePerTurn delta should apply');
r = context.adjustCharacterLoyalty('B', 3, '\u540C\u6E90\u4E00\u56DE\u5408', { source: 'same-source', oncePerTurn: true, ai: true });
assert(r.ok && r.duplicate && context.GM.chars[1].loyalty === 53, 'duplicate oncePerTurn source should skip');

r = context.setCharacterLoyalty('B', 95, '\u4E0A\u9650\u9632\u8DF3', { source: 'set-cap', maxJump: 20 });
assert(r.ok && context.GM.chars[1].loyalty === 73, 'absolute set should respect maxJump');

const beforeSetB = context.GM.chars[1].loyalty;
r = context.setCharacterLoyalty('B', 99, '', { source: 'set-missing' });
assert(r && r.blocked && context.GM.chars[1].loyalty === beforeSetB, 'direct absolute set without reason should be blocked');

const applier = context.AIChangeApplier;
const beforeA = context.GM.chars[0].loyalty;
r = applier.applyPathDelta(context.GM, 'chars.A.loyalty', 10, '');
assert(r.ok && context.GM.chars[0].loyalty === beforeA + 10, 'AI anyPath delta without reason should apply with default reason');

r = applier.applyPathDelta(context.GM, 'chars.A.loyalty', 10, '\u4EFB\u52A1\u6709\u529F');
assert(r.ok && context.GM.chars[0].loyalty === beforeA + 20, 'AI anyPath delta with reason should apply');

const afterDeltaA = context.GM.chars[0].loyalty;
r = applier.applyPathSet(context.GM, 'chars.A.loyalty', 80, '');
assert(r.ok && context.GM.chars[0].loyalty === afterDeltaA + 20, 'AI anyPath set without reason should cap jump');

const afterSetA = context.GM.chars[0].loyalty;
r = applier.applyPathSet(context.GM, 'chars.A.loyalty', 80, '\u91CD\u5927\u4EBA\u4E8B\u53D8\u52A8');
assert(r.ok && context.GM.chars[0].loyalty === afterSetA + 20, 'AI anyPath set with reason should cap jump');

const beforeCharUpdateB = context.GM.chars[1].loyalty;
applier.applyAITurnChanges({ char_updates: [{ name: 'B', updates: { loyalty: 99 } }] });
assert(context.GM.chars[1].loyalty === beforeCharUpdateB + 20, 'AI char_update loyalty without reason should cap jump');

applier.applyAITurnChanges({ char_updates: [{ name: 'B', reason: '\u5B98\u804C\u5927\u53D8', updates: { loyalty: 99 } }] });
assert(context.GM.chars[1].loyalty === 99, 'AI char_update loyalty with reason should finish capped set');

console.log('[smoke-loyalty-attribution] pass assertions=' + assertions);
