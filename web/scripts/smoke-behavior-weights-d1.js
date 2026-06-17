#!/usr/bin/env node
// smoke-behavior-weights-d1.js - D1 六资源→NPC行为权重 computeBehaviorWeights + 注入snapshot
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function approx(a, b, e) { return Math.abs(a - b) <= (e || 0.02); }
function load(ctx, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }

function main() {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, Error, TypeError, RangeError,
    GM: { turn: 1, clans: {}, chars: [], guoku: {}, neitang: {}, corruption: { subDepts: {} }, facs: [], regions: {}, officeTree: [] },
    addEB: function() {}, random: function() { return 0.5; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  const W = CE.computeBehaviorWeights;
  assert(typeof W === 'function', 'computeBehaviorWeights 导出');

  // 穷+野心 → 高受贿
  let w = W({ name: 'a', ambition: 80, integrity: 50, resources: { privateWealth: { money: -500 }, fame: 0, virtueMerit: 0 } });
  assert(approx(w.bribery, 0.94), '穷+野心高受贿=0.94, got ' + w.bribery);
  // 贪 → 高挪用
  w = W({ name: 'b', integrity: 10, resources: { privateWealth: { money: 100 }, fame: 0, virtueMerit: 0 } });
  assert(approx(w.embezzle, 0.5), '低廉高挪用=0.5, got ' + w.embezzle);
  // 高名望+高功名+富 → 高政治话语权
  w = W({ name: 'c', integrity: 50, resources: { privateWealth: { money: 50000 }, fame: 80, virtueMerit: 12000 } });
  assert(w.politicalClout >= 0.7 && w.politicalClout <= 2, '高名望功名话语权高, got ' + w.politicalClout);
  // 富+一品 → 高豪奢(clamp 1)
  w = W({ name: 'd', rankLevel: 1, integrity: 50, resources: { privateWealth: { money: 40000 }, fame: 0, virtueMerit: 0 } });
  assert(w.luxury === 1, '富+一品豪奢 clamp 1, got ' + w.luxury);
  // 高压力+病弱+恶名 → 高离职
  w = W({ name: 'e', integrity: 50, resources: { privateWealth: { money: 0 }, fame: -60, virtueMerit: 0, stress: 90, health: 30 } });
  assert(approx(w.resignRisk, 0.77, 0.03), '高压病弱恶名离职=0.77, got ' + w.resignRisk);
  // 兵权+高功名+恶名+欠债 → 高谋反
  w = W({ name: 'f', officialTitle: '总兵', integrity: 50, resources: { privateWealth: { money: -100 }, fame: -40, virtueMerit: 8000 } });
  assert(w.rebelRisk >= 0.6, '兵权+恶名+高功名谋反高, got ' + w.rebelRisk);
  // 名望好 → 谋反降(对照,无兵权)
  w = W({ name: 'f2', integrity: 50, resources: { privateWealth: { money: 5000 }, fame: 70, virtueMerit: 8000 } });
  assert(w.rebelRisk === 0, '名望好无兵权不反, got ' + w.rebelRisk);
  // 高功名+高名望 → 高荐才
  w = W({ name: 'g', integrity: 50, resources: { privateWealth: { money: 0 }, fame: 100, virtueMerit: 10500 } });
  assert(approx(w.recruitTalent, 0.8), '高功名名望荐才=0.8, got ' + w.recruitTalent);

  // ── 权重随 buildEconomySnapshot 流入(→ NPC prompt CharacterEconomy 块) ──
  const snap = CE.buildEconomySnapshot({ name: 'h', officialTitle: '尚书', rankLevel: 2, integrity: 40, ambition: 60, resources: { privateWealth: { money: 1000 }, fame: -10, virtueMerit: 3000 } });
  assert(snap && snap.behaviorWeights, 'buildEconomySnapshot 含 behaviorWeights');
  const keys = Object.keys(snap.behaviorWeights);
  assert(keys.length === 9, '9 个行为权重, got ' + keys.length);
  ['bribery','embezzle','politicalClout','luxury','partyFunding','antiCorruptSens','resignRisk','rebelRisk','recruitTalent'].forEach(function(k) {
    assert(typeof snap.behaviorWeights[k] === 'number', '权重 ' + k + ' 是数值');
  });

  console.log('[smoke-behavior-weights-d1] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-behavior-weights-d1] FAIL'); console.error(err && err.stack || err); process.exit(1); }
