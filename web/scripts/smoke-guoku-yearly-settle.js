#!/usr/bin/env node
// smoke-guoku-yearly-settle.js — guoku LAYERED · p4 yearlySettle OVERRIDE
// R8 (Phase 3·R161)·年度决算 archive·history.yearly snapshot

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
function assert(cond, msg) { if (!cond) throw new Error('[smoke-guoku-yearly-settle] ' + msg); }

load('tm-guoku-engine.js');





const GuokuEngine = ctx.GuokuEngine;
let assertions = 0;

GuokuEngine.ensureModel();

// ── 设置年初 baseline ──
ctx.GM.guoku.balance = 800000;
ctx.GM.guoku.annualIncome = 1000000;
ctx.GM.guoku.monthlyIncome = 90000;
ctx.GM.guoku.monthlyExpense = 75000;

const beforeYearlyLen = (ctx.GM.guoku.history.yearly || []).length;
GuokuEngine.yearlySettle();

// ── archive 字段验证 ──
assertions += 1; assert(Array.isArray(ctx.GM.guoku.history.yearly), 'history.yearly must be array');
assertions += 1; assert(ctx.GM.guoku.history.yearly.length === beforeYearlyLen + 1, 'yearly len should +1 after settle');

const lastEntry = ctx.GM.guoku.history.yearly[ctx.GM.guoku.history.yearly.length - 1];
assertions += 1; assert(lastEntry !== undefined, 'last yearly entry must exist');
assertions += 1; assert(typeof lastEntry === 'object', 'last entry must be object');

// ── 多次调用·archive 可累积 ──
GuokuEngine.yearlySettle();
GuokuEngine.yearlySettle();
assertions += 1; assert(ctx.GM.guoku.history.yearly.length === beforeYearlyLen + 3, 'yearly archive should accumulate');

// ── annualIncome reset 或 carry-over ──
assertions += 1; assert(typeof ctx.GM.guoku.annualIncome === 'number', 'annualIncome must remain numeric after settle');

console.log('[smoke-guoku-yearly-settle] pass assertions=' + assertions);
