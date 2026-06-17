#!/usr/bin/env node
// bench-applypending-profile.js — 钻 applyPending 928ms 尖刺:各子调用累计耗时
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SAVE = process.argv[2] || (os.homedir() + '\\AppData\\Roaming\\tianming\\saves\\__autosave__.json');

function fakeEl() {
  return {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, style: {},
    appendChild(c){ return c; }, removeChild(c){ return c; }, insertBefore(c){ return c; },
    setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){},
    querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; },
    children: [], childNodes: [], innerHTML: '', textContent: '', value: '', dataset: {}, remove(){}
  };
}
const sandbox = {
  console, Math, Date, JSON, RegExp, Error, Promise, Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; }, clearTimeout(){}, setInterval: () => 1, clearInterval(){},
  document: { getElementById: () => fakeEl(), querySelector: () => fakeEl(), querySelectorAll: () => [], addEventListener(){}, createElement: () => fakeEl(), body: fakeEl(), head: fakeEl(), readyState: 'complete' },
  window: {}, localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  navigator: { userAgent: 'node' }, performance: { now: () => Date.now() },
  fetch: () => Promise.reject(new Error('no fetch')), alert(){}, confirm: () => true, prompt: () => null,
  HTMLElement: function(){}, Event: function(){}, requestAnimationFrame: cb => setTimeout(cb, 16),
  EndTurnHooks: { register(){}, registerFragment(){}, execute: async () => {}, collectFragments: () => [] },
  GameHooks: { on(){}, emit(){} }, _$: () => fakeEl(), escHtml: v => String(v == null ? '' : v),
  addCYBubble(){}, addEB(){}, toast(){}, closeChaoyi(){}, showLoading(){}, hideLoading(){}, _ty2_enterDecide(){}
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.addEventListener = () => {}; sandbox.removeEventListener = () => {};
sandbox.callAIMessages = async function(){ throw new Error('LLM disabled'); };

const saveData = JSON.parse(fs.readFileSync(SAVE, 'utf8'));
const GM = saveData.gameState;
GM.running = true;
sandbox.GM = GM;
sandbox.P = { conf: { partyClassLlmEnabled: false }, ai: {}, scenario: { dynastyType: 'ming' } };
sandbox.scriptData = {};
sandbox.findCharByName = name => (GM.chars || []).find(c => c && c.name === name) || null;
vm.createContext(sandbox);
function load(file) { vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }); }

['tm-engine-constants.js','tm-class-engine.js','tm-party-goals.js','tm-social-political-signals.js',
 'tm-player-action-signals.js','tm-class-character-relations.js','tm-party-class-actors.js',
 'tm-party-class-action-scheduler.js','tm-minxin-ledger.js','tm-class-minxin-bridge.js'].forEach(load);

const TM = sandbox.TM;
const acc = {};
function wrap(obj, name, label) {
  if (!obj || typeof obj[name] !== 'function') { console.log('  (no ' + label + ')'); return; }
  const orig = obj[name];
  acc[label] = { ms: 0, calls: 0 };
  obj[name] = function() {
    const s = Date.now();
    try { return orig.apply(this, arguments); }
    finally { acc[label].ms += Date.now() - s; acc[label].calls++; }
  };
}

wrap(TM.ClassEngine, 'applyClassPartyCoupling', 'ClassEngine.applyClassPartyCoupling');
wrap(TM.ClassEngine, 'refreshClassPhase', 'ClassEngine.refreshClassPhase');
wrap(TM.ClassMinxinBridge, 'applyClassPressure', 'ClassMinxinBridge.applyClassPressure');
wrap(TM.ClassMinxinBridge, 'syncByClass', 'ClassMinxinBridge.syncByClass');
wrap(TM.ClassMinxinBridge, '_getLeafDivisions', 'ClassMinxinBridge._getLeafDivisions(fallback)');
if (TM.MinxinLedger) wrap(TM.MinxinLedger, 'recordAndApply', 'MinxinLedger.recordAndApply');
console.log('MinxinLedger loaded:', !!TM.MinxinLedger);
wrap(TM.PartyGoals, 'setGoal', 'PartyGoals.setGoal');
wrap(TM.PartyGoals, 'applyDynamicRelationAdjustment', 'PartyGoals.applyDynamicRelationAdjustment');
wrap(TM.PartyGoals, 'deriveFromClassDemands', 'PartyGoals.deriveFromClassDemands');
wrap(TM.PartyGoals, 'buildScenarioRelationIndex', 'PartyGoals.buildScenarioRelationIndex');

const SPS = TM.SocialPoliticalSignals;
let t0 = Date.now();
const scanned = SPS.scanRuntimePressures(GM, { source: 'profile', turn: GM.turn });
console.log('scanRuntimePressures:', (Date.now() - t0) + 'ms', 'scanned=' + JSON.stringify(scanned && scanned.created != null ? scanned.created : scanned).slice(0, 120));
const pending = (GM._socialPoliticalSignals && GM._socialPoliticalSignals.items || []).filter(s => s && s.applied !== true).length;
console.log('pending signals:', pending);

t0 = Date.now();
SPS.applyPending(GM, { source: 'profile', turn: GM.turn });
const total = Date.now() - t0;
console.log('\napplyPending total:', total + 'ms');
let sub = 0;
Object.keys(acc).sort((a, b) => acc[b].ms - acc[a].ms).forEach(k => {
  if (!acc[k].calls) return;
  sub += acc[k].ms;
  console.log(String(acc[k].ms + 'ms').padStart(8), ('×' + acc[k].calls).padStart(7), k);
});
console.log('  (wrapped subtotal ' + sub + 'ms · 其余为 applySignal 自身+pushHistory+digest)');
