#!/usr/bin/env node
// smoke-party-class-dynamic-relations.js - party/class relations evolve at runtime.

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

load('tm-engine-constants.js');
load('tm-class-engine.js');
load('tm-party-goals.js');

const PG = sandbox.TM && sandbox.TM.PartyGoals;
const CE = sandbox.TM && sandbox.TM.ClassEngine;
assert(PG && typeof PG.buildScenarioRelationIndex === 'function', 'PartyGoals relation index API should exist');
assert(typeof PG.updateDynamicRelationsFromOutcome === 'function', 'PartyGoals dynamic relation outcome API should exist');
assert(typeof PG.evolveDynamicRelations === 'function', 'PartyGoals dynamic relation tick API should exist');

const emergentRoot = {
  turn: 1,
  parties: [
    { name: 'Harbor League', influence: 64, cohesion: 62 },
    { name: 'Customs Board', influence: 60, cohesion: 70, rivalParty: 'Harbor League' }
  ],
  classes: [
    {
      name: 'Dockworkers',
      satisfaction: 20,
      influence: 72,
      demands: 'reduce harbor toll',
      unrestLevels: { grievance: 16, petition: 24, strike: 40, revolt: 52 }
    }
  ],
  partyState: {}
};

let index = PG.buildScenarioRelationIndex(emergentRoot, { turn: 1 });
assert(!index.classParties.Dockworkers || index.classParties.Dockworkers.indexOf('Harbor League') < 0, 'unbound class should not start with invented supporter');
let derived = PG.deriveFromClassDemands(emergentRoot, { turn: 1, source: 'smoke-dynamic-before' });
assert(!derived.ok, 'unbound class demand should not derive a party goal before runtime support exists');

const relationResult = PG.updateDynamicRelationsFromOutcome(emergentRoot, {
  sourceParty: 'Harbor League',
  sourceClass: 'Dockworkers',
  className: 'Dockworkers',
  demandText: 'reduce harbor toll',
  sealStatus: 'issued',
  outcome: 'issued',
  grade: 'A'
}, { turn: 2, source: 'smoke-dynamic-issued' });
assert(relationResult.ok, 'issued outcome should update dynamic relation state');

index = PG.buildScenarioRelationIndex(emergentRoot, { turn: 2 });
const latentEdge = Object.values(emergentRoot.partyClassRelations.edges).find(e => e && e.partyName === 'Harbor League' && e.className === 'Dockworkers');
assert(latentEdge && latentEdge.status === 'latent', 'first unseeded support should create only a latent relation');
assert(latentEdge.trust > 35 && latentEdge.grievance < 45, 'latent relation should track trust and grievance changes');
assert(!index.classParties.Dockworkers || index.classParties.Dockworkers.indexOf('Harbor League') < 0, 'one unseeded support should not instantly become representation');

PG.updateDynamicRelationsFromOutcome(emergentRoot, {
  sourceParty: 'Harbor League',
  sourceClass: 'Dockworkers',
  className: 'Dockworkers',
  demandText: 'reduce harbor toll',
  sealStatus: 'issued',
  outcome: 'issued',
  grade: 'A'
}, { turn: 3, source: 'smoke-dynamic-issued-again' });
index = PG.buildScenarioRelationIndex(emergentRoot, { turn: 3 });
assert(index.classParties.Dockworkers && index.classParties.Dockworkers.indexOf('Harbor League') >= 0, 'runtime support should create a derived class-party relation');
assert(index.evidence.some(e => e && e.className === 'Dockworkers' && e.partyName === 'Harbor League' && e.source === 'runtime-affinity'), 'runtime relation should be visible as evidence');

derived = PG.deriveFromClassDemands(emergentRoot, { turn: 3, source: 'smoke-dynamic-after' });
assert(derived.ok, 'runtime support should allow later class demand derivation');
assert(PG.getActiveGoals(emergentRoot, 'Harbor League', { turn: 3 }).some(g => g && g.kind === 'classDemand' && g.sourceClass === 'Dockworkers'), 'runtime supporter should receive class demand goal');

