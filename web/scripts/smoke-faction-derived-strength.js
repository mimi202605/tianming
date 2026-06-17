#!/usr/bin/env node
// scripts/smoke-faction-derived-strength.js — Phase B3·smoke
// 2026-05-10·验证 derivedStrength 综合 + 与 fac.strength 对比

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
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-strength.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-strength.js' });
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
  ctx.TM.FactionDerivedStrength.compute();
}

function unitTests() {
  var ctx = buildContext();
  var fds = ctx.TM.FactionDerivedStrength;
  assert(typeof fds.compute === 'function', 'compute missing');
  assert(typeof fds._militaryScale === 'function', '_militaryScale missing');

  // militaryScale 边界
  assert(fds._militaryScale(0) === 0, '0 → 0');
  assert(fds._militaryScale(1) <= 5, '1 → small');
  var s100k = fds._militaryScale(100000);
  var s1m = fds._militaryScale(1000000);
  var s10m = fds._militaryScale(10000000);
  assert(s100k > 50 && s100k < 80, '100k mil scale 50-80·got ' + s100k);
  assert(s1m > s100k, '1m > 100k');
  assert(s10m > s1m, '10m > 1m');
  assert(s10m <= 100, 'scale capped 100·got ' + s10m);

  // 空 fac
  var r = fds._computeOne({ name: 'X' });
  assert(r, 'returns');
  assert(r.value === 40 || (r.value >= 30 && r.value <= 50), 'empty fac strength ~40·got ' + r.value);
  assert(typeof r.label === 'string', 'has label');
  ['healthOverall','economyHealth','cohesionOverall','militaryScale'].forEach(function(k){
    assert(typeof r.breakdown[k] === 'number', 'breakdown.' + k);
  });

  // 满力 fac
  var rich = fds._computeOne({
    name: 'Y',
    derivedHealth: { overall: 95 },
    derivedEconomy: { economyHealth: 95, militaryStrength: 1000000 },
    derivedCohesion: { overall: 95 }
  });
  assert(rich.value > 80, 'rich fac > 80·got ' + rich.value);
  assert(rich.label === '健', 'rich label 健');

  console.log('[smoke-faction-derived-strength] unit tests pass·12 assertions');
}

function e2eTianqi() {
  var ctx = buildContext();
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));
  loadScenarioToGM(ctx, sc);

  ctx.GM.facs.forEach(function(f){ assert(f.derivedStrength, '势力 ' + f.name + ' 缺 derivedStrength'); });

  console.log('\n[e2e] derivedStrength·与 fac.strength 对比:');
  console.log('势力'.padEnd(28) + ' static→derived  health  econ  cohesion  milScale');
  console.log('─'.repeat(85));
  ctx.GM.facs.forEach(function(f){
    var ds = f.derivedStrength;
    var staticS = (typeof f.strength === 'number') ? f.strength : '?';
    console.log(f.name.padEnd(28) + ' '
      + String(staticS).padStart(3) + ' → ' + String(ds.value).padStart(3) + '/' + ds.label + '   '
      + String(ds.breakdown.healthOverall).padStart(3) + '   '
      + String(ds.breakdown.economyHealth).padStart(3) + '   '
      + String(ds.breakdown.cohesionOverall).padStart(3) + '       '
      + String(ds.breakdown.militaryScale).padStart(3));
  });

  // 史观断言
  var ming = ctx.GM.facs.find(function(f){ return f.name === '明朝廷'; });
  var hj = ctx.GM.facs.find(function(f){ return f.name === '后金'; });
  // 明朝廷·overall 弱·strength 应该 < 70 (体现塌陷)
  assert(ming.derivedStrength.value < 75, '明朝廷 derivedStrength < 75·got ' + ming.derivedStrength.value);
  // 后金·strength 应该高 (overall 平·economy 健·军强)
  assert(hj.derivedStrength.value >= 65, '后金 derivedStrength >= 65·got ' + hj.derivedStrength.value);

  console.log('\n[e2e] tianqi assertions pass');
}

function main() {
  unitTests();
  e2eTianqi();
  console.log('[smoke-faction-derived-strength] all pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-derived-strength] fail:', (e && e.message) || e);
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
