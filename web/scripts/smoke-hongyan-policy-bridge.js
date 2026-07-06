#!/usr/bin/env node
// smoke-hongyan-policy-bridge.js - Guard formal Hongyan letters landing in policy engines.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

function fn() {}

function fakeEl() {
  return {
    classList: { add: fn, remove: fn, toggle: fn, contains: function() { return false; } },
    style: {},
    children: [],
    childNodes: [],
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    appendChild: function(c) { this.children.push(c); return c; },
    removeChild: function(c) { return c; },
    setAttribute: fn,
    getAttribute: function() { return null; },
    removeAttribute: fn,
    addEventListener: fn,
    removeEventListener: fn,
    querySelector: function() { return fakeEl(); },
    querySelectorAll: function() { return []; },
    getBoundingClientRect: function() { return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }; },
    focus: fn,
    blur: fn,
    remove: fn
  };
}

function makeContext() {
  const calls = {
    transferOrders: []
  };
  const target = { name: '张巡', location: '江南', loyalty: 85, stress: 10, alive: true };
  const ctx = {
    console: console,
    window: null,
    globalThis: null,
    Math: Object.create(Math),
    Date: Date,
    JSON: JSON,
    RegExp: RegExp,
    Error: Error,
    Promise: Promise,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    document: {
      getElementById: function() { return fakeEl(); },
      querySelector: function() { return fakeEl(); },
      querySelectorAll: function() { return []; },
      createElement: function() { return fakeEl(); },
      createTextNode: function() { return fakeEl(); },
      body: fakeEl(),
      head: fakeEl()
    },
    escHtml: function(s) { return String(s == null ? '' : s); },
    toast: fn,
    addEB: fn,
    uid: (function() {
      let n = 0;
      return function() { n += 1; return 'uid_' + n; };
    })(),
    _getDaysPerTurn: function() { return 30; },
    getCurrentGameDay: function() { return ((ctx.GM && ctx.GM.turn) || 1) - 1; },
    getTSText: function(turn) { return 'T' + turn; },
    turnsForMonths: function(months) { return Math.max(1, Math.ceil(months)); },
    findCharByName: function(name) { return name === target.name ? target : null; },
    _isSameLocation: function(a, b) { return a === b; },
    P: {
      conf: { gameMode: '' },
      ai: {},
      officeConfig: {},
      playerInfo: { characterName: '天子' }
    },
    GM: {
      turn: 2,
      _capital: '京师',
      chars: [target],
      facs: [],
      letters: [],
      qijuHistory: [],
      _edictTracker: [],
      _pendingNpcLetters: [],
      _courierStatus: {},
      _npcCorrespondence: [],
      _routeDisruptions: [],
      guoku: { balance: 200000 },
      fiscal: {
        regions: {
          jiangnan: {
            regionId: 'jiangnan',
            name: '江南',
            ledgers: { money: 120000, grain: 0, cloth: 0 },
            allocation: { mode: 'qiyun_cunliu', perTax: { land_grain: { qiyun: 0.6, cunliu: 0.4 } } },
            compliance: 0.8,
            autonomyLevel: 0.2,
            annualReport: { collected: 0, remitted: 0, skimmed: 0 }
          }
        }
      },
      regions: [{ id: 'jiangnan', name: '江南' }]
    },
    EconomyLinkage: {
      createTransferOrder: function(spec) {
        calls.transferOrders.push(spec);
        return { success: true, orderId: 'transfer_' + calls.transferOrders.length };
      }
    },
    EconomyGapFill: {},
    CentralLocalEngine: {},
    EnvCapacityEngine: {},
    AuthorityComplete: { triggerHuangweiEvent: fn },
    HujiEngine: {},
    CurrencyEngine: { REFORM_PRESETS: [], applyReform: function() { return false; } }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.global = ctx;
  ctx.Math.random = function() { return 0.99; };
  return { ctx: ctx, calls: calls, target: target };
}

function loadRuntime(ctx) {
  vm.createContext(ctx);
  ['tm-edict-parser.js', 'tm-hongyan-office.js', 'tm-game-ui-shell.js', 'tm-hongyan-edict-ui.js'].forEach(function(file) {
    const fp = path.join(ROOT, file);
    vm.runInContext(fs.readFileSync(fp, 'utf8'), ctx, { filename: fp });
  });
  assert(ctx.EdictParser && typeof ctx.EdictParser.tryExecute === 'function',
    'EdictParser.tryExecute should be available in Hongyan policy bridge smoke');
  assert(typeof ctx._settleLettersAndTravel === 'function',
    'tm-hongyan-office should expose _settleLettersAndTravel');
}

function pushLetter(ctx, target, type, content) {
  const letter = {
    id: 'lt_' + type,
    from: '玩家',
    to: target.name,
    fromLocation: '京师',
    toLocation: target.location,
    content: content,
    sentTurn: 1,
    deliveryTurn: 1,
    replyTurn: 3,
    _sentDay: 0,
    _deliveryDay: 0,
    _replyDay: 60,
    reply: '',
    status: 'traveling',
    urgency: 'normal',
    letterType: type
  };
  ctx.GM.letters.push(letter);
  ctx.GM._edictTracker.push({
    content: content,
    category: '政令',
    turn: 1,
    status: 'pending',
    source: 'letter',
    target: target.name,
    letterId: letter.id
  });
  return letter;
}

(function main() {
  const formal = makeContext();
  loadRuntime(formal.ctx);
  const formalLetter = pushLetter(
    formal.ctx,
    formal.target,
    'formal_edict',
    '诏令：下拨江南银50000两赈济水灾。'
  );
  formal.ctx._settleLettersAndTravel();
  assert(formal.calls.transferOrders.length === 1,
    'formal Hongyan edict should execute central-local policy when delivered');
  assert(formal.calls.transferOrders[0].toRegion === 'jiangnan',
    'formal Hongyan edict should preserve the parsed region');
  assert(formal.calls.transferOrders[0].amount === 50000,
    'formal Hongyan edict should preserve the parsed amount');
  assert(formalLetter._policyApplied === true,
    'delivered formal Hongyan edict should be marked policy-applied');
  assert(formal.ctx.GM._edictTracker[0].status === 'executed',
    'Hongyan edict tracker should move from pending to executed');
  formal.ctx._settleLettersAndTravel();
  assert(formal.calls.transferOrders.length === 1,
    'settling again should not duplicate Hongyan policy execution');

  const personal = makeContext();
  loadRuntime(personal.ctx);
  pushLetter(
    personal.ctx,
    personal.target,
    'personal',
    '诏令：下拨江南银50000两赈济水灾。'
  );
  personal.ctx._settleLettersAndTravel();
  assert(personal.calls.transferOrders.length === 0,
    'personal Hongyan letters should not execute policy even when their text resembles an edict');

  console.log('smoke-hongyan-policy-bridge OK: ' + passed + ' assertions');
})()
