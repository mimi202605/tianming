#!/usr/bin/env node
// smoke-p5-eta-endturn.js - Phase 5 eta Endturn namespace facade gate.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed++;
}

function fn(name) {
  const f = function() {};
  Object.defineProperty(f, 'name', { value: name });
  return f;
}

const ctx = {
  document: { readyState: 'loading', addEventListener: function(){} },
  setTimeout: function() {},
  console: console,
  Object: Object,
  Array: Array,
  Promise: Promise,
  Proxy: Proxy,
  TM: {}
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.addEventListener = function(){};

[
  'endTurn',
  'confirmEndTurn',
  'openProvinceEconomy',
  'openDivisionDetail',
  'openQiaozhiPanel',
  'doQiaozhi',
  'restoreQiaozhiDivision'
].forEach(function(name) { ctx[name] = fn(name); });

[
  '_peLijuanPick',
  '_peLijuanClear',
  '_peTriggerCascadeNow',
  '_endTurn_aiInfer',
  '_endTurn_updateSystems',
  '_endTurn_render',
  '_endTurnCore',
  '_chooseIssueOption'
].forEach(function(name) { ctx[name] = fn(name); });

ctx.TM.lastPromptTokens = { sc1: { tokens: 123 } };
ctx.FiscalEngine = { tick: fn('FiscalEngine.tick') };
ctx.AuthorityEngines = { tick: fn('AuthorityEngines.tick') };
ctx.CorruptionEngine = { tick: fn('CorruptionEngine.tick') };

vm.createContext(ctx);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

load('tm-namespaces.js');

const TM = ctx.TM;
const hasOwn = Object.prototype.hasOwnProperty;

assert(TM.Endturn && typeof TM.Endturn === 'object', 'TM.Endturn should exist');
assert(TM.Endturn.AI && typeof TM.Endturn.AI === 'object', 'TM.Endturn.AI container should exist');
assert(TM.namespaces.Endturn === TM.Endturn, 'TM.namespaces.Endturn should point at TM.Endturn');

assert(TM.Endturn.run.endTurn === ctx.endTurn, 'Endturn.run.endTurn should alias endTurn');
assert(TM.Endturn.run.confirmEndTurn === ctx.confirmEndTurn,
  'Endturn.run.confirmEndTurn should alias confirmEndTurn');
assert(TM.Endturn.run.list().length === 2, 'Endturn.run should expose endTurn and confirmEndTurn');
assert(TM.Endturn.run.listMissing().length === 0, 'Endturn.run mocked refs should all be available');

assert(TM.Endturn.province.openProvinceEconomy === ctx.openProvinceEconomy,
  'Endturn.province.openProvinceEconomy should alias openProvinceEconomy');
assert(TM.Endturn.province.openDivisionDetail === ctx.openDivisionDetail,
  'Endturn.province.openDivisionDetail should alias openDivisionDetail');
assert(TM.Endturn.province.list().length === 2, 'Endturn.province should expose two public entries');
assert(TM.Endturn.province.listMissing().length === 0, 'Endturn.province mocked refs should all be available');

assert(TM.Endturn.qiaozhi.openQiaozhiPanel === ctx.openQiaozhiPanel,
  'Endturn.qiaozhi.openQiaozhiPanel should alias openQiaozhiPanel');
assert(TM.Endturn.qiaozhi.doQiaozhi === ctx.doQiaozhi, 'Endturn.qiaozhi.doQiaozhi should alias doQiaozhi');
assert(TM.Endturn.qiaozhi.restoreQiaozhiDivision === ctx.restoreQiaozhiDivision,
  'Endturn.qiaozhi.restoreQiaozhiDivision should alias restoreQiaozhiDivision');
assert(TM.Endturn.qiaozhi.list().length === 3, 'Endturn.qiaozhi should expose three public entries');
assert(TM.Endturn.qiaozhi.listMissing().length === 0, 'Endturn.qiaozhi mocked refs should all be available');

assert(!hasOwn.call(TM.Endturn.province, '_peLijuanPick'), 'province should not expose _peLijuanPick');
assert(!hasOwn.call(TM.Endturn.province, '_peLijuanClear'), 'province should not expose _peLijuanClear');
assert(!hasOwn.call(TM.Endturn.province, '_peTriggerCascadeNow'), 'province should not expose _peTriggerCascadeNow');
assert(!hasOwn.call(TM.Endturn, '_chooseIssueOption'), 'Endturn should not expose helper _chooseIssueOption');

assert(!hasOwn.call(TM.Endturn.AI, 'infer'), 'Endturn.AI should not expose infer facade in P5-eta');
assert(!hasOwn.call(TM.Endturn.AI, '_endTurn_aiInfer'), 'Endturn.AI should not expose _endTurn_aiInfer');
assert(!hasOwn.call(TM.Endturn, '_endTurn_updateSystems'), 'Endturn should not expose _endTurn_updateSystems');
assert(!hasOwn.call(TM.Endturn, '_endTurn_render'), 'Endturn should not expose _endTurn_render');
assert(!hasOwn.call(TM.Endturn, '_endTurnCore'), 'Endturn should not expose _endTurnCore');
assert(TM.lastPromptTokens === ctx.TM.lastPromptTokens, 'lastPromptTokens should remain a diagnostic TM field');

assert(TM.Fiscal && TM.Authority && TM.Corruption, 'P5 epsilon/delta namespaces should remain present');
assert(TM.Map && TM.UI && TM.NPC && TM.Char && TM.Editor, 'other P5 namespaces should remain present');

console.log('[smoke-p5-eta-endturn] pass assertions=' + passed);