const estrangedRoot = {
  turn: 5,
  parties: [
    { name: 'Court Bloc', influence: 70, cohesion: 70, socialBase: [{ class: 'Guilds', affinity: 1 }] }
  ],
  classes: [
    {
      name: 'Guilds',
      satisfaction: 25,
      influence: 68,
      demands: 'end workshop levy',
      unrestLevels: { grievance: 20, petition: 30, strike: 55, revolt: 70 }
    }
  ],
  partyState: {}
};
index = PG.buildScenarioRelationIndex(estrangedRoot, { turn: 5 });
assert(index.classParties.Guilds && index.classParties.Guilds.indexOf('Court Bloc') >= 0, 'static socialBase should seed initial support');
for (let i = 0; i < 4; i += 1) {
  PG.updateDynamicRelationsFromOutcome(estrangedRoot, {
    sourceParty: 'Court Bloc',
    sourceClass: 'Guilds',
    sealStatus: 'blocked',
    outcome: 'blocked',
    grade: 'B'
  }, { turn: 6 + i, source: 'smoke-dynamic-blocked' });
}
index = PG.buildScenarioRelationIndex(estrangedRoot, { turn: 10 });
assert(!index.classParties.Guilds || index.classParties.Guilds.indexOf('Court Bloc') < 0, 'runtime estrangement should suppress stale static socialBase');
assert(estrangedRoot.partyClassRelations && Object.keys(estrangedRoot.partyClassRelations.edges || {}).length > 0, 'dynamic relation ledger should persist on root');
const estrangedEdge = Object.values(estrangedRoot.partyClassRelations.edges).find(e => e && e.partyName === 'Court Bloc' && e.className === 'Guilds');
assert(estrangedEdge && estrangedEdge.status === 'estranged' && estrangedEdge.grievance > estrangedEdge.trust, 'blocked outcomes should turn static support into estrangement with grievance');

const engineRoot = {
  turn: 12,
  engineConstants: sandbox.TM.EngineConstants.getTemplate('generic'),
  partyState: {},
  parties: [
    { name: 'Craft Party', influence: 65, cohesion: 61 }
  ],
  classes: [
    {
      name: 'Artisans',
      satisfaction: 44,
      influence: 50,
      supportingParties: [{ class: 'Craft Party', affinity: 1 }]
    }
  ]
};
const applied = CE.applyPartyOutcomeToClasses(engineRoot, {
  sourceParty: 'Craft Party',
  sourceClass: 'Artisans',
  sealStatus: 'issued',
  outcome: 'issued',
  grade: 'A'
}, { turn: 12, source: 'smoke-dynamic-class-engine' });
assert(applied.ok, 'class engine bridge should still apply class satisfaction');
const relEdges = engineRoot.partyClassRelations && engineRoot.partyClassRelations.edges || {};
assert(Object.keys(relEdges).some(k => relEdges[k] && relEdges[k].partyName === 'Craft Party' && relEdges[k].className === 'Artisans' && relEdges[k].affinity > 60), 'class engine outcomes should feed dynamic party-class affinity');

const beforeTickAffinity = relEdges[Object.keys(relEdges)[0]].affinity;
PG.evolveDynamicRelations(engineRoot, { turn: 13, source: 'smoke-dynamic-tick' });
assert(engineRoot.partyClassRelations.history.some(h => h && h.source === 'smoke-dynamic-tick'), 'dynamic relation tick should append history');
assert(relEdges[Object.keys(relEdges)[0]].affinity !== beforeTickAffinity || relEdges[Object.keys(relEdges)[0]].momentum !== 0, 'dynamic relation tick should evolve stored relation values');

console.log('[smoke-party-class-dynamic-relations] PASS dynamic party/class relations');
