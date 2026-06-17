#!/usr/bin/env node
// smoke-class-character-court-office-links.js - court and office records bind classes to character delegates.

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

const root = {
  turn: 24,
  classes: [
    { name: '\u7f16\u6237\u519c\u6c11', satisfaction: 38, influence: 67, demands: '\u51cf\u5fAD\u5f79\u3001\u6e05\u6237\u53e3' },
    { name: '\u519b\u6237', satisfaction: 42, influence: 64, demands: '\u8865\u9977\u3001\u514D\u4E71\u6D3E' }
  ],
  characters: [
    { id: 'char-bi', name: '\u6bd5\u81ea\u4e25', office: '\u6237\u90e8\u5c1a\u4e66', stance: '\u6e05\u6237\u53e3\u51cf\u5fAD\u5f79', loyalty: 78 },
    { id: 'char-yuan', name: '\u8881\u5d07\u7115', office: '\u8fbd\u4e1c\u7763\u5e08', stance: '\u6574\u996C\u519B\u9977', loyalty: 72 }
  ],
  _pendingTinyiTopics: [
    {
      topic: '\u6c11\u60c5\u00b7\u7f16\u6237\u519c\u6c11\u00b7\u6237\u53e3\u5fAD\u5f79\u6e05\u6838',
      className: '\u7f16\u6237\u519c\u6c11',
      sourceClass: '\u7f16\u6237\u519c\u6c11',
      delegateCharacter: '\u6bd5\u81ea\u4e25',
      delegateCharacterId: 'char-bi',
      sourceType: 'class_pressure',
      reason: '\u7f16\u6237\u519c\u6c11\u8bf7\u6bd5\u81ea\u4e25\u4ee3\u4e3a\u4e0a\u8bae'
    }
  ],
  office_changes: [
    {
      characterName: '\u8881\u5d07\u7115',
      characterId: 'char-yuan',
      office: '\u8fbd\u4e1c\u7763\u5e08',
      affectedClasses: [{ name: '\u519b\u6237' }],
      linkedIssue: '\u519b\u9977\u6e05\u7406',
      reason: '\u4efb\u8881\u5d07\u7115\u627f\u529e\u519b\u9977\u6574\u996C'
    }
  ]
};

const CCR = sandbox.TM.ClassCharacterRelations;
assert(CCR && typeof CCR.run === 'function', 'run should exist');

const result = CCR.run(root, { turn: 24, source: 'smoke-court-office-links', skipDiscovery: true });
assert(result.signals >= 2, 'court topic and office change should be ingested as character-class signals');

const edges = Object.values(root.classCharacterRelations.edges || {});
const bi = edges.find(e => e.className === '\u7f16\u6237\u519c\u6c11' && e.characterName === '\u6bd5\u81ea\u4e25');
const yuan = edges.find(e => e.className === '\u519b\u6237' && e.characterName === '\u8881\u5d07\u7115');
assert(bi, 'class pressure tinyi delegate should form class-character edge');
assert(yuan, 'office appointment executor should form class-character edge');
assert(bi.source.indexOf('class_pressure') >= 0 || bi.source.indexOf('tinyi') >= 0, 'tinyi edge should retain sourceType/source evidence');
assert(yuan.source.indexOf('office') >= 0, 'office edge should retain office source');
assert(bi.evidence.some(x => String(x).indexOf('\u4ee3\u4e3a\u4e0a\u8bae') >= 0), 'tinyi edge should keep delegate reason');
assert(yuan.evidence.some(x => String(x).indexOf('\u519b\u9977') >= 0), 'office edge should keep appointment reason');
assert(root.characters[0].classSupportSummary.indexOf('\u7f16\u6237\u519c\u6c11') >= 0, 'delegate edge should feed character support summary');

console.log('[smoke-class-character-court-office-links] PASS court and office character-class links');
