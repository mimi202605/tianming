#!/usr/bin/env node
// smoke-guoku-loan-and-bankruptcy.js — guoku LAYERED · p5 LOAN_SOURCES + bankruptcy
// R8 (Phase 3·R161)·3 借贷源 (盐商/钱商/外邦) + 副作用 + bankruptcy 联动

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
function assert(cond, msg) { if (!cond) throw new Error('[smoke-guoku-loan-and-bankruptcy] ' + msg); }

load('tm-guoku-engine.js');





const GuokuEngine = ctx.GuokuEngine;
let assertions = 0;

GuokuEngine.ensureModel();

// ── 3 借贷源存在 ──
['saltMerchant','moneyMerchant','foreignLoan'].forEach(function(sid) {
  assertions += 1; assert(GuokuEngine.LOAN_SOURCES[sid] !== undefined, sid + ' must be in LOAN_SOURCES');
});

// ── case 1·saltMerchant·100k·12 月 ──
ctx.GM.guoku.balance = 100000;
const beforeBal1 = ctx.GM.guoku.balance;
const r1 = GuokuEngine.takeLoanBySource('saltMerchant', 100000, 12);
assertions += 1; assert(r1.success === true, 'saltMerchant loan should succeed');
assertions += 1; assert(ctx.GM.guoku.balance === beforeBal1 + 100000, 'balance should +100000');
assertions += 1; assert(Array.isArray(ctx.GM.guoku.emergency.loans), 'emergency.loans must be array');
assertions += 1; assert(ctx.GM.guoku.emergency.loans.length === 1, 'emergency.loans should have 1 entry');
assertions += 1; assert(ctx.GM.guoku.emergency.loans[0].source === 'saltMerchant', 'loan source should be saltMerchant');
assertions += 1; assert(ctx.GM.guoku.emergency.loan.active === true, 'emergency.loan.active should be true');

// ── case 2·foreignLoan·副作用 (huangwei -5·minxin -3) ──
ctx.GM.huangwei = { index: 60 };
ctx.GM.minxin = { trueIndex: 60 };
GuokuEngine.takeLoanBySource('foreignLoan', 200000, 24);
assertions += 1; assert(ctx.GM.huangwei.index === 55, 'foreignLoan should -5 huangwei');
assertions += 1; assert(ctx.GM.minxin.trueIndex === 57, 'foreignLoan should -3 minxin');
assertions += 1; assert(ctx.GM.guoku.emergency.loans.length === 2, 'should have 2 loans now');

// ── case 3·moneyMerchant·中性·无副作用 ──
ctx.GM.huangquan = { index: 60 };
const huangquanBefore = ctx.GM.huangquan.index;
GuokuEngine.takeLoanBySource('moneyMerchant', 100000);
assertions += 1; assert(ctx.GM.huangquan.index === huangquanBefore, 'moneyMerchant should be 中性·huangquan unchanged');
assertions += 1; assert(ctx.GM.guoku.emergency.loans.length === 3, 'should have 3 loans now');

// ── case 4·max amount cap ──
ctx.GM.guoku.balance = 0;
const r4 = GuokuEngine.takeLoanBySource('saltMerchant', 9999999);  // max 300000
assertions += 1; assert(r4.success === true, 'over-max loan should still succeed (capped)');
assertions += 1; assert(ctx.GM.guoku.balance <= 300001, 'balance after cap should be <= 300001');

// ── case 5·unknown source rejected ──
const r5 = GuokuEngine.takeLoanBySource('unknownLoan', 100000);
assertions += 1; assert(r5.success === false, 'unknown source must be rejected');

// ── case 6·bankruptcy state·negative balance ──
ctx.GM.guoku.balance = -100000;
GuokuEngine.checkBankruptcy();
assertions += 1; assert(typeof ctx.GM.guoku.bankruptcy.consecutiveMonths === 'number', 'bankruptcy.consecutiveMonths must be numeric');

console.log('[smoke-guoku-loan-and-bankruptcy] pass assertions=' + assertions);
