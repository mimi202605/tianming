#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 验·P-ZV7 ⑤读档削平：regularizeSourceCaps 把越界源夹回封顶 + 经 apply 摊叶子使 trueIndex 真回正。
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(c, l) { if (!c) throw new Error('[FAIL] ' + l); passed++; console.log('  ok ' + l); }

const ebLog = [];
const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {},
  addEB: (cat, msg) => ebLog.push(cat + '：' + msg), toast: () => {}
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-minxin-ledger.js'), 'utf8'), sandbox, { filename: 'tm-minxin-ledger.js' });

const ML = sandbox.TM && sandbox.TM.MinxinLedger;
assert(ML && typeof ML.regularizeSourceCaps === 'function', 'MinxinLedger.regularizeSourceCaps 已导出');

const GM = {
  turn: 35,
  minxin: {
    trueIndex: 60, perceivedIndex: 60, phase: 'peaceful', trend: 'stable',
    sources: { heavenSign: -37, taxation: -30, judicialFairness: -22, disasterRelief: 5, auspicious: 6 },
    byRegion: {}, byClass: {}, prophecy: { intensity: 0, pendingTriggers: [] }, revolts: []
  },
  adminHierarchy: { player: { factionId: 'fac-ming', divisions: [
    { id: 'd1', name: '甲府', minxin: 50, populationDetail: { mouths: 1000 } },
    { id: 'd2', name: '乙府', minxin: 50, populationDetail: { mouths: 1000 } }
  ] } }
};
sandbox.GM = GM;

const leafBefore = GM.adminHierarchy.player.divisions[0].minxin;
const r = ML.regularizeSourceCaps(GM);

assert(GM.minxin.sources.heavenSign === -12, '天象 -37 → 夹到封顶 -12·实得 ' + GM.minxin.sources.heavenSign);
assert(GM.minxin.sources.taxation === -25, '赋税 -30 → 夹到 -25·实得 ' + GM.minxin.sources.taxation);
assert(GM.minxin.sources.judicialFairness === -20, '司法 -22 → 夹到 -20·实得 ' + GM.minxin.sources.judicialFairness);
assert(GM.minxin.sources.disasterRelief === 5, '灾恤 +5 在区间内 → 不动·实得 ' + GM.minxin.sources.disasterRelief);
assert(GM.minxin.sources.auspicious === 6, '祥瑞 +6 在区间内 → 不动·实得 ' + GM.minxin.sources.auspicious);
assert(r.regularized.length === 3, '只规整 3 个越界源(天象/赋税/司法)·实得 ' + r.regularized.length);
const leafAfter = GM.adminHierarchy.player.divisions[0].minxin;
assert(leafAfter > leafBefore, '叶子民心真回升(50→' + leafAfter + ')·证明经 apply 摊叶子非只动显示');
assert(GM.minxin.trueIndex > 60, 'trueIndex 经聚合真回正(60→' + GM.minxin.trueIndex + ')');
console.log('  邸报:', ebLog.join(' | ') || '(无)');
console.log('\nALL PASS · ' + passed + ' assertions · 削平真起效');
