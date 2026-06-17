#!/usr/bin/env node
// smoke-tinyi-scenario-class-source.js - tinyi class scan honors scenario class stores.

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

load('tm-party-goals.js');
load('tm-tinyi-v3.js');

sandbox.GM = {
  running: true,
  turn: 70,
  vars: {},
  evtLog: [],
  qijuHistory: [],
  recentChaoyi: [],
  _chronicle: [],
  _ccHeldItems: [],
  _pendingTinyiTopics: [],
  _chronicleTracks: [],
  tinyi: { followUpQueue: [] },
  partyState: {},
  parties: [],
  chars: []
};
sandbox.P = {
  scenario: { dynastyType: 'ming' },
  classes: [
    {
      name: '流民',
      satisfaction: 22,
      influence: 68,
      demands: '开仓赈济',
      supportingParties: [],
      unrestLevels: { grievance: 10, petition: 22, strike: 58, revolt: 43 }
    }
  ]
};
sandbox.scriptData = {};

sandbox._ty3_phase15_scanAndSpawnTopics();

const classPressure = sandbox.GM._pendingTinyiTopics.find(t => t && t.sourceType === 'class_pressure' && t.className === '流民');
assert(classPressure, 'P.classes pressure should spawn class_pressure tinyi topic');
assert(classPressure.sourceClass === classPressure.className, 'class pressure topic should expose sourceClass for downstream result writes');
assert(classPressure.origin && classPressure.origin.sourceType === 'class_pressure' && classPressure.origin.sourceName === classPressure.className, 'class pressure topic should carry scenario origin metadata');
assert(classPressure.demandText === '开仓赈济', 'P.classes pressure should keep scenario demand text');
assert(!sandbox.GM._pendingTinyiTopics.some(t => t && t.sourceType === 'party_goal'), 'unbound P.classes demand should not invent party goals');

sandbox.GM = {
  running: true,
  turn: 71,
  vars: {},
  evtLog: [],
  qijuHistory: [],
  recentChaoyi: [],
  _chronicle: [],
  _ccHeldItems: [],
  _pendingTinyiTopics: [],
  _chronicleTracks: [],
  tinyi: { followUpQueue: [] },
  partyState: {},
  chars: [{ name: '赈济臣', party: '赈济派', officialTitle: '户部', prestige: 66, alive: true }]
};
sandbox.P = {
  scenario: { dynastyType: 'ming' },
  parties: [
    { name: '赈济派', leader: '赈济臣', socialBase: [{ class: '流民', affinity: 0.8 }], rivalParty: '守旧派' },
    { name: '守旧派', leader: '守旧臣', rivalParty: '赈济派' }
  ],
  classes: [
    {
      name: '流民',
      satisfaction: 22,
      influence: 68,
      demands: '开仓赈济',
      supportingParties: [],
      unrestLevels: { grievance: 10, petition: 22, strike: 58, revolt: 43 }
    }
  ]
};
sandbox.findCharByName = name => (sandbox.GM.chars || []).find(c => c && c.name === name) || null;
sandbox._ty3_phase15_scanAndSpawnTopics();
const pPartyGoal = sandbox.GM._pendingTinyiTopics.find(t => t && t.sourceType === 'party_goal' && t.party === '赈济派');
assert(pPartyGoal, 'P.parties socialBase demand should spawn a party_goal tinyi topic');
assert(pPartyGoal.goalKind === 'classDemand', 'P.parties party goal should preserve classDemand kind');
assert(pPartyGoal.sourceClass === sandbox.P.classes[0].name, 'class-derived party goal topic should preserve sourceClass');
assert(pPartyGoal.origin && pPartyGoal.origin.sourceType === 'party_goal' && pPartyGoal.origin.sourceId === pPartyGoal.goalId && pPartyGoal.origin.sourceName === pPartyGoal.party, 'party goal topic should carry scenario origin metadata');
assert(Array.isArray(pPartyGoal.relationEvidence), 'party goal topic should carry relation evidence');
assert(pPartyGoal.relationEvidence.some(e => e && e.source === 'party-socialBase' && e.partyName === pPartyGoal.party && e.className === pPartyGoal.sourceClass), 'party goal topic should explain socialBase binding evidence');

sandbox.GM = {
  running: true,
  turn: 72,
  vars: {},
  evtLog: [],
  qijuHistory: [],
  recentChaoyi: [],
  _chronicle: [],
  _ccHeldItems: [],
  _pendingTinyiTopics: [],
  _chronicleTracks: [],
  tinyi: { followUpQueue: [] },
  partyState: {},
  chars: [{ name: 'Relief Minister', party: 'Relief Bloc', officialTitle: 'Minister', prestige: 64, alive: true }]
};
sandbox.P = {
  scenario: { dynastyType: 'ming' },
  parties: [
    { name: 'Relief Bloc', leader: 'Relief Minister', socialBase: [{ class: 'Displaced', affinity: 0.9 }] }
  ],
  socialClasses: [
    {
      name: 'Displaced',
      satisfaction: 18,
      influence: 60,
      demands: 'open granaries',
      unrestLevels: { grievance: 12, petition: 20, strike: 50, revolt: 55 }
    }
  ]
};
sandbox.findCharByName = name => (sandbox.GM.chars || []).find(c => c && c.name === name) || null;
sandbox._ty3_phase15_scanAndSpawnTopics();
const socialClassGoal = sandbox.GM._pendingTinyiTopics.find(t => t && t.sourceType === 'party_goal' && t.party === 'Relief Bloc');
assert(socialClassGoal && socialClassGoal.sourceClass === 'Displaced', 'P.socialClasses should behave as a legacy scenario class source');

console.log('[smoke-tinyi-scenario-class-source] PASS tinyi reads scenario class stores');
