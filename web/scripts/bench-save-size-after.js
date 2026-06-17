#!/usr/bin/env node
// bench-save-size-after.js — 模拟本轮四刀后下一次 autosave 的实际写盘体积
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
const raw = fs.readFileSync(SAVE, 'utf8');
const saveData = JSON.parse(raw);
const GM = saveData.gameState;
GM.running = true;

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
sandbox.GM = GM;
sandbox.P = { conf: { partyClassLlmEnabled: false }, ai: {}, scenario: { dynastyType: 'ming' } };
sandbox.scriptData = {};
sandbox.findCharByName = name => (GM.chars || []).find(c => c && c.name === name) || null;
vm.createContext(sandbox);
['tm-engine-constants.js','tm-class-engine.js','tm-party-goals.js','tm-social-political-signals.js',
 'tm-player-action-signals.js','tm-party-class-actors.js','tm-party-class-action-scheduler.js',
 'tm-minxin-ledger.js','tm-class-minxin-bridge.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

// 真实路径:跑一次调度器(刷新 lastRun 为 slim 版)+一次 applyPending(触发账本削平 heal)
sandbox.TM.PartyClassActionScheduler.scheduleBeforeSubmit(GM, { source: 'size-sim', turn: GM.turn });
sandbox.TM.SocialPoliticalSignals.applyPending(GM, { source: 'size-sim', turn: GM.turn });

// 刀3:_autoSaveSnapshotGM SKIP 键(模拟)
const SKIP = ['_aiTelemetry','_debugSnapshots','_aiBranchDiag','_aiDiag','_sysCacheMode','_sysCacheLen','_saveMeta','_facIndex','_savedMapData','_savedAdminHierarchy'];
SKIP.forEach(k => { delete GM[k]; });

// 刀2:_saveMeta.scenario 只存名字串
const scen = (saveData.scenarios || []).find(s => s && s.id === GM.sid) || {};
saveData._saveMeta = { turn: GM.turn, scenario: scen.name || '', saveName: GM.saveName, date: new Date().toISOString() };

// 刀4:紧凑写盘
const compact = JSON.stringify(saveData);
console.log('旧文件(pretty·修复前):', (raw.length / 1048576).toFixed(1) + 'MB');
console.log('新文件(compact·四刀后):', (compact.length / 1048576).toFixed(1) + 'MB');
console.log('降幅:', (100 * (raw.length - compact.length) / raw.length).toFixed(0) + '%');
const gmStr = JSON.stringify(GM);
console.log('其中 gameState:', (gmStr.length / 1048576).toFixed(1) + 'MB (修复前 30.5MB)');
let t0 = Date.now(); JSON.stringify(saveData); console.log('整档 compact stringify:', (Date.now() - t0) + 'ms');
t0 = Date.now(); JSON.parse(compact); console.log('整档 parse(读档):', (Date.now() - t0) + 'ms (修复前 877ms)');
if (typeof structuredClone === 'function') { t0 = Date.now(); structuredClone(GM); console.log('structuredClone(GM)≈IPC:', (Date.now() - t0) + 'ms (修复前 446ms)'); }
