#!/usr/bin/env node
// smoke-class-character-ui.js - visible class <-> character backing surfaces.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function compact(v, n) {
  const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return s.length > (n || 120) ? s.slice(0, n || 120) : s;
}

const classes = [
  { name: '\u58eb\u7ec5', satisfaction: 52, influence: 71, currentDemand: '\u6269\u5927\u79d1\u4e3e\u53d6\u58eb' },
  { name: '\u519b\u6237', satisfaction: 44, influence: 64, currentDemand: '\u8865\u53d1\u8fb9\u9977' }
];
const parties = [
  { name: '\u4e1c\u6797\u515a', currentAgenda: '\u6574\u996c\u79d1\u573a', influence: 62 }
];
const people = [
  {
    id: 'char-qian',
    name: '\u94b1\u8c26\u76ca',
    office: '\u793c\u90e8\u4f8d\u90ce',
    party: '\u4e1c\u6797\u515a',
    faction: '\u4e1c\u6797\u515a',
    loyalty: 66,
    ambition: 58,
    stress: 32
  },
  {
    id: 'char-bi',
    name: '\u6bd5\u81ea\u4e25',
    office: '\u6237\u90e8\u5c1a\u4e66',
    loyalty: 80,
    ambition: 44,
    stress: 28
  }
];
const nodes = {};

const root = {
  turn: 14,
  classes,
  parties,
  characters: people,
  classCharacterRelations: {
    turn: 14,
    seq: 2,
    edges: {
      'e1': {
        className: '\u58eb\u7ec5',
        characterId: 'char-qian',
        characterName: '\u94b1\u8c26\u76ca',
        role: 'spokesperson',
        affinity: 0.72,
        legitimacy: 0.68,
        mobilization: 0.45,
        trust: 0.66,
        grievance: 0.12,
        source: 'llm-class-character-smoke',
        evidence: ['\u79d1\u4e3e\u5ef7\u8bae\u4ee3\u58eb\u6797\u53d1\u58f0'],
        lastTurn: 14,
        expiry: 20
      },
      'e2': {
        className: '\u519b\u6237',
        characterId: 'char-qian',
        characterName: '\u94b1\u8c26\u76ca',
        role: 'suppressor',
        affinity: 0.28,
        legitimacy: 0.24,
        mobilization: 0.18,
        trust: 0.22,
        grievance: 0.61,
        source: 'court-block',
        evidence: ['\u963b\u6320\u6b20\u9977\u8bae\u9898'],
        lastTurn: 14,
        expiry: 18
      }
    },
    history: []
  }
};

const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout(fn) { if (typeof fn === 'function') fn(); },
  document: {
    getElementById(id) { return nodes[id] || null; },
    createElement() {
      return {
        id: '',
        className: '',
        style: {},
        addEventListener(){},
        remove(){ if (this.id) delete nodes[this.id]; },
        set innerHTML(v) { this._html = String(v || ''); },
        get innerHTML() { return this._html || ''; }
      };
    },
    body: { appendChild(node){ if (node && node.id) nodes[node.id] = node; } },
    querySelector() { return null; },
    addEventListener() {}
  },
  window: {},
  GM: root,
  P: {},
  scriptData: {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.TMPhase8FormalBridge = {
  _state: { rightOutlineTab: 'classes', renwuTab: 'relations', modulePerson: 'char-qian', pinnedPeople: [] },
  _esc: esc,
  _attr: esc,
  _asset: p => p,
  _fmtNum: v => String(v == null ? '' : v),
  _miniRows: rows => '<div>' + (rows || []).map(r => '<span>' + esc(r[0]) + ':' + esc(r[1]) + '</span>').join('') + '</div>',
  _actionButton: () => '',
  _actionBtn: () => '',
  _actionChip: () => '',
  _moduleShell: (kind, title, sub, left, main, right) => '<section>' + left + main + right + '</section>',
  _dossierRows: () => '',
  _ownerKey: v => String(v || ''),
  _ownerName: v => String(v || ''),
  _findFaction: () => null,
  _findPerson: id => people.find(p => p.id === id || p.name === id) || null,
  _personKey: p => (p && (p.id || p.name)) || '',
  _personNameKey: p => (p && (p.name || p.id)) || '',
  _getPeople: () => people,
  _getMapData: () => [],
  _getParties: () => parties,
  _getClasses: () => classes,
  _collectRecentEvents: () => [],
  _getTurnText: t => String(t || ''),
  _firstArray: v => Array.isArray(v) ? v[0] : v,
  _renderActionStats: () => '',
  _compactText: compact,
  _getMemorials: () => [],
  _getIssues: () => [],
  _getLetters: () => [],
  _getActiveScenario: () => null,
  _getArmies: () => [],
  _issueIsResolved: () => false,
  _tmfRenwuPortrait: () => '',
  _toast: () => {},
  _renderEventFeed: () => '',
  _isPinned: () => false,
  _issueRank: () => 0,
  _renderIssueCard: () => '',
  _renderIssueDetail: () => '',
  openPanel: () => {},
  openModule: () => {},
  openGuoku: () => {},
  _openOfficeStandalone: () => {},
  _openShiluPreviewPanel: () => {},
  _openHongyanPreviewPanel: () => {},
  _closeDeskOverlay: () => {},
  _closeRightDrawer: () => {},
  _returnFormalHomeSoon: () => {},
  _saveFormalDraftsToGM: () => {}
};

vm.createContext(sandbox);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}

load('phase8-formal-rightrail.js');
load('phase8-formal-modules.js');

const bridge = sandbox.TMPhase8FormalBridge;
assert(bridge.rightrail && bridge.rightrail.renderers && typeof bridge.rightrail.renderers.ol === 'function', 'right rail outline renderer should load');
assert(bridge.modules && typeof bridge.modules.renderRenwuModule === 'function', 'renwu renderer should load');

const outlineHtml = bridge.rightrail.renderers.ol();
assert(!outlineHtml.includes('\u9636\u5c42\u4eba\u7269'), 'class card should not show class-character section inline');
bridge.rightrail.handleRightPanelAction('outline-select', { type: 'class', key: '\u58eb\u7ec5' });
const detailHtml = nodes['tm-social-detail-flyout'] && nodes['tm-social-detail-flyout'].innerHTML || '';
assert(detailHtml.includes('\u9636\u5c42\u4eba\u7269'), 'class detail should show class-character section');
assert(detailHtml.includes('\u4ee3\u8868\u4eba\u7269'), 'class detail should group spokespersons');
assert(detailHtml.includes('\u94b1\u8c26\u76ca'), 'class detail should show delegate character name');
assert(detailHtml.includes('\u79d1\u4e3e\u5ef7\u8bae'), 'class detail should show relation evidence');

const renwuHtml = bridge.modules.renderRenwuModule();
assert(renwuHtml.includes('\u9636\u5c42\u80cc\u4e66'), 'renwu relation tab should show class backing');
assert(renwuHtml.includes('\u9636\u5c42\u6028\u671b'), 'renwu relation tab should show class grievance');
assert(renwuHtml.includes('\u58eb\u7ec5'), 'renwu relation tab should show supporting class');
assert(renwuHtml.includes('\u519b\u6237'), 'renwu relation tab should show opposing class');
assert(renwuHtml.includes('\u8fd1\u56e0'), 'renwu relation tab should expose recent evidence');

console.log('[smoke-class-character-ui] PASS class-character UI surfaces');
