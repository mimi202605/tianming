#!/usr/bin/env node
// smoke-party-goals-adaptive-evidence.js - free-form scenario text can bind classes to parties.

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
assert(PG && typeof PG.buildScenarioRelationIndex === 'function', 'PartyGoals should expose buildScenarioRelationIndex');

sandbox.GM = {
  turn: 80,
  parties: [
    {
      name: '海商会盟',
      aliases: ['海舶党'],
      base: '沿海船户、市舶牙行、盐货行商',
      description: '以远洋贸易与口岸税利为命脉，常为船户与牙行争取开海。',
      policyStance: ['开海禁', '减轻关卡抽分'],
      rivalParty: '禁海军府'
    },
    {
      name: '禁海军府',
      base: '卫所水军、巡检司、内港关防',
      description: '主张封港与严查私舶。',
      enemies: ['海商会盟']
    },
    {
      name: '矿监内署',
      base: '矿山工匠、银场包头、监税内官',
      description: '攥取银场之利，拉拢采银户。',
      rivalParty: '户部清丈派'
    }
  ],
  classes: [
    {
      name: '船户',
      aliases: ['海民', '舶商'],
      satisfaction: 24,
      influence: 76,
      demands: '开放互市减港税',
      supportingParties: [],
      unrestLevels: { grievance: 20, petition: 30, strike: 50, revolt: 60 }
    },
    {
      name: '矿徒',
      aliases: ['矿山工匠', '采银户'],
      satisfaction: 33,
      influence: 64,
      demands: '减轻矿税',
      supportingParties: [],
      unrestLevels: { grievance: 30, petition: 44, strike: 66, revolt: 72 }
    },
    {
      name: '山民',
      satisfaction: 21,
      influence: 40,
      demands: '免除山场封禁',
      supportingParties: [],
      unrestLevels: { grievance: 18, petition: 24, strike: 70, revolt: 80 }
    }
  ],
  partyState: {}
};

const index = PG.buildScenarioRelationIndex(sandbox.GM, { turn: 80 });
assert(index.classParties['船户'] && index.classParties['船户'].indexOf('海商会盟') >= 0, 'party base/description text should bind 船户 to 海商会盟');
assert(index.classParties['矿徒'] && index.classParties['矿徒'].indexOf('矿监内署') >= 0, 'class aliases should bind 矿徒 to 矿监内署');
assert(!index.classParties['山民'] || index.classParties['山民'].length === 0, 'unmentioned class should remain unbound');
assert(index.evidence.some(e => e.className === '船户' && e.partyName === '海商会盟' && e.source === 'party-text'), 'relation index should record party-text evidence');

const derived = PG.deriveFromClassDemands(sandbox.GM, { turn: 80, source: 'smoke-adaptive-evidence' });
assert(derived.ok, 'adaptive evidence should allow class demand derivation');
const shippingGoal = PG.getActiveGoals(sandbox.GM, '海商会盟', { turn: 80 })
  .find(g => g && g.kind === 'classDemand' && g.sourceClass === '船户');
assert(shippingGoal, 'text-bound party should receive classDemand goal');
assert(Array.isArray(shippingGoal.relationEvidence), 'text-bound goal should carry relation evidence');
assert(shippingGoal.relationEvidence.some(e => e && e.source === 'party-text' && e.partyName === shippingGoal.party && e.className === shippingGoal.sourceClass), 'text-bound goal should retain party-text binding evidence');
assert(shippingGoal.demandText === '开放互市减港税', 'text-bound goal should keep exact scenario demand');
const navalCounter = PG.getActiveGoals(sandbox.GM, '禁海军府', { turn: 80 })
  .find(g => g && g.kind === 'counterClassDemand' && g.counterTo === shippingGoal.id);
assert(navalCounter, 'rival of text-bound party should receive counter goal');
assert(sandbox.GM._partyGoalRelationIndex && sandbox.GM._partyGoalRelationIndex.evidence.length >= 2, 'root should retain relation index evidence for debug/UI');

console.log('[smoke-party-goals-adaptive-evidence] PASS adaptive text evidence relation index');
