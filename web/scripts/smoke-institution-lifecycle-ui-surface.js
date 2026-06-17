#!/usr/bin/env node
// smoke-institution-lifecycle-ui-surface.js - right rail should expose institution lifecycle as a visible UI surface.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const QUEHUO = '\u69b7\u8d27\u53f8';

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

function load(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

const bridge = {
  _state: { rightOutlineTab: 'classes', activePanel: 'pcdebug' },
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
  _getParties: () => [],
  _getClasses: () => [],
  _collectRecentEvents: () => [],
  _getTurnText: () => 'T135',
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
  _toast() {},
  openPanel(slot) { this._lastPanel = slot; this._state.activePanel = slot; },
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

const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: fn => { if (typeof fn === 'function') fn(); return 1; },
  clearTimeout: () => {},
  navigator: { clipboard: { writeText() { return true; } } },
  document: { getElementById: () => null, createElement: () => ({ addEventListener(){}, remove(){}, style: {} }), body: { appendChild(){} } },
  window: {
    TMPhase8FormalBridge: bridge,
    GM: null,
    P: {},
    TM: { errors: { capture(){}, captureSilent(){} } },
    navigator: null,
    addEB() {}
  },
  addEB() {}
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.globalThis = sandbox.window;
sandbox.window.navigator = sandbox.navigator;
sandbox.window.addEB = sandbox.addEB;
sandbox.GM = sandbox.window.GM = {
  turn: 135,
  month: 1,
  chars: [],
  facs: [],
  parties: [],
  classes: [],
  armies: [],
  items: [],
  regions: [],
  guoku: { money: 500000 },
  huangquan: { index: 55 },
  dynamicInstitutions: [],
  _turnReport: []
};
sandbox.P = sandbox.window.P;
sandbox.TM = sandbox.window.TM;
vm.createContext(sandbox);

(function main() {
  load(sandbox, 'tm-edict-parser.js');
  const parser = sandbox.window.EdictParser;
  assert(parser && typeof parser.registerDynamicInstitution === 'function', 'EdictParser should load into window');

  const inst = parser.registerDynamicInstitution({
    name: QUEHUO,
    rank: 5,
    duties: '\u603b\u7406\u949e\u5173\u3001\u94f6\u6d41\u4e0e\u5e02\u6613',
    annualBudget: 40000,
    createdBy: 'edict'
  });
  parser.advanceInstitutionLifecycle(inst.id, 'court_debate', { decision: '\u5ef7\u8bae\u51c6\u8bd5\u884c\u4e09\u5e74' });
  parser.advanceInstitutionLifecycle(inst.id, 'trial_start', { durationTurns: 36 });
  parser.advanceInstitutionLifecycle(inst.id, 'trial_failed', { reason: '\u5546\u8d3e\u62b5\u5236\uff0c\u5e02\u4ef7\u5931\u5e73' });
  parser.abolishInstitution(inst.id);
  parser.advanceInstitutionLifecycle(inst.id, 'historical_reference', { citedBy: '\u6237\u90e8\u8986\u594f', note: '\u540e\u8bae\u94f6\u6d41\u6539\u6cd5\u5f15\u4e3a\u524d\u4f8b' });
  parser.advanceInstitutionLifecycle(inst.id, 'status_feedback', { summary: '\u5df2\u5e9f\u6b62\uff0c\u4f46\u7559\u4e0b\u94f6\u6d41\u7a3d\u6838\u6210\u4f8b' });

  sandbox.__lifecycleViewCalls = 0;
  const realView = parser.getInstitutionLifecycleView;
  parser.getInstitutionLifecycleView = function(id) {
    sandbox.__lifecycleViewCalls += 1;
    return realView.call(this, id);
  };

  load(sandbox, 'phase8-formal-rightrail.js');
  assert(bridge.rightrail && bridge.rightrail.renderers && typeof bridge.rightrail.renderers.pcdebug === 'function', 'right rail should export pcdebug renderer');

  const html = bridge.rightrail.renderers.pcdebug();
  assert(/Institution Lifecycle/.test(html), 'pcdebug should expose Institution Lifecycle section');
  assert(/proposal \/ debate \/ trial \/ archive/.test(html), 'lifecycle UI should explain visible lifecycle chain');
  assert(html.includes(QUEHUO), 'lifecycle UI should include institution name');
  assert(/current abolished/.test(html), 'lifecycle UI should show current stage');
  assert(/proposed/.test(html) && /court_debate/.test(html) && /trial_start/.test(html) && /trial_failed/.test(html) && /abolished/.test(html), 'lifecycle UI should show completed lifecycle steps');
  assert(/historical_reference/.test(html) && /status_feedback/.test(html), 'lifecycle UI should show non-stage reference and feedback steps');
  assert(/\u94f6\u6d41\u7a3d\u6838|\u524d\u4f8b/.test(html), 'lifecycle UI should show feedback or historical reference text');
  assert(sandbox.__lifecycleViewCalls > 0, 'right rail should call EdictParser.getInstitutionLifecycleView');

  console.log('[smoke-institution-lifecycle-ui-surface] PASS institution lifecycle UI surface');
})();
