#!/usr/bin/env node
// smoke-party-class-action-tinyi-bridge.js - actor actions strengthen/generate pending tinyi topics.

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

load('tm-party-class-action-scheduler.js');

const Scheduler = sandbox.TM && sandbox.TM.PartyClassActionScheduler;
assert(Scheduler && typeof Scheduler.scheduleBeforeSubmit === 'function', 'PartyClassActionScheduler.scheduleBeforeSubmit should exist');
assert(typeof Scheduler._bridgeActionsToTinyi === 'function', 'PartyClassActionScheduler should expose action->tinyi bridge for smoke coverage');

const root = {
  turn: 52,
  currentIssues: [
    { id: 'issue-levy', title: 'Emergency levy review', topic: 'Emergency levy review', status: 'pending' }
  ],
  classes: [
    {
      name: 'Canal Tenants',
      satisfaction: 42,
      influence: 62,
      demands: 'reduce emergency levy',
      unrestLevels: { grievance: 66, petition: 72, strike: 64, revolt: 35 },
      supportingParties: ['Relief League']
    }
  ],
  parties: [
    {
      name: 'Relief League',
      influence: 62,
      cohesion: 55,
      shortGoal: 'sponsor Emergency levy review',
      socialBase: ['Canal Tenants']
    }
  ],
  _partyClassCourtIssueLinks: [],
  _pendingTinyiTopics: [
    {
      id: 'issue-levy',
      issueId: 'issue-levy',
      topic: 'Emergency levy review',
      sourceType: 'party_goal',
      sourceParty: 'Relief League',
      party: 'Relief League',
      priority: 60,
      status: 'pending',
      linkedActions: ['old-action'],
      actionPressure: 1
    }
  ],
  party_actions: [
    {
      id: 'pcact-52-party',
      turn: 52,
      actorType: 'party',
      actorId: 'Relief League',
      actionType: 'memorial',
      agenda: 'sponsor Emergency levy review',
      linkedIssue: 'issue-levy',
      status: 'planned',
      confidence: 0.74,
      source: 'smoke'
    }
  ],
  class_actions: [
    {
      id: 'pcact-52-class',
      turn: 52,
      actorType: 'class',
      actorId: 'Canal Tenants',
      actionType: 'petition',
      agenda: 'reduce emergency levy',
      linkedIssue: 'issue-levy',
      status: 'planned',
      confidence: 0.72,
      source: 'smoke'
    }
  ]
};
sandbox.GM = root;

const result = Scheduler.scheduleBeforeSubmit(root, { turn: 52, source: 'smoke-action-tinyi', skipSignalMaintenance: true, skipRuntimeScan: true });
assert(result && result.tinyiBridge, 'scheduler should report tinyi bridge result');
assert(result.tinyiBridge.strengthened >= 1, 'existing issue should be strengthened');
assert(result.tinyiBridge.linkedActions >= 2, 'both actor actions should link into tinyi topic');

const levyTopics = root._pendingTinyiTopics.filter(t => t && (t.issueId === 'issue-levy' || t.id === 'issue-levy'));
assert(levyTopics.length === 1, 'same linkedIssue should not duplicate pending tinyi topics');
const levy = levyTopics[0];
assert(levy.priority > 60, 'action pressure should raise pending topic priority');
assert(levy.actionPressure >= 3, 'topic should accumulate actionPressure');
assert(levy.actionSourceType === 'party_class_action', 'existing topic should mark action source type without erasing original sourceType');
assert(Array.isArray(levy.linkedActions) && levy.linkedActions.includes('pcact-52-party') && levy.linkedActions.includes('pcact-52-class'), 'topic should keep linked actor action ids');
assert(Array.isArray(levy.actionHistory) && levy.actionHistory.some(x => x && x.actorId === 'Relief League') && levy.actionHistory.some(x => x && x.actorId === 'Canal Tenants'), 'topic should keep compact action history');
assert(levy.sourceParty === 'Relief League' && levy.sourceClass === 'Canal Tenants', 'topic should expose party/class sources for right rail chain');

const link = root._partyClassCourtIssueLinks.find(x => x && x.issueId === 'issue-levy' && x.party === 'Relief League' && x.className === 'Canal Tenants');
assert(link, 'action bridge should write court issue link for social chain');
assert(Array.isArray(link.linkedActions) && link.linkedActions.includes('pcact-52-party') && link.linkedActions.includes('pcact-52-class'), 'court issue link should carry linked action ids');

const prompt = Scheduler.formatForPrompt(root, { turn: 52, limit: 8 });
assert(/action_tinyi_pressure/.test(prompt), 'prompt should include action-derived tinyi pressure');
assert(/Emergency levy review/.test(prompt) && /actionPressure/.test(prompt), 'prompt should carry strengthened tinyi topic and pressure');

