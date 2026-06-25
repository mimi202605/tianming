#!/usr/bin/env node
// smoke-prompt-budget-guards.js — TokenBudget 两项加固
//   #1 getModelContextSizeK 自动按模型真实窗口(白名单与探测取较大·手动覆写最高·未知回退32)
//   #2 SC1 critical 硬截兜底:Call A 压缩后仍超预算 → 按比例截 tp1 中段·保头保尾·落入窗口
//   本测试逐字镜像两处算法。
'use strict';
let A = 0;
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

console.log('smoke-prompt-budget-guards');

// ===== #1 contextK 优先级(镜像 getModelContextSizeK) =====
function getModelContextSizeK(P, matchFn) {
  if (P.conf.contextSizeK && P.conf.contextSizeK > 0) return P.conf.contextSizeK;
  var k = (P.conf._detectedContextK && P.conf._detectedContextK > 0) ? P.conf._detectedContextK : 0;
  var mk = matchFn((P.ai && P.ai.model) || '');
  if (mk && mk > k) k = mk;
  return k > 0 ? k : 32;
}
// 简化白名单
function matchFn(m) {
  m = (m || '').toLowerCase();
  if (m.indexOf('claude-opus-4-6') >= 0) return 1024;
  if (m.indexOf('gpt-4o') >= 0) return 128;
  if (m.indexOf('deepseek-chat') >= 0) return 64;
  return 0;
}

assert(getModelContextSizeK({ conf: { contextSizeK: 48 }, ai: { model: 'gpt-4o' } }, matchFn) === 48, '#1 手动覆写最高(48·压过白名单128)');
assert(getModelContextSizeK({ conf: {}, ai: { model: 'gpt-4o' } }, matchFn) === 128, '#1 无设置→按模型白名单(gpt-4o=128·不再死守32)');
assert(getModelContextSizeK({ conf: { _detectedContextK: 64 }, ai: { model: 'gpt-4o' } }, matchFn) === 128, '#1 探测64但白名单128→取较大128(防自报偏低)');
assert(getModelContextSizeK({ conf: { _detectedContextK: 200 }, ai: { model: 'gpt-4o' } }, matchFn) === 200, '#1 探测200>白名单128→取较大200(探测可抬高)');
assert(getModelContextSizeK({ conf: {}, ai: { model: '某未知代理模型' } }, matchFn) === 32, '#1 全未知→保守回退32');
assert(getModelContextSizeK({ conf: {}, ai: { model: 'claude-opus-4-6' } }, matchFn) === 1024, '#1 不同模型不同窗口(opus-4-6=1024)');

// ===== #2 硬截兜底(镜像 tm-endturn-ai.js 硬截算法) =====
function mkCheck(budgetTok) {
  var warn80 = Math.floor(budgetTok * 0.8), warn95 = Math.floor(budgetTok * 0.95);
  return function (text) {
    var tokens = Math.ceil(text.length / 2);  // 约 2 字/token(测试用估算)
    var status = tokens > warn95 ? 'critical' : (tokens > warn80 ? 'warn' : 'ok');
    return { status: status, tokens: tokens, budget: { contextK: 64, budget: budgetTok, warn80: warn80, warn95: warn95 } };
  };
}
function hardTrim(sysP, tp1, check) {
  var _ht = check((sysP || '') + '\n' + tp1);
  var _htTarget = (_ht.budget && _ht.budget.warn80) ? _ht.budget.warn80 : Math.floor(((_ht.budget && _ht.budget.budget) || _ht.tokens) * 0.8);
  if (_ht.status === 'critical' && _ht.tokens > _htTarget && tp1.length > 4000) {
    var _r = Math.max(0.2, Math.min(0.95, _htTarget / _ht.tokens));
    var _keep = Math.floor(tp1.length * _r);
    var _head = Math.floor(_keep * 0.5);
    var _tail = _keep - _head;
    if (_head > 300 && _tail > 300 && (_head + _tail) < tp1.length) {
      var _omit = tp1.length - _head - _tail;
      tp1 = tp1.slice(0, _head)
        + '\n\n【⚠ 上下文窗口不足·已硬截中段约 ' + _omit + ' 字以保关键首尾(玩家诏令/输出约束)·请据现有信息推演·缺失处勿臆造】\n\n'
        + tp1.slice(tp1.length - _tail);
    }
  }
  return tp1;
}

var check = mkCheck(49152);  // contextK 64
var sysP = '系统提示约百字'.repeat(5);
var HEAD = 'HEADMARK·本回合玩家圣旨：彻查逆党。';
var TAIL = 'TAILMARK·请仅返回 JSON。';
var bloated = HEAD + '世'.repeat(300000) + TAIL;     // 远超预算

assert(check(sysP + '\n' + bloated).status === 'critical', '#2 构造的 prompt 确为 critical');
var trimmed = hardTrim(sysP, bloated, check);
assert(trimmed.length < bloated.length, '#2 硬截后变短(' + bloated.length + '→' + trimmed.length + ')');
assert(check(sysP + '\n' + trimmed).status !== 'critical', '#2 硬截后脱离 critical(落入窗口)');
assert(trimmed.indexOf('HEADMARK') >= 0, '#2 保头(玩家圣旨在)');
assert(trimmed.indexOf('TAILMARK') >= 0, '#2 保尾(输出约束在)');
assert(trimmed.indexOf('硬截中段') >= 0, '#2 留省略标记');

// 未超预算→不动
var small = HEAD + '微' + TAIL;
assert(hardTrim(sysP, small, check) === small, '#2 未超预算的 prompt 不截(原样)');

// 边界:略超 warn95 但 tp1 太短(<4000)→不截(避免破坏小 prompt)
var shortOver = '甲'.repeat(3000);
assert(hardTrim('', shortOver, mkCheck(1000)) === shortOver, '#2 tp1<4000 不硬截(护小prompt)');

console.log('\nPASS · ' + A + ' assertions');
