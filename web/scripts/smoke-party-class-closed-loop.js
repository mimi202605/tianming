#!/usr/bin/env node
// smoke-party-class-closed-loop.js - player action -> signals -> bridge -> actors -> tinyi result -> UI chain.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function fakeEl() {
  return {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: { cssText: '' },
    appendChild(c){ return c; },
    removeChild(c){ return c; },
    insertBefore(c){ return c; },
    setAttribute(){},
    getAttribute(){ return null; },
    addEventListener(){},
    removeEventListener(){},
    querySelector(){ return fakeEl(); },
    querySelectorAll(){ return []; },
    children: [],
    childNodes: [],
    firstChild: null,
    parentNode: null,
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    remove(){}
  };
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const calls = [];
const playerSignals = [];
const nodes = {};
const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error, Promise,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
  clearTimeout(){},
  setInterval: () => 1,
  clearInterval(){},
  document: {
    getElementById: (id) => id === 'tm-social-detail-flyout' ? (nodes[id] || null) : fakeEl(),
    querySelector: () => fakeEl(),
    querySelectorAll: () => [],
    addEventListener(){},
    createElement: () => {
      const el = fakeEl();
      el.remove = function(){ if (this.id) delete nodes[this.id]; };
      return el;
    },
    body: Object.assign(fakeEl(), { appendChild(node){ if (node && node.id) nodes[node.id] = node; return node; } }),
    head: fakeEl(),
    readyState: 'complete'
  },
  window: {},
  localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  navigator: { userAgent: 'node' },
  performance: { now: () => Date.now() },
  fetch: () => Promise.reject(new Error('no fetch')),
  alert(){},
  confirm: () => true,
  prompt: () => null,
  HTMLElement: function(){},
  Event: function(){},
  requestAnimationFrame: cb => setTimeout(cb, 16),
  EndTurnHooks: { register(){}, registerFragment(){}, execute: async () => {}, collectFragments: () => [] },
  GameHooks: { on(){}, emit(){} },
  _$: () => fakeEl(),
  _ty2_enterDecide(){},
  escHtml: esc,
  addCYBubble(){},
  addEB(){},
  toast(){},
  closeChaoyi(){},
  showLoading(){},
  hideLoading(){}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
sandbox.P = {
  conf: { partyClassLlmEnabled: true },
  ai: {
    key: 'primary-key',
    url: 'https://primary.example/v1',
    model: 'primary-model',
    secondary: {
      key: 'secondary-key',
      url: 'https://secondary.example/v1',
      model: 'secondary-model'
    }
  },
  scenario: { dynastyType: 'ming' }
};
sandbox.GM = {
  running: true,
  turn: 12,
  sid: 'closed-loop-smoke',
  vars: {},
  evtLog: [],
  qijuHistory: [],
  recentChaoyi: [],
  _chronicle: [],
  _ccHeldItems: [],
  _chronicleTracks: [],
  _pendingTinyiTopics: [],
  tinyi: { followUpQueue: [] },
  fiscal: { _peasantBurdenAvg: 0.82, taxPressureIndex: 0.84 },
  partyState: {},
  currentIssues: [
    { id: 'issue-levy', title: 'Emergency grain levy', topic: 'Emergency grain levy', status: 'pending', category: 'finance', priority: 66 }
  ],
  classes: [
    {
      name: 'Farmers',
      tags: ['peasant', 'tax', 'corvee'],
      satisfaction: 46,
      influence: 64,
      demands: 'reduce emergency grain levy',
      unrestLevels: { grievance: 40, petition: 45, strike: 56, revolt: 62 }
    }
  ],
  parties: [
    { name: 'Relief Party', leader: 'Minister Lin', influence: 52, cohesion: 50 },
    { name: 'Tax Clique', leader: 'Minister Cao', influence: 60, cohesion: 65, rivalParty: 'Relief Party' }
  ],
  chars: [
    { name: 'Minister Lin', party: 'Relief Party', officialTitle: 'Minister', prestige: 78, alive: true },
    { name: 'Minister Cao', party: 'Tax Clique', officialTitle: 'Minister', prestige: 72, alive: true }
  ]
};
sandbox.CY = { _ty3: null, _ty2: null };
sandbox.findCharByName = name => (sandbox.GM.chars || []).find(c => c && c.name === name) || null;
sandbox.callAIMessages = async function(messages, maxTok, signal, tier, opts) {
  calls.push({ messages, maxTok, tier, opts });
  return JSON.stringify({
    relation_adjustments: [
      {
        party: 'Relief Party',
        className: 'Farmers',
        affinityDelta: 18,
        trustDelta: 6,
        grievanceDelta: -8,
        reason: 'player made rural levy relief a court-facing bargain'
      }
    ],
    class_updates: [
      {
        className: 'Farmers',
        satisfactionDelta: 3,
        demands: ['reduce emergency grain levy'],
        unrestDelta: { petition: 3 }
      }
    ],
    party_updates: [
      {
        party: 'Relief Party',
        currentAgenda: 'reduce emergency grain levy',
        shortGoal: 'carry farmer levy relief through court debate',
        cohesionDelta: 2
      }
    ],
    court_issue_updates: [
      {
        issueId: 'issue-levy',
        topic: 'Emergency grain levy',
        status: 'linked',
        sourceParty: 'Relief Party',
        sourceClass: 'Farmers',
        linkedParties: ['Relief Party'],
        linkedClasses: ['Farmers'],
        priorityDelta: 8,
        reason: 'player connected tax pressure, class demand, and party sponsorship'
      }
    ],
    issue_goal_links: [
      {
        issueId: 'issue-levy',
        topic: 'Emergency grain levy',
        party: 'Relief Party',
        className: 'Farmers',
        goalText: 'carry farmer levy relief through court debate',
        demandText: 'reduce emergency grain levy',
        affinityDelta: 7,
        emergent: true,
        reason: 'class demand now has a party sponsor'
      }
    ],
    notes: ['closed loop calibration']
  });
};

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
  _getPeople: () => sandbox.GM.chars,
  _getMapData: () => ({ regions: [] }),
  _getParties: () => sandbox.GM.parties,
  _getClasses: () => sandbox.GM.classes,
  _collectRecentEvents: () => [],
  _getTurnText: () => 'T12',
  _firstArray: () => [],
  _actionBtn: () => '',
  _actionChip: () => '',
  _renderActionStats: () => '',
  _compactText: (v, n) => String(v || '').slice(0, n || 160),
  _getMemorials: () => [],
  _getIssues: () => sandbox.GM.currentIssues,
  _getActiveScenario: () => ({}),
  _getArmies: () => [],
  _issueIsResolved: () => false,
  _tmfRenwuPortrait: () => '',
  _toast(){},
  openPanel(slot) { this._lastPanel = slot; },
  openModule(kind, opts) { this._lastModule = { kind, opts }; },
  openGuoku(){},
  _openOfficeStandalone(){},
  _openShiluPreviewPanel(){},
  _openHongyanPreviewPanel(){},
  _closeModule(){},
  _closeDeskOverlay(){},
  _closeRightDrawer(){},
  _returnFormalHomeSoon(){},
  _saveFormalDraftsToGM(){},
  openRenwu(){},
  personAction(){},
  unpin(){}
};
sandbox.TMPhase8FormalBridge = bridge;