const topicCount = root._pendingTinyiTopics.length;
const linkedActionCount = levy.linkedActions.length;
Scheduler.scheduleBeforeSubmit(root, { turn: 52, source: 'smoke-action-tinyi-rerun', skipSignalMaintenance: true, skipRuntimeScan: true });
assert(root._pendingTinyiTopics.length === topicCount, 'rerun should not duplicate pending topics');
assert(levy.linkedActions.length === linkedActionCount, 'rerun should not duplicate linked action ids');

const bridge = {
  _state: { rightOutlineTab: 'classes', activePanel: 'ol' },
  _esc: esc,
  _attr: esc,
  _asset: (v) => v,
  _fmtNum: (v) => String(v),
  _miniRows: () => '',
  _actionButton: () => '',
  _moduleShell: () => '',
  _dossierRows: () => '',
  _ownerKey: () => '',
  _ownerName: () => '',
  _findFaction: () => null,
  _findPerson: (name) => ({ name, alive: true }),
  _personKey: (p) => p && (p.name || p.id) || '',
  _getPeople: () => [],
  _getMapData: () => ({ regions: [] }),
  _getParties: () => root.parties,
  _getClasses: () => root.classes,
  _collectRecentEvents: () => [],
  _getTurnText: () => 'T52',
  _firstArray: () => [],
  _actionBtn: () => '',
  _actionChip: () => '',
  _renderActionStats: () => '',
  _compactText: (v, n) => String(v || '').slice(0, n || 160),
  _getMemorials: () => [],
  _getIssues: () => [],
  _getActiveScenario: () => ({}),
  _getArmies: () => [],
  _issueIsResolved: () => false,
  _tmfRenwuPortrait: () => '',
  _toast: () => {},
  openPanel() {},
  openModule() {},
  openGuoku() {},
  _openOfficeStandalone() {},
  _openShiluPreviewPanel() {},
  _openHongyanPreviewPanel() {},
  _closeModule() {},
  _closeDeskOverlay() {},
  _closeRightDrawer() {},
  _returnFormalHomeSoon() {},
  _saveFormalDraftsToGM() {},
  openRenwu() {},
  personAction() {},
  unpin() {}
};
sandbox.TMPhase8FormalBridge = bridge;
sandbox.window.TMPhase8FormalBridge = bridge;
const nodes = {};
sandbox.document = {
  getElementById: (id) => nodes[id] || null,
  createElement: () => ({
    id: '',
    className: '',
    style: {},
    addEventListener(){},
    remove(){ if (this.id) delete nodes[this.id]; },
    set innerHTML(v) { this._html = String(v || ''); },
    get innerHTML() { return this._html || ''; }
  }),
  body: { appendChild(node){ if (node && node.id) nodes[node.id] = node; } }
};
sandbox.window.document = sandbox.document;

load('phase8-formal-rightrail.js');
assert(bridge.rightrail && bridge.rightrail.renderers && typeof bridge.rightrail.renderers.ol === 'function', 'right rail outline renderer should load');

let html = bridge.rightrail.renderers.ol();
assert(!/tmrp-actor-action/.test(html), 'class card should not show actor action block inline');
bridge.rightrail.handleRightPanelAction('outline-select', { type: 'class', key: 'Canal Tenants' });
let detailHtml = nodes['tm-social-detail-flyout'] && nodes['tm-social-detail-flyout'].innerHTML || '';
assert(/tmrp-actor-action/.test(detailHtml), 'class detail should show actor action block');
assert(/Canal Tenants/.test(detailHtml) && /petition|请愿/.test(detailHtml), 'class detail should show class petition');
assert(/Emergency levy review|紧急征派复核/.test(detailHtml), 'class action row should link to strengthened tinyi topic');

bridge._state.rightOutlineTab = 'parties';
html = bridge.rightrail.renderers.ol();
assert(!/tmrp-actor-action/.test(html), 'party card should not show actor action block inline');
bridge.rightrail.handleRightPanelAction('outline-select', { type: 'party', key: 'Relief League' });
detailHtml = nodes['tm-social-detail-flyout'] && nodes['tm-social-detail-flyout'].innerHTML || '';
assert(/tmrp-actor-action/.test(detailHtml), 'party detail should show actor action block');
assert(/Relief League/.test(detailHtml) && /memorial|奏疏|上书/.test(detailHtml), 'party detail should show party memorial');
assert(/Emergency levy review|紧急征派复核/.test(detailHtml), 'party action row should link to strengthened tinyi topic');

console.log('[smoke-party-class-action-tinyi-bridge] PASS action tinyi bridge');
