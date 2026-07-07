#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
// 2026-05-21·Slice 1·pathutils 已拆出·必须先加载
const pathutilsSrc = fs.readFileSync(path.join(ROOT, 'tm-ai-change-pathutils.js'), 'utf8');
const armySrc = fs.readFileSync(path.join(ROOT, 'tm-ai-change-army.js'), 'utf8');
const narrativeSrc = fs.readFileSync(path.join(ROOT, 'tm-ai-change-narrative.js'), 'utf8');
const src = fs.readFileSync(path.join(ROOT, 'tm-ai-change-applier.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

const GM = {
  turn: 7,
  _turnReport: [],
  turnChanges: { variables: [] },
  chars: [],
  facs: [],
  parties: [],
  classes: [],
  activeWars: [],
  activeDisasters: [],
  guoku: { money: 100, balance: 100, ledgers: { money: { stock: 100 } } },
  neitang: { money: 50, balance: 50, ledgers: { money: { stock: 50 } } },
  huangwei: { index: 40 },
  huangquan: { index: 30 },
  minxin: { trueIndex: 60 },
  corruption: {
    trueIndex: 70,
    overall: 70,
    perceivedIndex: 65,
    byDept: {},
    subDepts: {
      central: { true: 70 },
      fiscal: { true: 70 }
    }
  }
};

const context = {
  console,
  GM,
  P: {},
  window: null,
  TM: { errors: { capture() {}, captureSilent() {} } },
  addEB() {},
  recordAIDiagnostic() {},
  preflightAIWriteBack(output) { return output; },
  CorruptionEngine: {
    syncIndexFromSubDepts() {
      const vals = Object.keys(GM.corruption.subDepts).map((k) => Number(GM.corruption.subDepts[k].true)).filter(Number.isFinite);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      GM.corruption.trueIndex = avg;
      GM.corruption.overall = avg;
      return avg;
    }
  }
};
context.window = context;

vm.createContext(context);
vm.runInContext(pathutilsSrc, context, { filename: 'tm-ai-change-pathutils.js' });
vm.runInContext(armySrc, context, { filename: 'tm-ai-change-army.js' });
vm.runInContext(narrativeSrc, context, { filename: 'tm-ai-change-narrative.js' });
vm.runInContext(src, context, { filename: 'tm-ai-change-applier.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-ai-change-applier-validators.js'), 'utf8'), context, { filename: 'tm-ai-change-applier-validators.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-ai-change-applier-reconcile.js'), 'utf8'), context, { filename: 'tm-ai-change-applier-reconcile.js' });

const result = context.applyAITurnChanges({
  changes: [
    { path: 'vars.皇威.value', delta: 5, reason: 'alias delta' },
    { path: 'vars.民心.value', delta: -10, reason: 'alias delta' },
    { path: 'corruption.overall', op: 'set', value: 25, reason: 'alias set' },
    { path: 'guoku.balance', delta: 900, reason: 'balance alias' }
  ],
  anyPathChanges: [
    { path: 'GM.neitang.balance', op: 'set', value: 1200, reason: 'balance alias' },
    { path: 'neicang.money', op: 'delta', value: 300, reason: 'legacy neicang alias' },
    { path: 'corruption.subDepts.fiscal.true', op: 'delta', value: 10, reason: 'subdept sync' },
    { path: 'corruption.byDept.palace', op: 'set', value: 80, reason: 'legacy byDept sync' }
  ]
});

const failed = result && result.applied && Array.isArray(result.applied.failed) ? result.applied.failed : null;
if (!failed || failed.length) {
  console.error('[smoke-ai-core-path-aliases] result=' + JSON.stringify(result));
}
assert(result && result.ok && failed && failed.length === 0, 'AI change apply should not fail aliases');
assert(GM.huangwei.index === 45, 'huangwei alias should write index');
assert(GM.huangwei.value === 45, 'huangwei compatibility value should sync');
assert(GM.minxin.trueIndex === 50, 'minxin alias should write trueIndex');
assert(GM.minxin.value === 50, 'minxin compatibility value should sync');
assert(GM.guoku.money === 1000 && GM.guoku.balance === 1000 && GM.guoku.ledgers.money.stock === 1000, 'guoku balance alias should sync money/balance/ledger');
assert(GM.neitang.money === 1500 && GM.neitang.balance === 1500 && GM.neitang.ledgers.money.stock === 1500, 'neitang/neicang aliases should sync money/balance/ledger');
assert(GM.corruption.subDepts.central.true === 25, 'global corruption set should distribute to subdept central');
assert(GM.corruption.subDepts.fiscal.true === 35, 'subdept corruption delta should apply after global set');
assert(GM.corruption.subDepts.imperial.true === 80, 'legacy byDept palace write should mirror to imperial subdept');
assert(GM.corruption.byDept.fiscal === 35 && GM.corruption.byDept.palace === 80, 'subdept and byDept corruption mirrors should stay aligned');
assert(Math.abs(GM.corruption.trueIndex - (140 / 3)) < 0.000001 && Math.abs(GM.corruption.overall - (140 / 3)) < 0.000001, 'department corruption writes should resync global trueIndex/overall');
assert(!GM.vars, 'AI applier should not create GM.vars shadow container for core variables');

const paths = GM._turnReport.filter((r) => r && (r.type === 'change' || r.type === 'anyPath')).map((r) => r.path);
assert(paths.includes('huangwei.index'), 'turn report should record canonical huangwei path');
assert(paths.includes('minxin.trueIndex'), 'turn report should record canonical minxin path');
assert(paths.includes('corruption.trueIndex'), 'turn report should record canonical corruption path');
assert(paths.includes('guoku.money'), 'turn report should record canonical guoku path');
assert(paths.includes('neitang.money'), 'turn report should record canonical neitang path');

console.log('[smoke-ai-core-path-aliases] PASS');
