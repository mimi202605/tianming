#!/usr/bin/env node
// smoke-class-character-effects.js - class backing feeds character-side state.

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
  turn: 21,
  classes: [
    { name: '\u58eb\u7ec5', influence: 76, satisfaction: 62 },
    { name: '\u519b\u6237', influence: 68, satisfaction: 34 }
  ],
  characters: [
    {
      id: 'char-qian',
      name: '\u94b1\u8c26\u76ca',
      stressSources: ['\u515a\u4e89\u538b\u529b']
    }
  ]
};

const CCR = sandbox.TM.ClassCharacterRelations;
assert(CCR && typeof CCR.adjustRelation === 'function', 'adjustRelation should exist');
assert(typeof CCR.run === 'function', 'run should exist');

CCR.adjustRelation(root, {
  className: '\u58eb\u7ec5',
  characterId: 'char-qian',
  characterName: '\u94b1\u8c26\u76ca',
  role: 'spokesperson',
  affinity: 0.74,
  legitimacy: 0.7,
  mobilization: 0.42,
  trust: 0.68,
  grievance: 0.08,
  source: 'smoke-backing',
  evidence: ['\u4ee3\u58eb\u6797\u53d1\u58f0']
}, { turn: 21 });

CCR.adjustRelation(root, {
  className: '\u519b\u6237',
  characterId: 'char-qian',
  characterName: '\u94b1\u8c26\u76ca',
  role: 'suppressor',
  affinity: 0.24,
  legitimacy: 0.22,
  mobilization: 0.18,
  trust: 0.2,
  grievance: 0.66,
  source: 'smoke-grievance',
  evidence: ['\u963b\u6320\u6b20\u9977\u8bae\u9898']
}, { turn: 21 });

CCR.run(root, { turn: 21, source: 'smoke-effects', skipDiscovery: true, skipSignals: true });

const qian = root.characters[0];
assert(Array.isArray(qian.classBackings) && qian.classBackings.length === 2, 'character should keep class backing mirror');
assert(qian.socialCapital > 0, 'supportive class backing should create socialCapital');
assert(qian.classPressure > 0, 'hostile class backing should create classPressure');
assert(qian.classSupportSummary && qian.classSupportSummary.indexOf('\u58eb\u7ec5') >= 0, 'support summary should name backing class');
assert(qian.classOppositionSummary && qian.classOppositionSummary.indexOf('\u519b\u6237') >= 0, 'opposition summary should name resentful class');
assert(qian._classCharacterEffect && qian._classCharacterEffect.turn === 21, 'character should retain effect ledger');
assert(Array.isArray(qian._classCharacterEffect.backingClasses) && qian._classCharacterEffect.backingClasses[0].className === '\u58eb\u7ec5', 'effect should rank backing classes');
assert(Array.isArray(qian._classCharacterEffect.opposingClasses) && qian._classCharacterEffect.opposingClasses[0].className === '\u519b\u6237', 'effect should rank opposing classes');
assert(qian.stressSources.some(x => String(x).indexOf('\u9636\u5c42\u6028\u671b') >= 0 && String(x).indexOf('\u519b\u6237') >= 0), 'high class grievance should appear in stressSources');

root.turn = 30;
CCR.run(root, { turn: 30, source: 'smoke-effects-expiry', skipDiscovery: true, skipSignals: true });
assert((qian.classBackings || []).length === 0, 'expired edges should clear character backing mirror');
assert(qian.socialCapital === 0 && qian.classPressure === 0, 'expired edges should clear derived social capital and pressure');

console.log('[smoke-class-character-effects] PASS class backing feeds character state');
