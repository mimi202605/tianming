#!/usr/bin/env node
'use strict';
// smoke-event-bus-s2 — 事件系统统一 · Slice 2：后果出口接 AI 裁定
// 验：① AI 路径(开关开+aiHint → callAIWithTools+applyAITurnChanges+统一落账·不走兜底)
//     ② fallback(开关关→不调AI·走EffectRegistry) ③ fallback(无aiHint)
//     ④ viaAI:false(超时→不调AI) ⑤ async 返回 Promise ⑥ AI 失败→回落兜底(后果不空转)
//     ⑦ prompt 含事件/选择/aiHint/国势快照
// 注：tm-event-system.js 无 module.exports(纯浏览器全局)·走 vm·mock 全局 callAIWithTools/applyAITurnChanges
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ok ' + m); }

console.log('smoke-event-bus-s2');

const src = fs.readFileSync(path.join(ROOT, 'tm-event-system.js'), 'utf8');

const ctx = {
  console: { log() {}, warn() {}, error() {} },
  Math, JSON, String, Array, Object, Number, Boolean,
  Date: { now: () => 0 },
  uid: (function () { let n = 0; return function () { return 'evt-' + (++n); }; })(),
  _dbg: function () {},
  clamp: function (v, min, max) { return Math.max(min, Math.min(max, v)); }
};
ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;

function resetProbes() {
  ctx._cwt_called = false; ctx._cwt_prompt = '';
  ctx._aatc_called = false; ctx._aatc_patch = null;
  ctx._anchor_called = false; ctx._eb = [];
  ctx._spy_called = false; ctx._spy_data = null;
  ctx._cwt_should_throw = false;
}
resetProbes();

ctx.callAIWithTools = async function (prompt, tools, opts) {
  ctx._cwt_called = true; ctx._cwt_prompt = prompt;
  if (ctx._cwt_should_throw) throw new Error('mock AI network error');
  return { toolCalls: [{ name: 'adjudicate_event_outcome', input: {
    narrative: '天怒人怨，流民四起，仓廪为之一空。',
    changes: [{ path: '民心', delta: -6, reason: '苛政' }, { path: '国库', delta: -200, reason: '赈济耗银' }]
  } }] };
};
ctx.applyAITurnChanges = function (patch) { ctx._aatc_called = true; ctx._aatc_patch = patch; return { ok: true }; };
ctx.createMemoryAnchor = function () { ctx._anchor_called = true; };
ctx.addEB = function (type, text) { ctx._eb.push([type, text]); };
ctx.GM = { turn: 5, biannianItems: [], minxin: { trueIndex: 40 }, huangwei: { index: 55 }, huangquan: { index: 60 }, corruption: { trueIndex: 30 }, guoku: { money: 1000 } };
ctx.P = {};

vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'tm-event-system.js' });
const SEB = ctx.StoryEventBus;
ctx.EffectRegistry.spy = function (d) { ctx._spy_called = true; ctx._spy_data = d; };

function freshEvent(id, withAiHint) {
  if (ctx.GM) ctx.GM.biannianItems = [];
  SEB.deserialize({ queue: [], processing: null });
  var choice = { text: '开仓赈济', effectKey: 'spy', effectData: { k: 1 } };
  if (withAiHint) choice.aiHint = '赈济可缓民怨，然耗国库、恐生冒领';
  SEB.enqueue({ id: id, title: '陕西大饥', description: '饥民载道，流离失所', priority: 8, choices: [choice] });
  SEB.processNext();
}

