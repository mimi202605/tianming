#!/usr/bin/env node
// smoke-huangquan-attribution.js - locks attributable huangquan changes.

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
  window: null,
  globalThis: null,
  TM: { errors: { capture(){}, captureSilent(){}, getLog(){ return []; } } },
  P: { ai: {}, conf: {}, variables: [] },
  GM: {
    sid: 'smoke',
    turn: 1,
    chars: [],
    turnChanges: {},
    huangquan: {
      index: 50,
      phase: 'moderate',
      trend: 'stable',
      sources: {},
      drains: {},
      ministers: {},
      history: { purges: [], reforms: [] }
    },
    evtLog: []
  },
  addEB(type, text) { context.GM.evtLog.push({ type, text }); },
  findScenarioById() { return null; }
};

context.window = context;
context.globalThis = context;
vm.createContext(context);

const code = fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8');
vm.runInContext(code, context, { filename: 'tm-authority-engines.js' });

assert(context.AuthorityEngines && typeof context.AuthorityEngines.adjustHuangquan === 'function', 'adjustHuangquan should export');
assert(typeof context.AuthorityEngines.setHuangquan === 'function', 'setHuangquan should export');

let r = context.AuthorityEngines.adjustHuangquan('personalRule', 5, '');
assert(r && r.blocked, 'missing reason should block huangquan delta');
assert(context.GM.huangquan.index === 50, 'blocked huangquan delta should not mutate');
assert(Array.isArray(context.GM._authorityBlocked) && context.GM._authorityBlocked.length === 1, 'blocked huangquan delta should be logged');

r = context.AuthorityEngines.adjustHuangquan('personalRule', 5, '\u5bc6\u8bcf\u89c1\u6548');
assert(r.ok && context.GM.huangquan.index === 55, 'reasoned delta should mutate huangquan');
assert(Array.isArray(context.GM.turnChanges.variables), 'reasoned delta should create turnChanges.variables');
let entry = context.GM.turnChanges.variables.find(v => v.path === 'huangquan.index');
assert(entry && entry.name === '\u7687\u6743', 'turnChanges should record huangquan label/path');
assert(entry.oldValue === 50 && entry.newValue === 55, 'turnChanges should keep old/new huangquan values');
assert(entry.reasons.some(x => /\u5bc6\u8bcf\u89c1\u6548/.test(x.desc)), 'turnChanges should record huangquan reason');

r = context._adjAuthority('huangquan', -3);
assert(r && r.blocked, '_adjAuthority huangquan without reason should block');
assert(context.GM.huangquan.index === 55, 'blocked legacy huangquan delta should not mutate');

r = context._adjAuthority('huangquan', -3, '\u85e9\u9547\u81ea\u7acb', { source: 'legacy-smoke' });
assert(r.ok && context.GM.huangquan.index === 52, 'reasoned legacy huangquan delta should mutate');

r = context.AuthorityEngines.setHuangquan(80, '\u6743\u529b\u91cd\u5b9a', { source: 'smoke-set' });
assert(r.ok && context.GM.huangquan.index === 80, 'setHuangquan should mutate through attributed delta');
entry = context.GM.turnChanges.variables.find(v => v.path === 'huangquan.index');
assert(entry.newValue === 80 && entry.reasons.length >= 3, 'merged turnChanges should keep final value and all reasons');
assert(Array.isArray(context.GM._authorityLog) && context.GM._authorityLog.length >= 3, 'authority log should capture successful changes');

console.log('[smoke-huangquan-attribution] pass assertions=' + assertions);
