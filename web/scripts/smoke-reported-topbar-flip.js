#!/usr/bin/env node
'use strict';
/* smoke-reported-topbar-flip — 失真层S3a·顶栏民心/吏治掉头(拍板②标题直接换据奏)：
 * inactive=原真值零回归·active=标题/段位/墨点按朝廷视野·真值行与分部门真账从tooltip消失·
 * 已揭真=回显真值+对照。行为测试：从源抽出三函数带桩执行。 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-reported-topbar-flip');

const src = fs.readFileSync(path.join(ROOT, 'tm-topbar-vars.js'), 'utf8');
function slice(startMark, endMark) {
  const a = src.indexOf(startMark), b = src.indexOf(endMark, a + 1);
  if (a < 0 || b <= a) throw new Error('slice miss: ' + startMark);
  return src.slice(a, b);
}
const body = slice('function _barFlipToPerceived', 'function _renderHuangquan');
global.window = global;   // ★须在 require 前：引擎工厂 require 时取 window 作 global·否则 _gm() 读不到测试 GM
const RV = require('../tm-reported-view.js');

function run(gm, p) {
  const fns = new Function('GM', 'TM', 'P', 'Math', body + '\nreturn { minxin: _renderMinxin, lizhi: _renderLizhi };');
  return fns(gm, { ReportedView: RV }, p, Math);
}
const GM_BASE = {
  minxin: { trueIndex: 18, perceivedIndex: 72 },
  corruption: { trueIndex: 88, perceivedIndex: 30, subDepts: { central: { true: 90 }, military: { true: 85 } }, supervision: { level: 40 } }
};

// ── inactive：原行为零回归 ──
global.GM = JSON.parse(JSON.stringify(GM_BASE));
let r = run(global.GM, { conf: {} });
let mx = r.minxin(), lz = r.lizhi();
ok(mx.value === 18 && /真实民心/.test(JSON.stringify(mx.tip.rows)), '① inactive 民心标题=真值·tooltip 有真实民心行');
ok(lz.value === '●●●●' && /真实浊度/.test(JSON.stringify(lz.tip.rows)), '① inactive 吏治墨点按真浊度·有真实浊度行');

// ── active：掉头 ──
const P_ON = { conf: { gameMode: 'strict_hist', reportedViewEnabled: true } };
r = run(global.GM, P_ON);
mx = r.minxin(); lz = r.lizhi();
ok(mx.value === 72, '② active 民心标题=朝廷视野72(真值18消失)');
ok(mx.phase === 'peace' && /据奏/.test(mx.tip.phase), '② 段位按据奏值算(真值18揭竿在即·奏报72安居)·段名标据奏');
const mxRows = JSON.stringify(mx.tip.rows);
ok(!/真实民心/.test(mxRows) && !/"18/.test(mxRows) && /据奏民心/.test(mxRows), '② tooltip 真值行消失·换据奏行');
ok(lz.value === '○○○●', '② 吏治墨点按据奏浊度30(真88=●●●●消失)');
const lzRows = JSON.stringify(lz.tip.rows);
ok(!/真实浊度/.test(lzRows) && !/中央部门/.test(lzRows) && /据奏浊度/.test(lzRows) && /须遣厂卫/.test(lzRows), '② 分部门真账从tooltip消失·换核查提示');
ok(/监察力度/.test(lzRows), '② 监察力度(自家机构)保留');

// ── 揭真：回显真值 ──
global.GM.turn = 5; global.GM.sid = 's';
RV.reveal('minxin', 'index', 'test');
RV.reveal('corruption', 'index', 'test');
r = run(global.GM, P_ON);
mx = r.minxin(); lz = r.lizhi();
ok(mx.value === 18 && /真实民心/.test(JSON.stringify(mx.tip.rows)), '③ 已揭真 民心回显真值18+对照行');
ok(lz.value === '●●●●' && /真实浊度/.test(JSON.stringify(lz.tip.rows)), '③ 已揭真 吏治回显真浊度88');
global.GM.turn = 5 + RV.REVEAL_TTL + 1;
r = run(global.GM, P_ON);
ok(r.minxin().value === 72, '③ ttl 过重蒙尘 → 又回据奏');

console.log('\nsmoke-reported-topbar-flip ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
