#!/usr/bin/env node
'use strict';

const { createHarness, makeBaseGM, makeBaseP } = require('./smoke-corruption-harness');

let ASSERTS = 0;
function assert(cond, msg) {
  ASSERTS++;
  if (!cond) throw new Error('[assert] ' + msg);
}

const gm = makeBaseGM({ turn: 20 });
const h = createHarness({
  GM: gm,
  P: makeBaseP(),
  random: function() { return 0.0; }
});

h.loadMany(['tm-corruption-engine.js']);

const CE = h.context.CorruptionEngine;
CE.ensureModel();
gm._corrDeptLongTerm = {
  central: 80,
  provincial: 82,
  military: 78,
  fiscal: 75,
  judicial: 81,
  imperial: 77
};
gm.corruption.entrenchedFactions = [];

CE.checkFactionFormation({ _monthRatio: 1 });

assert(Array.isArray(gm.corruption.entrenchedFactions), 'entrenched factions missing');
assert(gm.corruption.entrenchedFactions.length >= 1, 'high long-term corruption should form a clique');
assert(!!gm.corruption.entrenchedFactions[0].name, 'formed clique should have a name');
assert(!!gm.corruption.entrenchedFactions[0].dept, 'formed clique should record a dept');
assert(typeof gm.corruption.entrenchedFactions[0].strength === 'number', 'formed clique should have strength');

console.log('[smoke-corruption-clique-formation] pass assertions=' + ASSERTS);
