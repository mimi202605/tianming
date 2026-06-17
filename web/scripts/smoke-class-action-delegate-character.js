#!/usr/bin/env node
// smoke-class-action-delegate-character.js - class actions flow through current character delegates.

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

load('tm-class-character-relations.js');
load('tm-party-class-actors.js');

const CCR = sandbox.TM && sandbox.TM.ClassCharacterRelations;
const Actors = sandbox.TM && sandbox.TM.PartyClassActors;
assert(CCR && typeof CCR.adjustRelation === 'function', 'ClassCharacterRelations.adjustRelation should exist');
assert(Actors && typeof Actors.run === 'function', 'PartyClassActors.run should exist');

const root = {
  turn: 31,
  currentIssues: [
    { id: 'issue-keju', title: '\u79d1\u4e3e\u53d6\u58eb', category: 'keju', status: 'pending' }
  ],
  classes: [
    {
      name: '\u58eb\u7ec5',
      satisfaction: 32,
      influence: 74,
      demands: '\u6269\u5927\u79d1\u4e3e\u53d6\u58eb\u540d\u989d'
    }
  ],
  characters: [
    {
      id: 'char-qian',
      name: '\u94b1\u8c26\u76ca',
      office: '\u793c\u90e8\u4f8d\u90ce',
      stance: '\u6269\u5927\u79d1\u4e3e\u53d6\u58eb'
    }
  ]
};

CCR.adjustRelation(root, {
  className: '\u58eb\u7ec5',
  characterId: 'char-qian',
  characterName: '\u94b1\u8c26\u76ca',
  role: 'spokesperson',
  affinity: 0.74,
  legitimacy: 0.82,
  mobilization: 0.66,
  trust: 0.76,
  grievance: 0.08,
  source: 'smoke-existing-backing',
  evidence: '\u79d1\u4e3e\u8bae\u9898\u4e2d\u88ab\u58eb\u6797\u63a8\u4e3a\u4ee3\u8a00',
  expiry: 36
}, { turn: 31, source: 'smoke-class-action-delegate-character' });

const result = Actors.run(root, { turn: 31, source: 'smoke-class-action-delegate-character' });
assert(result.classActions >= 1, 'class actor run should produce class actions');

const petition = root.class_actions.find(a => a.actorId === '\u58eb\u7ec5' && a.actionType === 'petition');
assert(petition, 'unhappy class should create a petition action');
assert(petition.delegateCharacter === '\u94b1\u8c26\u76ca', 'class petition should bind current delegate character');
assert(petition.delegateCharacterId === 'char-qian', 'class petition should preserve delegate character id');
assert(petition.delegateRole === 'spokesperson', 'class petition should preserve delegate role');
assert(String(petition.delegateEvidence || '').indexOf('\u79d1\u4e3e') >= 0, 'class petition should keep delegate evidence');
assert(root.classes[0].class_actions.some(a => a.id === petition.id && a.delegateCharacter === '\u94b1\u8c26\u76ca'), 'class row action history should keep delegate');

const memory = root._partyClassActorMemory && root._partyClassActorMemory.items.find(m => m.actionId === petition.id);
assert(memory, 'delegate action should write actor memory');
assert(memory.delegateCharacter === '\u94b1\u8c26\u76ca', 'memory should preserve delegate character');
assert(memory.delegateCharacterId === 'char-qian', 'memory should preserve delegate character id');

const snap = Actors.snapshot(root, { turn: 31, limit: 10 });
assert(snap.classActions.some(a => a.id === petition.id && a.delegateCharacter === '\u94b1\u8c26\u76ca'), 'snapshot should expose delegated class action');

console.log('[smoke-class-action-delegate-character] PASS class actions bind character delegates');
