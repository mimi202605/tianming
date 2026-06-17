#!/usr/bin/env node
/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const utilsSrc = fs.readFileSync(path.join(ROOT, 'tm-utils.js'), 'utf8');
const wenduiSrc = fs.readFileSync(path.join(ROOT, 'tm-wendui.js'), 'utf8');
const pathutilsSrc = fs.readFileSync(path.join(ROOT, 'tm-ai-change-pathutils.js'), 'utf8');
const armySrc = fs.readFileSync(path.join(ROOT, 'tm-ai-change-army.js'), 'utf8');
const narrativeSrc = fs.readFileSync(path.join(ROOT, 'tm-ai-change-narrative.js'), 'utf8');
const applierSrc = fs.readFileSync(path.join(ROOT, 'tm-ai-change-applier.js'), 'utf8');

let passed = 0;
function assert(cond, label) {
  if (!cond) throw new Error('[assert] ' + label);
  passed += 1;
}

function makeEl() {
  return {
    id: '',
    className: '',
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    remove() {},
    focus() {},
    scrollIntoView() {}
  };
}

const els = Object.create(null);
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Promise,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Date,
  Math,
  JSON,
  Map,
  parseInt,
  parseFloat,
  isFinite,
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  GM: {
    sid: 'smoke',
    turn: 2,
    _capital: '京师',
    chars: [],
    allCharacters: [],
    wenduiHistory: {},
    qijuHistory: [],
    _chronicle: [],
    _turnReport: [],
    characterArcs: {}
  },
  P: {
    playerInfo: { characterName: '朱由检' },
    ai: {},
    traitDefinitions: []
  },
  document: {
    body: makeEl(),
    createElement() { return makeEl(); },
    getElementById(id) { return els[id] || null; }
  },
  window: {},
  __els: els,
  findScenarioById: () => null,
  findCharByName(name) {
    return sandbox.GM.chars.find(c => c && c.name === name);
  },
  _spendEnergy: () => true,
  _fmtNum1: n => String(n == null ? 0 : n),
  escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  toast(msg) { sandbox.__toasts.push(String(msg || '')); },
  switchGTab(a, b) { sandbox.__switched = b; },
  renderLetterPanel() { sandbox.__letterRendered = true; },
  addEB() {},
  getTSText(turn) { return 'T' + turn; },
  onAppointment() { return { ok: true }; },
  renderGameState() { sandbox.__renderedGameState = true; },
  renderRenwu() { sandbox.__renderedRenwu = true; },
  renderSidePanels() { sandbox.__renderedSidePanels = true; },
  __toasts: [],
  __switched: '',
  __letterRendered: false
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(utilsSrc, sandbox, { filename: 'tm-utils.js' });
vm.runInContext(wenduiSrc, sandbox, { filename: 'tm-wendui.js' });
vm.runInContext(pathutilsSrc, sandbox, { filename: 'tm-ai-change-pathutils.js' });
vm.runInContext(armySrc, sandbox, { filename: 'tm-ai-change-army.js' });
vm.runInContext(narrativeSrc, sandbox, { filename: 'tm-ai-change-narrative.js' });
vm.runInContext(applierSrc, sandbox, { filename: 'tm-ai-change-applier.js' });

assert(typeof sandbox._isSameLocation === 'function', 'location alias helper exists');
assert(sandbox._isSameLocation('顺天府', '京师'), '顺天府 matches 京师');
assert(sandbox._isSameLocation('顺天府', '京师·乾清宫'), '顺天府 matches palace sub-location');

sandbox.P.playerInfo.characterName = 'Emperor';
sandbox.P.playerInfo.factionName = 'Ming';
sandbox.GM.playerName = 'Emperor';
sandbox.GM.playerFactionName = 'Ming';
sandbox.GM._capital = 'Capital';
sandbox.GM.chars = [
  { name: 'Emperor', isPlayer: true, alive: true, faction: 'Ming', location: 'Capital' },
  { name: 'PlayerConsort', alive: true, gender: 'female', spouse: 'Emperor', spouseRank: 'consort', faction: 'Ming', location: 'Capital' },
  { name: 'ForeignConsort', alive: true, gender: 'female', spouse: 'ForeignKhan', spouseRank: 'consort', faction: 'Khorchin', location: 'Mukden' },
  { name: 'FormerConsort', alive: true, gender: 'female', spouse: true, title: '先朝选侍', faction: 'Ming', location: 'Capital' }
];
assert(sandbox._tmIsPlayerConsort(sandbox.GM.chars[1]), 'player spouse string is recognized as player consort');
assert(!sandbox._tmIsPlayerConsort(sandbox.GM.chars[2]), 'foreign spouse string is not recognized as player consort');
assert(!sandbox._tmIsPlayerConsort(sandbox.GM.chars[3]), 'former-regime consort title is not recognized as player consort');
assert(sandbox._wdIsPlayerSideChar(sandbox.GM.chars[1]), 'player consort remains in wendui roster');
assert(!sandbox._wdIsPlayerSideChar(sandbox.GM.chars[2]), 'foreign consort is excluded from wendui roster');
sandbox.GM._pendingAudiences = [{ name: 'ForeignConsort', isConsort: true, reason: 'bad queue' }];
sandbox.__toasts = [];
sandbox._wdOpenAudienceQueue(0);
assert(sandbox.GM._pendingAudiences.length === 0, 'invalid foreign consort queue entry is removed');
sandbox.GM._pendingAudiences = [];
sandbox.P.playerInfo.characterName = '朱由检';
sandbox.GM.playerName = '朱由检';
sandbox.GM.playerFactionName = '';
sandbox.GM._capital = '京师';

