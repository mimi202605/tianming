#!/usr/bin/env node
// bench-minxin-equivalence.js — 新旧(批量收口 vs 逐笔收口)在真存档上跑同一批信号·对比民心终态签名
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SAVE = process.argv[2] || (os.homedir() + '\\AppData\\Roaming\\tianming\\saves\\__autosave__.json');
const BAK = process.argv[3] || 'bak-perf-20260610-072134';

const rawSave = fs.readFileSync(SAVE, 'utf8');

function fakeEl() {
  return {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, style: {},
    appendChild(c){ return c; }, removeChild(c){ return c; }, insertBefore(c){ return c; },
    setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){},
    querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; },
    children: [], childNodes: [], innerHTML: '', textContent: '', value: '', dataset: {}, remove(){}
  };
}

function makeSandbox(GM) {
  let seed = 42;
  const sandbox = {
    console, Math: Object.create(Math), Date, JSON, RegExp, Error, Promise, Array, Object, String, Number, Boolean,
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
  sandbox.Math.random = function() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
  sandbox.addEventListener = () => {}; sandbox.removeEventListener = () => {};
  sandbox.callAIMessages = async function(){ throw new Error('LLM disabled'); };
  sandbox.GM = GM;
  sandbox.P = { conf: { partyClassLlmEnabled: false }, ai: {}, scenario: { dynastyType: 'ming' } };
  sandbox.scriptData = {};
  sandbox.findCharByName = name => (GM.chars || []).find(c => c && c.name === name) || null;
  vm.createContext(sandbox);
  return sandbox;
}

const FILES = ['tm-engine-constants.js','tm-class-engine.js','tm-party-goals.js','tm-social-political-signals.js',
 'tm-player-action-signals.js','tm-class-character-relations.js','tm-party-class-actors.js',
 'tm-party-class-action-scheduler.js','tm-minxin-ledger.js','tm-class-minxin-bridge.js'];
const PATCHED = { 'tm-minxin-ledger.js': 1, 'tm-class-minxin-bridge.js': 1, 'tm-social-political-signals.js': 1 };

function runVariant(useBak) {
  const GM = JSON.parse(rawSave).gameState;
  GM.running = true;
  const sandbox = makeSandbox(GM);
  FILES.forEach(f => {
    let src;
    if (useBak && PATCHED[f]) src = fs.readFileSync(path.join(ROOT, f + '.' + BAK), 'utf8');
    else src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInContext(src, sandbox, { filename: f + (useBak && PATCHED[f] ? '(bak)' : '') });
  });
  const TM = sandbox.TM;
  const t0 = Date.now();
  TM.SocialPoliticalSignals.scanRuntimePressures(GM, { source: 'equiv', turn: GM.turn });
  TM.SocialPoliticalSignals.applyPending(GM, { source: 'equiv', turn: GM.turn });
  const ms = Date.now() - t0;

  // 签名
  const mx = GM.minxin || {};
  const leaves = TM.ClassMinxinBridge._getLeafDivisions(GM);
  const leafSig = {};
  leaves.forEach(d => { if (d && typeof d.minxin === 'number') leafSig[d.id || d.name] = d.minxin; });
  const classSig = (GM.classes || []).map(c => c && [c.name, c.satisfaction, c.influence].join(':')).join('|');
  const partySig = (GM.parties || []).map(p => p && [p.name, p.influence, p.cohesion].join(':')).join('|');
  const stateSig = Object.keys(GM.partyState || {}).sort().map(k => k + ':' + (GM.partyState[k] && GM.partyState[k].cohesion)).join('|');
  const matrix = mx.matrix || {};
  const matrixSig = {};
  Object.keys(matrix).sort().forEach(rid => {
    Object.keys(matrix[rid]).sort().forEach(ck => {
      const row = matrix[rid][ck];
      matrixSig[rid + '×' + ck] = row && [row.true, row.perceived].join(',');
    });
  });
  return {
    ms,
    trueIndex: mx.trueIndex, perceivedIndex: mx.perceivedIndex, phase: mx.phase,
    sources: JSON.stringify(mx.sources || {}),
    leafSig, classSig, partySig, stateSig, matrixSig
  };
}

const oldR = runVariant(true);
const newR = runVariant(false);

function diffMaps(a, b, label) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let same = 0; const diffs = [];
  keys.forEach(k => { if (String(a[k]) === String(b[k])) same++; else diffs.push(k + ': old=' + a[k] + ' new=' + b[k]); });
  console.log(label + ':', same + '/' + keys.size, '相同', diffs.length, '处不同');
  diffs.slice(0, 12).forEach(d => console.log('   ', d));
  return diffs.length;
}

console.log('== 等价性对比 (old=.bak 逐笔收口 / new=批量收口) ==');
console.log('耗时: old', oldR.ms + 'ms', '→ new', newR.ms + 'ms');
console.log('trueIndex:', oldR.trueIndex, '↔', newR.trueIndex, oldR.trueIndex === newR.trueIndex ? '✓' : '✗');
console.log('perceivedIndex:', oldR.perceivedIndex, '↔', newR.perceivedIndex, oldR.perceivedIndex === newR.perceivedIndex ? '✓' : '✗');
console.log('phase:', oldR.phase, '↔', newR.phase, oldR.phase === newR.phase ? '✓' : '✗');
console.log('sources 相同:', oldR.sources === newR.sources ? '✓' : '✗ old=' + oldR.sources.slice(0, 400) + ' new=' + newR.sources.slice(0, 400));
console.log('classes 相同:', oldR.classSig === newR.classSig ? '✓' : '✗');
console.log('parties 相同:', oldR.partySig === newR.partySig ? '✓' : '✗');
console.log('partyState 相同:', oldR.stateSig === newR.stateSig ? '✓' : '✗');
const leafDiffs = diffMaps(oldR.leafSig, newR.leafSig, '叶子民心');
const matrixDiffs = diffMaps(oldR.matrixSig, newR.matrixSig, '民心矩阵(true,perceived)');
console.log('\n结论:', (oldR.trueIndex === newR.trueIndex && leafDiffs === 0) ? '账本真值完全等价' + (matrixDiffs ? '·矩阵派生缓存有 ' + matrixDiffs + ' 行基线时点差(批末更新鲜)' : '·矩阵也完全一致') : '⚠️ 有真值分歧·须排查');
