#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 民心三刀(1.2.8.3) 回归·2026-05-29·锁「玩家民心/皇威/皇权操作真落进 trueIndex·不再蒸发」
// 旧 bug：民心运行时是对象 {trueIndex}，但三条玩家通道（AI 推演 / 恩科 / 议题选项 effect）
// 用 typeof GM.minxin==='number' 或写不存在的 .index 判定 → 对对象永不成立 → 操作蒸发。
// 修法：全改走 AuthorityEngines.adjustMinxin/adjustHuangwei/adjustHuangquan 写 trueIndex。
// 本测试加载真实 tm-authority-engines.js，复刻 tm-endturn-helpers.js:1320 的路由 map，
// 证一个 effect{民心:+N} 真把 trueIndex 抬上去（"实证会动·非纹丝不动"）。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {}, addEB: () => {}, _dbg: () => {}
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
// 运行时真实形态：minxin 是对象（正是旧 number 守卫判 false→蒸发的根源）
sandbox.GM = {
  turn: 10,
  minxin: { trueIndex: 50, perceivedIndex: 50, phase: 'uneasy', trend: 'stable',
            sources: {}, byRegion: {}, byClass: {}, prophecy: { intensity: 0, pendingTriggers: [] }, revolts: [] }
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8'), sandbox, { filename: 'tm-authority-engines.js' });
const AE = sandbox.AuthorityEngines;
assert(AE && typeof AE.adjustMinxin === 'function', 'AuthorityEngines.adjustMinxin 已导出');
assert(typeof AE.adjustHuangwei === 'function' && typeof AE.adjustHuangquan === 'function', 'adjustHuangwei/adjustHuangquan 已导出');

// 旧 bug 根因复现：运行时 minxin 是对象，旧通道的 typeof==='number' 守卫必判 false
assert(typeof sandbox.GM.minxin !== 'number', '运行时 minxin 是对象·旧 number 守卫必失效（蒸发根因）');

// 修法·议题选项 effect{民心:+N} 走 tm-endturn-helpers.js:1320 的权威路由 map
const before = sandbox.GM.minxin.trueIndex;
const effect = { '民心': 10 };
Object.keys(effect).forEach(function (k) {
  const authFn = ({ '民心': AE.adjustMinxin, 'minxin': AE.adjustMinxin, '皇威': AE.adjustHuangwei, 'huangwei': AE.adjustHuangwei, '皇权': AE.adjustHuangquan, 'huangquan': AE.adjustHuangquan })[k];
  assert(typeof authFn === 'function', '民心 key 解析到 adjustMinxin');
  authFn('issueChoice', effect[k], '要务决断·赈灾');
});
const after = sandbox.GM.minxin.trueIndex;
assert(after === before + 10, '议题 民心:+10 真落进 trueIndex·' + before + '→' + after + '（实证不蒸发）');

// 护栏·封顶 100 / 地板 0
AE.adjustMinxin('disasterRelief', 100, 'test');
assert(sandbox.GM.minxin.trueIndex === 100, '护栏封顶 100·实得 ' + sandbox.GM.minxin.trueIndex);
AE.adjustMinxin('disasterRelief', -200, 'test');
assert(sandbox.GM.minxin.trueIndex === 0, '护栏地板 0·实得 ' + sandbox.GM.minxin.trueIndex);

console.log('[smoke-minxin-3dao-writeback] PASS assertions=' + passed + ' · 民心:+10 → trueIndex ' + before + '→' + (before + 10) + '（不再蒸发）');
