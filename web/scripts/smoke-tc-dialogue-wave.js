#!/usr/bin/env node
// scripts/smoke-tc-dialogue-wave.js
// 刀A1·对话/人物族裸 LLM 口补时空约束 —— 逐口源码断言(2026-07-19)
//
// 背景：平行历史时空约束体系(tm-ai-infra.js: _buildTemporalConstraint / _tcScanMentionedNames)已铺九口·
//   本刀补齐对话/人物族仍裸奔的真 LLM 口。本 smoke 仿 smoke-temporal-constraint.js 的 SliceB 手法：
//   源码 grep + 每口窗口内断言(约束调用存在 / typeof 守卫 / 扫描源注释 / clauseOnly 正确使用 / mentionedNames 真传递)。
//   不真调 LLM。
//
// 判定分布(与最终汇报一致)：
//   full  口：tm-chaoyi.js(廷议/御前插话响应) · tm-wendui-prison.js(狱中对话) ·
//             tm-char-autogen.js(在局人物 bio 生成·ch=null) · tm-char-arcs.js(命运弧·批量 ch=null)
//   clauseOnly 口：tm-wendui.js(承诺抽取 JSON) · tm-npc-decision-ai-driven.js(NPC 决策 JSON 数组) ·
//                  tm-office-system.js(角色具象化短 JSON·无涉议名单) · tm-hongyan-edict-ui.js(诏书润色自由文本)
//   不适用(不注入·本 smoke 反向断言其未被误注)：tm-mechanics-world.js:246/620/1027(郡望名/后宫位份/变量映射·纯 schema 无时空叙述面) ·
//                  tm-reflection-agent.js(未接线+默认关·元认知偏差 JSON)

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let PASS = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } PASS++; }

