#!/usr/bin/env node
// smoke-class-action-delegate-ui.js - class action UI exposes delegate characters in the causal chain.

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
  {
    name: '\u58eb\u7ec5',
    satisfaction: 34,
    influence: 72,
    currentDemand: '\u6269\u5927\u79d1\u4e3e\u53d6\u58eb\u540d\u989d'
  }
];
const parties = [
  { name: '\u4e1c\u6797\u515a', currentAgenda: '\u6574\u996c\u79d1\u573a', influence: 62, socialBase: [{ class: '\u58eb\u7ec5' }] }
];
const people = [
  { id: 'char-qian', name: '\u94b1\u8c26\u76ca', office: '\u793c\u90e8\u4f8d\u90ce', party: '\u4e1c\u6797\u515a' }
];
const nodes = {};
const action = {
  id: 'pcact-ui-delegate',
  turn: 18,
  actorType: 'class',
  actorId: '\u58eb\u7ec5',
  actionType: 'petition',
  agenda: '\u6269\u5927\u79d1\u4e3e\u53d6\u58eb\u540d\u989d',
  linkedIssue: 'issue-keju',
  status: 'planned',
  delegateCharacter: '\u94b1\u8c26\u76ca',
  delegateCharacterId: 'char-qian',
  delegateRole: 'spokesperson',
  delegateEvidence: '\u79d1\u4e3e\u5ef7\u8bae\u4ee3\u58eb\u6797\u53d1\u58f0'
};
classes[0].class_actions = [action];

const root = {
  turn: 18,
  classes,
  parties,
  characters: people,
  class_actions: [action],
  _pendingTinyiTopics: [
    {
      issueId: 'issue-keju',
      topic: '\u79d1\u4e3e\u53d6\u58eb\u540d\u989d\u5ef7\u8bae',
      className: '\u58eb\u7ec5',
      linkedActions: ['pcact-ui-delegate']
    }
  ],
  classCharacterRelations: {
    edges: {
      e1: {
        className: '\u58eb\u7ec5',
        characterId: 'char-qian',
        characterName: '\u94b1\u8c26\u76ca',
        role: 'spokesperson',
        affinity: 0.72,
        legitimacy: 0.76,
        mobilization: 0.52,
        trust: 0.7,
        grievance: 0.1,
        evidence: ['\u79d1\u4e3e\u5ef7\u8bae\u4ee3\u58eb\u6797\u53d1\u58f0']
      }
    }
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
  _state: { rightOutlineTab: 'classes', pinnedPeople: [] },
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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8'), sandbox, { filename: 'phase8-formal-rightrail.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail-social.js'), 'utf8'), sandbox, { filename: 'phase8-formal-rightrail-social.js' });

const bridge = sandbox.TMPhase8FormalBridge;
assert(bridge.rightrail && bridge.rightrail.renderers && typeof bridge.rightrail.renderers.ol === 'function', 'right rail outline renderer should load');

const html = bridge.rightrail.renderers.ol();
assert(!html.includes('data-chain-kind="delegate"'), 'class card should not render delegate chain inline');
bridge.rightrail.handleRightPanelAction('outline-select', { type: 'class', key: '\u58eb\u7ec5' });
const detailHtml = nodes['tm-social-detail-flyout'] && nodes['tm-social-detail-flyout'].innerHTML || '';
assert(detailHtml.includes('data-chain-kind="delegate"'), 'class detail chain should include delegate step');
assert(detailHtml.includes('\u4ee3\u7406\u4eba\u7269'), 'class detail action row should label delegate character');
assert(detailHtml.includes('\u94b1\u8c26\u76ca'), 'class detail action row should show delegate character name');
assert(detailHtml.includes('\u79d1\u4e3e\u5ef7\u8bae'), 'class detail action row should keep delegate evidence');

console.log('[smoke-class-action-delegate-ui] PASS class action delegate UI chain');