(async function () {
  // ① AI 路径(开关开 + aiHint)
  ctx.P = { conf: { eventUnificationEnabled: true } };
  resetProbes(); freshEvent('e1', true);
  var r1 = await SEB.resolveChoice('e1', 0);
  ok(r1 === true, '① resolveChoice 返回 true(已处理)');
  ok(ctx._cwt_called, '① AI 路径:callAIWithTools 被调');
  ok(ctx._aatc_called, '① AI 路径:applyAITurnChanges 落地后果');
  ok(ctx._aatc_patch && Array.isArray(ctx._aatc_patch.changes) && ctx._aatc_patch.changes[0].path === '民心', '① 落地 changes 用核心变量名(民心)');
  ok(!ctx._spy_called, '① AI 裁定成功→不走 EffectRegistry 兜底');
  ok(ctx._anchor_called, '① 统一落账:记忆锚');
  ok(ctx.GM.biannianItems.length === 1, '① 统一落账:编年');
  ok(ctx._eb.some(function (e) { return e[0] === '事件·裁定'; }), '① AI 裁定叙事进事件簿');
  ok(ctx._eb.some(function (e) { return e[0] === '事件'; }), '① 选择本身进事件簿');

  // ② fallback:开关关 → 不调 AI,走 EffectRegistry
  ctx.P = {}; resetProbes(); freshEvent('e2', true);
  var r2 = await SEB.resolveChoice('e2', 0);
  ok(r2 === true && !ctx._cwt_called, '② 开关关:不调 AI');
  ok(ctx._spy_called, '② 开关关:走 EffectRegistry 兜底');
  ok(ctx.GM.biannianItems.length === 1, '② 兜底也统一落账(编年)');

  // ③ fallback:开关开但无 aiHint → 不调 AI
  ctx.P = { conf: { eventUnificationEnabled: true } };
  resetProbes(); freshEvent('e3', false);
  await SEB.resolveChoice('e3', 0);
  ok(!ctx._cwt_called, '③ 无 aiHint:不调 AI');
  ok(ctx._spy_called, '③ 无 aiHint:走 EffectRegistry 兜底');

  // ④ viaAI:false(超时事件)→ 即使开关开+aiHint 也不调 AI
  ctx.P = { conf: { eventUnificationEnabled: true } };
  resetProbes(); freshEvent('e4', true);
  await SEB.resolveChoice('e4', 0, { viaAI: false });
  ok(!ctx._cwt_called, '④ viaAI:false(超时):不调 AI');
  ok(ctx._spy_called, '④ viaAI:false:走兜底');

  // ⑤ async:resolveChoice 返回 Promise
  ctx.P = { conf: { eventUnificationEnabled: true } };
  resetProbes(); freshEvent('e5', true);
  var p5 = SEB.resolveChoice('e5', 0);
  ok(p5 && typeof p5.then === 'function', '⑤ resolveChoice 返回 Promise(async)');
  await p5;

  // ⑥ AI 失败 → 回落兜底
  ctx.P = { conf: { eventUnificationEnabled: true } };
  resetProbes(); ctx._cwt_should_throw = true; freshEvent('e6', true);
  var r6 = await SEB.resolveChoice('e6', 0);
  ok(r6 === true, '⑥ AI 失败仍返回 true(不炸)');
  ok(ctx._cwt_called && !ctx._aatc_called, '⑥ AI 失败:callAIWithTools 调了但未落地');
  ok(ctx._spy_called, '⑥ AI 失败→回落 EffectRegistry 兜底(后果不空转)');

  // ⑦ prompt 含事件/选择/aiHint/国势快照
  ctx.P = { conf: { eventUnificationEnabled: true } };
  resetProbes(); freshEvent('e7', true);
  await SEB.resolveChoice('e7', 0);
  ok(ctx._cwt_prompt.indexOf('陕西大饥') >= 0, '⑦ prompt 含事件标题');
  ok(ctx._cwt_prompt.indexOf('开仓赈济') >= 0, '⑦ prompt 含玩家选择');
  ok(ctx._cwt_prompt.indexOf('赈济可缓民怨') >= 0, '⑦ prompt 含 aiHint');
  ok(ctx._cwt_prompt.indexOf('民心40') >= 0, '⑦ prompt 含国势快照(民心40)');

  console.log('\n结果: ' + A + ' 通过 / 0 失败');
})().catch(function (e) { console.error(e); process.exit(1); });
