#!/usr/bin/env node
/* eslint-env node */
'use strict';
// ⑤ 确定性夺位党争:applyEdictActions 任命夺他人位→被夺位者确定性怨望(loyalty降/stress升/AffinityMap积怨)·跨党更烈。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const loyCalls = [];
const affCalls = [];
const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date, parseInt, parseFloat, isFinite
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.GM = {
  turn: 12,
  _capital: '京师',
  chars: [
    { name: '旧臣甲', loyalty: 70, stress: 10, party: '阉党', officialTitle: '兵部尚书' },
    { name: '新臣乙', loyalty: 60, stress: 10, party: '东林' },
    { name: '旧臣丙', loyalty: 70, stress: 10, officialTitle: '吏部尚书' },
    { name: '新臣丁', loyalty: 60, stress: 10 }
  ],
  officeTree: [
    { name: '兵部', positions: [{ name: '兵部尚书', holder: '旧臣甲' }] },
    { name: '吏部', positions: [{ name: '吏部尚书', holder: '旧臣丙' }] }
  ]
};
sandbox.P = { playerInfo: { characterName: '崇祯' } };
sandbox.findCharByName = function (n) { return sandbox.GM.chars.find(function (c) { return c.name === n; }); };
sandbox.adjustCharacterLoyalty = function (ch, d, reason, opts) {
  loyCalls.push({ name: ch && ch.name, delta: d, reason: reason, source: opts && opts.source });
  if (ch && typeof ch.loyalty === 'number') ch.loyalty = Math.max(0, Math.min(100, ch.loyalty + d));
};
sandbox.AffinityMap = { add: function (a, b, v, why) { affCalls.push({ from: a, to: b, value: v, why: why }); } };
sandbox.NpcMemorySystem = { remember: function () {} };
sandbox.addEB = function () {};
sandbox.recordCharacterArc = function () {};
sandbox.getTSText = function () { return 'T12'; };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8'), sandbox, { filename: 'tm-endturn-edict.js' });

assert(typeof sandbox.applyEdictActions === 'function', 'applyEdictActions 已定义');

function runAppoint(character, position) {
  try {
    sandbox.applyEdictActions({ appointments: [{ character: character, position: position }], dismissals: [], rewards: [], armyBuilds: [] });
  } catch (e) { /* 后段可能因未 stub 的助手抛错·夺位块在前已执行·侧效应已落 */ }
}

// ① 跨党夺位:新臣乙(东林)夺旧臣甲(阉党)的兵部尚书 → 旧臣甲 loyalty -6·stress +12·affinity -20
const before甲 = sandbox.GM.chars[0].loyalty;
runAppoint('新臣乙', '兵部尚书');
const displaced甲 = loyCalls.find(function (c) { return c.name === '旧臣甲' && c.source === 'edict-displaced'; });
assert(displaced甲, '①跨党夺位应对被夺位者(旧臣甲)发 edict-displaced 忠诚扣减·实得 ' + JSON.stringify(loyCalls));
assert(displaced甲.delta === -6, '①跨党夺位 loyalty 应 -6(实 ' + displaced甲.delta + ')');
assert(sandbox.GM.chars[0].stress === 22, '①跨党夺位 stress 应 +12(10→22·实 ' + sandbox.GM.chars[0].stress + ')');
const aff甲 = affCalls.find(function (c) { return c.from === '旧臣甲' && c.to === '新臣乙' && c.value < 0; });
assert(aff甲 && aff甲.value === -20, '①跨党夺位应对接替者积怨 affinity -20·实得 ' + JSON.stringify(affCalls));
assert(sandbox.GM.chars[0].loyalty === before甲 - 6, '①被夺位者忠诚实际下降');

// ② 同党(无党/同党)夺位:新臣丁夺旧臣丙(均无 party) → loyalty -4·stress +8·affinity -15
runAppoint('新臣丁', '吏部尚书');
const displaced丙 = loyCalls.find(function (c) { return c.name === '旧臣丙' && c.source === 'edict-displaced'; });
assert(displaced丙 && displaced丙.delta === -4, '②非跨党夺位 loyalty 应 -4(实 ' + (displaced丙 && displaced丙.delta) + ')');
assert(sandbox.GM.chars[2].stress === 18, '②非跨党夺位 stress 应 +8(10→18·实 ' + sandbox.GM.chars[2].stress + ')');
const aff丙 = affCalls.find(function (c) { return c.from === '旧臣丙' && c.to === '新臣丁' && c.value === -15; });
assert(aff丙, '②非跨党夺位应 affinity -15·实得 ' + JSON.stringify(affCalls));

// ③ 不误伤:接替者(新臣乙)不应收到 edict-displaced 扣减
assert(!loyCalls.some(function (c) { return c.name === '新臣乙' && c.source === 'edict-displaced'; }), '③接替者不应被当作被夺位者扣忠诚');

console.log('[verify-edict-displaced] PASS assertions=' + passed);
