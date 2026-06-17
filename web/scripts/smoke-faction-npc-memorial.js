#!/usr/bin/env node
// scripts/smoke-faction-npc-memorial.js — Phase C1·smoke
// 2026-05-10·验证 NPC memorial 生成/批决/副作用

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
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-personality.js'), 'utf8'), ctx, { filename: 'tm-faction-personality.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-index.js'), 'utf8'), ctx, { filename: 'tm-faction-index.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-health.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-health.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-membership.js'), 'utf8'), ctx, { filename: 'tm-faction-membership.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-economy.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-economy.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-cohesion.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-cohesion.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-strength.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-strength.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-npc-memorial.js'), 'utf8'), ctx, { filename: 'tm-faction-npc-memorial.js' });
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
  var fnm = ctx.TM.FactionNpcMemorial;
  assert(typeof fnm.generate === 'function', 'generate missing');
  assert(typeof fnm.resolve === 'function', 'resolve missing');
  assert(typeof fnm.getFor === 'function', 'getFor missing');

  // _classifyChar
  assert(fnm._classifyChar({ position: '皇帝' }) === 'ruler', 'ruler classify');
  assert(fnm._classifyChar({ position: '兵部尚书' }) === 'court', 'court classify');
  assert(fnm._classifyChar({ position: '总兵' }) === 'general', 'general classify');
  assert(fnm._classifyChar({ position: '亲王' }) === 'clan', 'clan classify');

  // _pickType returns valid type
  var t = fnm._pickType('court', { derivedHealth: { courtCohesion: 50 } });
  assert(['军务','政务','民生','经济','人事','密奏'].indexOf(t) >= 0, 'pickType returns valid·got ' + t);

  // _genContent returns string
  var c = fnm._genContent('政务', { name: '某臣', loyalty: 60 }, {});
  assert(typeof c === 'string' && c.length > 10, 'genContent string·got ' + c);

  // _rulerDecide
  var ruler = { name: 'R', party: '阉党' };
  var char = { name: 'C', party: '阉党', loyalty: 80 };
  var dec = fnm._rulerDecide(ruler, { type: '政务', turn: 1 }, char, { derivedHealth: {}, derivedEconomy: {} });
  assert(['approved','rejected','annotated','referred'].indexOf(dec.status) >= 0, 'decide returns valid status·got ' + dec.status);
  assert(typeof dec.loyaltyDelta === 'number', 'has loyaltyDelta');
  assert(typeof dec.ruling === 'string', 'has ruling');

  console.log('[smoke-faction-npc-memorial] unit tests pass·11 assertions');
}

function e2eTianqi() {
  var ctx = buildContext();
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));
  loadScenarioToGM(ctx, sc);

  var ret = ctx.TM.FactionNpcMemorial.generate();
  assert(ret && typeof ret.generated === 'number', 'generate returns count');
  console.log('[e2e] generated NPC memorials:', ret.generated);
  assert(ret.generated > 0, 'should generate >0·got ' + ret.generated);

  // 后金应该有 npcMemorials (是 NPC·有 chars)
  var hj = ctx.GM.facs.find(function(f){ return f.name === '后金'; });
  assert(Array.isArray(hj.npcMemorials), '后金.npcMemorials is array');
  console.log('[e2e] 后金 npcMemorials count:', hj.npcMemorials.length);
  assert(hj.npcMemorials.length > 0, '后金 should have memorials');

  // 明朝廷 (player) 不应该有 npcMemorials (走 GM.memorials)
  var ming = ctx.GM.facs.find(function(f){ return f.name === '明朝廷'; });
  if (ming.npcMemorials && ming.npcMemorials.length > 0) {
    fail('明朝廷 should NOT have npcMemorials (player faction)');
  }

  // 每条 memorial 必有完整字段
  hj.npcMemorials.forEach(function(m){
    ['id','from','fromRole','to','type','content','status','turn','ruling'].forEach(function(k){
      assert(m[k] !== undefined && m[k] !== null, '后金 memorial missing ' + k);
    });
    assert(['approved','rejected','annotated','referred'].indexOf(m.status) >= 0, 'status valid');
    assert(['军务','政务','民生','经济','人事','密奏'].indexOf(m.type) >= 0, 'type valid');
  });

  // 副作用·至少有一个 char 的 _memorialMemory 增长
  var hjChars = ctx.GM._facIndex['后金'].chars;
  var anyMem = hjChars.some(function(c){ return Array.isArray(c._memorialMemory) && c._memorialMemory.length > 0; });
  assert(anyMem, '至少一个后金 char 应有 _memorialMemory 记录');

  console.log('\n[e2e] 后金·首 3 条 memorial 样例:');
  hj.npcMemorials.slice(0, 3).forEach(function(m){
    console.log('  ' + m.from + '(' + m.fromRole + ') → ' + m.to + ' [' + m.type + '/' + m.status + ']');
    console.log('    "' + m.content + '"');
    console.log('    ruling: ' + m.ruling + ' (loyaltyΔ=' + m.impact.loyaltyDelta + ')');
  });

  // 跑 turn 2 看 last 30 上限
  ctx.GM.turn = 2;
  ctx.TM.FactionNpcMemorial.generate();
  ctx.GM.turn = 3;
  ctx.TM.FactionNpcMemorial.generate();
  console.log('\n[e2e] 后金·turn 1-3 累计 memorials:', hj.npcMemorials.length);
  assert(hj.npcMemorials.length <= 30, 'cap at 30·got ' + hj.npcMemorials.length);

  console.log('[e2e] tianqi assertions pass');
}

function main() {
  unitTests();
  e2eTianqi();
  console.log('[smoke-faction-npc-memorial] all pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-npc-memorial] fail:', (e && e.message) || e);
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
