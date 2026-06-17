#!/usr/bin/env node
'use strict';

const { createHarness, makeBaseGM, makeBaseP } = require('./smoke-corruption-harness');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function closeTo(actual, expected, label) {
  if (Math.abs(actual - expected) > 1e-6) {
    throw new Error(label + ' expected ' + expected + ', got ' + actual);
  }
}

const DEPTS = ['central', 'provincial', 'military', 'fiscal', 'judicial', 'imperial'];

function setDeptCorruption(gm, value) {
  DEPTS.forEach(function(dept) {
    gm.corruption.subDepts[dept].true = value;
    gm.corruption.subDepts[dept].perceived = value;
  });
  gm.corruption.trueIndex = value;
  gm.corruption.perceivedIndex = value;
  gm.corruption.overall = value;
}

function avgDeptTrue(gm) {
  return DEPTS.reduce(function(sum, dept) {
    return sum + gm.corruption.subDepts[dept].true;
  }, 0) / DEPTS.length;
}

const gm = makeBaseGM({ turn: 48 });
const harness = createHarness({
  GM: gm,
  P: makeBaseP(),
  random: function() { return 0; }
});

harness.load('tm-corruption-engine.js');

const CE = harness.context.CorruptionEngine;
assert(CE && CE.Actions, 'CorruptionEngine.Actions should exist');
CE.ensureModel();

gm.turnChanges = { variables: [] };
setDeptCorruption(gm, 60);

const commissionerResult = CE.Actions.dispatchCommissioner({
  cost: 1,
  targetDept: 'provincial'
});
assert(commissionerResult && commissionerResult.success, 'dispatch commissioner should succeed');

const expectedAfterCommissioner = avgDeptTrue(gm);
closeTo(gm.corruption.trueIndex, expectedAfterCommissioner, 'trueIndex after commissioner');
closeTo(gm.corruption.overall, expectedAfterCommissioner, 'overall after commissioner');

const firstChange = gm.turnChanges.variables.find(function(item) {
  return item && item.path === 'corruption.trueIndex';
});
assert(firstChange, 'commissioner action should record corruption trueIndex change');
closeTo(firstChange.oldValue, 60, 'recorded old value after commissioner');
closeTo(firstChange.newValue, expectedAfterCommissioner, 'recorded new value after commissioner');

gm.corruption.activeCases = [{
  id: 'case-fiscal-001',
  name: '户部侵蚀案',
  dept: 'fiscal',
  options: [{
    id: 'strict',
    label: '严办追赃',
    cost: {},
    benefit: { corruption: -6 }
  }]
}];

const caseResult = CE.applyCaseHandling('case-fiscal-001', 'strict');
assert(caseResult && caseResult.success, 'case handling should succeed');

const expectedAfterCase = avgDeptTrue(gm);
closeTo(gm.corruption.trueIndex, expectedAfterCase, 'trueIndex after case handling');
closeTo(gm.corruption.overall, expectedAfterCase, 'overall after case handling');
closeTo(firstChange.newValue, expectedAfterCase, 'turn change should aggregate later corruption action');

console.log('[smoke] corruption player actions sync ok');
