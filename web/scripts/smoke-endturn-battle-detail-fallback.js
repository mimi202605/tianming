#!/usr/bin/env node
// smoke-endturn-battle-detail-fallback.js - battle detail rows recover army/fate fields from military system output.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  escHtml,
  deepClone,
  setTimeout() { return 1; },
  clearTimeout() {},
  getTSText(turn) { return 'T' + turn; },
  turnsForDuration() { return 12; },
  AccountingSystem: {
    getLedger() {
      return { items: [], totalIncome: 0, totalExpense: 0, netChange: 0 };
    }
  },
  ChronicleSystem: { addMonthDraft() {} },
  CORE_METRIC_LABELS: {},
  PromptLayerCache: { preload() {} },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  _$() { return null; },
  renderQiju() {},
  renderWenduiChars() {},
  generateMemorials() {},
  renderGameState() {},
  hideLoading() {},
  showTurnResult(html) { sandbox._lastTurnResultHtml = html; },
  toast() {},
  showCharPopup() {},
  _dbg() {},
  SaveManager: { autoSave() {} },
  GM: {
    turn: 40,
    sid: 'smoke',
    eraNames: [],
    chars: [
      { name: '曹文诏', faction: '明军', alive: true },
      { name: '孙承宗', faction: '明军', alive: true },
      { name: '侯养性', faction: '后金', alive: true }
    ],
    facs: [],
    vars: {},
    rels: {},
    evtLog: [],
    factionEvents: [],
    shijiHistory: [],
    qijuHistory: [],
    jishiRecords: [],
    _turnReport: [],
    _turnBattleResults: [
      {
        turn: 39,
        attacker: '明军',
        defender: '后金',
        attackerSoldiers: 3600,
        defenderSoldiers: 2800,
        attackerLoss: 120,
        defenderLoss: 540,
        winner: '明军',
        loser: '后金',
        verdict: '小胜',
        affectedArmies: [
          { armyId: 'guanning', side: 'attacker', loss: 120, commanderFate: { name: '曹文诏', outcome: 'survived' } },
          { side: 'attacker', commander: '孙承宗', loss: 0 },
          { side: 'defender', commanderFate: { name: '侯养性', outcome: 'captured' }, stateAfter: 'routed', loss: 540 }
        ]
      }
    ],
    armies: [
      { id: 'guanning', name: '关宁军', faction: '明军', owner: '明军', commander: '曹文诏', soldiers: 3480, state: 'garrison', morale: 74, supply: 62 },
      { id: 'sun', name: '督师营', faction: '明军', owner: '明军', commander: '孙承宗', soldiers: 900, state: 'garrison', morale: 70, supply: 66 },
      { id: 'hou', name: '八旗偏师', faction: '后金', owner: '后金', commander: '侯养性', soldiers: 2260, state: 'routed', morale: 32, supply: 41 }
    ],
    activeWars: [],
    battleHistory: [],
    turnChanges: { variables: [], characters: [], factions: [], parties: [], classes: [], military: [], map: [] },
    guoku: { money: 0, grain: 0, cloth: 0 },
    neitang: { money: 0, grain: 0, cloth: 0 },
    population: { national: {}, fugitives: 0 }
  },
  P: {
    time: { year: 1625, startMonth: 1, perTurn: '1m' },
    adminHierarchy: {},
    playerInfo: { factionName: '明军' },
    variables: [],
    conf: {}
  }
};
sandbox.window = sandbox;
sandbox.TM = { errors: { capture() {}, captureSilent() {} } };
sandbox.window.TM = sandbox.TM;
sandbox.window.GM = sandbox.GM;
sandbox.document = {
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; }
};

vm.createContext(sandbox);
// 2026-07-06 弹窗组装拆至 sibling·须先加载（_composeShijiHtml/_renderUnifiedChanges alias 在此）
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-shiji-compose.js'), 'utf8'), sandbox, {
  filename: 'tm-endturn-shiji-compose.js'
});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-render.js'), 'utf8'), sandbox, {
  filename: 'tm-endturn-render.js'
});

assert(typeof sandbox._endTurn_render === 'function', '_endTurn_render should be callable');

sandbox._endTurn_render(
  '辽东战事略胜，诸军收兵。',
  '曹文诏、孙承宗督军转进，侯养性部溃退。',
  '',
  '',
  {},
  {},
  {},
  '',
  null,
  [],
  null,
  '辽东战况小胜。',
  '辽东战况小胜。',
  '',
  '',
  [],
  '',
  null
);

const html = (sandbox.GM.shijiHistory[0] && sandbox.GM.shijiHistory[0].html) || sandbox._lastTurnResultHtml || '';
const match = html.match(/<details[\s\S]*?<summary[\s\S]*?3\s*军卷入[\s\S]*?<\/table><\/details>/);
assert(match, 'battle affected-armies details table should render');

const details = match[0];
assert(/关宁军/.test(details), 'armyId should resolve to own army name');
assert(/督师营/.test(details), 'commander-only affected army should resolve to own army name');
assert(/八旗偏师/.test(details), 'enemy commander fallback should resolve live army name');
assert(/曹文诏/.test(details) && /孙承宗/.test(details) && /侯养性/.test(details), 'commander names should remain visible');
assert(/主将无恙/.test(details), 'commanderFate.outcome should localize survived fate');
assert(/溃退/.test(details) && /主将被俘/.test(details), 'stateAfter and captured outcome should localize enemy fate');
assert(/120/.test(details) && /540/.test(details), 'loss should render as casualties fallback');
assert(!/<td[^>]*>\s*\?\s*<\/td>/.test(details), 'battle details should not render bare question-mark cells');

console.log('[smoke-endturn-battle-detail-fallback] PASS battle detail fallbacks render named army/fate rows');
