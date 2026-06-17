#!/usr/bin/env node
/* eslint-env node */
// smoke-desktop-back-to-start-panel.js
// 回归:正式库剧本(projectOnly·无磁盘文件)从「选择游戏模式」页点「返回」
// 不得再走 desktopStartScn 按文件名读盘(必报「加载失败」),应经
// desktopBackToStartPanel 用内存 _pendingStartPayload 重建存档名面板。

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) { console.error('[smoke-desktop-back-to-start-panel] FAIL: ' + msg); process.exit(1); }
  passed += 1;
}

const toasts = [];
const elements = {};
function el(id) {
  if (!elements[id]) elements[id] = { id: id, value: '', style: {}, innerHTML: '', classList: { add() {}, remove() {}, contains() { return false; } } };
  return elements[id];
}

const ctx = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  JSON: JSON,
  Promise: Promise,
  fetch: async () => ({ ok: false }),
  confirm: () => true,
  P: { scenarios: [{ id: 'proj-1', name: '测试正式库剧本', era: '测试纪元', role: '测试帝' }], conf: {}, _indices: {} },
  GM: {},
  toast: (m) => toasts.push(String(m)),
  _dbg: () => {},
  _$: el,
  buildIndices: () => { ctx.P._indices = { scenarioById: {} }; },
  findScenarioById: (id) => ctx.P.scenarios.find((s) => s && s.id === id) || null,
  startGame: () => { ctx.__started = true; },
  document: {
    getElementById: el,
    querySelector: () => null,
    addEventListener: () => {},
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} })
  }
};
ctx.window = ctx;
ctx.window.tianming = {
  isDesktop: true,
  listScenarios: async () => ({ success: true, files: [] }),
  loadScenario: async (name) => { ctx.__diskLoadAttempts = (ctx.__diskLoadAttempts || 0) + 1; return { success: false, error: 'no such file: ' + name }; },
  saveScenario: async () => ({ success: true }),
  deleteScenario: async () => ({ success: true })
};
vm.createContext(ctx);

const code = fs.readFileSync(path.join(ROOT, 'tm-electron.js'), 'utf8');
vm.runInContext(code, ctx, { filename: 'tm-electron.js', timeout: 10000 });

// 1. 正式库剧本 → 存档名面板
assert(typeof ctx.desktopStartProjectScn === 'function', 'desktopStartProjectScn should exist');
assert(typeof ctx.desktopBackToStartPanel === 'function', 'desktopBackToStartPanel should exist');
ctx.desktopStartProjectScn('proj-1');
const panel1 = el('main-view').innerHTML;
assert(panel1.indexOf('start-save-name') >= 0, 'project scenario should open save-name panel');
assert(ctx._pendingStartPayload && ctx._pendingStartPayload.scn && ctx._pendingStartPayload.scn.id === 'proj-1',
  'pending payload should hold the project scenario');

// 2. 确认 → 模式选择面板·返回按钮必须走 desktopBackToStartPanel
el('start-save-name').value = '测试存档';
ctx.desktopConfirmStart();
const panel2 = el('main-view').innerHTML;
assert(panel2.indexOf('desktopBackToStartPanel()') >= 0, 'mode panel return button should call desktopBackToStartPanel');
assert(panel2.indexOf('desktopStartScn(window._pendingStartPayload') < 0,
  'mode panel return button must not reload from disk by filename');

// 3. 返回 → 回到存档名面板·不读盘·无「加载失败」
const diskBefore = ctx.__diskLoadAttempts || 0;
ctx.desktopBackToStartPanel();
const panel3 = el('main-view').innerHTML;
assert(panel3.indexOf('start-save-name') >= 0, 'back should rebuild save-name panel');
assert((ctx.__diskLoadAttempts || 0) === diskBefore, 'back must not attempt disk load');
assert(!toasts.some((t) => t.indexOf('加载失败') >= 0), 'back must not toast 加载失败, got: ' + JSON.stringify(toasts));

// 4. payload 缺失时 fallback showScnSelect 不抛
ctx._pendingStartPayload = null;
ctx.desktopBackToStartPanel();
assert(true, 'fallback path should not throw');

console.log('smoke-desktop-back-to-start-panel OK: ' + passed + ' assertions');
process.exit(0);
