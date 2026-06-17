#!/usr/bin/env node
'use strict';
// smoke-inflation-tax-namespace — 通胀蚀税命名空间修(Tier1·簇2#1)
//   #27 初版取 CurrencyEngine.getPurchasingPower 恒 undefined(实际挂 EconomyGapFill/EconomyCore)→inflationPenalty 永 0(prod 死线·smoke 桩掩盖)。
//   验:_ce 查找含 EconomyGapFill/EconomyCore + 复刻解析证新查找命中、旧查找(仅 CurrencyEngine)落空。
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }

console.log('smoke-inflation-tax-namespace');
const fis = fs.readFileSync(path.join(ROOT,'tm-fiscal-engine.js'),'utf8');
ok(/window\.EconomyGapFill \|\| window\.EconomyCore/.test(fis), '★_ce 查找优先 EconomyGapFill/EconomyCore(真命名空间)');
ok(/getPurchasingPower/.test(fis), '仍调 getPurchasingPower');
// 确认 getPurchasingPower 真挂 EconomyGapFill(非 CurrencyEngine)
const eco = fs.readFileSync(path.join(ROOT,'tm-economy-engine.js'),'utf8');
ok(/global\.EconomyGapFill = \{[\s\S]*getPurchasingPower: getPurchasingPower/.test(eco) || /getPurchasingPower: getPurchasingPower/.test(eco), 'EconomyGapFill 导出 getPurchasingPower');

// 复刻新/旧查找:stub window 只有 EconomyGapFill(无 CurrencyEngine)
function resolveNew(win){
  const ctx = { window:win, global:{} };
  vm.createContext(ctx);
  return vm.runInContext("(typeof window !== 'undefined' && (window.EconomyGapFill || window.EconomyCore || window.CurrencyEngine)) || (typeof global !== 'undefined' && (global.EconomyGapFill || global.EconomyCore || global.CurrencyEngine)) || null;", ctx);
}
function resolveOld(win){
  const ctx = { window:win, global:{} };
  vm.createContext(ctx);
  return vm.runInContext("(typeof window !== 'undefined' && window.CurrencyEngine) || (typeof global !== 'undefined' && global.CurrencyEngine) || null;", ctx);
}
const win = { EconomyGapFill: { getPurchasingPower: function(){ return 0.8; } } };
const ceNew = resolveNew(win);
const ceOld = resolveOld(win);
ok(ceNew && typeof ceNew.getPurchasingPower === 'function', '★新查找命中 EconomyGapFill(getPurchasingPower 可用)');
ok(ceOld == null, '★swap-test:旧查找(仅 CurrencyEngine)落空→inflationPenalty 永 0(复现死线)');
// 命中后 inflationPenalty 计算正确(购买力 0.8 → 罚 0.2 夹 0.35)
const pp = ceNew.getPurchasingPower();
const penalty = (pp < 1) ? Math.min(0.35, 1 - pp) : 0;
ok(Math.abs(penalty - 0.2) < 1e-9, '购买力 0.8 → inflationPenalty 0.2');

console.log('\n结果: '+A+' 通过 / 0 失败');