vm.createContext(sandbox);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}

(async function main() {
  load('tm-engine-constants.js');
  load('tm-class-engine.js');
  load('tm-party-goals.js');
  load('tm-social-political-signals.js');
  load('tm-player-action-signals.js');
  load('tm-party-class-actors.js');
  load('tm-party-class-llm-calibrator.js');
  const originalRecord = sandbox.TM.PlayerActionSignals.record;
  sandbox.TM.PlayerActionSignals.record = function(root, payload) {
    playerSignals.push({ root, payload });
    return originalRecord(root, payload);
  };
  load('tm-endturn-core.js');
  load('tm-tinyi-v3-persona.js'); load('tm-tinyi-v3.js'); load('tm-tinyi-v3-edict-personnel.js'); load('tm-tinyi-v3-parties.js');

  assert(typeof sandbox._runPreSubmitPartyClassCalibration === 'function', 'pre-submit calibration entry should be loadable');
  assert(sandbox.TM.PartyClassSignalBridge && typeof sandbox.TM.PartyClassSignalBridge.applyPending === 'function', 'signal bridge should be available');

  const initialSatisfaction = sandbox.GM.classes[0].satisfaction;
  sandbox.TM.PlayerActionSignals.record(sandbox.GM, {
    source: 'smoke-closed-loop-player',
    action: 'court',
    topic: 'Emergency grain levy',
    linkedIssue: 'issue-levy',
    text: 'Put Farmers levy relief before court and ask Relief Party to sponsor it.'
  });
  assert(playerSignals.length === 1, 'player operation should be recorded before submit');
  assert(sandbox.GM._socialPoliticalSignals.items.some(s => s && s.sourceSystem === 'player-action' && s.linkedIssue === 'issue-levy'), 'player operation should mirror into the social/political ledger');

  await sandbox._runPreSubmitPartyClassCalibration();

  assert(calls.length === 1, 'pre-submit should make exactly one party/class LLM calibration call');
  assert(calls[0].tier === 'secondary', 'pre-submit party/class calibration should prefer secondary API');
  assert(sandbox.GM._socialPoliticalSignals.items.some(s => s && s.kind === 'tax-pressure'), 'pre-submit should scan runtime tax pressure');
  assert(sandbox.TM.SocialPoliticalSignals.snapshot(sandbox.GM).pending === 0, 'pre-submit signal bridge should consume pending social/political signals');
  assert(sandbox.GM.classes[0].satisfaction < initialSatisfaction, 'runtime signal bridge should move class state before endturn inference');
  assert(sandbox.GM._pendingTinyiTopics.some(t => t && t.sourceType === 'party_class_calibration' && t.party === 'Relief Party' && t.sourceClass === 'Farmers'), 'LLM issue/goal link should enter real tinyi queue');
  assert(sandbox.TM.PartyGoals.getActiveGoals(sandbox.GM, 'Relief Party', { turn: 12 }).some(g => g && /farmer levy relief/.test(String(g.text || ''))), 'calibrated issue link should create a party goal');
  const reliefMemorials = (sandbox.GM.party_actions || []).filter(a => a && a.actorId === 'Relief Party' && a.actionType === 'memorial');
  assert(reliefMemorials.some(a => a && a.linkedIssue === 'issue-levy' && /(farmer levy relief|emergency grain levy)/.test(a.agenda)), 'post-calibration actor pass should convert the new party goal into a memorial action before submission: ' + JSON.stringify(reliefMemorials));
  assert(sandbox.GM._partyClassActorMemory.items.some(m => m && m.actorType === 'party' && m.actorId === 'Relief Party' && m.linkedIssue === 'issue-levy'), 'party memorial should leave actor memory with linked issue');

  const queued = sandbox.GM._pendingTinyiTopics.find(t => t && t.sourceType === 'party_class_calibration' && t.party === 'Relief Party');
  sandbox.CY = {
    _ty3: {
      topic: queued.topic,
      meta: queued,
      proposerParty: 'Relief Party',
      draftEdict: { body: 'Reduce emergency grain levy and review corvee quotas.' }
    },
    _ty2: { topic: queued.topic, attendees: ['Minister Lin', 'Minister Cao'], stances: {} }
  };
  const seal = sandbox._ty3_phase6_recordSeal('issued', {
    grade: 'B',
    decision: { mode: 'majority' },
    opts: { topic: queued.topic, proposerParty: 'Relief Party', opposingParties: ['Tax Clique'], chaoyiTrackId: queued.issueId || queued.id }
  }, {});
  assert(seal && seal.sealStatus === 'issued', 'tinyi seal should complete the queued issue');
  assert(sandbox.GM.classes[0].partyOutcomeHistory && sandbox.GM.classes[0].partyOutcomeHistory.some(h => h && h.outcome === 'issued' && h.sourceParty === 'Relief Party'), 'tinyi result should write back class outcome history');
  assert(sandbox.GM._socialPoliticalSignals.items.some(s => s && s.sourceSystem === 'court' && s.kind === 'tinyi-stage6-issued'), 'tinyi result should mirror back into the social/political ledger');
  assert(Array.isArray(sandbox.GM._courtRecords) && sandbox.GM._courtRecords.some(r => r && r.topic === queued.topic && r.sourceParty === 'Relief Party' && r.sourceClass === 'Farmers'), 'tinyi result should write a UI-readable court record for the cause chain');

  load('phase8-formal-rightrail.js');
  load('phase8-formal-rightrail-social.js');
  assert(bridge.rightrail && bridge.rightrail.renderers && typeof bridge.rightrail.renderers.ol === 'function', 'right rail outline renderer should load');
  let html = bridge.rightrail.renderers.ol();
  assert(!/tmrp-social-chain/.test(html), 'class outline should not render social cause chain inline');
  bridge.rightrail.handleRightPanelAction('outline-select', { type: 'class', key: 'Farmers' });
  let detailHtml = nodes['tm-social-detail-flyout'] && nodes['tm-social-detail-flyout'].innerHTML || '';
  assert(/tmrp-social-chain/.test(detailHtml), 'class detail should render social cause chain');
  assert(/急征粮役/.test(detailHtml), 'class chain should expose localized related tinyi issue');
  assert(/已明发 B/.test(detailHtml), 'class chain should expose localized recent ruling from court record');
  bridge._state.rightOutlineTab = 'parties';
  html = bridge.rightrail.renderers.ol();
  assert(/Relief Party/.test(html) && !/farmer levy relief/.test(html), 'party outline should keep calibrated goal evidence out of the main card');
  bridge.rightrail.handleRightPanelAction('outline-select', { type: 'party', key: 'Relief Party' });
  detailHtml = nodes['tm-social-detail-flyout'] && nodes['tm-social-detail-flyout'].innerHTML || '';
  assert(/Relief Party/.test(detailHtml) && /农户征派纾困/.test(detailHtml), 'party detail should show localized calibrated goal/action evidence');

  console.log('[smoke-party-class-closed-loop] PASS party/class closed loop');
})().catch((e) => {
  console.error('[smoke-party-class-closed-loop] FAIL:', (e && e.stack) || e);
  process.exit(1);
});
