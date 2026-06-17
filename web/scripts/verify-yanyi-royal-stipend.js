#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 验·演义旋钮（粮赤字②·1+2）：宗禄折粮按难度松绑——硬核 full、标准 0.85、叙事 0.5。
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(c, l) { if (!c) throw new Error('[FAIL] ' + l); passed++; console.log('  ok ' + l); }
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 0.5); }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date, isFinite, parseInt, parseFloat,
  setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
  addEB: () => {}, toast: () => {}, _dbg: () => {}, addEventListener: () => {}, removeEventListener: () => {},
  document: { addEventListener: () => {} }
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-fiscal-engine.js'), 'utf8'), sandbox, { filename: 'tm-fiscal-engine.js' });
const FE = sandbox.FixedExpense;
assert(FE && typeof FE.preview === 'function', 'FixedExpense.preview 已导出（内含 calcRoyalStipend→royal）');

// SAVED_T37 真数：annualStipendPaid=300(万石)、crushing、25万宗室
function setGM(diff) {
  sandbox.GM = { turn: 35, chars: [], armies: [{ name: '关宁军', soldiers: 50000 }], fiscal: { royalClanPressure: { enabled: true, severity: 'crushing', annualStipendPaid: 300, totalClanMembers: 250000, cumulativeArrears: 280 } } };
  sandbox.P = { conf: { difficulty: diff } };
}

setGM('hardcore'); var gHard = FE.preview({ turn: 35 }).royal.grain;
setGM('standard'); var gStd = FE.preview({ turn: 35 }).royal.grain;
setGM('narrative'); var gNarr = FE.preview({ turn: 35 }).royal.grain;

assert(gHard > 0, '硬核档宗禄折粮 > 0（保真明末·实得 ' + gHard.toFixed(1) + ' 石/回合）');
assert(gStd === gHard, '标准档 = 硬核（满压保真·P-FUV 只叙事松·实得 ' + gStd.toFixed(1) + ' = ' + gHard.toFixed(1) + '）');
assert(near(gNarr, gHard * 0.5, gHard * 0.02), '叙事档 = 硬核 ×0.5（宗禄减半·实得 ' + gNarr.toFixed(1) + ' vs ' + (gHard * 0.5).toFixed(1) + '）');
assert(gNarr < gStd && gStd === gHard, '只叙事松：叙事 < 标准 = 硬核（' + gNarr.toFixed(1) + ' < ' + gStd.toFixed(1) + ' = ' + gHard.toFixed(1) + '）');

// 军饷旋钮（P-FUV·军饷半·比宗禄轻：硬核1.0/标准0.9/叙事0.7）
setGM('hardcore'); var aHard = FE.preview({ turn: 35 }).army.grain;
setGM('standard'); var aStd = FE.preview({ turn: 35 }).army.grain;
setGM('narrative'); var aNarr = FE.preview({ turn: 35 }).army.grain;
assert(aHard > 0, '军饷折粮 > 0（硬核保真·实得 ' + aHard.toFixed(1) + ' 石/回合）');
assert(aStd === aHard, '标准军饷 = 硬核（满压保真·实得 ' + aStd.toFixed(1) + ' = ' + aHard.toFixed(1) + '）');
assert(near(aNarr, aHard * 0.7, aHard * 0.02), '叙事军饷 = 硬核 ×0.7（比宗禄0.5轻·实得 ' + aNarr.toFixed(1) + ' vs ' + (aHard * 0.7).toFixed(1) + '）');

console.log('\nALL PASS · ' + passed + ' assertions · 宗禄(0.5)+军饷(0.7)演义旋钮·硬核保真/叙事松绑 生效');
