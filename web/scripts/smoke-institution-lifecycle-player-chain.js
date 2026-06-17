#!/usr/bin/env node
// smoke-institution-lifecycle-player-chain.js - institutions need a visible proposal-to-history lifecycle.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const QUEHUO = '\u69b7\u8d27\u53f8';

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function load(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

const ctx = {
  console,
  Date, JSON, Math, Object, Array, Number, String, Boolean, RegExp,
  isFinite, isNaN, parseInt, parseFloat, Promise, Symbol, Map, Set,
  setTimeout: () => 0,
  clearTimeout: () => {},
  GM: {
    turn: 120,
    month: 1,
    guoku: { money: 500000 },
    huangquan: { index: 55 },
    dynamicInstitutions: [],
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

  assert(ctx.EdictParser && typeof ctx.EdictParser.registerDynamicInstitution === 'function', 'registerDynamicInstitution should load');
  assert(typeof ctx.EdictParser.advanceInstitutionLifecycle === 'function', 'advanceInstitutionLifecycle should be public');
  assert(typeof ctx.EdictParser.getInstitutionLifecycleView === 'function', 'getInstitutionLifecycleView should be public');

  const inst = ctx.EdictParser.registerDynamicInstitution({
    name: QUEHUO,
    rank: 5,
    duties: '\u603b\u7406\u949e\u5173\u3001\u94f6\u6d41\u4e0e\u5e02\u6613',
    annualBudget: 40000,
    createdBy: 'edict'
  });

  let view = ctx.EdictParser.getInstitutionLifecycleView(inst.id);
  assert(view && view.id === inst.id, 'new institution should expose a lifecycle view');
  assert(view.visibleSteps.some(s => s.key === 'proposed' && s.status === 'done' && /\u63d0\u51fa/.test(s.label)), 'creation should be visible as proposed');
  assert(view.timeline.some(e => e.action === 'created'), 'legacy created event should remain in timeline');

  ctx.EdictParser.advanceInstitutionLifecycle(inst.id, 'court_debate', { decision: '\u5ef7\u8bae\u51c6\u8bd5\u884c\u4e09\u5e74' });
  ctx.EdictParser.advanceInstitutionLifecycle(inst.id, 'trial_start', { durationTurns: 36 });
  ctx.EdictParser.advanceInstitutionLifecycle(inst.id, 'trial_failed', { reason: '\u5546\u8d3e\u62b5\u5236\uff0c\u5e02\u4ef7\u5931\u5e73' });
  ctx.EdictParser.abolishInstitution(inst.id);
  ctx.EdictParser.advanceInstitutionLifecycle(inst.id, 'historical_reference', { citedBy: '\u6237\u90e8\u8986\u594f', note: '\u540e\u8bae\u94f6\u6d41\u6539\u6cd5\u5f15\u4e3a\u524d\u4f8b' });
  ctx.EdictParser.advanceInstitutionLifecycle(inst.id, 'status_feedback', { summary: '\u5df2\u5e9f\u6b62\uff0c\u4f46\u7559\u4e0b\u94f6\u6d41\u7a3d\u6838\u6210\u4f8b' });

  view = ctx.EdictParser.getInstitutionLifecycleView(inst.id);
  const required = ['proposed', 'court_debate', 'trial_start', 'trial_failed', 'abolished', 'historical_reference', 'status_feedback'];
  required.forEach((key) => {
    assert(view.visibleSteps.some(s => s.key === key && s.status === 'done'), 'lifecycle view should mark ' + key + ' done');
  });
  assert(view.currentStage === 'abolished', 'abolished institution should keep abolished as current stage');
  assert(view.historicalReferences.some(r => /\u524d\u4f8b/.test(r.note || r.text || '')), 'historical reference should be retained for later citation');
  assert(view.feedback.some(f => /\u94f6\u6d41\u7a3d\u6838/.test(f.summary || f.text || '')), 'status feedback should be visible');
  assert(ctx.GM._turnReport.some(r => r.type === 'institution_lifecycle' && r.action === 'court_debate' && /\u5ef7\u8bae/.test(r.phaseLabel)), 'turn report should expose court debate phase label');
  assert(ctx.GM._turnReport.some(r => r.type === 'institution_lifecycle' && r.action === 'status_feedback' && /\u72b6\u6001\u53cd\u9988/.test(r.phaseLabel)), 'turn report should expose status feedback phase label');

  console.log('[smoke-institution-lifecycle-player-chain] PASS visible institution lifecycle chain');
})();
