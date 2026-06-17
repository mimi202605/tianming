#!/usr/bin/env node
'use strict';
// S4 守护（2026-06-03·预算鲁棒性）：
// ① 载重权威 coreFacts 被 mustKeep，紧预算下永不被裁（ST「mandatory memory never trimmed」）；
// ② 低权威 warnings 有 per-zone 上限，体量超限即便全局预算有余也被压制（防 balloon 挤占）；
// ③ 小体量 warnings 不被误杀。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Date, Math, JSON };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

[
  'tm-memory-evidence-registry.js',
  'tm-context-zones.js',
  'tm-memory-context-compiler.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));

const MCC = sandbox.TM && sandbox.TM.MemoryContextCompiler;
assert(MCC && typeof MCC.compileHits === 'function', 'MemoryContextCompiler.compileHits exported');
function arr(v) { return Array.isArray(v) ? v : []; }
function hit(o) { return Object.assign({ turn: 30 }, o); }

// ── 1) mustKeep coreFacts 紧预算存活；超额低优先 chronology 被裁 ──
const bigChron = '辽东军情'.repeat(40); // 160 CJK ≈ 120 tokens
const r1 = MCC.compileHits([
  hit({ id: 'core1', type: 'hard_state', authority: 'engine_state', lane: 'L1_world_truth', safeBody: '国库存银仅二百万两，辽饷缺口巨大。' }),
  hit({ id: 'chron1', type: 'chronicle_event', authority: 'structured_chronicle', lane: 'L7_chronicle_context', safeBody: bigChron })
], { maxTokens: 120 });
assert(r1.text.indexOf('国库存银') >= 0, 'mustKeep coreFacts survives tight budget');
assert(r1.text.indexOf('辽东军情') < 0, 'oversized low-priority chronology suppressed under tight budget');
assert(r1.diagnostics && Number(r1.diagnostics.guaranteed) >= 1, 'coreFacts force-kept (guaranteed>=1)');
assert(arr(r1.suppressed).length >= 1, 'at least one zone suppressed');

// ── 2) warnings per-zone 上限：体量超 25% 预算即被压制，即便全局预算有余 ──
const bigWarn = '市井流言'.repeat(40); // ≈ 120 tokens; cap = floor(400*0.25)=100
const r2 = MCC.compileHits([
  hit({ id: 'core2', type: 'hard_state', authority: 'engine_state', lane: 'L1_world_truth', safeBody: '皇帝在位、朝纲未乱。' }),
  hit({ id: 'warn1', authority: 'rumor', source: 'rumor', safeBody: bigWarn })
], { maxTokens: 400 });
assert(r2.text.indexOf('市井流言') < 0, 'oversized warnings suppressed by per-zone cap even when global budget has room');
assert(r2.text.indexOf('皇帝在位') >= 0, 'coreFacts present alongside');

// ── 3) 小体量 warnings 在上限内、不被误杀 ──
const r3 = MCC.compileHits([
  hit({ id: 'core3', type: 'hard_state', authority: 'engine_state', lane: 'L1_world_truth', safeBody: '皇帝在位。' }),
  hit({ id: 'warn2', authority: 'rumor', source: 'rumor', safeBody: '有零星流言传于市井。' })
], { maxTokens: 400 });
assert(r3.text.indexOf('零星流言') >= 0, 'small warnings within cap are kept');

// ── 4) 无预算(maxTokens 未给)时不分区打包、全量渲染(回退路径仍可用) ──
const r4 = MCC.compileHits([
  hit({ id: 'core4', type: 'hard_state', authority: 'engine_state', lane: 'L1_world_truth', safeBody: '社稷安。' })
], {});
assert(r4.text.indexOf('社稷安') >= 0, 'no-budget path still renders content');

console.log('smoke-memory-budget ok');
