#!/usr/bin/env node
// smoke-guoku-init-from-dynasty.js — guoku LAYERED · p4 initFromDynasty OVERRIDE
// R8 (Phase 3·R161)·12 朝代 × 4 phase 启动余额计算

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, Date, JSON, Math, GM: { turn: 0 }, P: {} };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}
function assert(cond, msg) { if (!cond) throw new Error('[smoke-guoku-init-from-dynasty] ' + msg); }

load('tm-guoku-engine.js');





const GuokuEngine = ctx.GuokuEngine;
let assertions = 0;

// ── case 1·明·peak (1.8x) ──
ctx.GM.guoku = undefined;
GuokuEngine.initFromDynasty('明', 'peak');
assertions += 1; assert(ctx.GM.guoku.monthlyIncome === Math.round(80000 * 1.8), 'Ming peak monthlyIncome should be 144000');
assertions += 1; assert(ctx.GM.guoku.balance === Math.round(80000 * 1.8 * 6), 'Ming peak balance should be 6 months');

// ── case 2·清·peak (2.5x·最高) ──
ctx.GM.guoku = undefined;
GuokuEngine.initFromDynasty('清', 'peak');
assertions += 1; assert(ctx.GM.guoku.monthlyIncome === Math.round(80000 * 2.5), 'Qing peak monthlyIncome should be 200000');

// ── case 3·五代·collapse (0.3x·最低) ──
ctx.GM.guoku = undefined;
GuokuEngine.initFromDynasty('五代', 'collapse');
assertions += 1; assert(ctx.GM.guoku.monthlyIncome === Math.round(80000 * 0.3), 'Wudai collapse monthlyIncome should be 24000');

// ── case 4·中文 phase '开国' = founding ──
ctx.GM.guoku = undefined;
GuokuEngine.initFromDynasty('唐', '开国');
assertions += 1; assert(ctx.GM.guoku.monthlyIncome === Math.round(80000 * 1.2), 'Tang 开国 monthlyIncome should be 96000 (founding=1.2)');

// ── case 5·未知朝代 fallback ──
ctx.GM.guoku = undefined;
GuokuEngine.initFromDynasty('虚构朝', 'peak');
assertions += 1; assert(ctx.GM.guoku.monthlyIncome === Math.round(80000 * 1.0), 'unknown dynasty fallback should be 1.0x');

// ── case 6·scenario override·initialMoney ──
ctx.GM.guoku = undefined;
GuokuEngine.initFromDynasty('明', 'peak', { guoku: { initialMoney: 500000 } });
assertions += 1; assert(ctx.GM.guoku.balance === 500000, 'scenario initialMoney should override balance');
assertions += 1; assert(ctx.GM.guoku.ledgers.money.stock === 500000, 'scenario initialMoney should also set ledgers.money.stock');

// ── case 7·p4 unit override ──
ctx.GM.guoku = undefined;
GuokuEngine.initFromDynasty('唐', 'peak', { fiscalConfig: { unit: { money: '贯', grain: '斛', cloth: '段' } } });
assertions += 1; assert(ctx.GM.guoku.unit.money === '贯', 'p4 unit override·money should be 贯');
assertions += 1; assert(ctx.GM.guoku.unit.grain === '斛', 'p4 unit override·grain should be 斛');
assertions += 1; assert(ctx.GM.guoku.unit.cloth === '段', 'p4 unit override·cloth should be 段');

console.log('[smoke-guoku-init-from-dynasty] pass assertions=' + assertions);
