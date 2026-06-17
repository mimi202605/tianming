#!/usr/bin/env node
/* eslint-env node */
'use strict';
// #3·affinity 衰减放缓·公式核对·2026-05-31
// 与 tm-help-social.js monthlyDecay 内"每两月才衰减一次(tick%2)+趋零1"逐字一致：让一次大恩/大怨管约两倍久。
var passed = 0;
function assert(c, l) { if (!c) throw new Error('[assert] ' + l); passed += 1; }

// 复刻 monthlyDecay 单键逻辑（含 tick 半速门）
function step(s) {
  s.tick += 1;
  if (s.tick % 2 !== 0) return s;               // 奇数月跳过·不衰减
  if (s.val > 0) s.val = Math.max(0, s.val - 1);
  else if (s.val < 0) s.val = Math.min(0, s.val + 1);
  return s;
}

var s = { tick: 0, val: 10 };
step(s); assert(s.val === 10, '月1·半速·不衰减·实得 ' + s.val);
step(s); assert(s.val === 9, '月2·衰减 1·实得 ' + s.val);
step(s); assert(s.val === 9, '月3·不衰·实得 ' + s.val);
step(s); assert(s.val === 8, '月4·衰减 1·实得 ' + s.val);

// 大恩 +10：原每月-1 需 10 月归零；半速后约 20 月，翻倍管久
var s2 = { tick: 0, val: 10 }; for (var i = 0; i < 20; i++) step(s2);
assert(s2.val === 0, '+10 大恩 20 月恰归零(原10月·翻倍管久)·实得 ' + s2.val);
var s3 = { tick: 0, val: 10 }; for (var j = 0; j < 18; j++) step(s3);
assert(s3.val === 1, '+10 大恩 18 月仍剩 1(没太快归零)·实得 ' + s3.val);

// 积怨 -8 同样半速趋零
var s4 = { tick: 0, val: -8 }; for (var k = 0; k < 16; k++) step(s4);
assert(s4.val === 0, '-8 积怨 16 月归零(半速)·实得 ' + s4.val);

console.log('  #3 衰减放缓: 每两月才 -1·大恩/积怨管约两倍久·parity 正确(奇月跳/偶月衰)');
console.log('[verify-affinity-decay] PASS assertions=' + passed);
