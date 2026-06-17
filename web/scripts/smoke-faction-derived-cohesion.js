#!/usr/bin/env node
// scripts/smoke-faction-derived-cohesion.js — Phase B2·smoke
// 2026-05-10·验证 derivedCohesion 6 维 + e2e

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const SCN_DIR = path.resolve(ROOT, '..', 'scenarios');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildContext() {
  var ctx = { console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-paradigm.js'), 'utf8'), ctx, { filename: 'tm-faction-paradigm.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-index.js'), 'utf8'), ctx, { filename: 'tm-faction-index.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-health.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-health.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-membership.js'), 'utf8'), ctx, { filename: 'tm-faction-membership.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-economy.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-economy.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-cohesion.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-cohesion.js' });
  return ctx;
}

function loadScenarioToGM(ctx, sc) {
  ctx.GM = {
    turn: 1,
    facs: (sc.factions || []).map(function(f){ return Object.assign({}, f); }),
    chars: (sc.characters || []).map(function(c){ return Object.assign({}, c, { alive: c.alive !== false }); }),
    armies: (sc.military && sc.military.initialTroops || []).map(function(a){ return Object.assign({}, a); }),
    parties: (sc.parties || []).map(function(p){ return Object.assign({}, p); }),
    factionRelations: sc.factionRelations || [],
    _provinceToFaction: {}, provinceStats: {}
  };
  ctx.getFactionProvinces = function(n) {
    var f = ctx.GM.facs.find(function(x){ return x.name === n; });
    if (!f) return [];
    if (Array.isArray(f.territories)) return f.territories.slice();
    if (typeof f.territory === 'string') return [f.territory];
    if (Array.isArray(f.territory)) return f.territory.slice();
    return [];
  };
  ctx.TM.FactionMembership.migrateArmyOwnerToFaction();
  ctx.TM.FactionMembership.migrateCharsAddFactionId();
  ctx.TM.FactionMembership.migrateProvinceOwnership();
  ctx.TM.FactionIndex.rebuild();
  ctx.TM.FactionDerived.compute();
  ctx.TM.FactionDerivedEconomy.compute();
  ctx.TM.FactionDerivedCohesion.compute();
}

function unitTests() {
  var ctx = buildContext();
  var fdc = ctx.TM.FactionDerivedCohesion;
  assert(typeof fdc.compute === 'function', 'compute fn missing');

  // 空 fac
  var r = fdc._computeOne({ name: 'X' });
  assert(r, 'returns object');
  assert(typeof r.overall === 'number', 'overall is number');
  assert(r.overall >= 0 && r.overall <= 100, 'overall in range');
  ['political','military','economic','cultural','ethnic','loyalty','overall'].forEach(function(k){
    assert(typeof r[k] === 'number', 'has ' + k);
    assert(typeof r.labels[k] === 'string', 'has labels.' + k);
  });
  // 全 fallback → 6 项都接近 50-80·overall ≈ 55±
  assert(r.overall >= 50 && r.overall <= 70, 'fallback overall ~50-70 got ' + r.overall);

  // 带 cohesion 字段·应优先 fallback 链
  var r2 = fdc._computeOne({
    name: 'Y',
    cohesion: { political: 30, military: 40, economic: 50, cultural: 60, ethnic: 70, loyalty: 80 },
    cultureLevel: 65
  });
  assert(r2.political === 30, 'political from fac.cohesion');
  assert(r2.military === 40, 'military from fac.cohesion');
  assert(r2.economic === 50, 'economic from fac.cohesion');
  assert(r2.cultural === 65, 'cultural from cultureLevel (优先于 cohesion.cultural)');
  assert(r2.ethnic === 70, 'ethnic from fac.cohesion (无 ethnicities)');
  assert(r2.loyalty === 80, 'loyalty from fac.cohesion');

  // 带 ethnicities → ethnic 优先用主体族
  var r3 = fdc._computeOne({
    name: 'Z',
    population: { ethnicities: { '汉': 0.96, '回': 0.04 } }
  });
  assert(r3.ethnic === 96, 'ethnic from main ethnicity·got ' + r3.ethnic);

  console.log('[smoke-faction-derived-cohesion] unit tests pass·15 assertions');
}

function e2eTianqi() {
  var ctx = buildContext();
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));
  loadScenarioToGM(ctx, sc);

  ctx.GM.facs.forEach(function(f){
    assert(f.derivedCohesion, '势力 ' + f.name + ' 缺 derivedCohesion');
  });

  console.log('\n[e2e] derivedCohesion·按 6 维:');
  console.log('势力'.padEnd(28) + ' overall  pol  mil  eco  cul  eth  loy');
  console.log('─'.repeat(75));
  ctx.GM.facs.forEach(function(f){
    var c = f.derivedCohesion;
    console.log(f.name.padEnd(28) + ' '
      + String(c.overall).padStart(3) + '/' + c.labels.overall + '  '
      + String(c.political).padStart(3) + '  '
      + String(c.military).padStart(3) + '  '
      + String(c.economic).padStart(3) + '  '
      + String(c.cultural).padStart(3) + '  '
      + String(c.ethnic).padStart(3) + '  '
      + String(c.loyalty).padStart(3));
  });

  // 史观断言
  var ming = ctx.GM.facs.find(function(f){ return f.name === '明朝廷'; });
  var hj = ctx.GM.facs.find(function(f){ return f.name === '后金'; });
  // 明朝廷 political 应该 >= 60 (朝堂高 cohesion)·loyalty 60-70 (avgLoyalty)·economic 30-60 (B1 fiscalStress 38·economyHealth 62)
  assert(ming.derivedCohesion.economic > 30 && ming.derivedCohesion.economic < 90, '明朝廷 economic in 30-90·got ' + ming.derivedCohesion.economic);
  // 后金 economic 应该 > 80 (fiscalStress 0)
  assert(hj.derivedCohesion.economic >= 80, '后金 economic >=80·got ' + hj.derivedCohesion.economic);

  console.log('\n[e2e] tianqi assertions pass');
}

function main() {
  unitTests();
  e2eTianqi();
  console.log('[smoke-faction-derived-cohesion] all pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-derived-cohesion] fail:', (e && e.message) || e);
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
