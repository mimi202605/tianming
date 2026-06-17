#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function fakeEl() {
  return {
    classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    style: { cssText: '' },
    appendChild: function(c){ return c; },
    removeChild: function(c){ return c; },
    insertBefore: function(c){ return c; },
    setAttribute: function(){},
    getAttribute: function(){ return null; },
    addEventListener: function(){},
    removeEventListener: function(){},
    querySelector: function(){ return fakeEl(); },
    querySelectorAll: function(){ return []; },
    children: [],
    childNodes: [],
    firstChild: null,
    parentNode: null,
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    scrollIntoView: function(){},
    focus: function(){},
    remove: function(){}
  };
}

function makeBaseGM(overrides) {
  const gm = {
    turn: 1,
    chars: [],
    armies: [{ id: 'army-1', name: 'Smoke Army', size: 1000, morale: 50, loyalty: 50 }],
    facs: [{ name: 'Smoke Faction', lifePhase: 'stable', strength: 50, legitimacy: 50, population: 1000, morale: 50, stability: 50 }],
    rels: {},
    activeWars: [],
    activeDisasters: [],
    currentExamYear: false,
    mapData: { cities: {}, state: { showCorruption: false }, polygons: {} },
    minxin: { trueIndex: 60, byClass: { shi: { true: 60 } } },
    huangwei: { index: 55, subDims: { foreign: { value: 50 } } },
    huangquan: { index: 55 },
    partyStrife: 20,
    currency: { market: { grainPrice: 100 } },
    hukou: { registeredTotal: 1000000, ding: 250000, taxRateMultiplier: 1, households: 250000 },
    policies: { landTaxRate: 0.04, pollTaxPerCapita: 0.03 },
    guoku: {
      balance: 1000000,
      monthlyIncome: 80000,
      monthlyExpense: 75000,
      annualIncome: 960000,
      rewardBudget: 50000,
      neicangTransferRate: 0.01,
      ledgers: {
        money: { stock: 1000000, lastTurnIn: 0, lastTurnOut: 0, sources: {}, sinks: {}, history: [] },
        grain: { stock: 0, lastTurnIn: 0, lastTurnOut: 0, sources: {}, sinks: {}, history: [] },
        cloth: { stock: 0, lastTurnIn: 0, lastTurnOut: 0, sources: {}, sinks: {}, history: [] }
      },
      sources: {},
      expenses: {},
      sourcesDetail: {},
      expensesDetail: {},
      history: { monthly: [], yearly: [], events: [] },
      bankruptcy: { active: false, consecutiveMonths: 0, severity: 0 },
      emergency: { extraTax: { active: false, rate: 0 }, loan: { active: false, amount: 0, monthsLeft: 0 } }
    },
    corruption: null,
    juanna: null
  };
  return Object.assign(gm, overrides || {});
}

function makeBaseP(overrides) {
  return Object.assign({
    conf: { gameMode: 'light-history' },
    ai: { key: null }
  }, overrides || {});
}

function createHarness(opts) {
  opts = opts || {};
  const math = Object.create(Math);
  math.random = typeof opts.random === 'function' ? opts.random : Math.random;

  const context = {
    console,
    Date,
    JSON,
    Math: math,
    RegExp,
    Error,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Map,
    Set,
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() { return false; },
    requestAnimationFrame: function(fn) {
      if (typeof fn === 'function') return fn(0);
      return 0;
    },
    cancelAnimationFrame: function() {},
    setInterval: typeof opts.setInterval === 'function' ? opts.setInterval : function(fn) {
      if (typeof fn === 'function') return fn();
      return 0;
    },
    clearInterval: function() {},
    performance: { now: function() { return 0; } },
    setTimeout: typeof opts.setTimeout === 'function' ? opts.setTimeout : function(fn) {
      if (typeof fn === 'function') return fn();
      return 0;
    },
    clearTimeout: function() {},
    localStorage: {
      getItem: function() { return null; },
      setItem: function() {},
      removeItem: function() {}
    },
    navigator: { userAgent: 'node' },
    document: {
      readyState: opts.readyState || 'complete',
      getElementById: function() { return fakeEl(); },
      querySelector: function() { return fakeEl(); },
      querySelectorAll: function() { return []; },
      addEventListener: function() {},
      createElement: function() { return fakeEl(); },
      body: fakeEl(),
      head: fakeEl(),
      defaultView: null
    },
    window: null,
    globalThis: null,
    global: null,
    TM: opts.TM || { errors: { capture: function() {} } },
    GM: opts.GM || makeBaseGM(),
    P: opts.P || makeBaseP(),
    scriptData: opts.scriptData || {},
    addEB: typeof opts.addEB === 'function' ? opts.addEB : function(){}
  };
  if (!context.TM.errors) context.TM.errors = { capture: function() {} };
  if (typeof opts.callAI === 'function') context.callAI = opts.callAI;
  context.window = context;
  context.globalThis = context;
  context.global = context;
  context.document.defaultView = context;
  vm.createContext(context);

  function load(file) {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  }

  function loadMany(files) {
    files.forEach(load);
  }

  return {
    context: context,
    load: load,
    loadMany: loadMany,
    root: ROOT,
    setRandom: function(fn) { context.Math.random = fn; }
  };
}

module.exports = {
  createHarness: createHarness,
  makeBaseGM: makeBaseGM,
  makeBaseP: makeBaseP,
  fakeEl: fakeEl
};
