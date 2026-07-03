#!/usr/bin/env node
'use strict';
/* smoke-formalmap-ui — 游戏内地块舆图(phase8-formal-map)UI 三修（2026-07-03）防腐线。
 * Y1 视口收口：clampMapView 单点夹取 + 尺度按钮切档以视口中心为锚（治府州往返后地图漂去左上）。
 * Y2 府州稀疏回落：该级仅零星地块时回落全量做底·稀疏层后画在上（治天启图府州近空图）。
 * Y3 方志裸键 registerAccuracy→造册精度 + 告警 chips 截断放宽(shortText 14 + max-width 196px·title 悬停全文本有)。
 * 真机已验：府州 translate(-1200,-720) scale(3) 中心锚定·回天下 translate(0,0) scale(1) 完整复位·零 pageerror。 */
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var P = 0, F = 0;
function ok(c, m) { if (c) { P++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
var mapSrc = fs.readFileSync(path.join(ROOT, 'phase8-formal-map.js'), 'utf8');
var bridgeSrc = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8');
console.log('smoke-formalmap-ui');

console.log('— Y1 · 视口收口 —');
ok(/function clampMapView\(v\)/.test(mapSrc), 'clampMapView 在');
ok(/var v = clampMapView\(state\.mapView/.test(mapSrc), 'applyMapTransform 单点收口走 clamp');
ok(/state\._mapVBW = width; state\._mapVBH = height;/.test(mapSrc), 'viewBox 尺寸存 state(单一来源)');
ok(/以视口中心为锚重算平移/.test(mapSrc), '尺度切档中心锚在');
ok(/_cw - \(_cw - \(Number\(state\.mapView\.tx\) \|\| 0\)\) \* \(_s2 \/ _s1\)/.test(mapSrc), '中心锚公式在(tx)');

console.log('— Y2 · 府州稀疏回落 —');
ok(/稀疏回落\(2026-07-03\)/.test(mapSrc), '稀疏回落段在');
ok(/filtered\.length < Math\.max\(4, regions\.length \* 0\.25\)/.test(mapSrc), '稀疏阈值 max(4,25%)');
ok(/want\.indexOf\(regionTier\(r\)\) < 0; \}\)\.concat\(filtered\)/.test(mapSrc), '全量做底+稀疏层后画在上');
ok(/if \(!filtered\.length\) return regions;/.test(mapSrc), '原零块回落保留');

console.log('— Y3 · 方志键典与告警 —');
ok(/registerAccuracy: '造册精度'/.test(mapSrc), '键典 registerAccuracy=造册精度');
ok(/shortText\(x\.title \|\| '待批奏疏', 14\)/.test(mapSrc), '告警 chips 截断 10→14');
ok(/title="' \+ attr\(x\.title \|\| ''\)/.test(mapSrc), '告警 chips title 悬停全文在');
ok(/\.map-alert\{max-width:196px/.test(bridgeSrc), 'bridge CSS max-width 128→196px');

console.log('— 关键结构存活 —');
['function renderFormalMap()', 'function bandToScale(band)', 'var GRADE_BANDS', 'function visibleRegionsForScale(map, scale)', 'function applyMapTransform()'].forEach(function (sig) {
  ok(mapSrc.indexOf(sig) !== -1, sig + ' 在');
});

console.log('\nsmoke-formalmap-ui ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + P + '/' + (P + F));
process.exit(F === 0 ? 0 : 1);
