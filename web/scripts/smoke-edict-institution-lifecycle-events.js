#!/usr/bin/env node
// smoke-edict-institution-lifecycle-events.js - institution tick should emit structured lifecycle feedback.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function load(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

const WENSHU = '\u6587\u4e66\u53f8';

const ctx = {
  console,
  Date, JSON, Math,
  setTimeout: () => {},
  clearTimeout: () => {},
  GM: {
    turn: 88,
    month: 1,
    guoku: { money: 1000 },
    corruption: { overall: 30, trueIndex: 30 },
    dynamicInstitutions: [
      {
        id: 'inst_wenshu',
        name: WENSHU,
        rank: 5,
        stage: 'running',
        annualBudget: 5000,
        corruption: 82,
        effectiveness: 0.9,
        duties: '\u638c\u6587\u4e66\u6863\u6848',
        history: []
      }
    ],
    _turnReport: []
  },
  P: {},
  addEB: () => {},
  toast: () => {},
  callAI: async () => null
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

(function main() {
  load(ctx, 'tm-edict-parser.js');

  assert(ctx.EdictParser && typeof ctx.EdictParser.tick === 'function', 'EdictParser.tick should load');

  ctx.EdictParser.tick({ turn: 88, monthRatio: 1 });
  const inst = ctx.GM.dynamicInstitutions[0];
  const events = ctx.GM._institutionLifecycleEvents || [];
  const underfunded = events.find(e => e && e.action === 'underfunded' && e.name === WENSHU && e.turn === 88);
  const corruption = events.find(e => e && e.action === 'corruption_high' && e.name === WENSHU && e.turn === 88);

  assert(underfunded, 'underfunded institution tick should emit lifecycle event');
  assert(corruption, 'high corruption institution tick should emit lifecycle event');
  assert(inst.history.some(e => e && e.action === 'underfunded' && e.turn === 88), 'institution history should receive underfunded event');
  assert(ctx.GM._turnReport.some(r => r && r.type === 'institution_lifecycle' && r.action === 'underfunded' && r.name === WENSHU), 'turn report should expose underfunded lifecycle event');
  assert(ctx.GM._turnReport.some(r => r && r.type === 'institution_lifecycle' && r.action === 'corruption_high' && r.name === WENSHU), 'turn report should expose corruption lifecycle event');

  console.log('[smoke-edict-institution-lifecycle-events] PASS institution lifecycle structured events');
})();
