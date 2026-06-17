#!/usr/bin/env node
// smoke-office-appointment-sync.js — lock holder/actualHolders sync for office appointments.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  assertions++;
}

function fakeEl() {
  return { value: '', style: {}, innerHTML: '', textContent: '', appendChild(){}, remove(){}, querySelector(){ return null; } };
}

const context = {
  console,
  Date,
  JSON,
  Math,
  RegExp,
  Array,
  Object,
  String,
  Number,
  Boolean,
  parseInt,
  parseFloat,
  isNaN,
  setTimeout(){},
  clearTimeout(){},
  document: {
    getElementById: () => fakeEl(),
    querySelectorAll: () => [],
    createElement: () => fakeEl(),
    body: fakeEl(),
    addEventListener(){}
  },
  window: null,
  P: { playerInfo: { characterName: '皇帝' } },
  scriptData: {},
  GM: {
    turn: 5,
    officeTree: [],
    chars: [],
    evtLog: [],
    _chronicle: [],
    qijuHistory: []
  },
  SettlementPipeline: { register(){} },
  autoSave(){},
  showToast(){},
  alert(){},
  escHtml(v) { return String(v == null ? '' : v); },
  toast(){},
  _dbg(){},
  addEB(){},
  recordCharacterArc(){},
  _isSameLocation(a, b) { return a === b; },
  getTSText(turn) { return 'T' + turn; },
  findCharByName() { return null; }
};
context.window = context;
context.globalThis = context;
context.addEB = function(type, text) { context.GM.evtLog.push({ type, text }); };
context.findCharByName = function(name) {
  return (context.GM.chars || []).find(ch => ch && ch.name === name) || null;
};

vm.createContext(context);

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

load('tm-office-system.js');
load('tm-endturn-edict.js');
load('tm-endturn-prep.js');
load('editor-crud.js');
load('tm-office-panel.js');

context.GM.chars = [
  { name: '旧臣', officialTitle: '尚书', position: '尚书', alive: true },
  { name: '新臣', officialTitle: '侍郎', position: '侍郎', alive: true, location: '京师' }
];
context.GM.officeTree = [
  { name: '吏部', positions: [
    { name: '尚书', holder: '旧臣', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '旧臣', generated: true }] },
    { name: '侍郎', holder: '新臣', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '新臣', generated: true }] }
  ], subs: [] }
];

context.applyEdictActions({ appointments: [{ character: '新臣', position: '尚书' }], dismissals: [], deaths: [] });

const shangshu = context.GM.officeTree[0].positions[0];
const shilang = context.GM.officeTree[0].positions[1];
assert(shangshu.holder === '新臣', 'appointment should update legacy holder');
assert(Array.isArray(shangshu.actualHolders), 'appointment should preserve actualHolders');
assert(shangshu.actualHolders.some(h => h && h.name === '新臣' && h.generated !== false), 'appointment should update actualHolders');
assert(!shangshu.actualHolders.some(h => h && h.name === '旧臣'), 'appointment should remove old holder from target actualHolders');
assert(shangshu.vacancyCount === 0, 'appointment should keep vacancy count synced');
assert(shilang.holder === '', 'appointment should vacate previous office holder field');
assert(!shilang.actualHolders.some(h => h && h.name === '新臣'), 'appointment should vacate previous office actualHolders');
assert(context.GM.chars[0].officialTitle === '', 'appointment should clear displaced character title');
assert(context.GM.chars[1].officialTitle === '尚书', 'appointment should update new character title');

context.applyEdictActions({ appointments: [], dismissals: [{ character: '新臣' }], deaths: [] });

assert(shangshu.holder === '', 'dismissal should clear legacy holder');
assert(!shangshu.actualHolders.some(h => h && h.name === '新臣'), 'dismissal should clear actualHolders');
assert(shangshu.actualHolders.some(h => h && h.generated === false), 'dismissal should leave vacancy placeholder');
assert(context.GM.chars[1].officialTitle === '', 'dismissal should clear character title');

context.scriptData = {
  characters: [
    { name: '编修甲', officialTitle: '无' },
    { name: '原尚书', officialTitle: '尚书' }
  ],
  government: {
    nodes: [
      { name: '吏部', positions: [
        { name: '尚书', holder: '原尚书', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '原尚书', generated: true }] }
      ], subs: [] }
    ]
  },
  officeTree: []
};
const editorSync = context._syncCharacterOfficeHolder(
  { name: '编修甲', officialTitle: '无' },
  { name: '编修甲', officialTitle: '吏部尚书' }
);
const editorPos = context.scriptData.government.nodes[0].positions[0];
assert(editorSync.synced === true, 'editor title save should report synced');
assert(editorPos.holder === '编修甲', 'editor title save should update holder');
assert(editorPos.actualHolders.some(h => h && h.name === '编修甲' && h.generated !== false), 'editor title save should update actualHolders');
assert(context.scriptData.characters[1].officialTitle === '无', 'editor title save should clear displaced character title');

context.GM.turn = 9;
context.GM._edictTracker = [];
context.GM._edictSuggestions = [];
context.GM.chars = [
  { name: 'OldOfficer', officialTitle: '', position: '', alive: true },
  { name: 'NewOfficer', officialTitle: '', position: '', alive: true, location: 'Capital' }
];
context.GM.officeTree = [
  { name: 'TestDept', positions: [
    {
      name: 'TestMinister',
      holder: '',
      establishedCount: 1,
      vacancyCount: 0,
      actualHolders: [{ name: 'OldOfficer', generated: true }],
      publicTreasury: { currentHead: 'OldOfficer' }
    }
  ], subs: [] }
];

