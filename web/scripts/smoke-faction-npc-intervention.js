#!/usr/bin/env node
// scripts/smoke-faction-npc-intervention.js — Phase F2·smoke

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
  ['tm-faction-paradigm.js','tm-faction-personality.js','tm-faction-index.js',
   'tm-faction-derived-health.js','tm-faction-membership.js',
   'tm-faction-derived-economy.js','tm-faction-derived-cohesion.js','tm-faction-derived-strength.js',
   'tm-faction-npc-intervention.js'].forEach(function(f){
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  });
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
  ctx.P = { playerInfo: sc.playerInfo || {} };
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
  var fni = ctx.TM.FactionNpcIntervention;
  assert(typeof fni.bribe === 'function', 'bribe missing');
  assert(typeof fni.sponsorRebellion === 'function', 'sponsorRebellion missing');
  assert(typeof fni.spreadRumor === 'function', 'spreadRumor missing');
  assert(typeof fni.espionage === 'function', 'espionage missing');
  assert(fni.COSTS.bribe.money === 50000, 'bribe cost');
  console.log('[smoke-faction-npc-intervention] unit tests pass·5 assertions');
}

function e2eTianqi() {
  var ctx = buildContext();
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));
  loadScenarioToGM(ctx, sc);
  var fni = ctx.TM.FactionNpcIntervention;

  // 给玩家加点钱
  var ming = ctx.GM.facs.find(function(f){ return f.name === '明朝廷'; });
  ming.treasury.money = 10000000;
  ming.treasury.grain = 5000000;

  // bribe·目标后金·阿敏 (loyalty 已经 50)
  var aminBefore = ctx.GM.chars.find(function(c){ return c.name === '阿敏'; });
  var loyB = aminBefore.loyalty;
  var r1 = fni.bribe('后金', '阿敏');
  assert(r1.ok, 'bribe should succeed·got ' + JSON.stringify(r1));
  assert(aminBefore.loyalty < loyB, 'loyalty drop·' + loyB + ' → ' + aminBefore.loyalty);
  console.log('[e2e] 暗结·阿敏 loyalty ' + loyB + ' → ' + aminBefore.loyalty + (aminBefore._bribed ? ' (已被收买)' : ''));

  // sponsorRebellion·后金
  var imbB = (ctx.GM.facs.find(function(f){return f.name==='后金';}).derivedHealth._source.partyImbalance || 0);
  var r2 = fni.sponsorRebellion('后金');
  assert(r2.ok, 'sponsor should succeed');
  console.log('[e2e] 资助后金内斗·' + r2.rec.effects.charsAffected.length + ' chars 受影响·imbalance ' + imbB + ' → ' + ctx.GM.facs.find(function(f){return f.name==='后金';}).derivedHealth._source.partyImbalance);

  // spreadRumor·后金
  var r3 = fni.spreadRumor('后金');
  assert(r3.ok, 'rumor should succeed');
  console.log('[e2e] 散谣·后金 _rumorTurn=' + r3.rec.effects.rumorTurn);

  // espionage 3 次·阿敏翻面
  var aminF = ctx.GM.chars.find(function(c){ return c.name === '阿敏'; });
  for (var i = 0; i < 3; i++) {
    fni.espionage('后金', '阿敏');
  }
  console.log('[e2e] 间谍 3 次后·阿敏 stacks=' + (aminF._espionageStacks || 0) + ' faction=' + aminF.faction + ' loyalty=' + aminF.loyalty);
  // 应该已 defected
  if (aminF.faction === '明朝廷') console.log('  ✓ 阿敏已策反·改归明朝廷');

  // 检 cost 扣
  console.log('[e2e] 玩家 treasury after: 钱 ' + ming.treasury.money + ' 粮 ' + ming.treasury.grain);
  assert(ming.treasury.money < 10000000, '玩家钱被扣');

  // 检 log
  var log = fni.getLog();
  console.log('[e2e] 干预日志: ' + log.length + ' 条');
  assert(log.length >= 6, '应至少 6 条 (1+1+1+3)·got ' + log.length);

  // 测试本朝拒
  var r4 = fni.bribe('明朝廷', '魏忠贤');
  assert(!r4.ok, '本朝 bribe 应被拒');

  // 资源不足
  ming.treasury.money = 100;
  var r5 = fni.bribe('后金', '代善');
  assert(!r5.ok && r5.reason.indexOf('不足') >= 0, '资源不足应拒');

  console.log('[e2e] tianqi assertions pass');
}

function main() {
  unitTests();
  e2eTianqi();
  console.log('[smoke-faction-npc-intervention] all pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-npc-intervention] fail:', (e && e.message) || e);
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
