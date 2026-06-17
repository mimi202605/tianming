#!/usr/bin/env node
// smoke-phase8-party-class-relation-interventions.js - right rail does not directly edit ecology-built relations.

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

const playerSignals = [];
const llmActions = [];
const toasts = [];
const nodes = {};

const classes = [
  {
    name: 'Canal Tenants',
    satisfaction: 31,
    influence: 56,
    currentDemand: 'reduce tax and levy pressure',
    demands: 'reduce tax and levy pressure',
    unrestLevels: { grievance: 34, petition: 42, strike: 68, revolt: 76 }
  }
];

const parties = [
  { name: 'Relief League', status: 'active', influence: 54, currentAgenda: 'carry tenant relief' },
  { name: 'Revenue Clique', status: 'active', influence: 68, currentAgenda: 'defend arrear collection', rivalParty: 'Relief League' }
];

const bridge = {
  _state: { rightOutlineTab: 'classes', activePanel: 'ol' },
  _esc: esc,
  _attr: esc,
  _asset: v => v,
  _fmtNum: v => String(v),
  _miniRows: () => '',
  _actionButton: () => '',
  _moduleShell: () => '',
  _dossierRows: () => '',
  _ownerKey: () => '',
  _ownerName: () => '',
  _findFaction: () => null,
  _findPerson: name => ({ name, alive: true, location: 'capital', officialTitle: 'minister' }),
  _personKey: p => p && (p.name || p.id) || '',
  _getPeople: () => [],
  _getMapData: () => ({ regions: [] }),
  _getParties: () => parties,
  _getClasses: () => classes,
  _collectRecentEvents: () => [],
  _getTurnText: () => 'T22',
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
  _toast: msg => { toasts.push(String(msg || '')); },
  openPanel(slot) { this._lastPanel = slot; this._state.activePanel = slot; },
  openModule(kind, opts) { this._lastModule = { kind, opts }; },
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

const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: fn => { if (typeof fn === 'function') fn(); return 1; },
  document: {
    getElementById: id => nodes[id] || null,
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
  },
  window: {
    TMPhase8FormalBridge: bridge,
    GM: null,
    P: {},
    TM: {
      PlayerActionSignals: {
        record(root, payload) {
          playerSignals.push({ root, payload });
          return { id: 'mock-player-action', payload };
        }
      },
      PartyClassLlmCalibrator: {
        notifyPlayerAction(payload) {
          llmActions.push(payload);
        }
      }
    }
  }
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.globalThis = sandbox.window;
sandbox.window.global = sandbox.window;
sandbox.GM = sandbox.window.GM = {
  turn: 22,
  classes,
  parties,
  partyState: {},
  _pendingTinyiTopics: [],
  _edictSuggestions: [],
  partyClassRelations: {
    edges: {
      'canaltenants::reliefleague': {
        className: 'Canal Tenants',
        partyName: 'Relief League',
        affinity: 46,
        trust: 44,
        grievance: 40,
        status: 'aligned',
        lastTurn: 21,
        lastSource: 'smoke-ecology-apply-21',
        lastReason: 'ecology signal tax linked class pressure'
      },
      'canaltenants::revenueclique': {
        className: 'Canal Tenants',
        partyName: 'Revenue Clique',
        affinity: 28,
        trust: 30,
        grievance: 62,
        status: 'latent',
        lastTurn: 21,
        lastSource: 'smoke-ecology-apply-21',
        lastReason: 'ecology signal tax linked class pressure'
      }
    },
    history: []
  },
  _partyClassEcology: {
    signalHistory: [
      { turn: 21, source: 'smoke-ecology-tax-21', kind: 'tax-pressure', categories: ['tax'], affectedClasses: ['Canal Tenants'], affectedParties: ['Relief League', 'Revenue Clique'] }
    ]
  }
};
sandbox.P = sandbox.window.P;
sandbox.TM = sandbox.window.TM;
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-party-goals.js'), 'utf8'), sandbox, { filename: 'tm-party-goals.js' });
// Restore UI-facing mocks after PartyGoals attaches itself to TM.
sandbox.window.TM.PlayerActionSignals = {
  record(root, payload) {
    playerSignals.push({ root, payload });
    return { id: 'mock-player-action', payload };
  }
};
sandbox.window.TM.PartyClassLlmCalibrator = {
  notifyPlayerAction(payload) {
    llmActions.push(payload);
  }
};
sandbox.TM = sandbox.window.TM;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8'), sandbox, { filename: 'phase8-formal-rightrail.js' });

const bridgeSource = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8');
assert(!/\.tmrp-ecology-actions/.test(bridgeSource), 'ecology relation rows should not style direct relation intervention buttons');

let html = bridge.rightrail.renderers.ol();
assert(!/tmrp-ecology/.test(html), 'ecology relation rows should not render inline on class cards');
bridge.rightrail.handleRightPanelAction('outline-select', { type: 'class', key: 'Canal Tenants' });
const detailHtml = nodes['tm-social-detail-flyout'] && nodes['tm-social-detail-flyout'].innerHTML || '';
assert(/tmrp-ecology/.test(detailHtml), 'ecology relation rows should render in detail flyout');
assert(!/data-right-action="social-relation"/.test(detailHtml), 'ecology relation rows must not expose direct relation actions');
assert(!/data-relation-command=/.test(detailHtml), 'ecology relation rows must not expose support/suppress/mediate/court relation commands');
assert(!/data-forecast=/.test(detailHtml), 'ecology forecasts should be display-only, not direct action payloads');
assert(/data-right-action="social-action"[^>]*data-social-command="audience"/.test(detailHtml), 'formal audience route should remain available');
assert(/data-right-action="social-action"[^>]*data-social-command="chaoyi"/.test(detailHtml), 'formal court route should remain available');
assert(/data-right-action="social-action"[^>]*data-social-command="edict"/.test(detailHtml), 'formal edict route should remain available');

const reliefEdge = sandbox.GM.partyClassRelations.edges['canaltenants::reliefleague'];
const revenueEdge = sandbox.GM.partyClassRelations.edges['canaltenants::revenueclique'];
const reliefBefore = { affinity: reliefEdge.affinity, trust: reliefEdge.trust, grievance: reliefEdge.grievance };
const revenueBefore = { affinity: revenueEdge.affinity, trust: revenueEdge.trust, grievance: revenueEdge.grievance };

bridge.rightrail.handleRightPanelAction('social-action', {
  actorType: 'class',
  name: 'Canal Tenants',
  socialCommand: 'chaoyi',
  buttonText: '付廷议'
});
assert(sandbox.GM._pendingTinyiTopics.some(x => x && x.sourceType === 'class_pressure' && x.sourceClass === 'Canal Tenants'), 'formal court route should create a class-pressure court issue');
assert(bridge._state.rightIssueTab === 'chaoyi' && bridge._state.rightChaoyiMode === 'tinyi', 'formal court route should switch right rail to court issue mode');

bridge.rightrail.handleRightPanelAction('social-action', {
  actorType: 'class',
  name: 'Canal Tenants',
  socialCommand: 'edict',
  buttonText: '拟安抚诏'
});
assert(sandbox.GM._edictSuggestions.some(x => x && x.source === '阶层民情' && /Canal Tenants/.test(x.content)), 'formal edict route should create an edict suggestion');

bridge.rightrail.handleRightPanelAction('social-action', {
  actorType: 'class',
  name: 'Canal Tenants',
  socialCommand: 'audience',
  buttonText: '召代表'
});
assert(sandbox.GM.wenduiTarget === 'Canal Tenants代表', 'formal audience route should enter question-and-answer flow');

assert(reliefEdge.affinity === reliefBefore.affinity && reliefEdge.trust === reliefBefore.trust && reliefEdge.grievance === reliefBefore.grievance, 'formal UI routes should not directly mutate Relief League relation edge');
assert(revenueEdge.affinity === revenueBefore.affinity && revenueEdge.trust === revenueBefore.trust && revenueEdge.grievance === revenueBefore.grievance, 'formal UI routes should not directly mutate Revenue Clique relation edge');
assert(!sandbox.GM._pendingTinyiTopics.some(x => x && x.sourceType === 'party_class_relation'), 'formal routes should not enqueue direct party-class relation issue commands');
assert(!sandbox.GM.partyClassRelations.history.some(h => h && /phase8-relation/.test(String(h.source || ''))), 'formal routes should not append direct relation intervention history');
assert(playerSignals.some(x => x.payload && x.payload.action === 'social-action' && /chaoyi|付廷议/.test(x.payload.text)), 'formal social action should enter player action signal ledger');
assert(!playerSignals.some(x => x.payload && x.payload.action === 'social-relation'), 'player action ledger should not receive direct relation actions');
assert(llmActions.some(x => x && x.action === 'social-action'), 'formal social action should notify LLM calibration path');
assert(!llmActions.some(x => x && x.action === 'social-relation'), 'LLM calibration path should not receive direct relation actions');

console.log('[smoke-phase8-party-class-relation-interventions] PASS phase8 relation interventions gated behind formal routes');
