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

// ═══ T 形接点插入(2026-07-11·玩家反馈焊接后仍偶出飞地=共享边顶点数不匹配残留) ═══
assert(typeof MS.insertTeeJunctionPoints === 'function', '⑦ 暴露 insertTeeJunctionPoints');

// left 的右边 x=10 中途多一个顶点 (10,5)·rightExact 的对应边没有 → T 形接点
const leftTee = [[0, 0], [10, 0], [10, 5], [10, 10], [0, 10]];

// ── ⑧ T 形接点未插入 → tryAdjacentMerge 失败(坐实残留根因·焊接治不了) ──
const w8 = MS.weldNearbyVertices([leftTee, rightExact], 4);
assert(MS.tryAdjacentMerge(w8) === null, '⑧ T形接点(一侧有中点一侧没有)焊接后仍 null → 正是残留飞地根因');

// ── ⑨ T 接点插入后 → 对侧边补进 (10,5) → 合成单一边界(残留飞地消除) ──
const t9 = MS.insertTeeJunctionPoints(w8, 4);
const m9 = MS.tryAdjacentMerge(t9);
assert(m9 && m9.length >= 4, '⑨ T接点插入后 → 合成单一边界(顶点=' + (m9 ? m9.length : 'null') + '·残留飞地消除)');
assert(has(t9[1], 10, 5), '⑨ 对侧 polygon 确实补进了 T 点(10,5)');

// ── ⑩ T 点差 2px 贴边(先焊不动它·插入原点仍精确匹配) ──
const leftTeeOff = [[0, 0], [10, 0], [12, 5], [10, 10], [0, 10]];   // 中点在 x=12·距对边 x=10 差 2px < tol
const w10 = MS.weldNearbyVertices([leftTeeOff, rightExact], 4);
const t10 = MS.insertTeeJunctionPoints(w10, 4);
const m10 = MS.tryAdjacentMerge(t10);
assert(m10 && m10.length >= 4, '⑩ 贴边差2px的 T 点 → 插入原顶点本身 → 仍精确匹配合成(顶点=' + (m10 ? m10.length : 'null') + ')');

// ── ⑪ 远隔两省 T 接点插入不受影响 → 仍判不相邻(无误合回归) ──
const t11 = MS.insertTeeJunctionPoints([left, farRight], 4);
assert(MS.tryAdjacentMerge(t11) === null, '⑪ 远隔两省插入后仍不相邻 → null(走多块兜底·无误合)');
assert(t11[0].length === 4 && t11[1].length === 4, '⑪ 远省顶点数不变(无幽灵插点)');

// ── ⑫ 三省共点(丁字路口)·合并其中两省不受第三省顶点干扰崩溃 ──
const top = [[0, 10], [10, 10], [10, 20], [0, 20]];
const t12 = MS.insertTeeJunctionPoints([leftTee, rightExact, top], 4);
assert(t12.length === 3 && t12.every(function (p) { return p.length >= 4; }), '⑫ 三省参与插入不崩·各 polygon 合法');

console.log('\nPASS · ' + A + ' assertions');
