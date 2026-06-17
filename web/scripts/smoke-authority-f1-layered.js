#!/usr/bin/env node
// smoke-authority-f1-layered.js - R12 PhaseF1 layered behavior baseline.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;

function assert(cond, msg) {
  assertions++;
  if (!cond) {
    throw new Error(msg);
  }
}

function close(actual, expected, msg) {
  assertions++;
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

function fakeEl() {
  return {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {},
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

function createContext() {
  const events = [];
  const context = {
    console,
    Date,
    JSON,
    Math,
    RegExp,
    Error,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    setTimeout(){},
    clearTimeout(){},
    document: {
      getElementById: () => fakeEl(),
      querySelector: () => fakeEl(),
      querySelectorAll: () => [],
      addEventListener(){},
      createElement: () => fakeEl(),
      body: fakeEl(),
      head: fakeEl(),
      readyState: 'complete'
    },
    localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
    navigator: { userAgent: 'node' },
    GM: {},
    P: {},
    scriptData: {},
    escHtml: v => String(v == null ? '' : v),
    toast(){},
    addEB(type, text) { events.push({ type, text }); },
    findScenarioById() { return null; },
    EventBus: { emit(){} },
    SettlementPipeline: { register(){} },
    EndTurnHooks: { register(){} },
    TM: { errors: { capture(){}, captureSilent(){} } },
    __events: events
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  return context;
}

function load(context, file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

function setupAuthority(context, index, corruption) {
  context.GM = {
    turn: 1,
    chars: [],
    huangwei: {
      index,
      phase: 'normal',
      trend: 'stable',
      subDims: {
        court: { value: index },
        provincial: { value: index },
        military: { value: index },
        foreign: { value: index }
      },
      perceivedIndex: index,
      visibilityTier: 'moderate',
      sources: { benevolence: 5 },
      drains: {},
      tyrantSyndrome: { active: false },
      lostAuthorityCrisis: { active: false },
      history: { tyrantPeriods: [], crisisPeriods: [], pastHumiliations: [], lastActionTurn: 1 }
    },
    huangquan: {
      index: 55,
      phase: 'moderate',
      trend: 'stable',
      subDims: {
        central: { value: 55 },
        provincial: { value: 55 },
        military: { value: 55 },
        imperial: { value: 55 }
      },
      sources: {},
      drains: {},
      ministers: {},
      powerMinister: null,
      history: { purges: [], reforms: [] }
    },
    minxin: {
      trueIndex: 60,
      perceivedIndex: 60,
      phase: 'stable',
      sources: {},
      drains: {},
      subDims: { urban: { value: 60 }, rural: { value: 60 }, elite: { value: 60 }, military: { value: 60 } }
    },
    corruption: { overall: corruption },
    guoku: { money: 1000000 },
    neitang: { money: 100000 },
    population: { national: { mouths: 50000000, fugitives: 0 } }
  };
}

function loadF1Stack(context) {
  load(context, 'tm-authority-engines.js');
  load(context, 'tm-prophecy.js');
  try {
    load(context, 'tm-phase-f1-fixes.js');
  } catch (err) {
    if (err && err.code !== 'ENOENT') throw err;
  }
  context.AuthorityEngines.init();
  if (context.PhaseF1 && typeof context.PhaseF1.init === 'function') {
    context.PhaseF1.init();
  }
}

function testPerceived(index, corruption, expected, label) {
  const context = createContext();
  setupAuthority(context, index, corruption);
  loadF1Stack(context);
  context.AuthorityEngines.tick({ turn: 1, monthRatio: 1 });
  close(context.GM.huangwei.perceivedIndex, expected, label);
}

testPerceived(95, 60, 100, 'tyrant stage clamps high perceived value');
testPerceived(75, 60, 77.6, 'majesty stage applies light corruption polish');
testPerceived(55, 60, 58.9, 'normal stage applies medium polish');
testPerceived(35, 60, 42.8, 'decline stage applies urgent polish');
testPerceived(20, 60, 22.6, 'lost stage remains close to true value');

{
  const context = createContext();
  setupAuthority(context, 55, 20);
  loadF1Stack(context);
  assert(context.PhaseF1 && typeof context.PhaseF1.checkDecreeRealtime === 'function', 'PhaseF1 compatibility API is exported');
  context.GM.huangquan.index = 80;
  let res = context.PhaseF1.checkDecreeRealtime('命尚书即日拨银十万修江南水利，半年考核');
  assert(res.ok === true && res.mode === 'fiveElementsStrict', 'strict decree check accepts complete decree');
  res = context.PhaseF1.checkDecreeRealtime('修水利');
  assert(res.ok === false && res.missing.includes('时日') && res.missing.includes('执行人'), 'strict decree check reports missing elements');
  context.GM.huangquan.index = 50;
  res = context.PhaseF1.checkDecreeRealtime('修水利');
  assert(res.ok === true && res.mode === 'ministerAmplify', 'balanced phase does not hard reject incomplete decree');
}

{
  const context = createContext();
  setupAuthority(context, 55, 20);
  loadF1Stack(context);
  context.GM.huangquan.powerMinister = {
    name: '张相',
    controlLevel: 0.8,
    faction: ['核心一', '核心二', '核心三', '外围一', '外围二', '外围三']
  };
  context.GM.chars = [
    { name: '核心一', rank: 1, officialTitle: '尚书' },
    { name: '核心二', rank: 2, officialTitle: '侍郎' },
    { name: '核心三', rank: 3, officialTitle: '御史' },
    { name: '外围一', rank: 4, officialTitle: '知府' },
    { name: '外围二', rank: 5, officialTitle: '通判' },
    { name: '外围三', rank: 6, officialTitle: '县令' }
  ];
  const result = context.PhaseD.COUNTER_STRATEGIES.rotate_officials.effect(context.GM);
  assert(result.ok === true, 'rotate_officials succeeds with power minister');
  assert(result.rotated === 5, 'rotate_officials rotates two core and three peripheral allies');
  close(result.decay, 0.36, 'rotate_officials reports weighted decay');
  close(context.GM.huangquan.powerMinister.controlLevel, 0.44, 'rotate_officials applies weighted control decay');
  assert(context.GM.huangquan.powerMinister.faction.length === 1 && context.GM.huangquan.powerMinister.faction[0] === '核心三', 'rotate_officials removes rotated allies from faction');
  assert(context.GM.chars.find(c => c.name === '核心一')._rotatedOut === true, 'rotated core ally is marked');
  assert(context.GM.chars.find(c => c.name === '外围三').officialTitle.endsWith('(外调)'), 'rotated peripheral ally title is marked');
}

{
  const context = createContext();
  setupAuthority(context, 55, 20);
  loadF1Stack(context);
  context.GM.huangquan.powerMinister = { name: '张相', controlLevel: 0.5, faction: [] };
  const result = context.PhaseD.COUNTER_STRATEGIES.rotate_officials.effect(context.GM);
  assert(result.ok === true && result.rotated === 0, 'rotate_officials handles empty faction without damage');
  close(context.GM.huangquan.powerMinister.controlLevel, 0.5, 'empty-faction rotate keeps control level');
}

console.log(`[smoke-authority-f1-layered] pass assertions=${assertions}`);
