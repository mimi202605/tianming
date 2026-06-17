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

const gm = makeBaseGM({ turn: 30 });
const h = createHarness({
  GM: gm,
  P: makeBaseP(),
  random: function() { return 0.5; }
});

h.load('tm-corruption-engine.js');

const CE = h.context.CorruptionEngine;
CE.ensureModel();
gm.guoku.balance = 1000000;
gm.guoku.monthlyIncome = 100000;
gm.minxin.byClass = { shi: { true: 60 } };
gm.corruption.subDepts.central.true = 30;
gm.corruption.subDepts.fiscal.true = 40;

const juanna = CE.openJuanna('open-any');
assert(juanna && juanna.active === true, 'juanna should open');
eq(Math.round(juanna.monthlyIncome), 25000, 'open-any monthly income should follow the 25% tier');

CE.applyJuannaMonthly({ _monthRatio: 2 });
eq(gm.guoku.balance, 1050000, 'juanna monthly income should flow into treasury');
assert(Math.abs(gm.corruption.subDepts.central.true - 30.1) < 1e-6, 'central corruption should tick up');
assert(Math.abs(gm.corruption.subDepts.fiscal.true - 40.06) < 1e-6, 'fiscal corruption should tick up');
assert(Math.abs(gm.minxin.byClass.shi.true - 59.6) < 1e-6, 'shi minxin should decay');
eq(gm.juanna.cumulativeSold, 2, 'juanna cumulative sold should track elapsed months');

CE.closeJuanna();
assert(gm.juanna.active === false, 'juanna should close');
eq(gm.juanna.monthlyIncome, 0, 'closing juanna should zero monthly income');

console.log('[smoke-corruption-pardon-and-restore] pass assertions=' + ASSERTS);
