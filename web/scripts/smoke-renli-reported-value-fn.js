#!/usr/bin/env node
// smoke-renli-reported-value-fn.js — 官报失真通用变换纯函数(concealFactor/reportedValue)钉公式
//   slice-1a:从 refreshReported 抽出瞒报幅度+据报值变换为可导出纯函数(供他系统按同律算据报值·如 slice-1b 方志据报行)。
//   本 smoke 钉数值公式防漂移；字节等价(refreshReported 走它后行为不变)由 smoke-renli-reported-fog 家族回归护。
'use strict';
const path = require('path');
const R = require(path.resolve(__dirname, '..', 'tm-renli.js'));
let n = 0;
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); n++; }
function near(a, b) { return Math.abs(a - b) < 1e-9; }

assert(typeof R.concealFactor === 'function' && typeof R.reportedValue === 'function', '① concealFactor/reportedValue 已导出(TM.Renli)');

// ── concealFactor：base 由 disposition·danger 放大·封顶 0.6·无主官例行 0.15 ──
assert(near(R.concealFactor(null, 0), 0.15), '② 无主官→例行轻度 0.15');
assert(near(R.concealFactor(null, 1), 0.225), '③ 无主官 danger=1→0.15×1.5=0.225');
assert(near(R.concealFactor(null, 5), 0.225), '④ danger 超界被 clamp 到 1(仍 0.225)');
assert(near(R.concealFactor({ stress: 0, loyalty: 100, fame: 0 }, 0), 0), '⑤ 尽职主官(压0忠满名0)→0 瞒报');
assert(near(R.concealFactor({ stress: 0, loyalty: 60, fame: 0 }, 0), 0.14), '⑥ 忠60→0.35×0.4=0.14');
assert(near(R.concealFactor({ stress: 100, loyalty: 0, fame: 100 }, 0), 0.6), '⑦ 极端主官 raw=1.0→封顶 0.6');
// danger 放大：同一主官坏事越多瞒得越狠
assert(R.concealFactor({ stress: 50, loyalty: 50, fame: 0 }, 1) > R.concealFactor({ stress: 50, loyalty: 50, fame: 0 }, 0), '⑧ danger 放大瞒报幅度');

// ── reportedValue：据报 = 真值×(1−conceal)·conceal 封顶 0.6 ──
assert(near(R.reportedValue(100, 0), 100), '⑨ 无瞒报→据报=真值');
assert(near(R.reportedValue(100, 0.25), 75), '⑩ conceal .25→据报 75');
assert(near(R.reportedValue(100, 0.6), 40), '⑪ conceal .6(封顶)→据报 40');
assert(near(R.reportedValue(100, 0.9), 40), '⑫ conceal 超封顶被 clamp 到 .6→据报 40(非 10)');
assert(near(R.reportedValue(0, 0.5), 0) && near(R.reportedValue(undefined, 0.5), 0), '⑬ 真值缺省→0(不 NaN)');

console.log('[smoke-renli-reported-value-fn] pass assertions=' + n);
