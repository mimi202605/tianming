#!/usr/bin/env node
'use strict';
/* smoke-reported-fiscal-wiring — 失真层S2·财政域接线契约：
 * 三面(顶栏帑廪/右rail财计/帑廪panel)同键名接 TM.ReportedView·方向正确(库藏岁入good/岁支bad)·
 * 内帑永真值不套·未开失真层=真值直通(inactive兜底在各面helper)·据奏口径标注在场。 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-reported-fiscal-wiring');

const topbar = fs.readFileSync(path.join(ROOT, 'tm-topbar-vars.js'), 'utf8');
const rail = fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8');
const panel = fs.readFileSync(path.join(ROOT, 'tm-guoku-panel.js'), 'utf8');

// ── 三面都接引擎·带 inactive 直通兜底 ──
[['顶栏', topbar, '_barReported'], ['右rail', rail, 'rightFiscalReported'], ['帑廪panel', panel, '_gkReported']].forEach(function (t) {
  ok(new RegExp('function ' + t[2] + '\\(').test(t[1]) && /ReportedView/.test(t[1]), '① ' + t[0] + ' 接 TM.ReportedView(' + t[2] + ')');
  ok(new RegExp(t[2] + '[\\s\\S]{0,220}?RV\\.active').test(t[1]) && new RegExp(t[2] + '[\\s\\S]{0,260}?shown: val, distorted: false').test(t[1]), '① ' + t[0] + ' 未开失真层=真值直通兜底');
});

// ── 键名三面同一(穿帮雷·同量必同键) ──
['guoku.money', 'guoku.grain', 'guoku.cloth', 'fiscal.turnIncome', 'fiscal.turnExpense'].forEach(function (k) {
  ok(topbar.indexOf("'" + k + "'") >= 0 && rail.indexOf("'" + k + "'") >= 0 && panel.indexOf("'" + k + "'") >= 0, '② 键 ' + k + ' 三面同名');
});
ok(topbar.indexOf("'fiscal.annualIncome'") >= 0 && panel.indexOf("'fiscal.annualIncome'") >= 0, '② 键 fiscal.annualIncome 顶栏/panel 同名');

// ── 方向正确：库藏/岁入报多(good)·岁支报少(bad) ──
[['顶栏', topbar], ['右rail', rail], ['帑廪panel', panel]].forEach(function (t) {
  ok(new RegExp("'guoku\\.money'[^\\n]*'good'").test(t[1]), '③ ' + t[0] + ' 库藏银 direction=good(账面报多)');
  ok(new RegExp("'fiscal\\.turnExpense'[^\\n]*'bad'").test(t[1]), '③ ' + t[0] + ' 岁支 direction=bad(报少显节用)');
});

// ── 内帑永真值：neitang 不套据奏 ──
ok(!/_barReported\('neitang/.test(topbar) && !/rightFiscalReported\('neitang/.test(rail) && !/_gkReported\('neitang/.test(panel), '④ 内帑(皇帝私账)三面均不套据奏');

// ── 据奏口径标注在场 ──
ok(/据奏\(有司上报口径·实情须核\)/.test(topbar), '⑤ 顶栏 tooltip 副题标注据奏');
ok(/ReportedView\.badge/.test(rail) && /ReportedView\.badge/.test(panel), '⑤ 右rail/panel 配据奏徽');

// ── 行为兜底：无 TM.ReportedView 环境下 helper 直通(rail 面全局函数域·node 直载最重的一面验) ──
global.window = global; global.P = { conf: {} }; global.GM = {};
delete global.TM;
const railHelper = new Function('window', 'TM', 'P', rail.match(/function rightFiscalReported\(key, val, dir\)\{[\s\S]*?\n  \}/)[0] + '; return rightFiscalReported;')(global, undefined, global.P);
const rr = railHelper('guoku.money', 12345, 'good');
ok(rr.shown === 12345 && rr.distorted === false, '⑥ 引擎缺席 → 直通真值不崩');

console.log('\nsmoke-reported-fiscal-wiring ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
