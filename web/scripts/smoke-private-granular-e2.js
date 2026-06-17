#!/usr/bin/env node
// smoke-private-granular-e2.js - E2 私产细粒度收支(shops/houses/familyBusiness/investments/debts)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function approx(a, b, e) { return Math.abs(a - b) <= (e || 0.5); }
function load(ctx, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }
function pw(over) { return { name: 'x', socialClass: 'landlord', resources: { privateWealth: over } }; }

function main() {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, Error, TypeError, RangeError,
    GM: { turn: 1, clans: {}, chars: [], guoku: {}, neitang: {}, corruption: { subDepts: {} }, facs: [], regions: {}, officeTree: [] },
    addEB: function() {}, random: function() { return 0.99; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  const I = CE.Income, E = CE.Expenses;

  // ── 细粒度 income(月值) ──
  assert(I.shopRevenue(pw({ shops: [{ annualRevenue: 12000 }] })) === 1000, '商铺营收 12000/12=1000');
  assert(I.businessProfit(pw({ familyBusiness: [{ annualProfit: 24000, partners: ['a', 'b'] }] })) === 1000, '家族企业 24000/2股/12=1000');
  assert(I.investmentReturn(pw({ investments: [{ principal: 120000, rate: 0.1 }] })) === 1000, '放贷息 12000/12=1000');
  assert(I.investmentReturn(pw({ investments: [{ principal: 120000, rate: 0.1, status: 'defaulted' }] })) === 0, '违约不计息');
  assert(approx(I.landRentDetail(pw({ landHoldings: [{ area: 240 }] })), 5), '田庄租 240×5×0.05/12=5, got ' + I.landRentDetail(pw({ landHoldings: [{ area: 240 }] })));

  // ── 数组盖扁平·防双计 ──
  let merchant = { name: 'm', socialClass: 'merchant', resources: { privateWealth: { commerce: 12000, shops: [{ annualRevenue: 6000 }] } } };
  assert(I.commerce(merchant) === 0, '有 shops[] 则扁平 commerce 跳过(防双计)');
  let landlord = { name: 'l', socialClass: 'landlord', resources: { privateWealth: { land: 1000, landHoldings: [{ area: 100 }] } } };
  assert(I.rent(landlord) === 0, '有 landHoldings[] 则扁平 rent 跳过');
  // 无数组时扁平照常
  assert(I.commerce({ socialClass: 'merchant', resources: { privateWealth: { commerce: 12000 } } }) === 80, '无 shops 扁平 commerce=80');

  // ── 细粒度 expenses ──
  assert(E.houseUpkeep(pw({ houses: [{ annualUpkeep: 12000, luxuryLevel: 5 }] })) === 1100, '宅维护 12000/12+5×20=1100, got ' + E.houseUpkeep(pw({ houses: [{ annualUpkeep: 12000, luxuryLevel: 5 }] })));
  assert(E.estate(pw({ land: 5000, houses: [{ annualUpkeep: 1200 }] })) === 0, '有 houses[] 则扁平 estate 跳过');
  assert(E.estate(pw({ land: 5000 })) === 50, '无 houses 扁平 estate=land×0.01=50');
  assert(E.debtService(pw({ debts: [{ amount: { money: 10000 }, monthlyRate: 0.02 }] })) === 200, '债务月息 10000×0.02=200');
  assert(E.debtInterest({ resources: { privateWealth: { money: -5000, debts: [{ amount: { money: 5000 } }] } } }) === 0, '有 debts[] 则扁平 debtInterest 跳过');

  // ── 全 tick:白名单入账(shopRevenue 真进 money) ──
  let shopkeeper = { name: 'sk', socialClass: 'merchant', resources: { privateWealth: { money: 10000, shops: [{ annualRevenue: 120000 }] } } };
  ctx.GM.chars.push(shopkeeper);
  CE.tickCharacter(shopkeeper, 1);
  assert(shopkeeper.resources.privateWealth.money > 15000, '全tick:商铺月入1万真入账(money>15000), got ' + Math.round(shopkeeper.resources.privateWealth.money));

  console.log('[smoke-private-granular-e2] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-private-granular-e2] FAIL'); console.error(err && err.stack || err); process.exit(1); }