context._offPickerConfirm('NewOfficer', 'TestDept', 'TestMinister', '', 'resign');

const directPanelPos = context.GM.officeTree[0].positions[0];
assert(directPanelPos.holder === 'NewOfficer', 'direct panel appointment should replace stale actualHolders primary holder');
assert(directPanelPos.actualHolders.some(h => h && h.name === 'NewOfficer' && h.generated !== false), 'direct panel appointment should write new holder to actualHolders');
assert(!directPanelPos.actualHolders.some(h => h && h.name === 'OldOfficer'), 'direct panel appointment should clear stale actualHolders holder');
assert(directPanelPos.publicTreasury.currentHead === 'NewOfficer', 'direct panel appointment should update treasury currentHead');
assert(directPanelPos._pendingEdict && directPanelPos._pendingEdict.prevHolder === 'OldOfficer', 'direct panel appointment should snapshot effective previous holder');
assert(context.GM.chars[1].officialTitle === 'TestMinister', 'direct panel appointment should update new character title');

context.GM.chars = [
  { name: '升官者', officialTitle: '侍郎', position: '侍郎', faction: '东林', party: '清流', ambition: 50, loyalty: 70, alive: true },
  { name: '中立同僚', faction: '东林', party: '清流', ambition: 90, loyalty: 60, alive: true },
  { name: '政敌同僚', faction: '东林', party: '浙党', ambition: 90, loyalty: 60, alive: true },
  { name: '善妒同僚', faction: '东林', party: '清流', ambition: 90, loyalty: 60, alive: true, traits: ['jealous'] }
];
context.GM.affinityMap = { '政敌同僚|升官者': -40 };
context.AffinityMap = {
  get(a, b) { return context.GM.affinityMap[a + '|' + b] || context.GM.affinityMap[b + '|' + a] || 0; },
  add(a, b, delta, reason) {
    const key = a + '|' + b;
    context.GM.affinityMap[key] = (context.GM.affinityMap[key] || 0) + delta;
    context.GM._affinityEvents = context.GM._affinityEvents || [];
    context.GM._affinityEvents.push({ a, b, delta, reason });
  }
};
context.adjustCharacterLoyalty = function(chOrName, delta, reason, opts) {
  const ch = typeof chOrName === 'string' ? context.findCharByName(chOrName) : chOrName;
  if (!ch) return { ok: false };
  ch.loyalty = Math.max(0, Math.min(100, (ch.loyalty == null ? 50 : ch.loyalty) + delta));
  context.GM._loyaltyEvents = context.GM._loyaltyEvents || [];
  context.GM._loyaltyEvents.push({ name: ch.name, delta, reason, source: opts && opts.source });
  return { ok: true };
};

const parsedPromotion = context.extractEdictActions('命升官者为尚书，并免去升官者旧职。');
assert(parsedPromotion.appointments.some(a => a.character === '升官者' && a.position === '尚书'), 'promotion edict should keep appointment');
assert(!parsedPromotion.dismissals.some(d => d.character === '升官者'), 'promotion edict should not also dismiss promoted character');

context.GM.chars = [
  { name: '升官者', officialTitle: '侍郎', position: '侍郎', faction: '东林', party: '清流', ambition: 50, loyalty: 70, alive: true },
  { name: '前任尚书', officialTitle: '尚书', position: '尚书', faction: '东林', party: '清流', ambition: 50, loyalty: 60, alive: true }
];
context.GM.officeTree = [
  { name: '吏部', positions: [
    { name: '尚书', holder: '前任尚书', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '前任尚书', generated: true }] },
    { name: '侍郎', holder: '升官者', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '升官者', generated: true }] }
  ], subs: [] }
];
context.applyEdictActions({ appointments: [{ character: '升官者', position: '尚书' }], dismissals: [{ character: '升官者', position: '旧职' }], deaths: [] });
assert(context.findCharByName('升官者').officialTitle === '尚书', 'same-edict promotion+dismissal should leave promoted character in new office');
assert(context.GM.officeTree[0].positions[0].holder === '升官者', 'same-edict promotion+dismissal should not vacate new office');

context.GM.chars = [
  { name: '升官者', officialTitle: '侍郎', position: '侍郎', faction: '东林', party: '清流', ambition: 50, loyalty: 70, alive: true },
  { name: '中立同僚', faction: '东林', party: '清流', ambition: 90, loyalty: 60, alive: true },
  { name: '政敌同僚', faction: '东林', party: '浙党', ambition: 90, loyalty: 60, alive: true },
  { name: '善妒同僚', faction: '东林', party: '清流', ambition: 90, loyalty: 60, alive: true, traits: ['jealous'] }
];
context.GM.affinityMap = { '政敌同僚|升官者': -40 };
context._reactToEdicts({ appointments: [{ character: '升官者', position: '尚书' }], dismissals: [], deaths: [] });
assert(context.findCharByName('中立同僚').loyalty === 60, 'neutral same-faction ambitious colleague should not lose loyalty for promotion');
assert(context.findCharByName('政敌同僚').loyalty === 57, 'same-faction political enemy may resent promotion');
assert(context.findCharByName('善妒同僚').loyalty === 57, 'jealous colleague may resent promotion');

console.log('[smoke-office-appointment-sync] pass assertions=' + assertions);
