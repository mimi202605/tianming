#!/usr/bin/env node
// bench-social-chain-realsave.js — 用真实存档无头测量社交层每回合同步耗时(只测同步JS·LLM关闭)
// 用法: node --max-old-space-size=6144 scripts/bench-social-chain-realsave.js [存档路径]
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SAVE = process.argv[2] || (os.homedir() + '\\AppData\\Roaming\\tianming\\saves\\__autosave__.json');

function fakeEl() {
  return {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: { cssText: '' },
    appendChild(c){ return c; }, removeChild(c){ return c; }, insertBefore(c){ return c; },
    setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){},
    querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; },
    children: [], childNodes: [], firstChild: null, parentNode: null,
    innerHTML: '', textContent: '', value: '', dataset: {}, remove(){}
  };
}
function esc(v) { return String(v == null ? '' : v); }

const sandbox = {
  console, Math, Date, JSON, RegExp, Error, Promise,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
  clearTimeout(){}, setInterval: () => 1, clearInterval(){},
  document: {
    getElementById: () => fakeEl(), querySelector: () => fakeEl(), querySelectorAll: () => [],
    addEventListener(){}, createElement: () => fakeEl(),
    body: fakeEl(), head: fakeEl(), readyState: 'complete'
  },
  window: {}, localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  navigator: { userAgent: 'node' }, performance: { now: () => Date.now() },
  fetch: () => Promise.reject(new Error('no fetch')),
  alert(){}, confirm: () => true, prompt: () => null,
  HTMLElement: function(){}, Event: function(){},
  requestAnimationFrame: cb => setTimeout(cb, 16),
  EndTurnHooks: { register(){}, registerFragment(){}, execute: async () => {}, collectFragments: () => [] },
  GameHooks: { on(){}, emit(){} },
  _$: () => fakeEl(), escHtml: esc,
  addCYBubble(){}, addEB(){}, toast(){}, closeChaoyi(){}, showLoading(){}, hideLoading(){},
  _ty2_enterDecide(){}
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.addEventListener = () => {}; sandbox.removeEventListener = () => {};
sandbox.callAIMessages = async function(){ throw new Error('LLM disabled in bench'); };

console.log('[bench] loading save', SAVE);
let t0 = Date.now();
const saveData = JSON.parse(fs.readFileSync(SAVE, 'utf8'));
console.log('[bench] JSON.parse save:', (Date.now() - t0) + 'ms');
const GM = saveData.gameState;
if (!GM) { console.error('save has no gameState'); process.exit(1); }
GM.running = true;
console.log('[bench] GM turn=' + GM.turn, 'chars=' + (GM.chars || []).length, 'classes=' + (GM.classes || []).length, 'parties=' + (GM.parties || []).length);

sandbox.GM = GM;
sandbox.P = { conf: { partyClassLlmEnabled: false }, ai: {}, scenario: { dynastyType: 'ming' } };
sandbox.scriptData = {};
sandbox.findCharByName = name => (GM.chars || []).find(c => c && c.name === name) || null;

vm.createContext(sandbox);
function load(file) {
  try {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
    return true;
  } catch (e) {
    console.error('[load fail]', file, '→', e.message);
    return false;
  }
}

['tm-engine-constants.js',
 'tm-class-engine.js',
 'tm-party-goals.js',
 'tm-social-political-signals.js',
 'tm-player-action-signals.js',
 'tm-class-character-relations.js',
 'tm-party-class-actors.js',
 'tm-party-class-action-scheduler.js',
 'tm-class-minxin-bridge.js'].forEach(load);

const TM = sandbox.TM || {};
function sz(v) { try { return JSON.stringify(v) ? JSON.stringify(v).length : 0; } catch (e) { return -1; } }
function mb(n) { return (n / 1048576).toFixed(2) + 'MB'; }

function bench(label, fn, iters) {
  iters = iters || 3;
  const times = [];
  for (let i = 0; i < iters; i++) {
    const s = Date.now();
    try { fn(i); } catch (e) { console.log('  [' + label + '] iter' + i + ' threw:', e.message); }
    times.push(Date.now() - s);
  }
  console.log(label.padEnd(46), times.map(t => t + 'ms').join(' / '));
}

(async function main() {
  const turn = Number(GM.turn) || 1;
  console.log('\n== 社交层各引擎单项耗时 (3次·真存档) ==');

  if (TM.ClassCharacterRelations && TM.ClassCharacterRelations.run) {
    bench('ClassCharacterRelations.run', () => TM.ClassCharacterRelations.run(GM, { source: 'bench', turn }));
  } else console.log('ClassCharacterRelations 不可用');

  if (TM.SocialPoliticalSignals) {
    const SPS = TM.SocialPoliticalSignals;
    if (SPS.decayAndResolve) bench('SocialPoliticalSignals.decayAndResolve', () => SPS.decayAndResolve(GM, { source: 'bench', turn }));
    if (SPS.scanRuntimePressures) bench('SocialPoliticalSignals.scanRuntimePressures', () => SPS.scanRuntimePressures(GM, { source: 'bench', turn }));
    if (SPS.applyPending) bench('SocialPoliticalSignals.applyPending', () => SPS.applyPending(GM, { source: 'bench', turn }));
  }

  if (TM.PartyClassActors) {
    if (TM.PartyClassActors.tick) bench('PartyClassActors.tick', () => TM.PartyClassActors.tick(GM, { source: 'bench', turn }));
    if (TM.PartyClassActors.run) bench('PartyClassActors.run', () => TM.PartyClassActors.run(GM, { source: 'bench', turn }));
  }

  if (TM.ClassMinxinBridge && TM.ClassMinxinBridge.maintain) {
    bench('ClassMinxinBridge.maintain', () => TM.ClassMinxinBridge.maintain(GM, { source: 'bench', turn }));
  }

  if (TM.PartyClassActionScheduler && TM.PartyClassActionScheduler.scheduleBeforeSubmit) {
    const before = { apps: sz(GM._socialPoliticalSignalApplications), lastRun: sz(GM._partyClassActionSchedulerLastRun), hist: sz(GM._partyClassActionSchedulerHistory) };
    bench('PartyClassActionScheduler.scheduleBeforeSubmit', () => TM.PartyClassActionScheduler.scheduleBeforeSubmit(GM, { source: 'bench', turn }));
    const after = { apps: sz(GM._socialPoliticalSignalApplications), lastRun: sz(GM._partyClassActionSchedulerLastRun), hist: sz(GM._partyClassActionSchedulerHistory) };
    console.log('\n== 审计账本体积 (scheduleBeforeSubmit ×3 后) ==');
    console.log('_socialPoliticalSignalApplications:', mb(before.apps), '→', mb(after.apps));
    console.log('_partyClassActionSchedulerLastRun :', mb(before.lastRun), '→', mb(after.lastRun));
    console.log('_partyClassActionSchedulerHistory :', mb(before.hist), '→', mb(after.hist));
  }

  console.log('\n== 存档管线成本参照 (同机·node) ==');
  t0 = Date.now(); const gmStr = JSON.stringify(GM); console.log('JSON.stringify(GM) compact:', (Date.now() - t0) + 'ms', mb(gmStr.length));
  t0 = Date.now(); JSON.stringify(GM, null, 2); console.log('JSON.stringify(GM) pretty :', (Date.now() - t0) + 'ms');
  t0 = Date.now(); JSON.parse(gmStr); console.log('JSON.parse(GM compact)    :', (Date.now() - t0) + 'ms');
  if (typeof structuredClone === 'function') {
    t0 = Date.now(); structuredClone(GM); console.log('structuredClone(GM)       :', (Date.now() - t0) + 'ms  (≈IPC 序列化成本)');
  }
  console.log('\ndone');
})();
