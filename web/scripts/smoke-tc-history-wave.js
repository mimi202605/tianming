#!/usr/bin/env node
'use strict';
// smoke-tc-history-wave.js — 刀A2·修史族裸LLM口补时空约束·逐口源码断言
//
// 侦察确认：修史/编年类真 LLM 口（编年正史/本纪/月度纪事/史记四体/agent 深析）此前裸奔，
// 最易把真实历史结局写成本局既成事实（本局没杀魏忠贤·正史却书「魏氏伏诛」）。本刀逐口补
// _buildTemporalConstraint 时空约束（typeof 守卫 + try 包裹 + 一行注释）。
//
// 本 smoke 做纯源码断言（约束调用 / 守卫 / 注释 / full vs clauseOnly 正确 / 引用限定名正确 /
// 不适用口零注入），不依赖运行时。PASS = 退出码 0 且无行首 FAIL。
const fs = require('fs');
const path = require('path');

const WEB = path.join(__dirname, '..');
const R = (n) => fs.readFileSync(path.join(WEB, n), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function count(hay, needle) { return hay.split(needle).length - 1; }

const chronicle = R('tm-chronicle-system.js');
const core = R('tm-endturn-core.js');
const benji = R('tm-benji.js');
const depth = R('tm-endturn-agent-depth-tools.js');
const agent = R('tm-endturn-agent-mode.js');

// 各文件对 _buildTemporalConstraint 的引用限定名（依 IIFE 包裹约定）
const REF = {
  bare: "_buildTemporalConstraint",
  global: "global._buildTemporalConstraint",
  root: "root._buildTemporalConstraint",
};

// ─────────────────────────────────────────────────────────────
// 口1 · tm-chronicle-system.js:155 年度编年正史 · full(null,{})
// ─────────────────────────────────────────────────────────────
ok(chronicle.indexOf('时空约束·年度编年正史修史·full') !== -1, '口1 缺注释(年度编年正史·full)');
ok(chronicle.indexOf("if (typeof _buildTemporalConstraint === 'function')") !== -1, '口1 缺 typeof 守卫');
ok(chronicle.indexOf("prompt += '\\n' + _buildTemporalConstraint(null, {});") !== -1, '口1 缺 full 约束调用 prompt += _buildTemporalConstraint(null, {})');
ok(chronicle.indexOf('try {') !== -1 && chronicle.indexOf('catch (_)') !== -1, '口1 缺 try 包裹');
ok(count(chronicle, '_buildTemporalConstraint(') === 1, '口1 chronicle 约束调用应恰1处');
ok(chronicle.indexOf('clauseOnly') === -1, '口1 应为 full·chronicle 不应出现 clauseOnly');

// ─────────────────────────────────────────────────────────────
// 口2 · tm-endturn-core.js:486 月度纪事 · full(null,{})（裸口·独立 callAIMessages 不继承主 sysP）
// ─────────────────────────────────────────────────────────────
ok(core.indexOf('时空约束·月度纪事修史·full') !== -1, '口2 缺注释(月度纪事·full)');
ok(core.indexOf("_mPrompt += '\\n' + _buildTemporalConstraint(null, {});") !== -1, '口2 缺 full 约束调用 _mPrompt += _buildTemporalConstraint(null, {})');
ok(core.indexOf('独立callAIMessages不继承主sysP') !== -1, '口2 注释未标明裸口理由');
// 口7 hist_check(1011) 预期不适用：core 全文时空约束注释恰 1 处(仅月度纪事)
ok(count(core, '时空约束·') === 1, '口7 不适用核实：endturn-core 时空约束注释应恰1处(仅口2·hist_check 零注入)');

// ─────────────────────────────────────────────────────────────
// 口3 · tm-benji.js:96 本纪终局修史 · clauseOnly 裁剪版（global. 限定名）
// ─────────────────────────────────────────────────────────────
ok(benji.indexOf('时空约束·本纪终局修史·clauseOnly裁剪版') !== -1, '口3 缺注释(本纪·clauseOnly裁剪版)');
ok(benji.indexOf("if (typeof global._buildTemporalConstraint === 'function')") !== -1, '口3 缺 global. 限定 typeof 守卫');
ok(benji.indexOf("s += '\\n' + global._buildTemporalConstraint(null, { clauseOnly: true });") !== -1, '口3 缺 clauseOnly 约束调用 s += global._buildTemporalConstraint(null,{clauseOnly:true})');

// ─────────────────────────────────────────────────────────────
// 口4 · tm-endturn-agent-depth-tools.js _xinshi（clauseOnly·同注入 record/后人戏说两口）
// ─────────────────────────────────────────────────────────────
ok(depth.indexOf('时空约束·史记四体') !== -1, '口4 缺注释(史记四体)');
ok(depth.indexOf("_xinshi += '\\n' + root._buildTemporalConstraint(null, { clauseOnly: true });") !== -1, '口4 缺 _xinshi 约束追加(clauseOnly)');
// _xinshi 同时进入 record(_recMsgs user) 与 后人戏说(raw3 user)·验证两口都吃到 _xinshi
ok(count(depth, '+ _xinshi }]') >= 1 || count(depth, '_xinshi }') >= 2, '口4 _xinshi 应流入 record 与 后人戏说两口');

// ─────────────────────────────────────────────────────────────
// 口5 · depth-tools 十个深析工具 + 史记纲要 beats（均 clauseOnly·root. 限定名）
// ─────────────────────────────────────────────────────────────
const depthSysComments = [
  '时空约束·世界态势快照深析',
  '时空约束·人物内心深析',
  '时空约束·人物关系深析',
  '时空约束·记忆/脉络固化',
  '时空约束·人物书信深析',
  '时空约束·御案朝务深析',
  '时空约束·人物认知深析',
  '时空约束·势力/外交深析',
  '时空约束·财政经济深析',
  '时空约束·军事边防深析',
];
depthSysComments.forEach(function (c) {
  ok(depth.indexOf(c) !== -1, '口5 缺注释: ' + c);
});
// 十个深析工具 sys += clauseOnly·恰 10 处
ok(count(depth, "sys += '\\n' + root._buildTemporalConstraint(null, { clauseOnly: true });") === 10,
  '口5 十个深析 sys += clauseOnly 应恰10处·实=' + count(depth, "sys += '\\n' + root._buildTemporalConstraint(null, { clauseOnly: true });"));
// 史记纲要 beats：_tcBeats 追加进 user 内容
ok(depth.indexOf('时空约束·史记纲要脉络') !== -1, '口5 缺注释(史记纲要脉络)');
ok(depth.indexOf("_tcBeats = '\\n' + root._buildTemporalConstraint(null, { clauseOnly: true });") !== -1, '口5 缺 _tcBeats clauseOnly 赋值');
ok(depth.indexOf("+ _tcBeats }], 900") !== -1, '口5 _tcBeats 未穿进 beats user 内容');
// depth 全为 clauseOnly·不应出现 full 形态 (null, {})
ok(depth.indexOf('_buildTemporalConstraint(null, {})') === -1, '口4/5 depth 应全 clauseOnly·不应出现 full(null,{})');

// ─────────────────────────────────────────────────────────────
// 口6 · tm-endturn-agent-mode.js 128 质量审读 + 138 据审读修订史记（clauseOnly·root.）
// ─────────────────────────────────────────────────────────────
ok(agent.indexOf('时空约束·史记质量审读·clauseOnly') !== -1, '口6-128 缺注释(质量审读)');
ok(agent.indexOf("sys += '\\n' + root._buildTemporalConstraint(null, { clauseOnly: true });") !== -1, '口6-128 缺 sys += clauseOnly');
ok(agent.indexOf('时空约束·据审读修订史记正文·clauseOnly') !== -1, '口6-138 缺注释(据审读修订史记)');
ok(agent.indexOf("fixSys += '\\n' + root._buildTemporalConstraint(null, { clauseOnly: true });") !== -1, '口6-138 缺 fixSys += clauseOnly');
// 口6-177(anomaly) + 口6-490(scaffold·继承 ctx.prompt.sysP) 预期不适用：agent 全文时空约束注释恰 2 处
ok(count(agent, '时空约束·') === 2, '口6 不适用核实：agent-mode 时空约束注释应恰2处(128/138)·177/490 零注入');
// 490 不适用取证：仍靠 situation = p.sysP + p.tp 继承主 sysP（主 sysP 已在 tm-endturn-prompt.js 注入 full 约束）
ok(agent.indexOf("var situation = (String(p.sysP || '') + '\\n' + String(p.tp || ''))") !== -1, '口6-490 应仍继承 ctx.prompt.sysP(不适用取证)');

// ─────────────────────────────────────────────────────────────
console.log('---');
console.log('断言总数 ' + (pass + fail) + '·PASS ' + pass + '·FAIL ' + fail);
if (fail > 0) { console.log('FAIL: smoke-tc-history-wave 有 ' + fail + ' 条断言未过'); process.exit(1); }
console.log('smoke-tc-history-wave PASS');
