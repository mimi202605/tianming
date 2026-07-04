#!/usr/bin/env node
// smoke-class-demand-party-goals.js - class demands seed party goals and tinyi outcomes.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function fakeEl() {
  return {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: { cssText: '' },
    appendChild(c){ return c; },
    removeChild(c){ return c; },
    insertBefore(c){ return c; },
    setAttribute(){},
    getAttribute(){ return null; },
    addEventListener(){},
    removeEventListener(){},
    querySelector(){ return fakeEl(); },
    querySelectorAll(){ return []; },
    children: [],
    childNodes: [],
    firstChild: null,
    parentNode: null,
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    remove(){}
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  Math, Date, JSON, RegExp, Error, Promise,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  document: {
    getElementById: () => fakeEl(),
    querySelector: () => fakeEl(),
    querySelectorAll: () => [],
    addEventListener(){},
    createElement: () => fakeEl(),
    body: fakeEl(),
    head: fakeEl(),
    readyState: 'complete'
  },
  window: {},
  localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  navigator: { userAgent: 'node' },
  performance: { now: () => Date.now() },
  fetch: () => Promise.reject(new Error('no fetch')),
  alert(){}, confirm: () => true, prompt: () => null,
  HTMLElement: function(){}, Event: function(){}, requestAnimationFrame: cb => setTimeout(cb, 16),
  _ty2_enterDecide(){},
  escHtml: v => String(v == null ? '' : v),
  addCYBubble(){}, addEB(){}, toast(){}, closeChaoyi(){}, showLoading(){}, hideLoading(){}
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
load('tm-tinyi-v3-persona.js'); load('tm-tinyi-v3.js'); load('tm-tinyi-v3-edict-personnel.js'); load('tm-tinyi-v3-parties.js');

sandbox.GM = {
  running: true,
  turn: 50,
  vars: {},
  evtLog: [],
  qijuHistory: [],
  recentChaoyi: [],
  _chronicle: [],
  _ccHeldItems: [],
  _pendingTinyiTopics: [],
  _chronicleTracks: [],
  tinyi: { followUpQueue: [] },
  engineConstants: sandbox.TM.EngineConstants.getTemplate('generic'),
  partyState: {},
  parties: [
    {
      name: 'Reformers',
      leader: 'Minister A',
      influence: 72,
      cohesion: 66,
      rivalParty: 'Old Guard',
      enemies: ['Old Guard'],
      currentAgenda: '',
      shortGoal: '',
      policyStance: [],
      focal_disputes: []
    },
    {
      name: 'Old Guard',
      leader: 'Minister B',
      influence: 61,
      cohesion: 70,
      rivalParty: 'Reformers',
      enemies: ['Reformers'],
      currentAgenda: '',
      shortGoal: '',
      policyStance: ['maintain old salt order'],
      focal_disputes: []
    }
  ],
  classes: [
    {
      name: 'Merchants',
      satisfaction: 28,
      influence: 80,
      demands: 'lower salt tax',
      supportingParties: [{ party: 'Reformers', affinity: 1 }],
      unrestLevels: { grievance: 18, petition: 28, strike: 55, revolt: 70 },
      representativeNpcs: ['Merchant Voice']
    }
  ],
  chars: [
    { name: 'Minister A', party: 'Reformers', officialTitle: 'Minister', prestige: 80, alive: true },
    { name: 'Minister B', party: 'Old Guard', officialTitle: 'Minister', prestige: 70, alive: true },
    { name: 'Merchant Voice', party: 'Reformers', officialTitle: 'Petitioner', prestige: 65, alive: true }
  ]
};
sandbox.P = { scenario: { dynastyType: 'ming' } };
sandbox.CY = { _ty3: null, _ty2: null };
sandbox.findCharByName = name => (sandbox.GM.chars || []).find(c => c && c.name === name) || null;

const PG = sandbox.TM && sandbox.TM.PartyGoals;
assert(PG && typeof PG.deriveFromClassDemands === 'function', 'TM.PartyGoals.deriveFromClassDemands should exist');

const derived = PG.deriveFromClassDemands(sandbox.GM, { turn: 50, source: 'smoke-class-demand' });
assert(derived && derived.ok, 'class demand derivation should apply');
assert(derived.sourceGoals.length === 1, 'supporting party should receive one classDemand goal');
assert(derived.counterGoals.length === 1, 'rival party should receive one counterClassDemand goal');

const reformGoal = PG.getActiveGoals(sandbox.GM, 'Reformers', { turn: 50 })
  .find(g => g && g.kind === 'classDemand' && /lower salt tax/.test(g.text));
assert(reformGoal, 'Reformers should have an active classDemand goal');
assert(reformGoal.priority >= 80, 'high-influence unhappy class should create high-priority party goal');
assert(Array.isArray(reformGoal.linkedClasses) && reformGoal.linkedClasses.indexOf('Merchants') >= 0, 'classDemand goal should link the class');
assert(reformGoal.demandText === 'lower salt tax', 'classDemand goal should keep demandText metadata');

const counterGoal = PG.getActiveGoals(sandbox.GM, 'Old Guard', { turn: 50 })
  .find(g => g && g.kind === 'counterClassDemand' && /lower salt tax/.test(g.text));
assert(counterGoal, 'rival party should have active counterClassDemand goal');
assert(counterGoal.counterTo === reformGoal.id, 'counter goal should reference the original demand goal');

sandbox.GM._pendingTinyiTopics = [];
sandbox._ty3_phase15_scanAndSpawnTopics();
const tinyiTopic = sandbox.GM._pendingTinyiTopics.find(t => t && t.sourceType === 'party_goal' && t.party === 'Reformers' && t.goalId === reformGoal.id);
assert(tinyiTopic, 'phase15 should turn classDemand party goal into a tinyi topic');
assert(tinyiTopic.goalKind === 'classDemand', 'tinyi topic should preserve classDemand kind');
assert(Array.isArray(tinyiTopic.supportingClasses) && tinyiTopic.supportingClasses.indexOf('Merchants') >= 0, 'tinyi topic should carry linked class');

const beforeSat = sandbox.GM.classes[0].satisfaction;
sandbox.CY = {
  _ty3: { topic: tinyiTopic.topic, meta: tinyiTopic, proposerParty: 'Reformers' },
  _ty2: { topic: tinyiTopic.topic, attendees: ['Minister A'], stances: {} }
};
const seal = sandbox._ty3_phase6_recordSeal('issued', {
  grade: 'B',
  decision: { mode: 'majority' },
  opts: { topic: tinyiTopic.topic, proposerParty: 'Reformers', opposingParties: ['Old Guard'] }
}, {});
assert(seal && seal.sealStatus === 'issued', 'issued tinyi seal should complete');
assert(reformGoal.status === 'advanced', 'issued classDemand tinyi should advance the party goal');
assert(sandbox.GM.classes[0].satisfaction > beforeSat, 'supporting class satisfaction should benefit from party goal success');

sandbox.GM._pendingTinyiTopics = [];
sandbox._ty3_phase15_scanAndSpawnTopics();
assert(!sandbox.GM._pendingTinyiTopics.some(t => t && t.goalId === reformGoal.id), 'advanced classDemand goal should not respawn');
assert(reformGoal.status === 'advanced', 'same-turn scan should not reactivate advanced classDemand goal');

sandbox.GM.turn = 56;
sandbox.GM._pendingTinyiTopics = [];
sandbox._ty3_phase15_scanAndSpawnTopics();
assert(!sandbox.GM._pendingTinyiTopics.some(t => t && t.goalId === reformGoal.id), 'advanced classDemand goal should not respawn after cooldown');
assert(reformGoal.status === 'advanced', 'derive pass after cooldown should not reactivate advanced classDemand goal');

console.log('[smoke-class-demand-party-goals] PASS class demand -> party goal -> tinyi loop');
