#!/usr/bin/env node
// smoke-party-goals-scenario-variance.js - scenario-specific parties/classes guard.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  window: {},
  scriptData: {},
  P: {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}

load('tm-party-goals.js');

const PG = sandbox.TM && sandbox.TM.PartyGoals;
assert(PG && typeof PG.deriveFromClassDemands === 'function', 'PartyGoals derivation API should exist');

// Variant A: official Tianqi-like schema. Classes live on P.classes, the class has no
// explicit supportingParties, and party socialBase is the only binding.
sandbox.GM = {
  turn: 61,
  parties: [
    { name: '东林党', leader: '韩爌', socialBase: [{ class: '士大夫', affinity: 0.85 }], rivalParty: '阉党' },
    { name: '阉党', leader: '魏忠贤', socialBase: [{ class: '胥吏', affinity: 0.5 }], enemies: ['东林党'] }
  ],
  partyState: {}
};
sandbox.P = {
  classes: [
    {
      name: '士大夫',
      satisfaction: 31,
      influence: 78,
      demands: '追复旧臣',
      supportingParties: [],
      unrestLevels: { grievance: 28, petition: 34, strike: 82, revolt: 90 }
    }
  ]
};
sandbox.scriptData = {};

let derived = PG.deriveFromClassDemands(sandbox.GM, { turn: 61, source: 'smoke-variance-socialbase' });
assert(derived.ok, 'socialBase-only class binding should derive a party goal');
let donglinGoal = PG.getActiveGoals(sandbox.GM, '东林党', { turn: 61 })
  .find(g => g && g.kind === 'classDemand' && g.sourceClass === '士大夫');
assert(donglinGoal, 'party socialBase should bind 士大夫 demand to 东林党');
assert(donglinGoal.demandText === '追复旧臣', 'derived goal should keep scenario-specific demand text');
let eunuchCounter = PG.getActiveGoals(sandbox.GM, '阉党', { turn: 61 })
  .find(g => g && g.kind === 'counterClassDemand' && g.counterTo === donglinGoal.id);
assert(eunuchCounter, 'rival party should get counter goal from scenario rivalParty');

// Variant B: explicit supportingParties use scenario qualifiers like "东林党(部分)".
sandbox.GM = {
  turn: 62,
  parties: [
    { name: '东林党', leader: '韩爌', rivalParty: '阉党' },
    { name: '阉党', leader: '魏忠贤', enemies: ['东林党'] }
  ],
  classes: [
    {
      name: '缙绅',
      satisfaction: 29,
      influence: 70,
      demands: '减免矿税',
      supportingParties: ['东林党(部分)'],
      unrestLevels: { grievance: 25, petition: 38, strike: 88, revolt: 92 }
    }
  ],
  partyState: {}
};
sandbox.P = {};

derived = PG.deriveFromClassDemands(sandbox.GM, { turn: 62, source: 'smoke-variance-alias' });
assert(derived.ok, 'qualified supporting party names should derive a goal');
let qualifiedGoal = PG.getActiveGoals(sandbox.GM, '东林党', { turn: 62 })
  .find(g => g && g.kind === 'classDemand' && g.sourceClass === '缙绅');
assert(qualifiedGoal, 'supportingParties alias 东林党(部分) should resolve to 东林党');
assert(qualifiedGoal.demandText === '减免矿税', 'alias-derived goal should keep the exact class demand');

// Variant C: no party binding. The derivation must not invent a default political party.
sandbox.GM = {
  turn: 63,
  parties: [{ name: '军方', leader: '总兵' }],
  classes: [
    {
      name: '流民',
      satisfaction: 20,
      influence: 65,
      demands: '开仓赈济',
      supportingParties: [],
      unrestLevels: { grievance: 12, petition: 20, strike: 50, revolt: 40 }
    }
  ],
  partyState: {}
};
derived = PG.deriveFromClassDemands(sandbox.GM, { turn: 63, source: 'smoke-variance-unbound' });
assert(!derived.ok && derived.sourceGoals.length === 0, 'unbound class demand should not invent a party goal');
assert(PG.getActiveGoals(sandbox.GM, '军方', { turn: 63 }).length === 0, 'unbound demand should leave unrelated parties untouched');

console.log('[smoke-party-goals-scenario-variance] PASS scenario-specific class/party variance');
