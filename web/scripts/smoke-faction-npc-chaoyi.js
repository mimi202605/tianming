#!/usr/bin/env node
// scripts/smoke-faction-npc-chaoyi.js — Phase C3·smoke
// 2026-05-10·验证 NPC chaoyi 生成 + 派系互动副作用

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
   'tm-faction-npc-memorial.js','tm-faction-npc-edict.js','tm-faction-npc-chaoyi.js'].forEach(function(f){
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
  var fnc = ctx.TM.FactionNpcChaoyi;
  assert(typeof fnc.generate === 'function', 'generate missing');

  // 单派 → null
  var t1 = fnc._decideType({ derivedHealth: {}, derivedCohesion: {} }, ['onlyParty']);
  assert(t1 === null, 'single party returns null·got ' + t1);

  // 双派 + 凝聚高 → 多协作
  var counts = { cooperate: 0, attack: 0, compromise: 0, infight: 0 };
  for (var i = 0; i < 200; i++) {
    var t = fnc._decideType({ derivedHealth: { courtCohesion: 90 }, derivedCohesion: {} }, ['A', 'B']);
    counts[t]++;
  }
  // 不强制具体比例·只验都覆盖
  assert(counts.cooperate > 0, 'cooperate seen');
  assert(counts.cooperate >= counts.attack, 'high cohesion·cooperate >= attack·got ' + JSON.stringify(counts));

  // 双派 + 凝聚低 → 多攻讦
  counts = { cooperate: 0, attack: 0, compromise: 0, infight: 0 };
  for (var i = 0; i < 200; i++) {
    var t = fnc._decideType({ derivedHealth: { courtCohesion: 30 }, derivedCohesion: {} }, ['A', 'B']);
    counts[t]++;
  }
  assert(counts.attack > 0, 'attack seen');
  assert(counts.attack >= counts.cooperate, 'low cohesion·attack >= cooperate·got ' + JSON.stringify(counts));

  console.log('[smoke-faction-npc-chaoyi] unit tests pass·6 assertions');
}

function e2eTianqi() {
  var ctx = buildContext();
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));
  loadScenarioToGM(ctx, sc);

  var ret = ctx.TM.FactionNpcChaoyi.generate();
  console.log('[e2e] 共发生 NPC 朝议:', ret.run);

  // 看哪些 NPC fac 有多派 (后金有多派吗·查 _facIndex)
  console.log('\n[e2e] 各 NPC fac 派系数:');
  ctx.GM.facs.forEach(function(f){
    if (f.name === sc.playerInfo.factionName) return;
    var entry = ctx.GM._facIndex[f.name];
    if (!entry) return;
    var pCount = Object.keys(entry.parties || {}).length;
    var cyCount = Array.isArray(f.npcChaoyi) ? f.npcChaoyi.length : 0;
    console.log('  ' + f.name.padEnd(28) + ' parties=' + pCount + ' chaoyi=' + cyCount);
  });

  // 找有 chaoyi 的 fac·展示样例
  var withChaoyi = ctx.GM.facs.filter(function(f){ return Array.isArray(f.npcChaoyi) && f.npcChaoyi.length > 0; });
  if (withChaoyi.length > 0) {
    console.log('\n[e2e] 朝议样例:');
    withChaoyi.slice(0, 3).forEach(function(f){
      f.npcChaoyi.forEach(function(cy){
        console.log('  ' + f.name + ': [' + cy.type + '] ' + cy.summary);
        console.log('    参与: ' + (cy.participants.join(',') || '-'));
        console.log('    effects: ' + JSON.stringify(cy.effects));
      });
    });
  } else {
    console.log('\n[e2e] (天启七年 NPC 多数单派·无朝议·与剧本数据缺 chars 一致·见 Phase D backlog)');
  }

  // multi-turn 累积上限
  for (var t = 2; t <= 5; t++) {
    ctx.GM.turn = t;
    ctx.TM.FactionNpcChaoyi.generate();
  }
  ctx.GM.facs.forEach(function(f){
    if (Array.isArray(f.npcChaoyi)) {
      assert(f.npcChaoyi.length <= 30, f.name + ' chaoyi cap 30·got ' + f.npcChaoyi.length);
    }
  });

  console.log('[e2e] tianqi assertions pass');
}

function main() {
  unitTests();
  e2eTianqi();
  console.log('[smoke-faction-npc-chaoyi] all pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-npc-chaoyi] fail:', (e && e.message) || e);
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
