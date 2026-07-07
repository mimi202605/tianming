#!/usr/bin/env node
// smoke-hidden-moves-hygiene.js — 悬账小修批（深挖第六轮⑥）
// 验：①executionConstraints 死代码已删且不复活 ②_npcHiddenMoves 封顶40(此前只增不裁)
//     ③slander 与 obstruct 双落账对齐(此前 slander 只进 cap80 的 InternalActionHistory·
//       高活跃局4回合窗内可被挤出→同人反复攻讦的 recency 惩罚与密探暗流计数漏 slander)。
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let N = 0;
function assert(cond, msg) { N++; if (!cond) { console.error('ASSERT FAIL [' + N + ']:', msg); process.exit(1); } }
function load(ctx, rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
}

// ── ① executionConstraints 死代码已删（防复活守卫）──
const runtimeFiles = fs.readdirSync(ROOT).filter(function (f) { return /\.js$/.test(f); });
let defHits = 0, writeHits = 0;
runtimeFiles.forEach(function (f) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (src.indexOf('function createExecutionConstraint') >= 0) defHits++;
  if (src.indexOf('GM.executionConstraints') >= 0) writeHits++;
});
assert(defHits === 0, '① createExecutionConstraint 定义已删·全运行时零复活');
assert(writeHits === 0, '② GM.executionConstraints 读写全清·子树死绝');

// ── 载入 NPC 决策引擎（照 smoke-npc-action-logic 同款沙箱）──
const chars = [
  { id: 'c1', name: 'ZhangSan', alive: true, loyalty: 65, ambition: 82, officialTitle: 'Minister', location: 'Capital' },
  { id: 'c2', name: 'LiSi', alive: true, loyalty: 50, ambition: 40, officialTitle: 'Clerk', location: 'Capital' }
];
const ctx = {
  console: console, Promise: Promise, Math: Math, Date: Date, JSON: JSON, Map: Map,
  Array: Array, Object: Object, String: String, Number: Number, RegExp: RegExp,
  setTimeout: function (fn) { return { fn: fn }; }, clearTimeout: function () {},
  P: { ai: {}, traitDefinitions: [], npcEngine: { enabled: true, behaviors: [] } },
  GM: {
    running: true, turn: 9, vars: {}, rels: {}, facs: [],
    guoku: { balance: 0, money: 0, ledgers: { money: { stock: 0 } } },
    corruption: { subDepts: {} }, chars: chars, armies: [], memorials: [], letters: [],
    _pendingNpcLetters: [], _pendingNpcCorrespondence: [], _pendingNpcConspiracies: [],
    _npcHiddenMoves: [], _pendingAudiences: [], _npcActionLedger: [], _npcPlans: [],
    _npcDecisionDiagnostics: [], _capital: 'Capital', provinceStats: {}, officeTree: []
  },
  addEB: function () {},
  random: function () { return 0.3; },
  findCharByName: function (n) { for (var i = 0; i < chars.length; i++) if (chars[i].name === n) return chars[i]; return null; }
};
ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
load(ctx, 'tm-npc-engine.js');
load(ctx, 'tm-npc-action-ledger.js');
load(ctx, 'tm-fiscal-engine.js');
load(ctx, 'tm-npc-decision.js');
load(ctx, 'tm-npc-decision-ai-driven.js');
assert(typeof ctx.executeObstructBehavior === 'function' && typeof ctx.executeSlanderBehavior === 'function', '③ 两行为函数在位');

// ── ② obstruct 落账原样 + 封顶 ──
ctx.executeObstructBehavior(chars[0], 'LiSi', { intent: '暗中作梗' }, {});
assert(ctx.GM._npcHiddenMoves.length === 1, '④ obstruct 落 _npcHiddenMoves(原有写端不破)');
var rec0 = ctx.GM._npcHiddenMoves[0];
assert(rec0.actor === 'ZhangSan' && rec0.target === 'LiSi' && rec0.visibility === 'hidden' && rec0.turn === 9, '⑤ obstruct 记录形状不变');

// ── ③ slander 双落账对齐 ──
ctx.executeSlanderBehavior(chars[0], 'LiSi', { intent: '谗言中伤' }, {});
assert(ctx.GM._npcHiddenMoves.length === 2, '⑥ slander 现亦落 _npcHiddenMoves(与 obstruct 对齐)');
var rec1 = ctx.GM._npcHiddenMoves[1];
assert(/^slander/.test(rec1.id) && rec1.actor === 'ZhangSan' && rec1.target === 'LiSi' && rec1.visibility === 'hidden', '⑦ slander 记录形状与 obstruct 同构');
assert(ctx.GM._npcInternalActionHistory && ctx.GM._npcInternalActionHistory.length >= 2, '⑧ InternalActionHistory 双落账仍在(不是搬家是对齐)');

// ── recency 惩罚读得到 slander 了 ──
var pen = ctx._npcRecentTargetPenalty(chars[0], 'slander', 'LiSi');
assert(typeof pen === 'number' && pen > 0, '⑨ 同人近攻讦 recency 惩罚>0(经 _npcHiddenMoves 读到)');

// ── 封顶40 ──
for (var i = 0; i < 50; i++) ctx.executeObstructBehavior(chars[0], 'T' + i, { intent: 'x' }, {});
assert(ctx.GM._npcHiddenMoves.length === 40, '⑩ obstruct 写端封顶40(只增不裁修毕)');
ctx.executeSlanderBehavior(chars[0], 'T99', { intent: 'y' }, {});
assert(ctx.GM._npcHiddenMoves.length === 40, '⑪ slander 写端同封顶');
assert(ctx.GM._npcHiddenMoves[39].target === 'T99', '⑫ 封顶裁旧留新');

console.log('smoke-hidden-moves-hygiene OK — ' + N + ' 断言全绿（死代码防复活/封顶/slander双落账对齐）');
