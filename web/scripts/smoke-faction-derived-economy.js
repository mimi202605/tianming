#!/usr/bin/env node
// scripts/smoke-faction-derived-economy.js — Phase B1·smoke
// 2026-05-10·验证 derivedEconomy 基本契约 + e2e 实剧本数值合理

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
}

function unitTests() {
  // 纯函数·空 entry
  var ctx = buildContext();
  var fde = ctx.TM.FactionDerivedEconomy;
  assert(typeof fde.compute === 'function', 'compute fn missing');
  assert(typeof fde._computeOne === 'function', '_computeOne missing');
  assert(typeof fde._detectParadigm === 'function', '_detectParadigm missing');
  // 空 entry
  var emptyResult = fde._computeOne({ name: 'X' }, { metrics: { totalSoldiers: 0, armyCount: 0, arrearsArmies: 0 }, armies: [], provinces: [] });
  assert(emptyResult, 'should return result for empty');
  assert(emptyResult.militaryStrength === 0, 'empty militaryStrength = 0');
  assert(emptyResult.annualMilitaryCost === 0, 'empty cost = 0 (no soldiers)');
  assert(emptyResult.annualTaxIncome > 0, 'empty tax > 0 (paradigm fallback territory=3)');
  assert(typeof emptyResult.fiscalStress === 'number', 'fiscalStress is number');
  assert(typeof emptyResult.economyHealth === 'number', 'economyHealth is number');
  assert(emptyResult.fiscalStress + emptyResult.economyHealth === 100, 'stress + health = 100');
  assert(emptyResult._source.paradigm === 'generic', 'unknown name → generic');

  // paradigm detect
  assert(fde._detectParadigm('明朝廷', {}) === 'central_empire', '明朝廷 → central_empire');
  assert(fde._detectParadigm('后金', {}) === 'manchu_empire', '后金 → manchu_empire');
  assert(fde._detectParadigm('察哈尔', {}) === 'mongol_tribe', '察哈尔 → mongol_tribe');
  assert(fde._detectParadigm('科尔沁蒙古', {}) === 'mongol_tribe', '科尔沁 → mongol_tribe');
  assert(fde._detectParadigm('朝鲜', {}) === 'tributary_kingdom', '朝鲜 → tributary');
  assert(fde._detectParadigm('葡萄牙·澳门', {}) === 'european_outpost', '澳门 → european');
  assert(fde._detectParadigm('郑氏海商', {}) === 'maritime_merchant', '郑氏 → maritime');
  assert(fde._detectParadigm('播州土司·杨氏(余裔)', {}) === 'native_chieftain', '播州 → native');
  assert(fde._detectParadigm('陕北饥民(将起)', {}) === 'rebellion', '饥民 → rebellion');

  console.log('[smoke-faction-derived-economy] unit tests pass·11 assertions');
}

function e2eTianqi() {
  var ctx = buildContext();
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));
  loadScenarioToGM(ctx, sc);

  var ming = ctx.GM.facs.find(function(f){ return f.name === '明朝廷'; });
  var hj = ctx.GM.facs.find(function(f){ return f.name === '后金'; });
  assert(ming.derivedEconomy, 'ming.derivedEconomy missing');
  assert(hj.derivedEconomy, 'hj.derivedEconomy missing');

  console.log('[e2e] 明朝廷·derivedEconomy:');
  console.log('  militaryStrength:', ming.derivedEconomy.militaryStrength);
  console.log('  annualMilitaryCost:', ming.derivedEconomy.annualMilitaryCost, '两');
  console.log('  annualTaxIncome:', ming.derivedEconomy.annualTaxIncome, '两');
  console.log('  netFlow:', ming.derivedEconomy.netFlow, '两/年');
  console.log('  fiscalStress:', ming.derivedEconomy.fiscalStress, '/', ming.derivedEconomy.labels.economyHealth);
  console.log('  source:', JSON.stringify(ming.derivedEconomy._source));

  console.log('[e2e] 后金·derivedEconomy:');
  console.log('  militaryStrength:', hj.derivedEconomy.militaryStrength);
  console.log('  annualMilitaryCost:', hj.derivedEconomy.annualMilitaryCost, '两');
  console.log('  annualTaxIncome:', hj.derivedEconomy.annualTaxIncome, '两');
  console.log('  netFlow:', hj.derivedEconomy.netFlow, '两/年');
  console.log('  fiscalStress:', hj.derivedEconomy.fiscalStress, '/', hj.derivedEconomy.labels.economyHealth);

  // 史观断言
  assert(ming.derivedEconomy.militaryStrength > 1000000, '明朝廷 militaryStrength should > 100w·got ' + ming.derivedEconomy.militaryStrength);
  assert(ming.derivedEconomy.fiscalStress >= 30, '明朝廷 fiscalStress should >= 30 (欠饷+军费)·got ' + ming.derivedEconomy.fiscalStress);
  assert(hj.derivedEconomy.militaryStrength > 50000, '后金 militaryStrength should > 5w·got ' + hj.derivedEconomy.militaryStrength);
  assert(hj.derivedEconomy.fiscalStress < ming.derivedEconomy.fiscalStress, '后金 fiscalStress < 明朝廷 (后金更稳)');

  // 所有势力都有 derivedEconomy
  ctx.GM.facs.forEach(function(f){
    assert(f.derivedEconomy, '势力 ' + f.name + ' 缺 derivedEconomy');
  });

  console.log('[e2e] tianqi assertions pass·' + ctx.GM.facs.length + ' factions checked');
}

function main() {
  unitTests();
  e2eTianqi();
  console.log('[smoke-faction-derived-economy] all pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-derived-economy] fail:', (e && e.message) || e);
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
