#!/usr/bin/env node
// scripts/smoke-dismissal-state-regex.js
// 2026-05-21·锁住 onDismissal 状态 regex·防止过宽误判
//
// Bug 历史·原 regex 含单字「押」「拘」「逃」「遁」「匿」过宽·误判·
//   押解/押粮/押司/签押/押韵/拘谨/拘泥/拘束/逃避/隐遁/匿名 → false positive
//   character._imprisoned/_exiled/_fled 被永久误标·导致问对/朝议/时政 UI 全部排除该人物
//
// 修复·
//   1. 改用必须的入狱/流放/逃亡 compound·去除单字模糊匹配
//   2. 加 release/起复 路径清反向字段

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ ' + msg); }
}

function makeCtx() {
  const ctx = { console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat,
    setTimeout: () => 0, clearTimeout: () => {}, Error
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['tm-ai-change-pathutils.js', 'tm-ai-change-army.js', 'tm-ai-change-narrative.js', 'tm-ai-change-applier.js'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f}));

  ctx.GM = {
    turn: 5, chars: [], facs: [{ name: '明朝廷' }],
    officeTree: [],  // _clearAll(G.officeTree || []) walks this as array
    _turnReport: [], publicTreasury: {},
    guoku: { money: 1000 }, neitang: { money: 500 }
  };
  ctx.P = { playerInfo: { factionName: '明朝廷' } };
  return ctx;
}

function addChar(ctx, name) {
  const ch = { name, position: '兵部尚书', loyalty: 60, alive: true, faction: '明朝廷', _resources: {} };
  ctx.GM.chars.push(ch);
  return ch;
}

// ── 不该被误判为入狱的 reason ──
const NOT_IMPRISON_CASES = [
  '因拘谨保守不胜重任',     // 拘 lone in 拘谨 (personality)
  '押解粮饷不力',           // 押 in 押解 (escort grain)
  '因拘泥旧礼',             // 拘 in 拘泥 (pedantic)
  '宋朝押司',               // 押司 — Song clerk title
  '签押有误',               // 签押 — sign+seal
  '押韵不工',               // 押韵 — rhyme
  '拘束失措',               // 拘束 — restrained personality
  '正常考核降职',           // control — neutral
];

// ── 该被判为入狱的 reason ──
const IMPRISON_CASES = [
  '下狱待决',
  '羁押在京',
  '拘押审查',
  '关押刑部',
  '拘禁三月',
  '逮捕归案',
  '入狱',
  '系狱',
  '缉拿归案',
  '收押大牢',
];

// ── 释放/赦免类·应清 _imprisoned ──
const RELEASE_CASES = [
  '释放归田',
  '赦免出狱',
  '大赦天下',
  '平反昭雪',
  '宽释无罪',
];

// ── 不该被误判为逃亡的 reason ──
const NOT_FLED_CASES = [
  '逃避责任',               // 逃 in 逃避 (avoid)
  '隐遁山林修道',           // 遁 in 隐遁 (hermit)
  '匿名上书',               // 匿 in 匿名 (anonymous)
];

// ── 该被判为逃亡的 reason ──
const FLED_CASES = [
  '畏罪潜逃',
  '出奔后金',
  '外逃失踪',
  '不知所终',
];

let ctx = makeCtx();
let i = 0;

console.log('===== 入狱 false-positive 检测·应不中 =====');
NOT_IMPRISON_CASES.forEach(reason => {
  const name = 'char_imp_neg_' + (i++);
  const ch = addChar(ctx, name);
  ctx.AIChangeApplier.onDismissal(name, reason);
  assert(!ch._imprisoned, `"${reason}" should NOT set _imprisoned (got ${ch._imprisoned})`);
});

console.log('===== 入狱 true-positive 检测·应中 =====');
IMPRISON_CASES.forEach(reason => {
  const name = 'char_imp_pos_' + (i++);
  const ch = addChar(ctx, name);
  ctx.AIChangeApplier.onDismissal(name, reason);
  assert(ch._imprisoned === true, `"${reason}" SHOULD set _imprisoned (got ${ch._imprisoned})`);
});

console.log('===== 释放·清 _imprisoned =====');
RELEASE_CASES.forEach(reason => {
  const name = 'char_rel_' + (i++);
  const ch = addChar(ctx, name);
  ch._imprisoned = true;
  ch._imprisonedTurn = 1;
  ctx.AIChangeApplier.onDismissal(name, reason);
  assert(ch._imprisoned === false, `"${reason}" should CLEAR _imprisoned (got ${ch._imprisoned})`);
});

console.log('===== 逃亡 false-positive·应不中 =====');
NOT_FLED_CASES.forEach(reason => {
  const name = 'char_fled_neg_' + (i++);
  const ch = addChar(ctx, name);
  ctx.AIChangeApplier.onDismissal(name, reason);
  assert(!ch._fled, `"${reason}" should NOT set _fled (got ${ch._fled})`);
});

console.log('===== 逃亡 true-positive·应中 =====');
FLED_CASES.forEach(reason => {
  const name = 'char_fled_pos_' + (i++);
  const ch = addChar(ctx, name);
  ctx.AIChangeApplier.onDismissal(name, reason);
  assert(ch._fled === true, `"${reason}" SHOULD set _fled (got ${ch._fled})`);
});

console.log('===== 召回·清流放/致仕/逃亡 =====');
[['流放', '_exiled'], ['致仕', '_retired'], ['逃亡', '_fled']].forEach(([setReason, field]) => {
  const name = 'char_recall_' + (i++);
  const ch = addChar(ctx, name);
  ctx.AIChangeApplier.onDismissal(name, setReason);
  assert(ch[field] === true, `setup·"${setReason}" should set ${field}`);
  ctx.AIChangeApplier.onDismissal(name, '召回起复');
  assert(ch[field] === false, `"召回起复" should CLEAR ${field} (got ${ch[field]})`);
});

console.log('');
console.log(`[smoke-dismissal-state-regex] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
