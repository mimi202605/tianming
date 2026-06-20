#!/usr/bin/env node
'use strict';
// smoke-event-bus-s1 — 事件系统统一 · Slice 1：统一事件总线骨架激活验证
// 验：① 骨架可用(enqueue/优先级/processNext) ② 存档往返(serialize/deserialize·经 JSON)
//     ③ cleanExpired 超时清理(含空队列安全) ④ eventUnificationOn 开关(默认关·两命名空间)
//     ⑤ endturn drain 钩子静态断言(开关门控+cleanExpired·且 S1 不调 processNext) ⑥ 存档点仍接
// 注：tm-event-system.js 无 module.exports(纯浏览器全局)·故走 vm(同 smoke-eventbus-vestigial)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ok ' + m); }

console.log('smoke-event-bus-s1');

// ── vm 加载 tm-event-system.js ──
const src = fs.readFileSync(path.join(ROOT, 'tm-event-system.js'), 'utf8');
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  Math, JSON, String, Array, Object, Number, Boolean,
  Date: { now: () => 0 },
  uid: (function () { let n = 0; return function () { return 'evt-' + (++n); }; })(),
  _dbg: function () {},
  addEB: function () {},
  clamp: function (v, min, max) { return Math.max(min, Math.min(max, v)); }
};
ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
ctx.GM = { turn: 1 };
ctx.P = {};
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'tm-event-system.js' });

const SEB = ctx.StoryEventBus;

// ① 骨架导出 + enqueue 优先级排序
ok(SEB && typeof SEB.enqueue === 'function', '① StoryEventBus 骨架导出');
SEB.enqueue({ title: 'low', priority: 3 });
SEB.enqueue({ title: 'high', priority: 9 });
ok(SEB.getQueue().length === 2, '① enqueue x2');
ok(SEB.getQueue()[0].title === 'high', '① 按优先级降序排队(high 在前)');
ok(!!SEB.getQueue()[0].id && !!SEB.getQueue()[1].id, '① enqueue 自动填 id');
ok(SEB.getQueue()[0].enqueueTurn === 1, '① enqueue 自动填 enqueueTurn=GM.turn');

// ② processNext 取最高优先级 + 出队
const first = SEB.processNext();
ok(first && first.title === 'high', '② processNext 取最高优先级');
ok(SEB.getQueue().length === 1, '② processNext 出队');
ok(SEB.getCurrentEvent() === first, '② getCurrentEvent=正在处理');

// ③ serialize/deserialize 存档往返(经 JSON·模拟真存档)
// 当前队列: [low](high 已被 processNext 取走)
const snap = SEB.serialize();
ok(snap && Array.isArray(snap.queue) && snap.queue.length === 1, '③ serialize 出 {queue,processing}(queue=[low])');
const roundtrip = JSON.parse(JSON.stringify(snap)); // 模拟存档 JSON 序列化往返
SEB.deserialize(null);
ok(SEB.getQueue().length === 1, '③ deserialize(null) 安全(不炸·语义=缺数据不动队列·save-lifecycle:650 有 guard)');
SEB.deserialize({ queue: [], processing: null });
ok(SEB.isEmpty(), '③ deserialize 可清空');
SEB.deserialize(roundtrip);
ok(SEB.getQueue().length === 1 && SEB.getQueue()[0].title === 'low', '③ deserialize 从快照还原队列(存档往返)');

// ④ cleanExpired 超时清理 + 空队列安全
SEB.deserialize({ queue: [], processing: null });
ctx.GM.turn = 1;
SEB.enqueue({ title: 'deadline2', priority: 5, deadline: 2, choices: [] });
ok(SEB.getQueue().length === 1, '④ 入队限时事件');
ctx.GM.turn = 5; // age = 5-1 = 4 > deadline 2
SEB.cleanExpired();
ok(SEB.getQueue().length === 0, '④ cleanExpired 清超时事件');
SEB.cleanExpired();
ok(SEB.isEmpty(), '④ 空队列 cleanExpired 安全(空转无副作用)');

// ⑤ eventUnificationOn 开关(默认关·两命名空间·零回归)
ok(typeof ctx.eventUnificationOn === 'function', '⑤ eventUnificationOn 导出');
ctx.P = {};
ok(ctx.eventUnificationOn() === false, '⑤ 默认关(P.conf 未设·零回归)');
ctx.P = { conf: { eventUnificationEnabled: true } };
ok(ctx.eventUnificationOn() === true, '⑤ P.conf.eventUnificationEnabled 开');
ctx.P = { ai: { eventUnificationEnabled: true } };
ok(ctx.eventUnificationOn() === true, '⑤ P.ai.* 也认');
ctx.P = { conf: { eventUnificationEnabled: false } };
ok(ctx.eventUnificationOn() === false, '⑤ 显式关');

// ⑥ endturn drain 钩子静态断言(开关门控 + cleanExpired·S1 不调 processNext 防吞事件)
const sysSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-systems.js'), 'utf8');
ok(/eventUnificationOn\(\)/.test(sysSrc), '⑥ endturn 引用开关 eventUnificationOn');
ok(/StoryEventBus\.cleanExpired\(\)/.test(sysSrc), '⑥ endturn drain 调 cleanExpired');
ok(/StoryEventBus\.processNext\(\)/.test(sysSrc), '⑥ endturn drain 已接 processNext(S3 渲染入口)');

// ⑦ 存档点仍接(save-lifecycle·S1 零工作但须确认没被破坏)
const saveSrc = fs.readFileSync(path.join(ROOT, 'tm-save-lifecycle.js'), 'utf8');
ok(/StoryEventBus\.serialize\(\)/.test(saveSrc), '⑦ save-lifecycle 存 serialize');
ok(/StoryEventBus\.deserialize/.test(saveSrc), '⑦ save-lifecycle 恢复 deserialize');

console.log('\n结果: ' + A + ' 通过 / 0 失败');
