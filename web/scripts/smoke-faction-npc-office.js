#!/usr/bin/env node
// scripts/smoke-faction-npc-office.js — Phase C4·smoke

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
  ['tm-faction-paradigm.js','tm-faction-index.js','tm-faction-derived-health.js','tm-faction-membership.js',
   'tm-faction-derived-economy.js','tm-faction-derived-cohesion.js','tm-faction-derived-strength.js',
   'tm-faction-npc-memorial.js','tm-faction-npc-edict.js','tm-faction-npc-chaoyi.js','tm-faction-npc-office.js'].forEach(function(f){
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
  var fno = ctx.TM.FactionNpcOffice;
  assert(typeof fno.generate === 'function', 'generate missing');
  assert(typeof fno._findPromoteTarget === 'function', '_findPromoteTarget missing');

  // 提拔候选: 高 loyalty + 高 charisma
  var ruler = { name: 'R', position: '皇帝' };
  var alive = [
    ruler,
    { name: 'A', position: '宗室', loyalty: 80, charisma: 70 },
    { name: 'B', position: '总兵', loyalty: 50, charisma: 60 },
    { name: 'C', position: '内阁参议', loyalty: 90, charisma: 80 }  // 已是 court·skip
  ];
  var p = fno._findPromoteTarget(alive, ruler);
  assert(p && p.name === 'A', '提拔候选应为 A·got ' + (p && p.name));

  // 罢撤候选: 低 loyalty
  var alive2 = [
    ruler,
    { name: 'X', position: '内阁参议', loyalty: 25 },
    { name: 'Y', position: '内阁参议', loyalty: 60 }
  ];
  var d = fno._findDemoteTarget(alive2, ruler);
  assert(d && d.name === 'X', '罢撤候选应为 X·got ' + (d && d.name));

  console.log('[smoke-faction-npc-office] unit tests pass·5 assertions');
}

function e2eTianqi() {
  var ctx = buildContext();
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));
  loadScenarioToGM(ctx, sc);

  var ret = ctx.TM.FactionNpcOffice.generate();
  console.log('[e2e] NPC 人事行动:', ret.actions);

  ctx.GM.facs.forEach(function(f){
    if (f.name === sc.playerInfo.factionName) return;
    if (Array.isArray(f.npcOfficeActions) && f.npcOfficeActions.length > 0) {
      console.log('  ' + f.name + ': ' + f.npcOfficeActions.length + ' actions');
      f.npcOfficeActions.forEach(function(a){
        console.log('    [' + a.action + '] ' + a.target + ' (' + a.effect.positionFrom + '→' + a.effect.positionTo + ', loyaltyΔ=' + a.effect.loyaltyDelta + ') 由 ' + a.ruler);
      });
    }
  });

  // multi-turn cap
  for (var t = 2; t <= 5; t++) { ctx.GM.turn = t; ctx.TM.FactionNpcOffice.generate(); }
  ctx.GM.facs.forEach(function(f){
    if (Array.isArray(f.npcOfficeActions)) {
      assert(f.npcOfficeActions.length <= 30, f.name + ' cap 30·got ' + f.npcOfficeActions.length);
    }
  });

  console.log('[e2e] tianqi assertions pass');
}

function main() {
  unitTests();
  e2eTianqi();
  console.log('[smoke-faction-npc-office] all pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-npc-office] fail:', (e && e.message) || e);
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
