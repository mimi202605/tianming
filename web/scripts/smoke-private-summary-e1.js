#!/usr/bin/env node
// smoke-private-summary-e1.js - E1 私产五大类数组 overlay + _calcPrivateSummary(向后兼容)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function load(ctx, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }

function main() {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, Error, TypeError, RangeError,
    GM: { turn: 1, clans: {}, chars: [], guoku: {}, neitang: {}, corruption: { subDepts: {} }, facs: [], regions: {}, officeTree: [] },
    addEB: function() {}, random: function() { return 0.5; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  const S = CE.calcPrivateSummary;
  assert(typeof S === 'function', 'calcPrivateSummary 导出');

  // ── 扁平回退(无数组·向后兼容) ── money5000 + land100×5 + treasure2000 + commerce1000 - debt500 = 8000
  let ch = { name: 'flat', resources: { privateWealth: { money: 5000, grain: 0, cloth: 0, land: 100, treasure: 2000, commerce: 1000, debt: 500 } } };
  let sum = S(ch);
  assert(sum.money === 8000, '扁平回退 money=8000, got ' + sum.money);
  assert(sum.totalValue.money === 8000, 'totalValue 一致');

  // ── 数组明细折算(数组在则盖扁平) ──
  ch = { name: 'rich', resources: { privateWealth: {
    money: 5000, grain: 0, cloth: 0, commerce: 1000,
    land: 100, treasure: 999, debt: 9999,   // 这三个扁平值应被数组盖掉
    landHoldings: [{ area: 200, yieldPerYear: { grain: 8000 } }],   // 200×5=1000 + grain8000
    houses: [{ estimatedValue: 30000 }],
    shops: [{ annualRevenue: 5000 }],         // ×3 = 15000
    treasures: [{ estimatedValue: 10000 }],
    familyBusiness: [{ annualProfit: 2000 }], // ×3 = 6000
    investments: [{ principal: 5000 }],
    debts: [{ amount: { money: 3000 } }]
  } } };
  sum = S(ch);
  // 5000 +1000(land) +30000 +15000 +10000 +6000 +1000(commerce) +5000(invest) -3000(debt) = 70000
  assert(sum.money === 70000, '数组明细 money=70000, got ' + sum.money);
  assert(sum.grain === 8000, '田产年产粮入 grain=8000, got ' + sum.grain);

  // ── 数组覆盖确认:land/treasure/debt 扁平值确实未被双计 ──
  // 若误用扁平: 会多加 land100×5=500 + treasure999 - debt(9999 instead of 3000) 等 → 数值会变
  assert(sum.money === 70000, '扁平 land/treasure/debt 未与数组双计');

  // ── 负值场景(债务>资产) ──
  ch = { name: 'broke', resources: { privateWealth: { money: 1000, debts: [{ amount: { money: 50000 } }] } } };
  sum = S(ch);
  assert(sum.money === -49000, '资不抵债 money=-49000, got ' + sum.money);

  // ── 随 buildEconomySnapshot 注入 ──
  const snap = CE.buildEconomySnapshot({ name: 's', resources: { privateWealth: { money: 5000, land: 100, treasure: 2000, commerce: 1000, debt: 500 } } });
  assert(snap && snap.privateSummary && snap.privateSummary.money === 8000, 'snapshot 含 privateSummary, got ' + (snap && snap.privateSummary && snap.privateSummary.money));

  console.log('[smoke-private-summary-e1] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-private-summary-e1] FAIL'); console.error(err && err.stack || err); process.exit(1); }
