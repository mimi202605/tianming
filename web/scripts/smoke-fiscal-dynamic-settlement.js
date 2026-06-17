#!/usr/bin/env node
// Regression smoke for AI fiscal_adjustments entering live fiscal settlement.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed++;
}

function near(actual, expected, msg) {
  const diff = Math.abs(Number(actual) - Number(expected));
  assert(diff < 1e-6, `${msg}: expected ${expected}, got ${actual}`);
}

const ctx = {
  console,
  Math,
  Date,
  JSON,
  Array,
  Object,
  Number,
  String,
  RegExp,
  parseFloat,
  parseInt,
  isFinite,
  setTimeout: function() {},
  clearTimeout: function() {},
  document: { readyState: 'complete', addEventListener: function() {} },
  addEventListener: function() {},
  addEB: function() {},
  toast: function() {},
  renderTopBarVars: function() {},
  getTSText: function(turn) { return 'T' + turn; },
  _getDaysPerTurn: function() { return 30; }
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.TM = { errors: { capture: function() {}, captureSilent: function() {} } };

vm.createContext(ctx);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

load('tm-guoku-engine.js');
load('tm-neitang-engine.js');
load('tm-ai-change-pathutils.js'); load('tm-ai-change-army.js'); load('tm-ai-change-narrative.js'); load('tm-ai-change-applier.js');

function resetGM(turn) {
  ctx.GM = {
    turn: turn || 1,
    hukou: { registeredTotal: 10000000, households: 2000000, ding: 2500000 },
    minxin: { trueIndex: 65 },
    huangquan: { index: 70 },
    huangwei: { index: 70 },
    corruption: { subDepts: {}, sources: {} },
    chars: [],
    facs: [],
    parties: [],
    classes: [],
    armies: [],
    _turnReport: [],
    turnChanges: { variables: [], characters: [] }
  };
  return ctx.GM;
}

function settleGuoku(extraIncome, extraExpense) {
  const G = resetGM(30);
  ctx.GuokuEngine.ensureModel();
  G.guoku.balance = 1000000;
  G.guoku.money = 1000000;
  G.guoku.ledgers.money.stock = 1000000;
  G.guoku.extraIncome = extraIncome || [];
  G.guoku.extraExpense = extraExpense || [];
  ctx.GuokuEngine.monthlySettle(1);
  return {
    delta: G.guoku.lastDelta,
    sources: G.guoku.ledgers.money.sources || {},
    sinks: G.guoku.ledgers.money.sinks || {},
    balance: G.guoku.balance,
    money: G.guoku.money,
    stock: G.guoku.ledgers.money.stock
  };
}

function settleNeitang(extraIncome, extraExpense) {
  const G = resetGM(31);
  ctx.NeitangEngine.ensureModel();
  G.neitang.balance = 500000;
  G.neitang.money = 500000;
  G.neitang.ledgers.money.stock = 500000;
  G.neitang.extraIncome = extraIncome || [];
  G.neitang.extraExpense = extraExpense || [];
  ctx.NeitangEngine.monthlySettle(1);
  return {
    delta: G.neitang.lastDelta,
    sources: G.neitang.ledgers.money.sources || {},
    sinks: G.neitang.ledgers.money.sinks || {},
    balance: G.neitang.balance,
    money: G.neitang.money,
    stock: G.neitang.ledgers.money.stock
  };
}

// 1. Guoku recurring income/expense should affect later monthly settlement pro rata.
const guokuBase = settleGuoku([], []);
const guokuDyn = settleGuoku(
  [{ name: 'New Salt Surcharge', resource: 'money', amount: 120000, recurring: true, lastSettledTurn: 29 }],
  [{ name: 'Liaodong Annual Pay', resource: 'money', amount: 60000, recurring: true, lastSettledTurn: 29 }]
);
near(guokuDyn.delta - guokuBase.delta, 5000, 'guoku recurring annual entries settle by month');
near(guokuDyn.sources['New Salt Surcharge'], 10000, 'guoku recurring income appears in source ledger');
near(guokuDyn.sinks['Liaodong Annual Pay'], 5000, 'guoku recurring expense appears in sink ledger');
near(guokuDyn.money, guokuDyn.balance, 'guoku money mirrors balance after settlement');
near(guokuDyn.stock, guokuDyn.balance, 'guoku ledger stock mirrors balance after settlement');

// 2. Neitang recurring income/expense should follow the same rule.
const neitangBase = settleNeitang([], []);
const neitangDyn = settleNeitang(
  [{ name: 'Imperial Shop Rent', resource: 'money', amount: 24000, recurring: true, lastSettledTurn: 30 }],
  [{ name: 'Palace Repair Contract', resource: 'money', amount: 12000, recurring: true, lastSettledTurn: 30 }]
);
near(neitangDyn.delta - neitangBase.delta, 1000, 'neitang recurring annual entries settle by month');
near(neitangDyn.sources['Imperial Shop Rent'], 2000, 'neitang recurring income appears in source ledger');
near(neitangDyn.sinks['Palace Repair Contract'], 1000, 'neitang recurring expense appears in sink ledger');
near(neitangDyn.money, neitangDyn.balance, 'neitang money mirrors balance after settlement');
near(neitangDyn.stock, neitangDyn.balance, 'neitang ledger stock mirrors balance after settlement');

// 3. AI fiscal expense should read guoku.balance when money is absent.
let G = resetGM(40);
G.guoku = {
  balance: 100000,
  ledgers: { money: { stock: 100000, sources: {}, sinks: {}, history: [] } },
  extraIncome: [],
  extraExpense: []
};
ctx.applyAITurnChanges({
  fiscal_adjustments: [
    { target: 'guoku', kind: 'expense', resource: 'money', name: 'Emergency Army Pay', amount: 20000, reason: 'test' }
  ]
});
near(G.guoku.balance, 80000, 'AI guoku expense applies against balance fallback');
near(G.guoku.money, 80000, 'AI guoku expense creates money mirror');
near(G.guoku.ledgers.money.stock, 80000, 'AI guoku expense syncs ledger stock');
assert(G.guoku.extraExpense[0].executionStatus === 'completed', 'AI guoku expense is not falsely blocked');

// 4. Province fiscal adjustments should hit publicTreasury, not stray div.money.
G = resetGM(41);
const province = {
  id: 'henan',
  name: 'Henan',
  publicTreasury: {
    money: { stock: 50000, available: 50000, used: 0, quota: 0 },
    grain: { stock: 100, available: 100, used: 0, quota: 0 },
    cloth: { stock: 20, available: 20, used: 0, quota: 0 }
  }
};
G.adminHierarchy = { player: { divisions: [province] } };
ctx.applyAITurnChanges({
  fiscal_adjustments: [
    { target: 'province:Henan', kind: 'expense', resource: 'money', name: 'River Works', amount: 12000, reason: 'test' }
  ]
});
near(province.publicTreasury.money.stock, 38000, 'province expense deducts publicTreasury stock');
near(province.publicTreasury.money.available, 38000, 'province expense deducts publicTreasury available');
assert(province.money === undefined, 'province expense does not create stray div.money');
assert(province.extraFiscal.expense[0].executionStatus === 'completed', 'province expense is not falsely blocked');

// 5. AI context should expose dynamic fiscal commitments with scenario turn scaling.
G = resetGM(42);
ctx._getDaysPerTurn = function() { return 90; };
G.guoku = {
  money: 1000000,
  balance: 1000000,
  grain: 300000,
  cloth: 100000,
  monthlyIncome: 80000,
  monthlyExpense: 60000,
  turnIncome: 240000,
  turnExpense: 180000,
  annualIncome: 960000,
  ledgers: { money: { stock: 1000000, sources: {}, sinks: {}, history: [] } },
  extraIncome: [
    { name: 'Salt Surcharge', resource: 'money', amount: 120000, recurring: true, addedTurn: 39, reason: 'new tax' }
  ],
  extraExpense: [
    { name: 'Frontier Pay', resource: 'money', amount: 60000, recurring: true, addedTurn: 40, reason: 'annual stipend' }
  ]
};
G.neitang = {
  money: 300000,
  balance: 300000,
  monthlyIncome: 15000,
  monthlyExpense: 9000,
  ledgers: { money: { stock: 300000, sources: {}, sinks: {}, history: [] } },
  extraExpense: [
    { name: 'Palace Repairs', resource: 'money', amount: 24000, recurring: true, addedTurn: 41, reason: 'maintenance' }
  ]
};
G.adminHierarchy = { player: { divisions: [
  { id: 'hebei', name: 'Hebei', extraFiscal: { income: [
    { name: 'Local Salt Sale', resource: 'money', amount: 36000, recurring: true, addedTurn: 41, reason: 'local charter' }
  ], expense: [] } }
] } };
const aiCtx = ctx.buildFullAIContext();
assert(aiCtx.variables.fiscalDynamic, 'AI context exposes fiscalDynamic');
near(aiCtx.variables.fiscalDynamic.turnDays, 90, 'AI fiscal context reads scenario turn days');
near(aiCtx.variables.fiscalDynamic.monthRatio, 3, 'AI fiscal context computes month ratio');
const saltCtx = aiCtx.variables.fiscalDynamic.active.find(function(x) { return x.name === 'Salt Surcharge'; });
assert(saltCtx && saltCtx.target === 'guoku' && saltCtx.kind === 'income', 'AI context includes guoku recurring income');
near(saltCtx.annualAmount, 120000, 'AI context records annual amount');
near(saltCtx.turnAmount, 30000, 'AI context scales annual amount to this turn');
const provinceCtx = aiCtx.variables.fiscalDynamic.active.find(function(x) { return x.target === 'province:Hebei'; });
assert(provinceCtx && provinceCtx.name === 'Local Salt Sale', 'AI context includes province recurring fiscal entries');

// 6. AI should add multiple long-term income items, then update/stop them as ledger entries.
G = resetGM(43);
ctx._getDaysPerTurn = function() { return 30; };
G.guoku = {
  money: 200000,
  balance: 200000,
  ledgers: { money: { stock: 200000, sources: {}, sinks: {}, history: [] } },
  extraIncome: [],
  extraExpense: []
};
ctx.applyAITurnChanges({
  fiscal_adjustments: [
    { target: 'guoku', action: 'add', kind: 'income', resource: 'money', name: 'Harbor Duty', amount: 120000, recurring: true, reason: 'new port customs' },
    { target: 'guoku', action: 'add', kind: 'income', resource: 'money', name: 'Salt Franchise', amount: 240000, recurring: true, reason: 'salt merchant charter' }
  ]
});
assert(G.guoku.extraIncome.length === 2, 'AI can add multiple guoku recurring income entries');
near(G.guoku.balance, 200000, 'recurring income add does not apply annual amount immediately');
near(G.guoku.ledgers.money.stock, 200000, 'recurring income add does not change ledger stock immediately');
assert(G.guoku.extraIncome.every(function(x) { return x.executionStatus === 'scheduled'; }), 'recurring income add is scheduled as long-term ledger');
const scheduledReports = G._turnReport.filter(function(x) { return x.type === 'fiscal_adj' && x.executionStatus === 'scheduled'; });
assert(scheduledReports.length === 2, 'recurring income add records scheduled fiscal reports');
near(scheduledReports[0].amount, 0, 'scheduled fiscal report has no immediate amount');
assert(scheduledReports.some(function(x) { return x.name === 'Harbor Duty' && x.annualAmount === 120000 && x.recurring === true; }), 'scheduled fiscal report carries annual amount');
ctx.applyAITurnChanges({
  fiscal_adjustments: [
    { target: 'guoku', action: 'update', kind: 'income', resource: 'money', name: 'Harbor Duty', amount: 180000, recurring: true, reason: 'higher tonnage' },
    { target: 'guoku', action: 'stop', kind: 'income', resource: 'money', name: 'Salt Franchise', reason: 'charter revoked' }
  ]
});
const harbor = G.guoku.extraIncome.find(function(x) { return x.name === 'Harbor Duty'; });
const salt = G.guoku.extraIncome.find(function(x) { return x.name === 'Salt Franchise'; });
near(harbor.amount, 180000, 'AI can update recurring income annual amount');
assert(harbor.recurring === true, 'AI update keeps recurring flag');
near(harbor.lastSettledTurn, 43, 'AI update does not re-settle the same turn');
near(salt.stopAfterTurn, 43, 'AI can stop recurring income from current turn');
assert(G._turnReport.some(function(x) { return x.type === 'fiscal_adj' && x.action === 'update' && x.name === 'Harbor Duty' && x.annualAmount === 180000; }), 'update fiscal report carries annual amount');
assert(G._turnReport.some(function(x) { return x.type === 'fiscal_adj' && x.action === 'stop' && x.name === 'Salt Franchise' && x.executionStatus === 'stopped'; }), 'stop fiscal report records stopped status');
const ledgerCtx = ctx.buildFullAIContext().variables.fiscalDynamic;
assert(ledgerCtx.active.some(function(x) { return x.name === 'Harbor Duty' && x.turnAmount === 15000; }), 'AI context reflects updated recurring amount');
assert(!ledgerCtx.active.some(function(x) { return x.name === 'Salt Franchise'; }), 'AI context omits stopped recurring entries');

console.log(`smoke-fiscal-dynamic-settlement: pass assertions=${passed}`);
