#!/usr/bin/env node
// smoke-endturn-helpers.js — Phase 7 P7-β baseline·4/21
// 锁 §2 sub-call infra·_runSubcall / _tok / _buildFetchBody / _truncatedOnce / _checkTruncated
// 拆分 P7-δ 时·这 5 个 helper 是 ai.js 的核心·签名必保

'use strict';

const { readSource, makeAssert, findLines } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();

// ─── _getEffectiveOutputLimit·token cap helper ───
assert(/function\s+_getEffectiveOutputLimit\s*\(\s*\)/.test(src),
  '_getEffectiveOutputLimit() 签名 (no-args)');
assert(src.indexOf('var _effectiveOutCap = _getEffectiveOutputLimit()') >= 0,
  '_effectiveOutCap = _getEffectiveOutputLimit() 调用');

// ─── _tok·token helper ───
assert(/function\s+_tok\s*\(\s*baseTok\s*\)/.test(src),
  '_tok(baseTok) 签名');
assert(src.indexOf('P.conf.maxOutputTokens') >= 0,
  '_tok 读 P.conf.maxOutputTokens·玩家手动设置优先');

// ─── _buildFetchBody·body builder ───
assert(/function\s+_buildFetchBody\s*\(\s*model\s*,\s*messages\s*,\s*temperature\s*,\s*baseTok\s*,\s*extra\s*\)/.test(src),
  '_buildFetchBody(model, messages, temperature, baseTok, extra) 签名');
assert(src.indexOf("var body = {model:model, messages:messages, temperature:temperature}") >= 0,
  '_buildFetchBody 内部 body shape');
assert(src.indexOf('if (mt !== undefined) body.max_tokens = mt') >= 0,
  '_buildFetchBody·_tok() undefined → 不传 max_tokens (auto 模式)');

// ─── _truncatedOnce flag·跨 phase 截断检测 ───
assert(src.indexOf('var _truncatedOnce = false') >= 0,
  '_truncatedOnce 初值 false');
assert(/function\s+_checkTruncated\s*\(\s*data\s*,\s*label\s*\)/.test(src),
  '_checkTruncated(data, label) 签名');
assert(src.indexOf("'length'") >= 0 && src.indexOf("'max_tokens'") >= 0,
  "_checkTruncated 检 finish_reason in {'length', 'max_tokens'}");

// ─── _runSubcall factory·sub-call 注册化基础设施 ───
assert(/async\s+function\s+_runSubcall\s*\(\s*id\s*,\s*name\s*,\s*minDepth\s*,\s*fn\s*\)/.test(src),
  '_runSubcall(id, name, minDepth, fn) 签名·async function declaration');
assert(/async\s+function\s+_runSubcallBatch\s*\(\s*label\s*,\s*tasks\s*,\s*limit\s*\)/.test(src),
  '_runSubcallBatch(label, tasks, limit) 签名·async function declaration');

// _runSubcall call sites·~6 直调 + batch 调 (followup 走 batch)
const callSites = findLines(/await\s+_runSubcall\s*\(/);
assert(callSites.length >= 5,
  '_runSubcall direct call sites >= 5·实际 ' + callSites.length + ' (主 5 sub-call + 部分 followup·余走 _runSubcallBatch)');
const batchSites = findLines(/_runSubcallBatch\s*\(/);
assert(batchSites.length >= 1,
  '_runSubcallBatch call sites >= 1·实际 ' + batchSites.length + ' (followup batch)');

// ─── §2 marker 在 helper 之前 ───
const sec2Lines = findLines(/§2\s*Sub-call\s*注册化基础设施/);
assert(sec2Lines.length === 1, '§2 marker 唯一·count=' + sec2Lines.length);

// _runSubcall 应在 §2 之后·§3 之前
const sec3Lines = findLines(/§3\s*Sub-calls?\s*sc0/);
assert(sec3Lines.length === 1, '§3 marker 唯一·count=' + sec3Lines.length);
assert(sec2Lines[0] < sec3Lines[0], '§2 marker 在 §3 之前·sec2=' + sec2Lines[0] + ' sec3=' + sec3Lines[0]);

// ─── 截断 toast 提示·"AI输出被截断" ───
assert(src.indexOf('AI输出被截断') >= 0,
  '_checkTruncated·toast 提示文本"AI输出被截断"');
assert(src.indexOf('AI输出上限') >= 0,
  '_checkTruncated·建议 toast 含"AI输出上限"');

// ─── 4096 兜底·token cap fallback ───
assert(src.indexOf('Math.max(4096') >= 0,
  '_getEffectiveOutputLimit·兜底最低 4096 tokens');

console.log('[smoke-endturn-helpers] pass assertions=' + passed.value);
