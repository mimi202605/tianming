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
  turn: 9,
  guoku: {
    balance: 1000000,
    monthlyIncome: 100000,
    monthlyExpense: 75000,
    annualIncome: 1200000,
    rewardBudget: 50000,
    neicangTransferRate: 0.01,
    ledgers: {
      money: { stock: 1000000, lastTurnIn: 0, lastTurnOut: 0, sources: {}, sinks: {}, history: [] },
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
  random: function() { return 0.42; }
});

h.loadMany(['tm-corruption-engine.js', 'tm-guoku-engine.js']);

const CE = h.context.CorruptionEngine;
const GE = h.context.GuokuEngine;
CE.ensureModel();

const incident = CE.pushLumpSumIncident({
  name: '河工漕渠',
  type: 'infrastructure',
  amount: 240000,
  executionLayers: 4,
  publicTally: true,
  decreeHasOversight: true,
  directPeopleBurden: true
});

assert(incident && incident.id, 'lump-sum incident should be created');
assert(Array.isArray(gm.corruption.lumpSumIncidents) && gm.corruption.lumpSumIncidents.length === 1, 'incident should register on corruption model');
assert(incident.ratioToAnnual > 0.05, 'incident ratio should be above threshold');

const gongcheng = GE.Expenses.gongcheng();
assert(gongcheng > 0, 'gongcheng expense should reflect active incident');

GE.tick({ _monthRatio: 1 });

assert(gm.guoku.expenses.gongcheng > 0, 'guoku annual expense should include gongcheng');
eq(gm.guoku.expenses.gongcheng, gongcheng, 'tick should preserve gongcheng annual expense');
assert(gm.guoku.expensesDetail.gongcheng && gm.guoku.expensesDetail.gongcheng.length > 0, 'gongcheng detail should be written');
assert(gm.guoku.ledgers.money.sinks && gm.guoku.ledgers.money.sinks['工程'] > 0, 'money ledger should include engineering sink');

console.log('[smoke-corruption-impact-on-treasury] pass assertions=' + ASSERTS);
