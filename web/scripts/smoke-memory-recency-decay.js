#!/usr/bin/env node
'use strict';
// S5b 守护（2026-06-03·连续 salience 衰减）：recencyOf 由 5 桶阶梯改连续单调插值——
// 边界值与原桶一致(保 golden)、桶间平滑(老记忆渐进降权而非突降)、单调非增、有 0.30 下限。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Date, Math, JSON };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

['tm-memory-evidence-registry.js', 'tm-memory-retrieval.js'].forEach((file) =>
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));

const MR = sandbox.TM && sandbox.TM.MemoryRetrieval;
assert(MR && typeof MR.scoreHit === 'function', 'MemoryRetrieval.scoreHit exported');

var CUR = 100;
function rec(dt) { return MR.scoreHit({ turn: CUR - dt }, { turn: CUR }).reason.recency; }

// 1) 边界锚点值与原 5 桶一致（保 golden 排序稳定）
assert(Math.abs(rec(1) - 1.0) < 1e-9, 'dt=1 -> 1.0 (anchor)');
assert(Math.abs(rec(5) - 0.85) < 1e-9, 'dt=5 -> 0.85 (anchor)');
assert(Math.abs(rec(15) - 0.65) < 1e-9, 'dt=15 -> 0.65 (anchor)');
assert(Math.abs(rec(50) - 0.45) < 1e-9, 'dt=50 -> 0.45 (anchor)');

// 2) 桶间连续平滑：中间 dt 取相邻锚点之间值（不再阶梯硬跳）
assert(rec(3) < 1.0 && rec(3) > 0.85, 'dt=3 between 1.0 and 0.85 (smooth, not flat 0.85)');
assert(rec(10) < 0.85 && rec(10) > 0.65, 'dt=10 between 0.85 and 0.65');
assert(rec(30) < 0.65 && rec(30) > 0.45, 'dt=30 between 0.65 and 0.45');

// 3) 单调非增（越老 recency 越低·永不回升）
var prev = 2.0;
[0, 1, 2, 3, 5, 8, 12, 15, 25, 40, 50, 80, 120, 150, 300].forEach(function(dt) {
  var r = rec(dt);
  assert(r <= prev + 1e-9, 'monotonic non-increasing at dt=' + dt + ' (r=' + r + ', prev=' + prev + ')');
  prev = r;
});

// 4) 远期下限 0.30
assert(Math.abs(rec(300) - 0.30) < 1e-9, 'far past floors at 0.30');
assert(rec(50) > rec(150) && rec(150) >= 0.30, 'old-but-once-relevant decays gradually past dt=50 toward floor');

// 5) 无 turn 信息时回退 0.55（与原一致）
assert(Math.abs(MR.scoreHit({}, {}).reason.recency - 0.55) < 1e-9, 'no-turn fallback stays 0.55');

console.log('smoke-memory-recency-decay ok');
