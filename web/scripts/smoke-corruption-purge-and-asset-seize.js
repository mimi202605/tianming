#!/usr/bin/env node
'use strict';

const { createHarness, makeBaseGM, makeBaseP } = require('./smoke-corruption-harness');

let ASSERTS = 0;
function assert(cond, msg) {
  ASSERTS++;
  if (!cond) throw new Error('[assert] ' + msg);
}
function eq(actual, expected, msg) {
  ASSERTS++;
  if (actual !== expected) throw new Error('[assert] ' + msg + ' expected=' + expected + ' actual=' + actual);
}

const gm = makeBaseGM({
  turn: 15,
  guoku: {
    balance: 200000,
    monthlyIncome: 80000,
    monthlyExpense: 75000,
    annualIncome: 960000,
    rewardBudget: 50000,
    neicangTransferRate: 0.01,
    ledgers: {
      money: { stock: 200000, lastTurnIn: 0, lastTurnOut: 0, sources: {}, sinks: {}, history: [] },
      grain: { stock: 0, lastTurnIn: 0, lastTurnOut: 0, sources: {}, sinks: {}, history: [] },
      cloth: { stock: 0, lastTurnIn: 0, lastTurnOut: 0, sources: {}, sinks: {}, history: [] }
    },
    sources: {},
    expenses: {},
    sourcesDetail: {},
    expensesDetail: {},
    history: { monthly: [], yearly: [], events: [] },
    bankruptcy: { active: false, consecutiveMonths: 0, severity: 0 },
    emergency: { extraTax: { active: false, rate: 0 }, loan: { active: false, amount: 0, monthsLeft: 0 } }
  }
});
const h = createHarness({
  GM: gm,
  P: makeBaseP(),
  random: function() { return 0.33; }
});

h.load('tm-corruption-engine.js');

const CE = h.context.CorruptionEngine;
CE.ensureModel();
gm.corruption.subDepts.central.true = 50;
gm.minxin.trueIndex = 60;
gm.huangwei.index = 55;

gm.corruption.activeCases = [{
  id: 'case-asset-seize',
  name: '科场贿赂案',
  dept: 'central',
  evidence: '账册与供词',
  status: 'pending',
  options: [{
    id: 'strict',
    label: '三法司严审',
    cost: { guoku: 50000, minxin: 5 },
    benefit: { corruption: -8, huangwei: 10, guoku: 100000 }
  }]
}];

const result = CE.applyCaseHandling('case-asset-seize', 'strict');
assert(result && result.success, 'case handling should succeed');
eq(gm.guoku.balance, 250000, 'asset seizure should flow into treasury balance');
eq(gm.minxin.trueIndex, 55, 'strict handling should reduce minxin');
eq(gm.huangwei.index, 65, 'strict handling should improve huangwei');
eq(gm.corruption.subDepts.central.true, 42, 'strict handling should reduce central corruption');
assert(Array.isArray(gm.corruption.history.exposedCases) && gm.corruption.history.exposedCases.length === 1, 'resolved case should enter history');
assert(gm.corruption.activeCases.length === 0, 'resolved case should be removed from active cases');
eq(gm.corruption.history.exposedCases[0].resolvedAction, 'strict', 'resolved action should be recorded');

console.log('[smoke-corruption-purge-and-asset-seize] pass assertions=' + ASSERTS);
