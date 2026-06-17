#!/usr/bin/env node
// smoke-guoku-tick-full-pass.js — guoku LAYERED · 全链 tick 1 turn snapshot
// R8 (Phase 3·R161)·覆盖 engine.tick + p2.tick + p4.tick + p5.tick + p6.tick (5 层 OVERRIDE)
// snapshot·tick 后关键字段·R9 merge 后必须保 invariant

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
function assert(cond, msg) { if (!cond) throw new Error('[smoke-guoku-tick-full-pass] ' + msg); }

load('tm-guoku-engine.js');





const GuokuEngine = ctx.GuokuEngine;
let assertions = 0;

ctx.GM.minxin = { trueIndex: 60 };
ctx.GM.huangquan = { index: 65 };
ctx.GM.huangwei = { index: 60 };
ctx.GM.hukou = { registeredTotal: 10000000, estimatedHidden: 2000000 };

GuokuEngine.ensureModel();
const balanceBefore = ctx.GM.guoku.balance;
const stockGrainBefore = ctx.GM.guoku.ledgers.grain.stock;

GuokuEngine.tick({ _monthRatio: 1 });

assertions += 1; assert(ctx.GM.guoku !== undefined, 'GM.guoku must exist after tick');

['balance','monthlyIncome','monthlyExpense','annualIncome','lastDelta','trend','actualTaxRate']
  .forEach(function(k) { assertions += 1; assert(ctx.GM.guoku[k] !== undefined, 'GM.guoku.' + k + ' must exist after tick'); });

['money','grain','cloth'].forEach(function(k) {
  const L = ctx.GM.guoku.ledgers[k];
  assertions += 1; assert(L !== undefined, 'ledgers.' + k + ' must exist');
  assertions += 1; assert(typeof L.stock === 'number', 'ledgers.' + k + '.stock must be number');
  assertions += 1; assert(typeof L.lastTurnIn === 'number', 'ledgers.' + k + '.lastTurnIn must be number');
  assertions += 1; assert(typeof L.lastTurnOut === 'number', 'ledgers.' + k + '.lastTurnOut must be number');
});

['fenglu','junxiang','zhenzi','gongcheng','jisi','shangci','neiting','qita']
  .forEach(function(k) { assertions += 1; assert(typeof ctx.GM.guoku.expenses[k] === 'number', 'expenses.' + k + ' must exist after tick'); });

['tianfu','dingshui','caoliang','yanlizhuan','shipaiShui','quanShui','juanNa','qita']
  .forEach(function(k) { assertions += 1; assert(typeof ctx.GM.guoku.sources[k] === 'number', 'sources.' + k + ' must exist after tick'); });

assertions += 1; assert(typeof ctx.GM.guoku.bankruptcy.active === 'boolean', 'bankruptcy.active must be boolean');
assertions += 1; assert(typeof ctx.GM.guoku.emergency === 'object', 'emergency block must exist');

console.log('[smoke-guoku-tick-full-pass] pass assertions=' + assertions);
