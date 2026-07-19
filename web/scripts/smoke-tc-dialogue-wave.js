#!/usr/bin/env node
// scripts/smoke-tc-dialogue-wave.js
// 刀A1·对话/人物族裸 LLM 口补时空约束 —— 逐口源码 grep + 行为锁断言(2026-07-19·Codex 复审返工版)
//
// 背景：平行历史时空约束体系(tm-ai-infra.js: _buildTemporalConstraint / _tcScanMentionedNames)已铺九口·
//   本刀补齐对话/人物族仍裸奔的真 LLM 口。本 smoke 仿 smoke-temporal-constraint.js 的 SliceB 手法：
//   slice1-4=源码 grep(窗口内断言约束调用/typeof 守卫/扫描源注释/clauseOnly 正确使用/mentionedNames 真传递)·
//   slice5=行为锁(抽出真注入块喂 sentinel 实跑·守卫改 if(false)/删扫描/换 ch 任一都变红)。不真调 LLM。
//
// 判定分布(与最终汇报一致·共 9 注入口)：
//   full  口：tm-chaoyi.js(廷议/御前插话响应) · tm-wendui-prison.js(狱中对话) ·
//             tm-char-autogen.js(在局人物 bio 生成·ch=null) · tm-char-arcs.js(命运弧·批量 ch=null)
//   clauseOnly 口：tm-wendui.js(承诺抽取 JSON) · tm-npc-decision-ai-driven.js(NPC 决策 JSON 数组) ·
//                  tm-office-system.js(角色具象化短 JSON·无涉议名单) · tm-hongyan-edict-ui.js(诏书润色自由文本) ·
//                  tm-reflection-agent.js(反思偏差画像·经 formatBiasForSc0 反哺 sc0 主推演·Codex 复审证伪原"不适用"判定)
//   不适用(不注入·本 smoke 反向断言其未被误注)：tm-mechanics-world.js:246/620/1027(郡望名/后宫位份/变量映射·纯 schema 无时空叙述面)

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
  // 每口必带 mentionChk 或 scanChk(名单/扫描源真数据来源断言)·消费 bug 修复：不再留只声明不消费的 hasScan 死旗(否则删扫描/换空名单仍绿)
  const clauses = [
    { f: 'tm-wendui.js',                 marker: '_wcMentioned', note: '承诺抽取 JSON·扫描 dialog·targetName 种子·防 relays 第三方漏抽',
      scanChk: /_tcScanMentionedNames\(String\(dialog/ },
    { f: 'tm-npc-decision-ai-driven.js', marker: '_ndMentioned', note: 'NPC 决策 JSON 数组·涉议=本批 npcs 名',
      mentionChk: /npcs[\s\S]{0,80}map/ },
    { f: 'tm-hongyan-edict-ui.js',       marker: '_edMentioned', note: '诏书润色自由文本·扫描玩家草拟 parts.content',
      scanChk: /parts[\s\S]{0,60}map/ },
    { f: 'tm-reflection-agent.js',       marker: '_raMentioned', note: '反思偏差画像(经 formatBiasForSc0 反哺 sc0 主推演)·扫描 lastPred+actual 人名·global. 前缀',
      scanChk: /global\._tcScanMentionedNames\(_raScan/, needGlobal: true }
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
    // 每口都必须有一个真数据来源断言(mentionChk 或 scanChk)·杜绝只声明不消费的死旗
    assert(!!(it.mentionChk || it.scanChk), it.f + '·smoke 配置须给出 mentionChk/scanChk（防死旗假绿·' + it.note + '）');
    if (it.mentionChk) assert(it.mentionChk.test(w.replace(/\s+/g, ' ')), it.f + '·涉议名单须由真数据推导（' + it.note + '）');
    if (it.scanChk) assert(it.scanChk.test(w.replace(/\s+/g, ' ')), it.f + '·扫描源须由真文本推导（删扫描则红·' + it.note + '）');
    if (it.needGlobal) assert(/global\._buildTemporalConstraint\s*\(/.test(w), it.f + '·IIFE 模块须用 global. 前缀调用（' + it.note + '）');
  });
  console.log('  [slice2-clauseOnly] ' + (PASS - start) + ' 断言通过（4 个 clauseOnly 口·含 reflection-agent）');
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
//   注：tm-reflection-agent.js 原判"不适用"经 Codex 复审证伪(它是活口·post-turn-jobs:443 每三回合调 run·
//   endturn-agent-mode:1038 也调·endturn-ai:1260 把偏差画像注入 sc0 反哺主推演)·已改判 clauseOnly·移入 slice2。
function slice4_notApplicable() {
  const start = PASS;
  // 世界机制三口·纯 schema/映射·无时空叙述面(郡望名 timeline 不变/后宫位份是制度 schema/变量映射无人物)→不注入
  const mw = readSrc('tm-mechanics-world.js');
  assert(!callRe.test(mw), 'tm-mechanics-world.js·三口(郡望名/后宫位份/变量映射)为纯 schema·不应注入时空约束（不适用）');
  console.log('  [slice4-notApplicable] ' + (PASS - start) + ' 断言通过（mechanics-world 三口未被误注）');
}

// ── Slice 5：行为级断言(不是源码 grep 假绿)——从源码抽出真注入 if 块·喂 sentinel 版
//   _buildTemporalConstraint/_tcScanMentionedNames 实跑·断言"守卫改 if(false)/删扫描/换 ch"任一都会变红。
//   sentinel 返回可识别标记串(含 ch 值与 mentionedNames)·扫描 sentinel 命中"魏忠贤"即回填名单。
//   chaoyi 口的行为断言在 smoke-chaoyi-interject-respond.js(真跑 _cyInterjectRespond·锁每 responder 的 prompt)。

// 抽出含 markerVar 的那个 if(typeof ... _buildTemporalConstraint ...) { ... } 完整块(花括号配平)
function extractGuardBlock(src, markerVar) {
  const mi = src.indexOf(markerVar);
  if (mi < 0) return null;
  const gi = src.lastIndexOf('if (typeof', mi);
  if (gi < 0) return null;
  let i = src.indexOf('{', gi);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(gi, j + 1); }
  }
  return null;
}
// sentinel TC·把 ch 值与 mentionedNames 编进可识别标记
function sentinelTC(ch, opts) {
  return '<<TC ch=' + (ch === null ? 'null' : (ch && ch.name) || '?') +
    ' clause=' + !!(opts && opts.clauseOnly) +
    ' mn=[' + (((opts && opts.mentionedNames) || []).join('|')) + ']>>';
}
// sentinel 扫描·种子恒留·文本命中"魏忠贤"则回填(用于验"删扫描"会红)
function sentinelScan(text, seeds, cap) {
  const out = (seeds || []).slice();
  if (String(text || '').indexOf('魏忠贤') >= 0 && out.indexOf('魏忠贤') < 0) out.push('魏忠贤');
  return out;
}

function slice5_behavior() {
  const start = PASS;

  // (a) 狱中对话 tm-wendui-prison.js·full·ch=囚犯·扫描 freeText。块用 global. 前缀·free vars: global/freeText/charName/ch/sysP
  {
    const src = readSrc('tm-wendui-prison.js');
    const block = extractGuardBlock(src, '_wpMentioned');
    assert(!!block && block.indexOf('_wpMentioned') >= 0, 'prison·未能抽出注入块');
    const fn = new Function('global', 'freeText', 'charName', 'ch', 'sysP', block + '\n; return sysP;');
    const g = { _buildTemporalConstraint: sentinelTC, _tcScanMentionedNames: sentinelScan };
    const out = fn(g, '魏忠贤近来如何？', '客氏', { name: '客氏' }, 'BASE_SYSP');
    assert(out.indexOf('BASE_SYSP') === 0, 'prison·须 append 到 sysP(不替换)');
    assert(out.indexOf('<<TC ch=客氏') >= 0, 'prison·须以 ch=囚犯(客氏)调用约束(换 ch 则红)');
    assert(out.indexOf('魏忠贤') >= 0, 'prison·freeText 里的人名须经扫描进 mentionedNames(删扫描则红)');
    assert(out.indexOf('clause=false') >= 0, 'prison·应为 full(非 clauseOnly)');
    // 守卫真拦：guard 为 false 时块内不执行→sysP 不变
    const gOff = {};   // 无 _buildTemporalConstraint→typeof 守卫 false
    assert(fn(gOff, '魏忠贤', '客氏', { name: '客氏' }, 'BASE') === 'BASE', 'prison·守卫应真拦(函数未定义则 sysP 不变)');
    // placement：注入 marker 须在 callAIMessagesStream 之前
    assert(src.indexOf('_wpMentioned') < src.indexOf('callAIMessagesStream(msgs'), 'prison·注入须在 AI 调用之前');
  }

  // (b) 在局人物 bio tm-char-autogen.js·full·ch=null·扫描 sourceContext+reason。free vars: _buildTemporalConstraint/_tcScanMentionedNames/sourceContext/reason/prompt
  {
    const src = readSrc('tm-char-autogen.js');
    const block = extractGuardBlock(src, '_cgMentioned');
    assert(!!block && block.indexOf('_cgMentioned') >= 0, 'bio·未能抽出注入块');
    const fn = new Function('_buildTemporalConstraint', '_tcScanMentionedNames', 'sourceContext', 'reason', 'prompt', block + '\n; return prompt;');
    const out = fn(sentinelTC, sentinelScan, '议及魏忠贤旧事', '推演涌现', 'BASE_PROMPT');
    assert(out.indexOf('BASE_PROMPT') === 0, 'bio·须 append 到 prompt(不替换)');
    assert(out.indexOf('<<TC ch=null') >= 0, 'bio·生成对象未入 GM·须 ch=null(换 ch 则红)');
    assert(out.indexOf('魏忠贤') >= 0, 'bio·sourceContext 里的人名须经扫描进 mentionedNames(删扫描则红)');
    assert(out.indexOf('clause=false') >= 0, 'bio·应为 full(带在世/已故名单)');
    assert(fn(undefined, sentinelScan, 'x', 'y', 'BASE') === 'BASE', 'bio·守卫应真拦');
    assert(src.indexOf('_cgMentioned') < src.indexOf('callAISmart(prompt'), 'bio·注入须在 AI 调用之前');
  }

  // (c) 反思偏差画像 tm-reflection-agent.js·clauseOnly·ch=null·扫描 lastPred+actual。块用 global. 前缀·free vars: global/lastPred/actual/sys
  {
    const src = readSrc('tm-reflection-agent.js');
    const block = extractGuardBlock(src, '_raMentioned');
    assert(!!block && block.indexOf('_raMentioned') >= 0, 'reflection·未能抽出注入块');
    const fn = new Function('global', 'lastPred', 'actual', 'sys', block + '\n; return sys;');
    const g = { _buildTemporalConstraint: sentinelTC, _tcScanMentionedNames: sentinelScan };
    const out = fn(g, '上回合预测魏忠贤将失势', '势力变动', 'BASE_SYS');
    assert(out.indexOf('BASE_SYS') === 0, 'reflection·须 append 到 sys(不替换)');
    assert(out.indexOf('<<TC ch=null') >= 0, 'reflection·须 ch=null 调用');
    assert(out.indexOf('魏忠贤') >= 0, 'reflection·lastPred/actual 里的人名须经扫描进 mentionedNames(删扫描则红)');
    assert(out.indexOf('clause=true') >= 0, 'reflection·JSON 偏差画像口须 clauseOnly(反哺 sc0·防大名单干扰结构)');
    assert(fn({}, 'x', 'y', 'BASE') === 'BASE', 'reflection·守卫应真拦');
    assert(src.indexOf('_raMentioned') < src.indexOf('callAIMessages('), 'reflection·注入须在 AI 调用之前');
  }

  console.log('  [slice5-behavior] ' + (PASS - start) + ' 断言通过（狱中/bio/反思 真跑注入块·守卫/扫描/ch 三向锁）');
}

slice0_infra();
slice1_full();
slice2_clauseOnly();
slice3_officeMaterialize();
slice4_notApplicable();
slice5_behavior();
console.log('PASS smoke-tc-dialogue-wave · 共 ' + PASS + ' 断言（9 注入口 grep + 狱中/bio/反思行为锁 + mechanics-world 不适用 + infra 前提）');
