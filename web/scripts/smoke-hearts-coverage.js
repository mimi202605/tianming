#!/usr/bin/env node
// scripts/smoke-hearts-coverage.js
// 2026-07-03·锁住『方向A 名额饥饿』修复——heartsTotalCap 系数 16→24·令有效覆盖 NPC 数逼近 heartsMaxChars
//
// 背景·NPC 记忆进推演只给 top-N 深度名额·有效覆盖=min(heartsMaxChars, floor(heartsTotalCap/heartsPerChar))。
//   旧 totalCap=16*scale 在 64-128K 被 perChar(3-4)反噬·覆盖饿死到~8人(公式本意 maxChars 人)。
// 修·tm-ai-infra.js 系数 16→24·覆盖逼近 maxChars。本测复制公式·断言各档覆盖较旧提升且无低档回归。

'use strict';
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

// ── 复制自 tm-ai-infra.js 的 hearts 公式(新系数 24) ──
function heartsParams(k) {
  var rawScale = Math.log2(Math.max(k, 4) / 8) / 2;
  var scale = Math.max(0.2, Math.min(rawScale, 3.0));
  return {
    scale: scale,
    maxChars: Math.max(3, Math.min(20, Math.round(8 * scale))),
    perChar:  Math.max(1, Math.min(4, Math.round(2 * scale))),
    impMin:   Math.max(3, Math.min(9, Math.round(8 - scale * 2))),
    totalCap: Math.max(6, Math.min(80, Math.round(24 * scale)))   // ★新系数
  };
}
function coverage(k){ var p = heartsParams(k); return Math.min(p.maxChars, Math.floor(p.totalCap / p.perChar)); }
// 旧系数 16 的覆盖(对照)
function coverageOld(k){
  var rawScale = Math.log2(Math.max(k,4)/8)/2, scale = Math.max(0.2, Math.min(rawScale, 3.0));
  var maxChars = Math.max(3, Math.min(20, Math.round(8*scale)));
  var perChar = Math.max(1, Math.min(4, Math.round(2*scale)));
  var totalCap = Math.max(6, Math.min(80, Math.round(16*scale)));
  return Math.min(maxChars, Math.floor(totalCap/perChar));
}

console.log('===== 有效覆盖·各档实际值(k 为 contextK·K 单位) =====');
[8, 16, 32, 64, 128, 256, 1000].forEach(function(k){
  var c=coverage(k), o=coverageOld(k), p=heartsParams(k);
  console.log('  ' + k + 'K: scale=' + p.scale.toFixed(2) + ' maxChars=' + p.maxChars + ' perChar=' + p.perChar + ' totalCap=' + p.totalCap + ' → 覆盖 ' + c + ' (旧 ' + o + ')');
});

console.log('===== ★64-128K 饥饿已缓解(覆盖>旧) =====');
assert(coverage(64) > coverageOld(64), '64K 覆盖应>旧 (' + coverage(64) + ' vs ' + coverageOld(64) + ')');
assert(coverage(128) > coverageOld(128), '128K 覆盖应>旧 (' + coverage(128) + ' vs ' + coverageOld(128) + ')');
assert(coverage(256) > coverageOld(256), '256K 覆盖应>旧 (' + coverage(256) + ' vs ' + coverageOld(256) + ')');
assert(coverage(128) >= 12, '128K 覆盖应≥12 (得 ' + coverage(128) + ')');
assert(coverage(64) >= 12, '64K 覆盖应满 maxChars=12 (得 ' + coverage(64) + ')');

console.log('===== 无低档回归(≤32K 覆盖不变) =====');
assert(coverage(8) === coverageOld(8), '8K 覆盖不变 (' + coverage(8) + ')');
assert(coverage(32) === coverageOld(32), '32K 覆盖不变 (' + coverage(32) + ')');
assert(coverage(128) <= heartsParams(128).maxChars, '覆盖不得超 maxChars');

console.log('===== 重臣定义性记忆·提取逻辑(复制自 _injectNeglectedAuthority) =====');
function defMem(c2){
  var _defMem = '';
  try {
    if (Array.isArray(c2._scars) && c2._scars.length) {
      var _sc = c2._scars[c2._scars.length - 1];
      if (_sc) _defMem = String(_sc.event || '').slice(0, 26) + (_sc.emotion ? '[' + _sc.emotion + ']' : '');
    } else if (Array.isArray(c2._memory) && c2._memory.length) {
      var _mm = c2._memory.slice().sort(function(a, b){ return (b.importance || 0) - (a.importance || 0); })[0];
      if (_mm && _mm.event) _defMem = String(_mm.event).slice(0, 26);
    }
  } catch (_dmE) {}
  return _defMem;
}
assert(defMem({ _scars: [{ event: '门生尽死诏狱', emotion: '恨' }] }) === '门生尽死诏狱[恨]', '优先取顶级伤疤(带情绪)');
assert(defMem({ _memory: [{ event: '琐事', importance: 2 }, { event: '边镇失守之痛', importance: 9 }] }) === '边镇失守之痛', '无伤疤则取最高重要度记忆');
assert(defMem({}) === '', '无记忆无伤疤→空串(不加记忆段)');
assert(defMem({ _scars: [], _memory: [] }) === '', '空数组→空串');

console.log('');
console.log(`[smoke-hearts-coverage] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