sandbox.GM.chars = [
  { name: '朱由检', isPlayer: true, alive: true, location: '京师' },
  { name: '魏忠贤', alive: true, location: '顺天府', loyalty: 40 }
];
sandbox.GM.allCharacters = [
  { name: '魏忠贤', alive: true, location: '顺天府', loyalty: 40 }
];
sandbox.__toasts = [];
sandbox.__switched = '';
sandbox.openWenduiModal('魏忠贤', 'formal');
assert(sandbox.GM.wenduiTarget === '魏忠贤', '顺天府人物可在京师问对');
assert(!sandbox.__toasts.some(t => t.indexOf('远在') >= 0 || t.indexOf('不能召见') >= 0), 'same-city alias is not treated as away');
assert(sandbox.__switched !== 'gt-letter', 'same-city alias does not redirect to letters');

sandbox.GM.chars = [
  { name: '袁崇焕', alive: true, location: '宁远', _travelFrom: '宁远', _travelTo: '顺天府', _travelRemainingDays: 1, _travelReason: '奉诏入见' }
];
sandbox.GM.allCharacters = [
  { name: '袁崇焕', alive: true, location: '宁远', relationValue: 50 }
];
const travelResult = sandbox.advanceCharTravelByDays(30);
assert(travelResult.arrived === 1, 'travel tick records arrival');
assert(sandbox.GM.chars[0].location === '顺天府', 'active character location changes on arrival');
assert(sandbox.GM.allCharacters[0].location === '顺天府', 'allCharacters mirror location changes on arrival');
assert(!sandbox.GM.chars[0]._travelTo && !sandbox.GM.allCharacters[0]._travelTo, 'travel state is cleared from active and mirror records');

sandbox.GM.chars = [
  { name: '孙承宗', alive: true, location: '顺天府' }
];
sandbox.GM.allCharacters = [
  { name: '孙承宗', alive: true, location: '顺天府' }
];
sandbox.GM._turnReport = [];
sandbox.applyAITurnChanges({
  char_updates: [
    { name: '孙承宗', travelTo: { toLocation: '京师', estimatedDays: 5, reason: '召见' } }
  ]
});
assert(!sandbox.GM.chars[0]._travelTo && !sandbox.GM.allCharacters[0]._travelTo, 'same-city travelTo does not create an in-flight state');
assert(sandbox.GM.chars[0].location === '顺天府' && sandbox.GM.allCharacters[0].location === '顺天府', 'same-city travelTo keeps location mirrors stable');

sandbox.GM.chars = [
  { name: '卢象升', alive: true, location: '大名府' }
];
sandbox.GM.allCharacters = [
  { name: '卢象升', alive: true, location: '大名府' }
];
sandbox.GM._turnReport = [];
sandbox.applyAITurnChanges({
  char_updates: [
    { name: '卢象升', travelTo: { toLocation: '京师', estimatedDays: 15, reason: '奉诏入朝' } }
  ]
});
assert(sandbox.GM.chars[0]._travelTo === '京师' && sandbox.GM.allCharacters[0]._travelTo === '京师', 'travel start is mirrored to allCharacters');
assert(sandbox.GM.allCharacters[0]._travelRemainingDays === 15, 'travel remaining days are mirrored on start');

sandbox.GM.chars = [
  { name: '温体仁', alive: true, location: '顺天府' }
];
sandbox.GM.allCharacters = [
  { name: '温体仁', alive: true, location: '顺天府' }
];
sandbox.GM._turnReport = [];
sandbox.applyAITurnChanges({
  office_assignments: [
    { name: '温体仁', action: 'appoint', post: '首辅', dept: '内阁', toLocation: '京师', estimatedDays: 5, reason: '入阁办事' }
  ]
});
assert(!sandbox.GM.chars[0]._travelTo && !sandbox.GM.allCharacters[0]._travelTo, 'same-city office assignment does not create travel');

console.log('[smoke-character-location-travel] PASS assertions=' + passed);
