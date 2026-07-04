#!/usr/bin/env node
'use strict';
// smoke-keju-hl-default-on — 科举 H/L5-L12 成熟内容默认开(二梯·照特科 !== false 范式)
//   抽真返回值型 gate(_isHEnabled/_isL11/_isL12/_isL7)实跑:默认开/显式关/无conf防御
//   + 源契约:早返回守卫(L5/L6/L8/L9/L10)极性翻正(=== false)·旧 opt-in(!== true)已清
//   + L7 跨文件一致(apply/memorial/rollback 全 !== false)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

function sliceFn(src, marker) {
  const a = src.indexOf(marker); if (a < 0) return null;
  let i = src.indexOf('{', a), depth = 0, j = i;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { j++; break; } } }
  return src.slice(a, j);
}
function gate(file, marker, flag, label) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const fnSrc = sliceFn(src, marker);
  ok(!!fnSrc, label + ' 抽取成功(' + file + ')');
  const fnName = marker.replace('function ', '').replace('() {', '');
  function run(P) { const ctx = { P: P }; vm.createContext(ctx); vm.runInContext(fnSrc + '\nthis.__r = ' + fnName + '();', ctx); return ctx.__r; }
  ok(run({ conf: {} }) === true, label + ' 默认(flag 缺)→ 开');
  const off = {}; off[flag] = false;
  ok(run({ conf: off }) === false, label + ' 显式 false → 关(玩家可关)');
  const on = {}; on[flag] = true;
  ok(run({ conf: on }) === true, label + ' 显式 true → 开');
  ok(run({}) === false, label + ' 无 P.conf → 关(防御守卫保留)');
}

console.log('smoke-keju-hl-default-on');

// ── 返回值型 gate 实跑 ──
gate('tm-keju-school-network.js', 'function _isHEnabled() {', 'useNewKejuH', 'H 书院网络');
gate('tm-keju-reform-rollback.js', 'function _isL11Enabled() {', 'useNewKejuL11', 'L11 变法废止');
gate('tm-keju-reformer-bio.js', 'function _isL12Enabled() {', 'useNewKejuL12', 'L12 改革者列传');

// ── L7 跨文件一致(apply/memorial/rollback 全 !== false·治同名 flag 默认值不一致) ──
['tm-keju-reform-apply.js', 'tm-keju-reform-memorial.js', 'tm-keju-reform-rollback.js'].forEach(function (f) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok(/useNewKejuL7 !== false/.test(s), f + ' L7 走 !== false(默认开)');
  ok(!/useNewKejuL7 === true/.test(s), f + ' L7 旧 === true 已清(一致化)');
});

// ── 源契约:早返回守卫极性翻正(=== false 替 !== true) ──
function guardFlipped(file, flag, sample) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8');
  ok(s.indexOf('useNewKeju' + flag + ' === false') >= 0, file + ' ' + flag + ' 守卫翻为 === false(默认开)');
  ok(s.indexOf('useNewKeju' + flag + ' !== true') < 0, file + ' ' + flag + ' 旧 !== true 守卫已清');
}
guardFlipped('tm-keju-reform-llm.js', 'L5');
guardFlipped('tm-keju-reform-evolution.js', 'L8'); // 含 ×3
guardFlipped('tm-keju-reform-evolution.js', 'L9'); // 含 ×2
// 2026-07-04 立项拆分：L10/L6/L5 守卫随§4渲染族迁入 tm-keju-paradigm-panel-render.js·断言跟人走
guardFlipped('tm-keju-paradigm-panel-render.js', 'L10');
guardFlipped('tm-keju-paradigm-panel-render.js', 'L6');
// paradigm-panel L8 守卫(!== true → === false 翻正·L8 段留守 origin)
{
  const s = fs.readFileSync(path.join(ROOT, 'tm-keju-paradigm-panel.js'), 'utf8');
  ok(s.indexOf('useNewKejuL8 === false) {') >= 0, 'paradigm-panel L8 守卫翻 === false');
  ok(s.indexOf('useNewKejuL8 !== true)') < 0, 'paradigm-panel L8 旧 !== true 已清');
  // L5 l5Off 取反翻正(在渲染族)
  const r = fs.readFileSync(path.join(ROOT, 'tm-keju-paradigm-panel-render.js'), 'utf8');
  ok(r.indexOf('useNewKejuL5 === false)') >= 0 && r.indexOf('useNewKejuL5 === true)') < 0, 'paradigm-panel L5 l5Off 翻 === false');
}

// ── L8/L9 节流确证(默认开安全·同年只1次 cooldown) ──
{
  const ev = fs.readFileSync(path.join(ROOT, 'tm-keju-reform-evolution.js'), 'utf8');
  ok(/_lastEvolveYear/.test(ev) && /cooldown/i.test(ev), 'L8/L9 内置同年 cooldown(默认开不刷屏)');
}
// ── H 节流确证(讲会每5年+5%) + 设置开关同步默认开 ──
{
  const h = fs.readFileSync(path.join(ROOT, 'tm-keju-school-network.js'), 'utf8');
  ok(/每 5 年|5%|0\.05/.test(h), 'H 讲会内置节流(每5年+5%·默认开不刷屏)');
  const pat = (fs.readFileSync(path.join(ROOT, 'tm-patches.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-patches-start.js'), 'utf8'));
  ok(/useNewKejuH !== false/.test(pat) && /默认开/.test(pat), 'H 设置开关同步默认开(!== false·复选框默认勾)');
}

console.log('\n结果: ' + A + ' 通过 / 0 失败');
