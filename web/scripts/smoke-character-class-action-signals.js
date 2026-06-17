#!/usr/bin/env node
// smoke-character-class-action-signals.js - character actions become class signals.

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

load('tm-social-political-signals.js');
load('tm-player-action-signals.js');
load('tm-class-character-relations.js');

const root = {
  turn: 18,
  classes: [
    {
      name: '\u7f16\u6237\u519c\u6c11',
      satisfaction: 36,
      influence: 64,
      demands: '\u51cf\u514d\u52a0\u6d3e\u4e0e\u5fAD\u5f79',
      tags: ['peasant', 'tax', 'corvee']
    },
    {
      name: '\u58eb\u7ec5',
      satisfaction: 58,
      influence: 72,
      demands: '\u4fdd\u62a4\u4f18\u514d\u4e0e\u79d1\u4e3e',
      tags: ['gentry', 'keju']
    }
  ],
  parties: [
    { name: '\u6e05\u6d41', socialBase: [{ class: '\u7f16\u6237\u519c\u6c11', affinity: 0.4 }], currentAgenda: '\u51cf\u514d\u52a0\u6d3e' }
  ],
  characters: [
    {
      id: 'char-bi',
      name: '\u6bd5\u81ea\u4e25',
      office: '\u6237\u90e8\u5c1a\u4e66',
      officialTitle: '\u6237\u90e8\u5c1a\u4e66',
      stance: '\u51cf\u514d\u52a0\u6d3e',
      administration: 84,
      management: 88,
      loyalty: 80
    }
  ]
};

sandbox.GM = root;

const PAS = sandbox.TM.PlayerActionSignals;
const SPS = sandbox.TM.SocialPoliticalSignals;
const CCR = sandbox.TM.ClassCharacterRelations;
assert(PAS && typeof PAS.record === 'function', 'PlayerActionSignals.record should exist');
assert(SPS && typeof SPS.applyPending === 'function', 'SocialPoliticalSignals.applyPending should exist');
assert(CCR && typeof CCR.run === 'function', 'ClassCharacterRelations.run should exist');

const beforeSat = root.classes[0].satisfaction;
const playerSignal = PAS.record(root, {
  source: 'phase8-formal-module',
  action: 'memorial-decision',
  actor: '\u6bd5\u81ea\u4e25',
  characterName: '\u6bd5\u81ea\u4e25',
  characterId: 'char-bi',
  target: '\u6bd5\u81ea\u4e25',
  topic: '\u51cf\u514d\u52a0\u6d3e\u4e0e\u5fAD\u5f79',
  text: '\u6bd5\u81ea\u4e25\u4e0a\u4e66\u51cf\u514d\u52a0\u6d3e\uff0c\u8BF7\u4EE5\u6237\u90E8\u6838\u5B9E\u6C11\u56F0\u3002',
  decision: 'approved',
  intensity: 0.75
});
assert(playerSignal.characterName === '\u6bd5\u81ea\u4e25', 'player action signal should preserve characterName');

const social = root._socialPoliticalSignals && root._socialPoliticalSignals.items && root._socialPoliticalSignals.items[0];
assert(social, 'player action should mirror to social-political signal');
assert(social.characterName === '\u6bd5\u81ea\u4e25', 'standard social-political signal should preserve characterName');
assert(social.characterId === 'char-bi', 'standard social-political signal should preserve characterId');
assert(social.affectedClasses.some(x => x.name === '\u7f16\u6237\u519c\u6c11'), 'character action signal should affect matching class');

const applied = SPS.applyPending(root, { turn: 18, source: 'smoke-character-class-action' });
assert(applied.classes >= 1, 'social-political signal should apply to class engine path');
assert(root.classes[0].satisfaction > beforeSat, 'beneficial character action should raise affected class satisfaction');

CCR.run(root, { turn: 18, source: 'smoke-character-class-action' });
const edges = Object.values(root.classCharacterRelations.edges || {});
const biPeasant = edges.find(e => e.className === '\u7f16\u6237\u519c\u6c11' && e.characterName === '\u6bd5\u81ea\u4e25');
assert(biPeasant, 'affected class should form dynamic backing edge to executor character');
assert(biPeasant.source.indexOf('signal') >= 0, 'class-character edge should cite the standard signal');
assert(biPeasant.trust > 0.5, 'helpful executor should gain class trust');

const explicit = SPS.record(root, {
  sourceSystem: 'office',
  kind: 'appointment',
  characterName: '\u6bd5\u81ea\u4e25',
  characterId: 'char-bi',
  affectedClasses: [{ name: '\u7f16\u6237\u519c\u6c11', satisfactionDelta: 1, reason: '\u4efb\u6237\u90e8\u4e13\u7406\u52a0\u6d3e' }],
  reason: '\u4efb\u6bd5\u81ea\u4e25\u627f\u529e\u52a0\u6d3e\u6e05\u6838'
});
assert(explicit.characterName === '\u6bd5\u81ea\u4e25', 'direct SocialPoliticalSignals.record should retain characterName');
assert(explicit.characterId === 'char-bi', 'direct SocialPoliticalSignals.record should retain characterId');

console.log('[smoke-character-class-action-signals] PASS character actions affect classes and backing edges');
