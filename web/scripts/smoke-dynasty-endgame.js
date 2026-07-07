#!/usr/bin/env node
'use strict';
/* smoke-dynasty-endgame — 亡国终局接线（2026-07-02）
 * 背景：GM._gameOver（民变5级改朝 tm-authority-complete / 权臣篡位）与 GM._gameOverPending（起义颠覆 tm-endturn-apply）
 * 历史上只写不读（王朝亡不了国）。本刀在 endTurn 尾部消费信号 → 复用 _showEndgameScreen('defeat') 弹「天命已绝」。
 * 本 smoke：①从 tm-endturn-helpers.js 提取 _consumeDynastyEndSignal 真函数逐用例验 ②源码契约验 endturn-core 接线与写入点仍在。
 */
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');

let A = 0, F = 0;
function ok(cond, msg) { if (cond) { A++; console.log('  ✓ ' + msg); } else { F++; console.log('  ✗ ' + msg); } }

// ── 提取真函数（花括号计数） ──
const helpersSrc = fs.readFileSync(path.join(W, 'tm-endturn-helpers.js'), 'utf8');
const fnStart = helpersSrc.indexOf('function _consumeDynastyEndSignal()');
ok(fnStart > 0, 'tm-endturn-helpers.js 含 _consumeDynastyEndSignal 定义');
let depth = 0, fnEnd = -1;
for (let i = helpersSrc.indexOf('{', fnStart); i < helpersSrc.length; i++) {
  if (helpersSrc[i] === '{') depth++;
  else if (helpersSrc[i] === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
}
ok(fnEnd > fnStart, '函数体提取成功');
const fnSrc = helpersSrc.slice(fnStart, fnEnd);

// 沙箱：注入 GM 全局后 eval 出真函数
function makeFn(gm) {
  global.GM = gm;
  return (0, eval)('(' + fnSrc + ')');
}

// ① 新鲜 dynasty_change（民变5级·turn=当前）→ 返回败因对象并标 _shown
let gm = { turn: 20, _gameOver: { type: 'dynasty_change', revolt: 'r1', turn: 20 } };
let fn = makeFn(gm);
let r = fn();
ok(!!r && r._dynastyEnd === true, '① 新鲜民变改朝信号 → 返回败因对象');
ok(r && r.title.indexOf('改朝换代') >= 0, '① 标题含「改朝换代」');
ok(gm._gameOver._shown === true, '① 信号被标 _shown');

// ② 幂等：再调一次 → null（防跨回合重复弹屏）
ok(fn() === null, '② 已 _shown 信号不再触发（幂等）');

// ③ 陈年信号（老存档护栏）→ null 且标 _stale
gm = { turn: 50, _gameOver: { type: 'dynasty_change', turn: 30 } };
fn = makeFn(gm);
ok(fn() === null, '③ 陈年信号(turn=30@回合50)不爆');
ok(gm._gameOver._stale === true, '③ 陈年信号被标 _stale 留档');

// ④ turn-1 边界：上回合写入的信号仍算新鲜
gm = { turn: 21, _gameOver: { type: 'dynasty_change', turn: 20 } };
fn = makeFn(gm);
ok(fn() !== null, '④ 上回合信号(turn-1)仍触发');

// ⑤ _gameOverPending 无 turn 字段（apply 写入时未记）→ 视为新事·用 narrative
gm = { turn: 33, _gameOverPending: { reason: 'dynasty_replaced_by_revolt', revoltId: 'r2', newDynasty: '大顺', narrative: '闯军入京，社稷易主。' } };
fn = makeFn(gm);
r = fn();
ok(!!r && r.title.indexOf('鼎革') >= 0, '⑤ 起义颠覆 → 标题含「鼎革」');
ok(r && r.description === '闯军入京，社稷易主。', '⑤ 败因用 AI narrative 原文');

// ⑥ 权臣篡位 → 标题含「篡位」·desc 带其名
gm = { turn: 12, _gameOver: { type: 'usurped_by_power_minister', name: '某相', turn: 12 } };
fn = makeFn(gm);
r = fn();
ok(!!r && r.title.indexOf('篡位') >= 0 && r.description.indexOf('某相') >= 0, '⑥ 权臣篡位标题/败因正确');

// ⑦ 陈年 _gameOver + 新鲜 _gameOverPending 并存 → 跳过陈年取新鲜
gm = { turn: 60, _gameOver: { type: 'dynasty_change', turn: 10 }, _gameOverPending: { reason: 'dynasty_replaced_by_revolt', narrative: 'x' } };
fn = makeFn(gm);
r = fn();
ok(!!r && r._signal === 'dynasty_replaced_by_revolt', '⑦ 陈年跳过·新鲜 pending 触发');
ok(gm._gameOver._stale === true && gm._gameOverPending._shown === true, '⑦ 双信号各得其标');

// ⑧ 未知类型 → 通用「天命已移」兜底
gm = { turn: 5, _gameOver: { type: 'weird_future_type', turn: 5 } };
fn = makeFn(gm);
r = fn();
ok(!!r && r.title === '天命已移', '⑧ 未知类型走通用兜底');

// ⑨ 无信号 → null
gm = { turn: 8 };
fn = makeFn(gm);
ok(fn() === null, '⑨ 无信号返回 null');

// ── 源码契约 ──
const coreSrc = fs.readFileSync(path.join(W, 'tm-endturn-core.js'), 'utf8');
ok(coreSrc.indexOf('_consumeDynastyEndSignal') >= 0, '⑩ endturn-core 已接消费点');
ok(/_showEndgameScreen\('defeat',\s*_dynEnd\)/.test(coreSrc), '⑩ 消费点复用 _showEndgameScreen(defeat)');
const authSrc = fs.readFileSync(path.join(W, 'tm-authority-complete.js'), 'utf8');
ok(authSrc.indexOf("type: 'dynasty_change', revolt: r.id") >= 0, '⑪ 民变5级写入点仍在(authority-complete·第七轮起多行带真亡因字段)');
ok(authSrc.indexOf('G._playerDeposed = {') >= 0 && authSrc.indexOf("type: 'usurped_by_power_minister'") < 0, '⑪ 权臣篡位已反转失位态(鼎革R1d·终局信号退役·消费分支留旧档兼容)');
const applySrc = fs.readFileSync(path.join(W, 'tm-endturn-apply.js'), 'utf8');
ok(applySrc.indexOf("_gameOverPending = { reason: 'dynasty_replaced_by_revolt'") >= 0, '⑪ 起义颠覆写入点仍在(endturn-apply)');

console.log('\n' + (F === 0 ? 'ALL PASS' : 'FAIL') + ' (' + A + ' pass / ' + F + ' fail)');
process.exit(F === 0 ? 0 : 1);
