#!/usr/bin/env node
// smoke-guoku-enact-reform.js — guoku LAYERED · p4 APPEND enactReform
// R8 (Phase 3·R161)·4 大改革 (两税法/方田均税/一条鞭/摊丁入亩) 生命周期

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
function assert(cond, msg) { if (!cond) throw new Error('[smoke-guoku-enact-reform] ' + msg); }

load('tm-guoku-engine.js');





const GuokuEngine = ctx.GuokuEngine;
let assertions = 0;

// ── 4 大改革注册存在 ──
['twoTax','fieldEquity','oneWhip','tanDingRuMu'].forEach(function(rid) {
  assertions += 1; assert(GuokuEngine.FISCAL_REFORMS[rid] !== undefined, rid + ' must be in FISCAL_REFORMS');
});

GuokuEngine.ensureModel();

// ── case 1·canEnactReform·前提不足应拒 ──
ctx.GM.huangquan = { index: 30 };
ctx.GM.huangwei = { index: 30 };
ctx.GM.minxin = { trueIndex: 30 };
const can1 = GuokuEngine.canEnactReform('twoTax');
assertions += 1; assert(can1.can === false, 'twoTax should be blocked when prereq fails');
assertions += 1; assert(typeof can1.reason === 'string', 'reason must be string');

// ── case 2·满足前提·应允许 ──
ctx.GM.huangquan = { index: 60 };
ctx.GM.huangwei = { index: 60 };
ctx.GM.minxin = { trueIndex: 50 };
const can2 = GuokuEngine.canEnactReform('twoTax');
assertions += 1; assert(can2.can === true, 'twoTax should be allowed when prereq met');

// ── case 3·enactReform·成功后入 ongoingReforms ──
const r1 = GuokuEngine.enactReform('twoTax');
assertions += 1; assert(r1 !== undefined, 'enactReform should return result');
assertions += 1; assert(Array.isArray(ctx.GM.guoku.ongoingReforms), 'ongoingReforms should be array');
assertions += 1; assert(ctx.GM.guoku.ongoingReforms.some(function(o) { return o.id === 'twoTax'; }), 'twoTax should be in ongoingReforms');

// ── case 4·重复 enactReform·应拒 ──
const can3 = GuokuEngine.canEnactReform('twoTax');
assertions += 1; assert(can3.can === false, 'duplicate enactReform should be blocked');

// ── case 5·tickReforms·一段时间后完成 ──
ctx.GM.guoku.balance = 1000000;
ctx.GM.guoku.monthlyIncome = 80000;
for (let i = 0; i < 13; i++) {  // twoTax durationMonths=12
  GuokuEngine.tickReforms(1);
}
assertions += 1; assert(ctx.GM.guoku.completedReforms !== undefined, 'completedReforms must exist after ticks');
assertions += 1; assert(Array.isArray(ctx.GM.guoku.completedReforms), 'completedReforms must be array');

// ── case 6·oneWhip 满足前提 ──
ctx.GM.huangquan = { index: 65 };
ctx.GM.huangwei = { index: 65 };
ctx.GM.minxin = { trueIndex: 50 };
const can4 = GuokuEngine.canEnactReform('oneWhip');
assertions += 1; assert(can4.can === true, 'oneWhip should be allowed under fitting prereqs');

// ── case 7·tanDingRuMu 高门槛 ──
ctx.GM.huangquan = { index: 70 };
ctx.GM.huangwei = { index: 75 };
const can5 = GuokuEngine.canEnactReform('tanDingRuMu');
assertions += 1; assert(can5.can === true, 'tanDingRuMu should be allowed with huangquan>=65 huangwei>=70');

console.log('[smoke-guoku-enact-reform] pass assertions=' + assertions);
