#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 段位 phase 同步治本验证·2026-05-30（修 1.2.8.5 段位与数值脱节：民心98配「揭竿」、皇威73配「暴君」）
// 根因：phase 是缓存字段，trueIndex/index 被 aggregate / P-5TK 衰减写新值后没重算 phase。
// 治本：① authority-engines 导出 _getMinxinPhase/_getHuangweiPhase；_tickHuangwei 衰减后重算 hw.phase；
//       ② integration-bridge aggregate 写 trueIndex 后调 _getMinxinPhase 重算 mx.phase。
// 本脚本验导出的两个 phase 函数阈值对（即段位现算逻辑对）；端到端(真跑回合后 phase 跟数值)由桌面端/E.B 实测兜底。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
  addEB: () => {}, toast: () => {}, _dbg: () => {}, _adjAuthority: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, document: { addEventListener: () => {} }
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
sandbox.GM = { turn: 28, minxin: {}, huangwei: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-integration-bridge.js'), 'utf8'), sandbox, { filename: 'tm-integration-bridge.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8'), sandbox, { filename: 'tm-authority-engines.js' });

const AE = sandbox.AuthorityEngines;
assert(AE && typeof AE._getMinxinPhase === 'function', 'AuthorityEngines._getMinxinPhase 已导出（给 integration-bridge 调）');
assert(typeof AE._getHuangweiPhase === 'function', 'AuthorityEngines._getHuangweiPhase 已导出');

// 民心段位阈值（_getMinxinPhase: >=80 adoring / >=60 peaceful / >=40 uneasy / >=20 angry / else revolt）
assert(AE._getMinxinPhase(98) === 'adoring', 'E.B 案例·民心 98 → adoring(颂圣)·不再 revolt(揭竿)·实得 ' + AE._getMinxinPhase(98));
assert(AE._getMinxinPhase(60) === 'peaceful', '民心 60 → peaceful(安居)');
assert(AE._getMinxinPhase(15) === 'revolt', '民心 15 → revolt(揭竿)·低位才该揭竿');

// 皇威段位阈值（_getHuangweiPhase: >=90 tyrant / >=70 majesty / >=50 normal / >=30 decline / else lost）
assert(AE._getHuangweiPhase(73) === 'majesty', 'E.B 案例·皇威 73 → majesty(威严)·不再 tyrant(暴君)·实得 ' + AE._getHuangweiPhase(73));
assert(AE._getHuangweiPhase(95) === 'tyrant', '皇威 95 → tyrant(暴君)·90+ 才该暴君');
assert(AE._getHuangweiPhase(20) === 'lost', '皇威 20 → lost(失威)');

console.log('  段位现算修复: 民心 98 → 颂圣(adoring)、皇威 73 → 威严(majesty)——E.B 报的两个错位值现算都对了');
console.log('[verify-phase-sync] PASS assertions=' + passed);
