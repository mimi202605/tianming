#!/usr/bin/env node
'use strict';

const { createHarness, makeBaseGM, makeBaseP } = require('./smoke-corruption-harness');

let ASSERTS = 0;
function assert(cond, msg) {
  ASSERTS++;
  if (!cond) throw new Error('[assert] ' + msg);
}

const gm = makeBaseGM({
  turn: 7,
  currentExamYear: true,
  activeWars: [{ id: 'war-1' }],
  activeDisasters: [{ id: 'dis-1' }]
});
const h = createHarness({
  GM: gm,
  P: makeBaseP(),
  random: function() { return 0.01; }
});

h.load('tm-corruption-engine.js');

const CE = h.context.CorruptionEngine;
CE.ensureModel();
gm.corruption.trueIndex = 85;
gm.corruption.supervision.level = 25;
gm.corruption.subDepts.central.true = 88;
gm.corruption.subDepts.provincial.true = 79;
gm.corruption.subDepts.military.true = 76;
gm.corruption.subDepts.fiscal.true = 74;
gm.corruption.subDepts.judicial.true = 82;
gm.corruption.subDepts.imperial.true = 81;
gm.corruption.entrenchedFactions = [];
gm.juanna = { active: true };

const caseObj = CE.generateExposureCase();
assert(caseObj && caseObj.id, 'generated exposure case missing');
assert(caseObj.status === 'pending', 'generated case status should be pending');
assert(Array.isArray(caseObj.options) && caseObj.options.length > 0, 'generated case should carry options');
assert(Array.isArray(gm.corruption.activeCases) && gm.corruption.activeCases.length === 1, 'active case should be registered');
assert(gm.corruption.activeCases[0] === caseObj, 'generated case should be the active case');
assert(caseObj.expireTurn > gm.turn, 'case expire turn should be in the future');

console.log('[smoke-corruption-detection-event] pass assertions=' + ASSERTS);
