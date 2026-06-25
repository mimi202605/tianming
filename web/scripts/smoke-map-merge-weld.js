#!/usr/bin/env node
// smoke-map-merge-weld.js — 地图编辑器「肉眼无缝隙却合出飞地」修复
//   bug: tryAdjacentMerge 要求相邻省共享边顶点精确反向匹配(EPS=0.5px)·独立描边常差几像素→
//        匹配失败→落 multi-polygon 兜底→小块变飞地(用户肉眼看不出缝)。
//   fix: 合并前先 weldNearbyVertices(焊接近邻顶点·tol=MERGE_WELD_EPS)·缝隙闭合·共享边精确匹配·合为一体。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

// 桩 ME(模块加载守卫需 TM.MapEditor 真值;被测函数不依赖 ME 其余)
const ctx = { console, Math, Array, Object, JSON, isNaN, window: {} };
ctx.window.TM = { MapEditor: {} };
ctx.TM = ctx.window.TM; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'map-editor-merge-split.js'), 'utf8'), ctx, { filename: 'map-editor-merge-split.js' });

const MS = ctx.TM.MapEditor.mergeSplit;
console.log('smoke-map-merge-weld');
assert(MS && typeof MS.tryAdjacentMerge === 'function' && typeof MS.weldNearbyVertices === 'function', '模块加载·暴露 tryAdjacentMerge + weldNearbyVertices');

// 两个相邻方块(共享 x=10 这条边)·顶点精确重合 → 本就能合
function rect(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
const left = rect(0, 0, 10, 10);          // 右边 x=10
const rightExact = rect(10, 0, 20, 10);   // 左边 x=10·与 left 精确共享

// ── ① 精确共享边 → tryAdjacentMerge 直接合成单一边界 ──
const m1 = MS.tryAdjacentMerge([left, rightExact]);
assert(m1 && m1.length >= 4, '① 精确相邻 → 合成单一边界(顶点=' + (m1 ? m1.length : 'null') + ')');

// ── ② 差几像素的缝(right 左边在 x=13·与 left 右边 x=10 差 3px)→ 不焊接则匹配失败 ──
const rightGap = rect(13, 0, 23, 10);     // 左边 x=13·与 left 右边 x=10 有 3px 缝
const m2raw = MS.tryAdjacentMerge([left, rightGap]);
assert(m2raw === null, '② 差3px未焊接 → tryAdjacentMerge 失败(返回 null·正是会落飞地的根因)');

// ── ③ 焊接后(tol=4 ≥ 3px 缝)→ 缝隙闭合 → 合成单一边界(不再飞地) ──
const welded = MS.weldNearbyVertices([left, rightGap], 4);
const m3 = MS.tryAdjacentMerge(welded);
assert(m3 && m3.length >= 4, '③ 焊接后差3px缝 → 合成单一边界(顶点=' + (m3 ? m3.length : 'null') + '·飞地消除)');

// ── ④ 焊接确实把近邻顶点吸成同点(left 的 [10,0] 与 rightGap 的 [13,0] → 同一代表点) ──
const wl = welded[0], wr = welded[1];
function has(poly, x, y) { return poly.some(function (p) { return p[0] === x && p[1] === y; }); }
assert(has(wl, 10, 0) && has(wr, 10, 0), '④ 近邻顶点焊到同一代表点([10,0]·缝合)');

// ── ⑤ 相距远的两省(缝 50px ≫ tol)→ 焊接不动它们 → 仍判不相邻(不误合·无回归) ──
const farRight = rect(60, 0, 70, 10);
const wfar = MS.weldNearbyVertices([left, farRight], 4);
assert(MS.tryAdjacentMerge(wfar) === null, '⑤ 远隔两省焊接后仍不相邻 → null(走多块兜底·无误合)');
assert(has(wfar[1], 60, 0), '⑤ 远省顶点未被焊动(60,0 原样)');

// ── ⑥ 焊接去除退化(相邻重复点) ──
const degen = MS.weldNearbyVertices([[[0, 0], [1, 1], [1.5, 1.5], [10, 10], [0, 10]]], 4);
// [0,0],[1,1],[1.5,1.5] 互在 4px 内 → 焊成 1 点
assert(degen[0].length < 5, '⑥ 焊接合并近邻点并去退化(' + 5 + '→' + degen[0].length + ')');

console.log('\nPASS · ' + A + ' assertions');
