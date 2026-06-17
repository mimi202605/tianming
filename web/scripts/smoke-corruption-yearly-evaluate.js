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

const gm = makeBaseGM({ turn: 1 });
const h = createHarness({
  GM: gm,
  P: makeBaseP(),
  random: function() { return 0.5; }
});

h.load('tm-corruption-engine.js');

const CE = h.context.CorruptionEngine;
CE.ensureModel();
gm.corruption.trueIndex = 66;
gm.corruption.perceivedIndex = 58;
gm.corruption.supervision.level = 42;
gm.corruption.subDepts.central.true = 70;
gm.corruption.subDepts.provincial.true = 64;
gm.corruption.subDepts.military.true = 61;
gm.corruption.subDepts.fiscal.true = 63;
gm.corruption.subDepts.judicial.true = 59;
gm.corruption.subDepts.imperial.true = 56;

for (let i = 1; i <= 121; i++) {
  gm.turn = i;
  CE.snapshotHistory();
}

assert(Array.isArray(gm.corruption.history.snapshots), 'snapshot history missing');
eq(gm.corruption.history.snapshots.length, 120, 'snapshot history should trim to 120 entries');
eq(gm.corruption.history.snapshots[0].turn, 2, 'oldest retained snapshot should be turn 2');
eq(gm.corruption.history.snapshots[119].turn, 121, 'latest retained snapshot should be the last turn');
eq(gm.corruption.history.snapshots[119].supervision, 42, 'snapshot should record supervision level');
eq(gm.corruption.history.snapshots[119].trueIndex, 66, 'snapshot should record true corruption index');

console.log('[smoke-corruption-yearly-evaluate] pass assertions=' + ASSERTS);
