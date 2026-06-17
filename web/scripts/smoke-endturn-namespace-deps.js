#!/usr/bin/env node
// smoke-endturn-namespace-deps.js — Phase 7 P7-β baseline·11/21
// 锁 endturn-ai-infer 对 R200-R208 namespace 的依赖
// 拆分时·sub-module 应保持相同 namespace usage·避免错引

'use strict';

const { readSource, makeAssert, countMatches } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();

// ─── R201/R204 alias references (read-only·callsite drift detection) ───
// endturn-ai-infer 应用 endturn pipeline·调 fiscal/economy/edict 等 R200+ ns
// 拆分时·这些 ns 调用必保 (sub-module 内 Or 主入口)

// TM.errors·R204 P4-β-2 + P5-α meta·diagnostic
assert(src.indexOf('TM.errors') >= 0,
  'TM.errors·diagnostic call (R204 P4-β-2 + P5-α)');

// TM.lastPromptTokens·diagnostic·P5-η letter 提到·留 TM 顶层
assert(src.indexOf('TM.lastPromptTokens') >= 0 || src.indexOf('lastPromptTokens') >= 0,
  'lastPromptTokens·diagnostic 跨 phase');

// ─── R10 redistribute 后·fiscal/economy 函数调用 ───
// 这些不是 namespace·是 R10 后留 window 的函数·拆分后 sub-module 应 import 或 read window
[
  'EDICT_TYPES',     // tm-edict-lifecycle·R202 lifecycle 引用
  'REFORM_PHASES',   // 同
  'RESISTANCE_SOURCES'  // 同
].forEach(function(ref) {
  assert(src.indexOf(ref) >= 0, 'R10 redistribute 后 ref·"' + ref + '"');
});

// ─── GM·P 直访问数量·拆分时改 ctx 时需考虑 ───
const gmRefs = countMatches(/\bGM\./g);
const pRefs = countMatches(/\bP\./g);
assert(gmRefs >= 200,
  'GM. references·拆分挑战·实际 ' + gmRefs + ' (>= 200·sub-module 必跨 GM 访问)');
assert(pRefs >= 50,
  'P. references·实际 ' + pRefs + ' (>= 50)');

// ─── _getDaysPerTurn·跨文件 helper ───
assert(src.indexOf('_getDaysPerTurn') >= 0,
  '_getDaysPerTurn·跨文件·tm-utils helper');

// ─── getTimeRatio·主入口收·ctx.input 候选 ───
assert(src.indexOf('getTimeRatio') >= 0,
  'getTimeRatio·主入口收·拆分后入 ctx.input.timeRatio');

console.log('[smoke-endturn-namespace-deps] pass assertions=' + passed.value);
