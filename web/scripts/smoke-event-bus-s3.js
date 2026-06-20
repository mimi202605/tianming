#!/usr/bin/env node
'use strict';
// smoke-event-bus-s3 — 事件系统统一 · Slice 3：渲染器（玩家入口）
// 验：① renderStoryEventModal 生成事件模态(openGenericModal·含 choices/aiHint/data-evt/data-idx)
//     ② _bindStoryEventChoices 绑 onclick ③ onclick→closeGenericModal+resolveChoice(出队)
//     ④ 无 choices 不渲染 ⑤ endturn drain 接 processNext+renderStoryEventModal(静态断言)
// 注：tm-event-system.js 无 module.exports(纯浏览器全局)·走 vm·mock document/openGenericModal
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ok ' + m); }

console.log('smoke-event-bus-s3');

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
ctx.setTimeout = function (fn) { try { fn(); } catch (e) {} }; // 立即执行(测 bind)
ctx.GM = { turn: 5, biannianItems: [] };
ctx.P = {};
ctx.addEB = function () {};
ctx.createMemoryAnchor = function () {};
// mock DOM + 模态
ctx._modal = null; ctx._closed = false; ctx._mockEls = [];
ctx.openGenericModal = function (title, html, onSave) { ctx._modal = { title: title, html: html }; };
ctx.closeGenericModal = function () { ctx._closed = true; };
ctx.document = { querySelectorAll: function () { return ctx._mockEls; } };

vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'tm-event-system.js' });
const SEB = ctx.StoryEventBus;

// ① renderStoryEventModal 生成模态
var ev = { id: 'e1', title: '陕西大饥', description: '饥民载道，流离失所', choices: [{ text: '开仓赈济', aiHint: '缓民怨然耗国库' }, { text: '按律徵粮' }] };
ctx.renderStoryEventModal(ev);
ok(ctx._modal, '① renderStoryEventModal 调 openGenericModal');
ok(ctx._modal.title === '陕西大饥', '① 模态标题=事件标题');
ok(ctx._modal.html.indexOf('开仓赈济') >= 0, '① html 含 choice text');
ok(ctx._modal.html.indexOf('缓民怨然耗国库') >= 0, '① html 含 aiHint');
ok(ctx._modal.html.indexOf('饥民载道') >= 0, '① html 含 description');
ok(ctx._modal.html.indexOf('data-evt="e1"') >= 0, '① choice 带 data-evt');
ok(ctx._modal.html.indexOf('data-idx="0"') >= 0 && ctx._modal.html.indexOf('data-idx="1"') >= 0, '① 每个 choice 带 data-idx');

// ② _bindStoryEventChoices 绑 onclick
function mkEl(eid, idx) {
  return { _attrs: { 'data-evt': eid, 'data-idx': String(idx) }, getAttribute: function (k) { return this._attrs[k]; }, onclick: null };
}
var fake = mkEl('e1', 0);
ctx._mockEls = [fake];
ctx._bindStoryEventChoices();
ok(typeof fake.onclick === 'function', '② bind 绑了 onclick');
ok(fake._seBound === true, '② bind 标记 _seBound(防重绑)');

// ③ onclick → closeGenericModal + resolveChoice(出队)
(async function () {
  ctx.P = {}; // 开关关→resolveChoice 走兜底(不调 AI·无需 mock callAIWithTools)
  ctx._closed = false;
  SEB.deserialize({ queue: [], processing: null });
  var evClick = { id: 'e9', title: '边衅', choices: [{ text: '抚', effectKey: 'noop' }, { text: '剿', effectKey: 'noop' }] };
  SEB.enqueue(evClick); // e9 入队
  var elClick = mkEl('e9', 1);
  ctx._mockEls = [elClick];
  ctx._bindStoryEventChoices();
  await elClick.onclick();
  ok(ctx._closed === true, '③ onclick 调 closeGenericModal');
  ok(SEB.isEmpty(), '③ onclick→resolveChoice 处理事件(出队)');

  // ④ 无 choices 不渲染
  ctx._modal = null;
  ctx.renderStoryEventModal({ id: 'x', title: '空', choices: [] });
  ok(ctx._modal === null, '④ 无 choices 不渲染模态');

  // ⑤ endturn drain 接 processNext + renderStoryEventModal(静态断言)
  var sysSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-systems.js'), 'utf8');
  ok(/StoryEventBus\.processNext\(\)/.test(sysSrc), '⑤ endturn drain 接 processNext');
  ok(/renderStoryEventModal/.test(sysSrc), '⑤ endturn drain 调 renderStoryEventModal');
  ok(/getCurrentEvent\(\)/.test(sysSrc), '⑤ drain 先取 getCurrentEvent(未处理则续弹·一回合一个)');

  console.log('\n结果: ' + A + ' 通过 / 0 失败');
})().catch(function (e) { console.error(e); process.exit(1); });
