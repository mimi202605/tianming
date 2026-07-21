#!/usr/bin/env node
// scripts/smoke-sovereign-ai-edict.js — Phase 3·Task 7 诏令落账 smoke
// 验证：classifyEdict + GM._edictTracker source:'sovereign-ai' + estimateResistance + applyEdictTypedIncidence + addEB

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = { Transmigration: { isTransmigrationMode: function(){ return true; }, getSovereignName: function(){ return '测试帝'; } } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-sovereign-ai.js'), 'utf8'), ctx, { filename: 'tm-sovereign-ai.js' });
  return ctx;
}

function edictSmoke() {
  var ctx = buildContext();
  var classifyCalls = [];
  var resistanceCalls = [];
  var incidenceCalls = [];
  var addEBCalls = [];

  ctx.GM = {
    turn: 7,
    memorials: [],
    classes: [
      { name: '朝堂', satisfaction: 55 },
      { name: '庶民', satisfaction: 48 }
    ],
    _edictTracker: []
  };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝' } };

  ctx.classifyEdict = function(content) {
    classifyCalls.push({ content: content });
    return 'amnesty';
  };
  ctx.EDICT_TYPES = { amnesty: { label: '大赦' } };
  ctx.estimateResistance = function(type, state) {
    resistanceCalls.push({ type: type, state: state });
    return 35;
  };
  ctx.applyEdictTypedIncidence = function(root, content, opts) {
    incidenceCalls.push({ content: content, opts: opts });
    return { kind: 'typed-incidence', payload: 'mock' };
  };
  ctx.addEB = function(category, text) {
    addEBCalls.push({ category: category, text: text });
  };

  var aiOutput = {
    rationale: '春暖花开·宜赦。',
    edicts: [{
      type: 'amnesty',
      content: '大赦天下·除谋反大逆不赦外·余皆减等。',
      trigger: '春令',
      treasuryDelta: -5000,
      loyaltyDeltas: { court: 3, general: 5 }
    }],
    chaoyiSpeeches: [],
    memorialDecisions: [],
    officeActions: []
  };

  var r = ctx.TM.SovereignAI.runTurnSync(ctx.GM, {}, aiOutput);
  assert(r.ok === true, 'runTurnSync ok');
  assert(r.edicts.applied.length === 1, 'edict applied count = 1');

  var rec = ctx.GM._edictTracker[0];
  assert(rec, '_edictTracker has 1 record');
  assert(rec.source === 'sovereign-ai', 'source = sovereign-ai');
  assert(rec.status === 'pending', 'status = pending');
  assert(rec.type === 'amnesty', 'type = amnesty');
  assert(rec.turn === 7, 'turn = 7');
  assert(rec.content.indexOf('大赦天下') === 0, 'content preserved');
  assert(rec.resistance === 35, 'resistance = 35');
  assert(rec.typedIncidence && rec.typedIncidence.kind === 'typed-incidence', 'typedIncidence attached');

  assert(classifyCalls.length === 1, 'classifyEdict called once');
  assert(resistanceCalls.length === 1, 'estimateResistance called once');
  assert(resistanceCalls[0].type === 'amnesty', 'estimateResistance type');
  assert(incidenceCalls.length === 1, 'applyEdictTypedIncidence called once');
  assert(addEBCalls.length === 1, 'addEB called once');
  assert(addEBCalls[0].text.indexOf('【君主 AI 颁旨】') === 0, 'addEB text prefix');

  console.log('[smoke-sovereign-ai-edict] PASS · 12 assertions · 诏令落账 + 阻力计算 + 类型化后果');
}

try {
  edictSmoke();
  process.exit(0);
} catch (e) {
  console.error('[smoke-sovereign-ai-edict] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
