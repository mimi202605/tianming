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
  turn: 12,
  mapData: { cities: { changan: {}, luoyang: {} }, state: { showCorruption: true }, polygons: {} }
});
const h = createHarness({
  GM: gm,
  P: makeBaseP(),
  random: function() { return 0.99; }
});

h.load('tm-corruption-engine.js');

const CE = h.context.CorruptionEngine;
assert(CE && typeof CE.initFromDynasty === 'function', 'CorruptionEngine must exist');

CE.initFromDynasty('明', 'decline', {
  corruption: {
    trueIndex: 78,
    subDepts: {
      central: { true: 88 },
      provincial: { true: 73 },
      military: { true: 61 },
      fiscal: { true: 77 },
      judicial: { true: 69 },
      imperial: { true: 72 }
    },
    supervision: { level: 33 }
  }
});
gm.corruption.supervision.level = 33;
gm.mapData.state.showCorruption = true;

CE.tick({ _monthRatio: 1 });

assert(Array.isArray(gm.corruption.history.snapshots), 'history snapshots missing');
assert(gm.corruption.history.snapshots.length >= 1, 'tick should record a snapshot');
eq(gm.corruption.history.snapshots[gm.corruption.history.snapshots.length - 1].turn, 12, 'snapshot turn mismatch');
assert(gm.corruption.byRegion && gm.corruption.byRegion.changan, 'regional corruption should be written');
assert(gm.corruption.byRegion && gm.corruption.byRegion.luoyang, 'regional corruption should cover all cities');
assert(gm.corruption.perceivedIndex <= gm.corruption.trueIndex, 'perceived index should not exceed true index');
assert(gm.corruption.subDepts.central.perceived <= gm.corruption.subDepts.central.true, 'central perceived should trail true');

console.log('[smoke-corruption-tick-full-pass] pass assertions=' + ASSERTS);
