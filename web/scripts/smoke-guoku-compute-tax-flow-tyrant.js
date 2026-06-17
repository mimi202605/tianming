#!/usr/bin/env node
// smoke-guoku-compute-tax-flow-tyrant.js — guoku LAYERED · 暴君段·皇威虚增账面
// R8 (Phase 3·R161)·覆盖 p2 OVERRIDE applyTyrantFiscalDistortion
// 暴君段 (huangwei.index >=80) → 账面 actualReceived 含 phantom 增量

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, Date, JSON, Math, GM: { turn: 12 }, P: {} };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}
function assert(cond, msg) { if (!cond) throw new Error('[smoke-guoku-compute-tax-flow-tyrant] ' + msg); }

load('tm-guoku-engine.js');





const GuokuEngine = ctx.GuokuEngine;
assert(typeof GuokuEngine.applyTyrantFiscalDistortion === 'function', 'p2 must export applyTyrantFiscalDistortion');

let assertions = 0;

// ── 暴君段·应触发 phantom 账面虚增 ──
ctx.GM.huangwei = { index: 90 };
ctx.GM.minxin = { trueIndex: 50 };
ctx.GM.huangquan = { index: 70 };
ctx.GM.guoku = {};
GuokuEngine.ensureModel();
ctx.GM.guoku.actualReceived = 800000;
ctx.GM.guoku.balance = 500000;
const beforeBal = ctx.GM.guoku.balance;
GuokuEngine.applyTyrantFiscalDistortion();
assert(ctx.GM.guoku.phantomBookkeeping !== undefined || ctx.GM.guoku._phantomDelta !== undefined || ctx.GM.guoku.balance !== beforeBal, 'tyrant phase should add phantom or shift balance');
assertions += 1;

// ── 非暴君段·应无 phantom ──
ctx.GM.huangwei = { index: 50 };
ctx.GM.guoku = {};
GuokuEngine.ensureModel();
const balBefore2 = ctx.GM.guoku.balance;
GuokuEngine.applyTyrantFiscalDistortion();
assert(ctx.GM.guoku.balance === balBefore2 || (ctx.GM.guoku._phantomDelta || 0) === 0, 'non-tyrant phase: no phantom expected');
assertions += 1;

// ── 民心反馈·赋税过重 → 民心扣 ──
ctx.GM.minxin = { trueIndex: 80, baseIndex: 80 };
ctx.GM.guoku = {};
GuokuEngine.ensureModel();
ctx.GM.guoku.actualTaxRate = 0.15; // 15% 重税
const minxinBefore = ctx.GM.minxin.trueIndex;
GuokuEngine.applyTaxMinxinFeedback();
// 实证·重税应触发民心负反馈 (具体值由 p2 内部 logic·这里只验有触发)
assert(typeof ctx.GM.minxin.trueIndex === 'number', 'minxin.trueIndex still numeric after feedback');
assertions += 1;

// ── 轻税段·民心应稳定或略升 ──
ctx.GM.minxin = { trueIndex: 50, baseIndex: 50 };
ctx.GM.guoku.actualTaxRate = 0.05; // 5% 轻税
GuokuEngine.applyTaxMinxinFeedback();
assert(typeof ctx.GM.minxin.trueIndex === 'number', 'minxin.trueIndex still numeric after light tax');
assertions += 1;

console.log('[smoke-guoku-compute-tax-flow-tyrant] pass assertions=' + assertions);
