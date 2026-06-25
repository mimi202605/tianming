#!/usr/bin/env node
// smoke-scenario-import-events-shape.js — 剧本导入校验·events 形态修复
//   bug: 官方剧本 events 是「按类目分组的对象」(buildCategorizedEvents 返回 {historical:[...],random:[...],...})·
//        游戏加载器(tm-patches.js:2364)正是读这个对象形态;但编辑器导入校验器硬要 events 为数组 →
//        每个此类剧本导入都报「1 项错误·events 不是数组」被拦(forceImportScenario 才能强载)。
//   fix: 校验器接受 events 为「数组 或 对象」(与 variables/adminHierarchy 同·二者皆游戏可载)。
//   本测试从 preview/scenario-editor-reset-app.js 抽取真实 validateImportedScenario 函数执行。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

const src = fs.readFileSync(path.join(ROOT, 'preview', 'scenario-editor-reset-app.js'), 'utf8');

// 抽取真实 validateImportedScenario(brace 计数到闭合)
const sig = 'function validateImportedScenario(parsed) {';
const start = src.indexOf(sig);
if (start < 0) throw new Error('找不到 validateImportedScenario');
let i = start + sig.length - 1, depth = 0, end = -1;
for (; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const fnSrc = src.slice(start, end);

const ctx = { isObject: (v) => v != null && typeof v === 'object' && !Array.isArray(v), Array: Array };
vm.createContext(ctx);
vm.runInContext(fnSrc + '\nthis.validateImportedScenario = validateImportedScenario;', ctx);
const validate = ctx.validateImportedScenario;

console.log('smoke-scenario-import-events-shape');
assert(typeof validate === 'function', '抽取到真实 validateImportedScenario');

function errsOf(o) { return validate(o).errors; }
function hasEventsErr(o) { return errsOf(o).some(function (e) { return e.indexOf('events') >= 0; }); }

const base = { name: '测试剧本', id: 'test1', characters: [], factions: [] };

// ── ① 核心修复: events 为「分类对象」→ 不再报错(官方剧本真实形态) ──
var catEvents = Object.assign({}, base, { events: { historical: [{ name: '萨尔浒之战' }], random: [], story: [{ name: '阉党案' }] } });
assert(validate(catEvents).ok === true, '① 分类对象 events → 校验通过(ok)');
assert(!hasEventsErr(catEvents), '① 分类对象 events 不再产 events 错');

// ── ② events 为数组 → 仍通过 ──
assert(validate(Object.assign({}, base, { events: [{ name: 'A' }] })).ok === true, '② 数组 events → 通过');

// ── ③ events 缺省 → 通过 ──
assert(validate(Object.assign({}, base)).ok === true, '③ 无 events → 通过');

// ── ④ events 为字符串/数字 → 仍报错(真异常形态不放过) ──
assert(hasEventsErr(Object.assign({}, base, { events: '一段叙事' })), '④ 字符串 events → 报错');
assert(hasEventsErr(Object.assign({}, base, { events: 123 })), '④ 数字 events → 报错');

// ── ⑤ 其它既有规则不回归 ──
assert(validate({ characters: [] }).errors.some(function (e) { return e.indexOf('name') >= 0 || e.indexOf('id') >= 0; }), '⑤ 缺 name/id → 仍报错');
assert(validate(Object.assign({}, base, { characters: { 0: {} } })).errors.some(function (e) { return e.indexOf('characters') >= 0; }), '⑤ characters 非数组 → 仍报错');
assert(validate([]).ok === false, '⑤ 顶层非对象(数组) → 报错');

// ── ⑥ 模拟官方剧本(分类 events + 对象 variables/adminHierarchy)整体通过 ──
var official = { name: '天启七年', id: 'tianqi7', characters: [{}], factions: [{}],
  events: { historical: [{}], random: [{}], conditional: [{}], story: [{}], chain: [{}] },
  variables: { 民心: 50 }, adminHierarchy: { 京师: {} }, globalRules: '十条规则…' };
assert(validate(official).ok === true && validate(official).errors.length === 0, '⑥ 官方剧本形态整体校验 0 错(原报1错)');

console.log('\nPASS · ' + A + ' assertions');