function readSrc(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
// 解 \uXXXX 转义→字符(部分文件把中文注释存为 \u 转义·与其字节风格一致)·令中文注释断言对编码不敏感
function decodeU(s) { return s.replace(/\\u([0-9a-fA-F]{4})/g, function(_, h){ return String.fromCharCode(parseInt(h, 16)); }); }

// 在源码里定位 marker·取其前后窗口(默认 ±600 字)·窗口内跑断言(避免撞同文件他处 _buildTemporalConstraint 调用)
function windowAround(src, marker, span) {
  span = span || 600;
  const i = src.indexOf(marker);
  if (i < 0) return null;
  return src.slice(Math.max(0, i - span), i + span);
}

const guardRe = /typeof\s+(?:global\.)?_buildTemporalConstraint\s*===\s*'function'/;
const callRe  = /(?:global\.)?_buildTemporalConstraint\s*\(/;

// ── Slice 0：infra 助手仍在(体系前提) ──
function slice0_infra() {
  const start = PASS;
  const infra = readSrc('tm-ai-infra.js');
  assert(/function _buildTemporalConstraint\s*\(ch, opts\)/.test(infra), 'tm-ai-infra.js 须定义 _buildTemporalConstraint(ch, opts)');
  assert(/function _tcScanMentionedNames\s*\(/.test(infra), 'tm-ai-infra.js 须定义 _tcScanMentionedNames 供各口复用');
  console.log('  [slice0-infra] ' + (PASS - start) + ' 断言通过');
}

// ── Slice 1：full 口(带在世/已故名单)。窗口内：守卫+调用+扫描源注释+mentionedNames·且不带 clauseOnly ──
function slice1_full() {
  const start = PASS;
  const fulls = [
    { f: 'tm-chaoyi.js',       marker: '_ciMentioned', note: '廷议/御前玩家插话响应器·扫描 txt+opts.topic·响应者 nm 种子',
      scanChk: /_tcScanMentionedNames\([\s\S]{0,80}\[nm\]/ },
    { f: 'tm-wendui-prison.js', marker: '_wpMentioned', note: '狱中对话·扫描玩家问话 freeText·囚犯 charName 种子·global. 前缀',
      scanChk: /global\._tcScanMentionedNames\([\s\S]{0,80}\[charName\]/, needGlobal: true },
    { f: 'tm-char-autogen.js',  marker: '_cgMentioned', note: '在局人物 bio 生成·ch=null·扫描 sourceContext+reason·种子空(生成对象未入 GM)',
      scanChk: /_tcScanMentionedNames\(_cgScan,\s*\[\]/, nullCh: true },
    { f: 'tm-char-arcs.js',     marker: '_arcMentioned', note: '命运弧叙事·批量 ch=null·种子=keyChars 名',
      scanChk: /keyChars\.map/, nullCh: true }
  ];
  fulls.forEach(function(it) {
    const src = readSrc(it.f);
    const w = windowAround(src, it.marker);
    assert(!!w, it.f + '·未找到注入 marker ' + it.marker + '（' + it.note + '）');
    assert(guardRe.test(w), it.f + '·须 typeof 守卫（' + it.note + '）');
    assert(callRe.test(w), it.f + '·须调用 _buildTemporalConstraint（' + it.note + '）');
    assert(/扫描源/.test(decodeU(w)), it.f + '·须一行注释说明扫描源（' + it.note + '）');
    assert(it.scanChk.test(w.replace(/\s+/g, ' ')) || it.scanChk.test(w), it.f + '·须真传递涉议 mentionedNames（' + it.note + '）');
    assert(/mentionedNames/.test(w), it.f + '·调用须带 mentionedNames（' + it.note + '）');
    // full 口：本注入窗口不得出现 clauseOnly(否则退化成条款版·丢了名单价值)
    assert(!/clauseOnly/.test(w), it.f + '·full 口不应带 clauseOnly（' + it.note + '）');
    if (it.needGlobal) assert(/global\._buildTemporalConstraint\s*\(/.test(w), it.f + '·IIFE 模块须用 global. 前缀调用（' + it.note + '）');
    if (it.nullCh) assert(/_buildTemporalConstraint\(null,/.test(w), it.f + '·批量/未入册口 ch 须传 null（' + it.note + '）');
  });
  console.log('  [slice1-full] ' + (PASS - start) + ' 断言通过（4 个 full 口）');
}

// ── Slice 2：clauseOnly 口(JSON 结构化 / 自由公文)。窗口内：守卫+调用+clauseOnly:true ──
function slice2_clauseOnly() {
  const start = PASS;
  const clauses = [
    { f: 'tm-wendui.js',                 marker: '_wcMentioned', note: '承诺抽取 JSON·扫描 dialog·targetName 种子·防 relays 第三方漏抽', hasScan: true },
    { f: 'tm-npc-decision-ai-driven.js', marker: '_ndMentioned', note: 'NPC 决策 JSON 数组·涉议=本批 npcs 名', hasScan: false, mentionChk: /npcs[\s\S]{0,80}map/ },
    { f: 'tm-hongyan-edict-ui.js',       marker: '_edMentioned', note: '诏书润色自由文本·扫描玩家草拟 parts.content', hasScan: true, scanChk: /parts[\s\S]{0,60}map/ }
  ];
  clauses.forEach(function(it) {
    const src = readSrc(it.f);
    const w = windowAround(src, it.marker);
    assert(!!w, it.f + '·未找到注入 marker ' + it.marker + '（' + it.note + '）');
    assert(guardRe.test(w), it.f + '·须 typeof 守卫（' + it.note + '）');
    assert(callRe.test(w), it.f + '·须调用 _buildTemporalConstraint（' + it.note + '）');
    assert(/扫描源|涉议/.test(decodeU(w)), it.f + '·须一行注释说明名单来源(扫描源/涉议)（' + it.note + '）');
    assert(/clauseOnly\s*:\s*true/.test(w.replace(/\s+/g, ' ')), it.f + '·JSON/公文口须用 clauseOnly:true 防大名单干扰结构（' + it.note + '）');
    assert(/mentionedNames/.test(w), it.f + '·须带 mentionedNames 逐人标生死（' + it.note + '）');
    if (it.mentionChk) assert(it.mentionChk.test(w.replace(/\s+/g, ' ')), it.f + '·涉议名单须由真数据推导（' + it.note + '）');
    if (it.scanChk) assert(it.scanChk.test(w.replace(/\s+/g, ' ')), it.f + '·扫描源须由真文本推导（' + it.note + '）');
  });
  console.log('  [slice2-clauseOnly] ' + (PASS - start) + ' 断言通过（3 个 clauseOnly 口）');
}

// ── Slice 3：tm-office-system.js 角色具象化短 JSON·clauseOnly 但无涉议名单(新任职者未入 GM) ──
function slice3_officeMaterialize() {
  const start = PASS;
  const src = readSrc('tm-office-system.js');
  const w = windowAround(src, '_offTcE', 500);
  assert(!!w, 'tm-office-system.js·未找到注入 marker _offTcE');
  assert(guardRe.test(w), 'tm-office-system.js·须 typeof 守卫');
  assert(/clauseOnly\s*:\s*true/.test(w.replace(/\s+/g, ' ')), 'tm-office-system.js·短 JSON 具象化口须 clauseOnly:true');
  assert(/扫描源|无涉议名单/.test(decodeU(w)), 'tm-office-system.js·须注释说明(无涉议名单·新任职者未入 GM)');
  // 无 mentionedNames(本口不扫描·只挂总纲铁律)
  assert(!/mentionedNames/.test(w), 'tm-office-system.js·新任职者未入 GM·本口不应硬造 mentionedNames');
  console.log('  [slice3-officeMaterialize] ' + (PASS - start) + ' 断言通过（1 口·clauseOnly 无名单）');
}

// ── Slice 4：不适用口反向断言——确未被误注约束(避免后人误改) ──
function slice4_notApplicable() {
  const start = PASS;
  // 世界机制三口·纯 schema/映射·无时空叙述面→不注入
  const mw = readSrc('tm-mechanics-world.js');
  assert(!callRe.test(mw), 'tm-mechanics-world.js·三口(郡望名/后宫位份/变量映射)为纯 schema·不应注入时空约束（不适用）');
  // 反思 agent·未接线+默认关+元认知偏差 JSON→不注入
  const ref = readSrc('tm-reflection-agent.js');
  assert(!callRe.test(ref), 'tm-reflection-agent.js·未接线+默认关·元认知偏差口·不应注入时空约束（不适用）');
  console.log('  [slice4-notApplicable] ' + (PASS - start) + ' 断言通过（不适用口未被误注）');
}

slice0_infra();
slice1_full();
slice2_clauseOnly();
slice3_officeMaterialize();
slice4_notApplicable();
console.log('PASS smoke-tc-dialogue-wave · 共 ' + PASS + ' 断言（8 注入口 + 5 不适用点 + infra 前提）');
