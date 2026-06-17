#!/usr/bin/env node
// smoke-guoku-compute-tax-flow.js — guoku LAYERED 5 层链 · computeTaxFlow 行为快照
// R8 (Phase 3·R161)·覆盖 p2 OVERRIDE (民心顺从度+皇权可支配+皇威虚账)
// R9 merge 前 baseline·锁定 compliance/huangquanMult 数值

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
function assert(cond, msg) { if (!cond) throw new Error('[smoke-guoku-compute-tax-flow] ' + msg); }

load('tm-guoku-engine.js');





const GuokuEngine = ctx.GuokuEngine;
assert(GuokuEngine, 'GuokuEngine must be exported');
assert(typeof GuokuEngine.computeTaxFlow === 'function', 'computeTaxFlow must be function');

let assertions = 0;

// ── case 1·中性 (民心 50·皇权 50) ──
ctx.GM.minxin = { trueIndex: 50 };
ctx.GM.huangquan = { index: 50 };
ctx.GM.huangwei = { index: 50 };
const r1 = GuokuEngine.computeTaxFlow(1200000);
assert(r1.nominal === 1200000, 'r1.nominal should be 1200000');
assert(r1.compliance > 0.6 && r1.compliance < 0.7, 'r1.compliance ~ 0.65 (50/100*0.7+0.3=0.65)');
assert(r1.huangquanMult >= 0.85 && r1.huangquanMult <= 0.86, 'r1.huangquanMult ~ 0.85 for 35<=h<60');
assertions += 3;

// ── case 2·民心高 (80)·正常段 (60<=h<=80) ──
ctx.GM.minxin.trueIndex = 80;
ctx.GM.huangquan.index = 70;
const r2 = GuokuEngine.computeTaxFlow(1000000);
assert(r2.compliance >= 0.85 && r2.compliance <= 0.87, 'r2.compliance ~ 0.86 (80/100*0.7+0.3=0.86)');
assert(r2.huangquanMult === 1.0, 'r2.huangquanMult must be 1.0 for 60<=h<=80 (default)');
assertions += 2;

// ── case 3·民心低 (20)·权臣段 (h<35) ──
ctx.GM.minxin.trueIndex = 20;
ctx.GM.huangquan.index = 30;
const r3 = GuokuEngine.computeTaxFlow(800000);
assert(r3.compliance >= 0.4 && r3.compliance <= 0.45, 'r3.compliance ~ 0.44 (20/100*0.7+0.3=0.44)');
assert(r3.huangquanMult === 0.5, 'r3.huangquanMult must be 0.5 for h<35 (权臣段)');
assertions += 2;

// ── case 4·专制段 (h>80) ──
ctx.GM.minxin.trueIndex = 60;
ctx.GM.huangquan.index = 90;
const r4 = GuokuEngine.computeTaxFlow(1500000);
assert(r4.huangquanMult === 1.05, 'r4.huangquanMult must be 1.05 for h>80 (专制段)');
assertions += 1;

// ── case 5·result 结构完整 ──
['nominal','actualReceived','peasantPaid','leakageRate','overCollectRate','purchasingPower','compliance','huangquanMult'].forEach(function(k){
  assert(typeof r4[k] === 'number', 'r4.' + k + ' must be number');
});
assertions += 8;

// ── case 6·compliance 下限保护 (>=0.3) ──
ctx.GM.minxin.trueIndex = 0;
const r5 = GuokuEngine.computeTaxFlow(500000);
assert(r5.compliance >= 0.3, 'r5.compliance must be >= 0.3 (lower bound)');
assertions += 1;

console.log('[smoke-guoku-compute-tax-flow] pass assertions=' + assertions);
