#!/usr/bin/env node
/* eslint-env node */
'use strict';
// P-VWF 端到端回归·2026-05-29·锁「肃贪升 compliance → cascade → 中央月入真涨」
// 补 smoke-fiscal-reform-reconcile 之缺：那个只证 compliance 字段被改 + setter 会动，
// 这个加载真实 tm-fiscal-engine.js 跑 CascadeTax.collect() 两次，证实 G.guoku.monthlyIncome
// 真的随 compliance 上升（"实证会动·非分析完面板纹丝不动"）。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {},
  addEB: () => {}, toast: () => {}, _dbg: () => {}
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };

function mkDiv(id, name, pop, compliance) {
  const households = Math.floor(pop / 5);
  return {
    id, name, population: pop, terrain: 'plain', corruption: 0,
    economyBase: {
      farmland: households * 30, arableLand: households * 30,
      households, mouths: pop, ding: Math.floor(pop * 0.25),
      commerceVolume: Math.round(pop * 0.05), consumption: pop
    },
    fiscal: { compliance }
  };
}
sandbox.GM = {
  turn: 28,
  guoku: { money: 0, grain: 0, cloth: 0 },
  adminHierarchy: {
    '明廷': { divisions: [
      mkDiv('shaanxi', '陕西', 8000000, 0.80),
      mkDiv('henan', '河南', 12000000, 0.80),
      mkDiv('jiangnan', '江南', 20000000, 0.80)
    ] }
  }
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-fiscal-engine.js'), 'utf8'), sandbox, { filename: 'tm-fiscal-engine.js' });
const CT = sandbox.CascadeTax;
assert(CT && typeof CT.collect === 'function', 'CascadeTax.collect 已导出');
assert(typeof CT.adjustPlayerCompliance === 'function', 'CascadeTax.adjustPlayerCompliance 已导出');

// 基线
CT.collect({ faction: '明廷', turnDays: 30 });
const before = sandbox.GM.guoku.monthlyIncome;
assert(typeof before === 'number' && before > 0, '基线·cascade 产出非零中央月入·实得 ' + before);

// 肃贪 → compliance +0.10（对账层 anticorruption 的确定性落地）
const n = CT.adjustPlayerCompliance('明廷', 0.10, 0.1, 1);
assert(n === 3, '肃贪·3 个本势力 division 升 compliance·实得 ' + n);

sandbox.GM.turn = (sandbox.GM.turn || 0) + 1; // 2026-07-04 起 cascadeCollect 有回合幂等闸(防sc1重试双征)·二次征收须推进回合号模拟下一回合
CT.collect({ faction: '明廷', turnDays: 30 });
const after = sandbox.GM.guoku.monthlyIncome;
assert(after > before, '中央月入真涨·' + before + ' → ' + after + '（实证会动）');

// toCentral ∝ compliance：0.9/0.8 = 1.125·全程线性·验涨幅吻合（容差 ±2% 吸收四舍五入）
const ratio = after / before;
assert(Math.abs(ratio - 1.125) < 0.02, '涨幅吻合 compliance 比 0.9/0.8=1.125·实得 ' + (Math.round(ratio * 1000) / 1000));

console.log('[smoke-pvwf-income-flow] PASS assertions=' + passed + ' · 中央月入 ' + before + ' → ' + after + ' (+' + (Math.round((ratio - 1) * 1000) / 10) + '%)');
